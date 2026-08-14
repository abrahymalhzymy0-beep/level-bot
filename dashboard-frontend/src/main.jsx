import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Overview from './pages/Overview'
import Members from './pages/Members'
import MemberDetail from './pages/MemberDetail'
import Leaderboard from './pages/Leaderboard'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Header from './components/Header'
import './styles.css'

function App(){
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <Header />
        <main className="p-6">
          <Routes>
            <Route path="/" element={<Overview/>} />
            <Route path="/login" element={<Login/>} />
            <Route path="/members" element={<Members/>} />
            <Route path="/members/:guildId/:memberId" element={<MemberDetail/>} />
            <Route path="/leaderboard" element={<Leaderboard/>} />
            <Route path="/settings" element={<Settings/>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<App />)
