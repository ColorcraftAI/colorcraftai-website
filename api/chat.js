import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../lib/supabase.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── CACHE LOOKUP ─────────────────────────────────────────────────────────────
// Search for a cached answer using full-text search.
// Returns the best matching cached answer if similarity is high enough.
async function findCachedAnswer(question, mode) {
  try {
    const { data } = await supabase
      .from('qa_cache')
      .select('id, answer, usage_count')
      .eq('mode', mode)
      .textSearch('question', question.split(' ').filter(w => w.length > 3).join(' | '), { type: 'websearch' })
      .order('usage_count', { ascending: false })
      .limit(1);

    if (data?.[0]) {
      // Increment usage count (non-blocking)
      supabase.from('qa_cache').update({ usage_count: data[0].usage_count + 1 }).eq('id', data[0].id).then(() => {});
      return data[0].answer;
    }
  } catch(e) { /* cache miss is fine */ }
  return null;
}

// ── SAVE TO CACHE ─────────────────────────────────────────────────────────────
async function saveToCache(question, answer, mode) {
  try {
    // Only cache short factual questions (not long conversations)
    if (question.length > 200) return;
    await supabase.from('qa_cache').insert({
      mode,
      question,
      answer,
      keywords: question.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(w => w.length > 3).join(' ')
    });
  } catch(e) { /* silently fail */ }
}

// ── LOAD TOP CACHED Q&As AS EXAMPLES ─────────────────────────────────────────
// Inject the top 5 most-asked Q&As into the system prompt so Claude learns
// what works best for your specific audience over time.
async function loadTopExamples(mode) {
  try {
    const { data } = await supabase
      .from('qa_cache')
      .select('question, answer')
      .eq('mode', mode)
      .gte('helpful_up', 1)           // only answers users found helpful
      .order('helpful_up', { ascending: false })
      .limit(5);

    if (!data?.length) return '';

    return '\n\nHere are examples of great answers you have given before (learn from these):\n' +
      data.map((qa, i) => `Example ${i+1}:\nQ: ${qa.question}\nA: ${qa.answer}`).join('\n\n');
  } catch(e) { return ''; }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, clientSlug, mode = 'visitor', sessionId } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const lastUserMessage = messages[messages.length - 1]?.content || '';

    // ── STEP 1: Check cache first (free) ───────────────────────────────────
    // Only check cache for single-turn visitor questions (not ongoing conversations)
    if (mode === 'visitor' && messages.length === 1 && lastUserMessage.length < 200) {
      const cached = await findCachedAnswer(lastUserMessage, mode);
      if (cached) {
        return res.status(200).json({ reply: cached, cached: true });
      }
    }

    // ── STEP 2: Load client context if portal ──────────────────────────────
    let clientContext = '';
    if (clientSlug) {
      const { data: client } = await supabase
        .from('clients')
        .select('*, client_platforms(*)')
        .eq('slug', clientSlug)
        .single();

      if (client) {
        clientContext = `
CLIENT CONTEXT:
- Business: ${client.name}
- Type: ${client.business_type}
- City: ${client.city}
- Google Rating: ${client.reputation_score}/5
- Plan: ${client.plan}
`;
      }
    }

    // ── STEP 3: Load top examples for self-improvement ─────────────────────
    const examples = await loadTopExamples(mode);

    // ── STEP 4: Build system prompt ────────────────────────────────────────
    const basePrompts = {
      visitor: `You are ColorcraftAI's assistant on our website. Help visitors understand what we do and answer their questions. ColorcraftAI manages Google reviews for Indian businesses — we monitor reviews, respond with AI, and improve Google ratings. We are a Google-only service. Do NOT mention Zomato, Practo, JustDial or any other platform. Be warm, concise, and persuasive. Keep replies under 3 sentences unless more detail is needed.`,

      client: `You are ColorcraftAI's AI assistant helping a business owner with their Google reputation. You specialise exclusively in Google Business Profiles for Indian businesses. Do NOT mention Zomato, Practo, JustDial, TripAdvisor or any other platform. ${clientContext} Be warm, clear, concise. Keep replies under 4 sentences.`,

      admin: `You are ColorcraftAI's internal assistant for the admin team managing Google reputation for Indian businesses. Google-only service — do NOT mention other platforms. Be concise and data-driven.`
    };

    const systemPrompt = (basePrompts[mode] || basePrompts.visitor) + examples;

    // ── STEP 5: Call Claude ────────────────────────────────────────────────
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', // Haiku = 5x cheaper than Sonnet
      max_tokens: 300,                     // Short answers = lower cost
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    });

    const reply = response.content[0].text.trim();

    // ── STEP 6: Save new Q&A to cache (non-blocking) ──────────────────────
    if (messages.length === 1 && lastUserMessage.length < 200) {
      saveToCache(lastUserMessage, reply, mode);
    }

    // ── STEP 7: Save to chat history ──────────────────────────────────────
    if (sessionId) {
      supabase.from('chat_messages').insert([
        { session_id: sessionId, role: 'user', content: lastUserMessage },
        { session_id: sessionId, role: 'assistant', content: reply }
      ]).then(() => {});
    }

    return res.status(200).json({ reply, cached: false });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
