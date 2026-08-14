import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Leaderboard(){
  const [guildId, setGuildId] = useState('');
  const [type, setType] = useState('level');
  const [rows, setRows] = useState([]);

  useEffect(()=>{
    if(!guildId) return;
    axios.get(`/api/members/leaderboard/${guildId}?type=${type}`, { withCredentials: true }).then(r=> setRows(r.data)).catch(()=>{});
  },[guildId, type]);

  return (
    <div>
      <h2 className="text-2xl mb-4">Leaderboard</h2>
      <div className="mb-4 flex gap-2">
        <input placeholder="Guild ID" value={guildId} onChange={e=>setGuildId(e.target.value)} className="p-2 bg-gray-800 rounded" />
        <select value={type} onChange={e=>setType(e.target.value)} className="p-2 bg-gray-800 rounded">
          <option value="level">Level</option>
          <option value="text">Text</option>
          <option value="voice">Voice</option>
        </select>
      </div>

      <div className="space-y-2">
        {rows.map((r,i)=> (
          <div key={r.id} className="p-3 bg-gray-800 rounded flex justify-between">
            <div>
              <div className="font-semibold">#{i+1} {r.discordId}</div>
              <div className="text-sm">Level {r.level} — Total: {r.totalXp} — Text: {r.textXp} — Voice: {r.voiceXp}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
