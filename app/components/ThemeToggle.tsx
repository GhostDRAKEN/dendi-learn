'use client'

import { useState, useEffect } from 'react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    document.body.className = dark ? 'dark' : 'light'
  }, [dark])

  return (
    <button
      onClick={() => setDark(!dark)}
      style={{
        padding: '8px 14px',
        borderRadius: '9999px',
        border: '1px solid var(--border)',
        backgroundColor: 'transparent',
        color: 'var(--text)',
        fontSize: '13px',
        cursor: 'pointer',
        fontFamily: 'Georgia, serif',
      }}
    >
      {dark ? '☀️ Clair' : '🌙 Sombre'}
    </button>
  )
}