'use client'

import Link from 'next/link'

type Props = {
  trialEndsAt: string
}

export default function TrialBanner({ trialEndsAt }: Props) {
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )

  const isUrgent = daysLeft <= 3

  return (
    <div className={`w-full px-4 py-2.5 text-sm flex items-center justify-between gap-4 ${
      isUrgent ? 'bg-red-500 text-white' : 'bg-amber-400 text-amber-900'
    }`}>
      <p className="text-xs mt-0.5">
        Upgrade before your trial ends to keep access
      </p>
      <Link
        href="/dashboard/subscribe"
        className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition ${
          isUrgent
            ? 'bg-white text-red-600 hover:bg-red-50'
            : 'bg-amber-900/20 text-amber-900 hover:bg-amber-900/30'
        }`}
      >
        Upgrade now →
      </Link>
    </div>
  )
}