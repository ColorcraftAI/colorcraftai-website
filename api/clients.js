import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET /api/clients
  if (req.method === 'GET') {
    try {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('*, client_platforms(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Attach pending review counts
      const ids = clients.map(c => c.id);
      const { data: counts } = await supabase
        .from('reviews')
        .select('client_id')
        .in('client_id', ids)
        .eq('response_status', 'pending');

      const pendingMap = {};
      counts?.forEach(r => { pendingMap[r.client_id] = (pendingMap[r.client_id] || 0) + 1; });

      const enriched = clients.map(c => ({
        ...c,
        pending_reviews: pendingMap[c.id] || 0
      }));

      return res.status(200).json({ clients: enriched });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }

  // POST /api/clients — create a new client
  if (req.method === 'POST') {
    try {
      const { name, slug, business_type, city, contact_name, contact_email, contact_phone, plan, monthly_fee } = req.body;
      if (!name || !slug) return res.status(400).json({ error: 'name and slug are required' });

      const { data, error } = await supabase
        .from('clients')
        .insert({ name, slug, business_type, city, contact_name, contact_email, contact_phone, plan, monthly_fee })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({ client: data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
