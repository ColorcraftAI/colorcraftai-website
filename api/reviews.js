import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET /api/reviews?status=pending&client_id=xxx&limit=20
  if (req.method === 'GET') {
    try {
      const { status, client_id, limit = 50 } = req.query;

      let q = supabase
        .from('reviews')
        .select('*, clients(id,name,slug,business_type,city)')
        .order('created_at', { ascending: false })
        .limit(Number(limit));

      if (status)    q = q.eq('response_status', status);
      if (client_id) q = q.eq('client_id', client_id);

      const { data, error } = await q;
      if (error) throw error;

      return res.status(200).json({ reviews: data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }

  // POST /api/reviews — create a new review
  if (req.method === 'POST') {
    try {
      const { client_id, platform, reviewer_name, rating, review_text, is_urgent } = req.body;
      if (!client_id || !platform || !review_text || !rating) {
        return res.status(400).json({ error: 'Missing required fields: client_id, platform, review_text, rating' });
      }

      const { data, error } = await supabase
        .from('reviews')
        .insert({ client_id, platform, reviewer_name, rating, review_text, is_urgent: is_urgent || rating <= 2 })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({ review: data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
