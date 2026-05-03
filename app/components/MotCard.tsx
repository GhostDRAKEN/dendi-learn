'use client'

import { useState } from 'react'

type Mot = {
  id: number
  fr: string
  dendi: string
  phonetique: string
  categorie: string
}

export default function MotCard({ mot }: { mot: Mot }) {
  const [retournee, setRetournee] = useState(false)

  return (
    <div
      onClick={() => setRetournee(!retournee)}
      className="cursor-pointer border rounded-lg p-6 min-h-32 flex flex-col justify-center items-center text-center transition-all duration-300 hover:shadow-lg"
    >
      {!retournee ? (
        <p className="text-2xl font-bold">{mot.fr}</p>
      ) : (
        <>
          <p className="text-2xl font-bold">{mot.dendi}</p>
          <p className="text-gray-400 italic mt-2">{mot.phonetique}</p>
        </>
      )}
    </div>
  )
}