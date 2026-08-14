import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function Header(){
  const [user, setUser] = useState(null);

  useEffect(()=>{
    axios.get('/api/me', { withCredentials: true }).then(r=> setUser(r.data.user)).catch(()=> setUser(null));
  },[]);

  return (
    <header className="p-4 border-b border-gray-800 flex items-center justify-between">
      <h1 className="text-xl font-bold">Level Bot Dashboard</h1>
      <nav className="space-x-4">
        <Link to="/" className="text-gray-300">Overview</Link>
        <Link to="/members" className="text-gray-300">Members</Link>
        <Link to="/leaderboard" className="text-gray-300">Leaderboard</Link>
        <Link to="/settings" className="text-gray-300">Settings</Link>
        {user && <Link to="/logs" className="text-gray-300">Logs</Link>}
      </nav>
      <div>
        {user ? (
          <div className="flex items-center gap-2">
            <img src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} alt="avatar" className="w-8 h-8 rounded" />
            <span>{user.username}</span>
            <a href="/auth/logout" className="ml-2 text-sm text-gray-300">Logout</a>
          </div>
        ) : (
          <a href="/auth/discord" className="px-3 py-1 bg-blue-600 rounded">Login</a>
        )}
      </div>
    </header>
  )
}
