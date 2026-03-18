import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../lib/supabase.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, clientSlug, mode = 'client', sessionId } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Load client context if provided
    let clientContext = '';
    if (clientSlug) {
      const { data: client } = await supabase
        .from('clients')
        .select('*, client_platforms(*)')
        .eq('slug', clientSlug)
        .single();

      if (client) {
        const platforms = client.client_platforms || [];
        const platformStr = platforms.map(p => `${p.platform}: ${p.rating}★ (${p.review_count} reviews)`).join(', ');
        clientContext = `
CLIENT CONTEXT:
- Business: ${client.name}
- Type: ${client.business_type}
- City: ${client.city}
- Reputation Score: ${client.reputation_score}/5
- Google Reviews: ${platformStr || 'Not set up yet'}
- Plan: ${client.plan}
`;
      }
    }

    const systemPrompt = mode === 'admin'
      ? `You are ColorcraftAI's internal assistant for the admin team. You help manage Google reputation management operations for multiple Indian business clients. ColorcraftAI is a Google-only reputation management service — do NOT mention other platforms like Zomato, Practo, JustDial, or TripAdvisor. Be concise, data-driven, and professional. Help with tasks like drafting review responses, analysing client data, and making recommendations.`
      : `You are ColorcraftAI's AI assistant, helping a business owner understand and improve their Google reputation. You are friendly, knowledgeable, and practical. You specialise exclusively in Google Business Profiles for Indian businesses.

IMPORTANT: ColorcraftAI only manages Google reviews. Do NOT mention Zomato, Practo, JustDial, TripAdvisor or any other platform. We are a Google-only reputation management service.

${clientContext}

Your role:
- Answer questions about their Google reputation data and what it means
- Explain Google review trends and what actions to take
- Guide them on how to get more Google reviews ethically
- Help them respond to negative Google reviews
- Explain Google Business Profile best practices
- Be encouraging and solution-focused
- Keep answers concise (2-4 sentences) unless a detailed explanation is needed`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    });

    const reply = response.content[0].text.trim();

    // Save to DB for history
    if (sessionId) {
      const lastUserMsg = messages[messages.length - 1];
      await supabase.from('chat_messages').insert([
        { session_id: sessionId, role: 'user', content: lastUserMsg.content },
        { session_id: sessionId, role: 'assistant', content: reply }
      ]);
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
