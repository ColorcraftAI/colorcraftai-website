import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: activeClients },
      { count: reviewsThisWeek },
      { count: pendingReviews },
      { count: crisisCount },
      { data: clients },
      { data: topClients },
      { data: recentAlerts }
    ] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('response_status', 'pending'),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('is_urgent', true).eq('response_status', 'pending'),
      supabase.from('clients').select('monthly_fee').eq('status', 'active'),
      supabase.from('clients').select('id,name,slug,business_type,city,reputation_score,status').eq('status', 'active').order('reputation_score', { ascending: false }).limit(7),
      supabase.from('alerts').select('*,clients(name)').eq('is_read', false).order('created_at', { ascending: false }).limit(5)
    ]);

    const monthlyRevenue = clients?.reduce((s, c) => s + (c.monthly_fee || 0), 0) || 0;

    return res.status(200).json({
      activeClients: activeClients || 0,
      reviewsThisWeek: reviewsThisWeek || 0,
      pendingReviews: pendingReviews || 0,
      crisisCount: crisisCount || 0,
      monthlyRevenue,
      topClients: topClients || [],
      recentAlerts: recentAlerts || []
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
