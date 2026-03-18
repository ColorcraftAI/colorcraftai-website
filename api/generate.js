import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../lib/supabase.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { reviewId, reviewText, businessName, businessType, platform, rating } = req.body;

    if (!reviewText || !businessName || !platform || !rating) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const tone = rating <= 2 ? 'empathetic, apologetic, and urgent' : rating === 3 ? 'understanding and constructive' : 'warm, grateful, and enthusiastic';
    const urgency = rating <= 2 ? 'This is a critical review that needs immediate attention.' : '';

    const prompt = `You are an expert reputation manager for Indian businesses. Write a professional public response to the following ${platform} review on behalf of ${businessName} (${businessType || 'business'}).

Review (${rating}/5 stars): "${reviewText}"

Guidelines:
- Tone should be ${tone}
- Length: 2-4 sentences, concise and professional
- Do not offer discounts or refunds in the response (handle privately)
- Do not be defensive; always acknowledge the customer's experience
- End with a positive note or invitation to return/contact
- Use Indian business context (mention calling on phone if urgent, use professional but warm language)
- ${urgency}
- Do NOT include any preamble — just write the response directly as it will be posted

Response:`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    });

    const aiResponse = message.content[0].text.trim();

    // Save to DB if reviewId provided
    if (reviewId) {
      await supabase
        .from('reviews')
        .update({ ai_response: aiResponse })
        .eq('id', reviewId);
    }

    return res.status(200).json({ response: aiResponse });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
