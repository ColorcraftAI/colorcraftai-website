import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id, slug } = req.query;
  if (!id && !slug) return res.status(400).json({ error: 'Provide id or slug' });

  try {
    let q = supabase
      .from('clients')
      .select('*, client_platforms(*)')
      .single();

    if (id)   q = q.eq('id', id);
    if (slug) q = q.eq('slug', slug);

    const { data: client, error } = await q;
    if (error || !client) return res.status(404).json({ error: 'Client not found' });

    // Get recent reviews for this client
    const { data: reviews } = await supabase
      .from('reviews')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get alerts
    const { data: alerts } = await supabase
      .from('alerts')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Compute stats from reviews
    const allReviews = reviews || [];
    const totalRating = allReviews.reduce((s, r) => s + r.rating, 0);
    const avgRating = allReviews.length ? (totalRating / allReviews.length).toFixed(1) : client.reputation_score;
    const fiveStarPct = allReviews.length ? Math.round(allReviews.filter(r => r.rating === 5).length / allReviews.length * 100) : 0;
    const pendingCount = allReviews.filter(r => r.response_status === 'pending').length;

    return res.status(200).json({
      client: {
        ...client,
        avg_rating: parseFloat(avgRating),
        five_star_pct: fiveStarPct,
        pending_reviews: pendingCount
      },
      reviews: allReviews,
      alerts: alerts || []
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
