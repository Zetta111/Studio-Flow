'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function SubscribeSuccessPage() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    setTimeout(() => setShow(true), 100)
  }, [])

  return (
    <div className="px-4 sm:px-0 max-w-md mx-auto py-16 text-center">
      <div className={`transition-all duration-500 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
          ✓
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">You're all set!</h2>
        <p className="text-gray-500 text-sm mb-8">
          Your subscription is active. Welcome to StudioFlow — let's get your studio running.
        </p>
        <Link
          href="/dashboard"
          className="inline-block bg-indigo-600 text-white font-semibold text-sm px-8 py-3 rounded-xl hover:bg-indigo-700 transition"
        >
          Go to dashboard →
        </Link>
      </div>
    </div>
  )
}