import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing review id' });

  // PATCH /api/review?id=xxx — update status or AI response
  if (req.method === 'PATCH') {
    try {
      const { response_status, ai_response } = req.body;
      const updates = {};
      if (response_status) updates.response_status = response_status;
      if (ai_response !== undefined) updates.ai_response = ai_response;

      const { data, error } = await supabase
        .from('reviews')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ review: data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/review?id=xxx
  if (req.method === 'DELETE') {
    try {
      const { error } = await supabase.from('reviews').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
