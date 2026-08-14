import React from 'react'

export default function Login(){
  return (
    <div className="p-4 bg-gray-800 rounded">
      <h2 className="text-xl mb-2">Login</h2>
      <a href="/auth/discord" className="px-4 py-2 bg-blue-600 rounded">Login with Discord</a>
    </div>
  )
}
