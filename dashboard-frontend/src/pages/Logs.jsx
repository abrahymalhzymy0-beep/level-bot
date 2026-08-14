import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Logs(){
  const [guildId, setGuildId] = useState('');
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ action: '', adminId: '', memberId: '', from: '', to: '', q: '' });

  useEffect(()=>{
    if(!guildId) return;
    fetch();
  },[guildId, page, perPage]);

  async function fetch(){
    const params = { page, perPage, ...filters };
    const res = await axios.get(`/api/logs/${guildId}`, { params, withCredentials: true });
    setRows(res.data.rows);
    setTotal(res.data.total);
  }

  return (
    <div>
      <h2 className="text-2xl mb-4">Logs</h2>
      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
        <input placeholder="Guild ID" value={guildId} onChange={e=>setGuildId(e.target.value)} className="p-2 bg-gray-800 rounded" />
        <input placeholder="Action (e.g. add_xp)" value={filters.action} onChange={e=>setFilters({...filters, action: e.target.value})} className="p-2 bg-gray-800 rounded" />
        <input placeholder="Admin ID" value={filters.adminId} onChange={e=>setFilters({...filters, adminId: e.target.value})} className="p-2 bg-gray-800 rounded" />
        <input placeholder="Member ID" value={filters.memberId} onChange={e=>setFilters({...filters, memberId: e.target.value})} className="p-2 bg-gray-800 rounded" />
        <input type="date" value={filters.from} onChange={e=>setFilters({...filters, from: e.target.value})} className="p-2 bg-gray-800 rounded" />
        <input type="date" value={filters.to} onChange={e=>setFilters({...filters, to: e.target.value})} className="p-2 bg-gray-800 rounded" />
        <input placeholder="Search" value={filters.q} onChange={e=>setFilters({...filters, q: e.target.value})} className="p-2 bg-gray-800 rounded" />
        <div className="flex gap-2">
          <button className="p-2 bg-blue-600 rounded" onClick={()=>{ setPage(1); fetch(); }}>Search</button>
          <button className="p-2 bg-gray-600 rounded" onClick={()=>{ setFilters({ action: '', adminId: '', memberId: '', from: '', to: '', q: '' }); setPage(1); }}>Reset</button>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((r:any)=> (
          <div key={r.id} className="p-3 bg-gray-800 rounded flex justify-between">
            <div>
              <div className="font-semibold">{new Date(r.createdAt).toLocaleString()} — {r.action}</div>
              <div className="text-sm">Admin: {r.adminId || 'N/A'} — Member: {r.targetMemberId || 'N/A'}</div>
              <div className="text-xs mt-1">{r.details ? (r.details.length > 200 ? r.details.slice(0,200)+'...' : r.details) : ''}</div>
            </div>
            <div>
              <button onClick={async ()=>{ const d = await axios.get(`/api/logs/${guildId}/${r.id}`, { withCredentials: true }); alert(JSON.stringify(d.data, null, 2)); }} className="px-3 py-1 bg-blue-600 rounded">View</button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button disabled={page<=1} onClick={()=>{ setPage(p=>p-1); fetch(); }} className="px-3 py-1 bg-gray-700 rounded">Prev</button>
        <div>Page {page} — {total} total</div>
        <button disabled={page*perPage>=total} onClick={()=>{ setPage(p=>p+1); fetch(); }} className="px-3 py-1 bg-gray-700 rounded">Next</button>
      </div>
    </div>
  )
}
