const supabase = require('./supabase');

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let a = '', b = '';
  for (let i = 0; i < 4; i++) a += chars[Math.floor(Math.random() * chars.length)];
  for (let i = 0; i < 4; i++) b += chars[Math.floor(Math.random() * chars.length)];
  return a + '-' + b;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — load my guild by business_id
  if (req.method === 'GET') {
    const { business_id } = req.query;
    if (!business_id) return res.status(400).json({ error: 'business_id required' });

    try {
      const { data: membership, error: memberErr } = await supabase
        .from('guild_members')
        .select('guild_id, role')
        .eq('business_id', business_id)
        .single();

      if (memberErr && memberErr.code !== 'PGRST116') {
        console.error('Guild GET membership error:', memberErr.message, 'business_id:', business_id);
      }
      if (!membership) return res.status(200).json({ guild: null });

      const { data: guild } = await supabase
        .from('guilds')
        .select('*')
        .eq('id', membership.guild_id)
        .single();

      const { data: members } = await supabase
        .from('guild_members')
        .select('*')
        .eq('guild_id', membership.guild_id)
        .order('joined_at', { ascending: true });

      let codes = [];
      if (membership.role === 'leader') {
        const { data: codeRows } = await supabase
          .from('guild_codes')
          .select('*')
          .eq('guild_id', membership.guild_id)
          .order('created_at', { ascending: false });
        codes = codeRows || [];
      }

      return res.status(200).json({ guild: { ...guild, members: members || [], codes, myRole: membership.role } });

    } catch (err) {
      console.error('Guild GET error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // POST — action-based
  if (req.method === 'POST') {
    const { action, business_id, user_name } = req.body;
    if (!action || !business_id) return res.status(400).json({ error: 'action and business_id required' });

    // CREATE GUILD
    if (action === 'create_guild') {
      const { name, description, church } = req.body;
      if (!name) return res.status(400).json({ error: 'Guild name required' });

      try {
        const { data: existing } = await supabase
          .from('guild_members')
          .select('guild_id')
          .eq('business_id', business_id)
          .single();
        if (existing) return res.status(409).json({ error: 'You are already in a guild.' });

        const { data: guild, error } = await supabase
          .from('guilds')
          .insert([{ name, description, church, leader_business_id: business_id, leader_name: user_name }])
          .select()
          .single();
        if (error) { console.error('Create guild error:', error.message); throw error; }

        await supabase.from('guild_members').insert([{
          guild_id: guild.id, business_id, user_name, role: 'leader'
        }]);

        return res.status(200).json({ success: true, guild: { ...guild, members: [{ business_id, user_name, role: 'leader', joined_at: new Date().toISOString() }], codes: [], myRole: 'leader' } });
      } catch (err) {
        console.error('create_guild error:', err.message);
        return res.status(500).json({ error: err.message });
      }
    }

    // JOIN GUILD
    if (action === 'join_guild') {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: 'Invite code required' });

      try {
        const { data: existing } = await supabase
          .from('guild_members')
          .select('guild_id')
          .eq('business_id', business_id)
          .single();
        if (existing) return res.status(409).json({ error: 'You are already in a guild.' });

        const { data: codeRow } = await supabase
          .from('guild_codes')
          .select('*')
          .eq('code', code.toUpperCase())
          .eq('used', false)
          .single();

        if (!codeRow) return res.status(404).json({ error: 'Invalid or expired invite code. Please check with your Guild leader.' });

        await supabase.from('guild_codes').update({
          used: true,
          used_by_business_id: business_id,
          used_by_name: user_name,
          used_at: new Date().toISOString()
        }).eq('id', codeRow.id);

        await supabase.from('guild_members').insert([{
          guild_id: codeRow.guild_id, business_id, user_name, role: 'member'
        }]);

        const { data: guild } = await supabase.from('guilds').select('*').eq('id', codeRow.guild_id).single();
        const { data: members } = await supabase.from('guild_members').select('*').eq('guild_id', codeRow.guild_id).order('joined_at', { ascending: true });

        return res.status(200).json({ success: true, guild: { ...guild, members: members || [], codes: [], myRole: 'member' } });
      } catch (err) {
        console.error('join_guild error:', err.message);
        return res.status(500).json({ error: err.message });
      }
    }

    // CREATE INVITE CODE
    if (action === 'create_code') {
      try {
        const { data: membership } = await supabase
          .from('guild_members')
          .select('guild_id, role')
          .eq('business_id', business_id)
          .single();
        if (!membership || membership.role !== 'leader') return res.status(403).json({ error: 'Only the guild leader can create invite codes.' });

        let code, attempts = 0;
        do {
          code = genCode();
          const { data: exists } = await supabase.from('guild_codes').select('id').eq('code', code).single();
          if (!exists) break;
        } while (++attempts < 10);

        const { data: codeRow, error } = await supabase
          .from('guild_codes')
          .insert([{ guild_id: membership.guild_id, code }])
          .select()
          .single();
        if (error) throw error;

        return res.status(200).json({ success: true, code: codeRow });
      } catch (err) {
        console.error('create_code error:', err.message);
        return res.status(500).json({ error: err.message });
      }
    }

    // DELETE INVITE CODE
    if (action === 'delete_code') {
      const { code_id } = req.body;
      if (!code_id) return res.status(400).json({ error: 'code_id required' });
      try {
        const { data: membership } = await supabase
          .from('guild_members')
          .select('guild_id, role')
          .eq('business_id', business_id)
          .single();
        if (!membership || membership.role !== 'leader') return res.status(403).json({ error: 'Only the guild leader can delete codes.' });

        await supabase.from('guild_codes').delete().eq('id', code_id).eq('guild_id', membership.guild_id);
        return res.status(200).json({ success: true });
      } catch (err) {
        console.error('delete_code error:', err.message);
        return res.status(500).json({ error: err.message });
      }
    }

    // LEAVE GUILD
    if (action === 'leave') {
      try {
        const { data: membership } = await supabase
          .from('guild_members')
          .select('guild_id, role')
          .eq('business_id', business_id)
          .single();
        if (!membership) return res.status(404).json({ error: 'You are not in a guild.' });
        if (membership.role === 'leader') return res.status(400).json({ error: 'Leaders must disband the guild, not leave.' });

        await supabase.from('guild_members').delete().eq('business_id', business_id).eq('guild_id', membership.guild_id);
        return res.status(200).json({ success: true });
      } catch (err) {
        console.error('leave error:', err.message);
        return res.status(500).json({ error: err.message });
      }
    }

    // DISBAND GUILD
    if (action === 'disband') {
      try {
        const { data: membership } = await supabase
          .from('guild_members')
          .select('guild_id, role')
          .eq('business_id', business_id)
          .single();
        if (!membership || membership.role !== 'leader') return res.status(403).json({ error: 'Only the guild leader can disband the guild.' });

        await supabase.from('guilds').delete().eq('id', membership.guild_id);
        return res.status(200).json({ success: true });
      } catch (err) {
        console.error('disband error:', err.message);
        return res.status(500).json({ error: err.message });
      }
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
