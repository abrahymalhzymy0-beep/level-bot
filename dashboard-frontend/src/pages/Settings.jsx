import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Settings(){
  const [guildId, setGuildId] = useState('');
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ textXpPerMessage: 10, textXpCooldown: 60, voiceXpPerMinute: 5 });

  useEffect(()=>{
    if(!guildId) return;
    axios.get(`/api/settings/${guildId}`, { withCredentials: true }).then(r=>{ setSettings(r.data); setForm({ textXpPerMessage: r.data?.textXpPerMessage ?? 10, textXpCooldown: r.data?.textXpCooldown ?? 60, voiceXpPerMinute: r.data?.voiceXpPerMinute ?? 5 }) }).catch(()=>{});
  },[guildId]);

  async function save(){
    await axios.post(`/api/settings/${guildId}`, form, { withCredentials: true });
    const res = await axios.get(`/api/settings/${guildId}`, { withCredentials: true });
    setSettings(res.data);
    alert('Saved');
  }

  return (
    <div>
      <h2 className="text-2xl mb-4">Settings</h2>
      <div className="mb-4 flex gap-2">
        <input placeholder="Guild ID" value={guildId} onChange={e=>setGuildId(e.target.value)} className="p-2 bg-gray-800 rounded" />
        <button className="p-2 bg-blue-600 rounded" onClick={()=>{ if(!guildId) alert('Enter guild'); }}>Load</button>
      </div>

      {guildId && (
        <div className="p-4 bg-gray-800 rounded space-y-2">
          <div>
            <label className="block text-sm">Text XP per message</label>
            <input type="number" className="p-2 bg-gray-900 rounded w-40" value={form.textXpPerMessage} onChange={e=>setForm({...form, textXpPerMessage: Number(e.target.value)})} />
          </div>
          <div>
            <label className="block text-sm">Text XP Cooldown (seconds)</label>
            <input type="number" className="p-2 bg-gray-900 rounded w-40" value={form.textXpCooldown} onChange={e=>setForm({...form, textXpCooldown: Number(e.target.value)})} />
          </div>
          <div>
            <label className="block text-sm">Voice XP per minute</label>
            <input type="number" className="p-2 bg-gray-900 rounded w-40" value={form.voiceXpPerMinute} onChange={e=>setForm({...form, voiceXpPerMinute: Number(e.target.value)})} />
          </div>
          <div>
            <button onClick={save} className="px-3 py-1 bg-green-600 rounded">Save</button>
          </div>
        </div>
      )}
    </div>
  )
}
