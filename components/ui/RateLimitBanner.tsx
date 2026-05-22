import React from 'react'

interface RateLimitBannerProps {
  message: string
  resetAt?: Date
}

export default function RateLimitBanner({ message, resetAt }: RateLimitBannerProps) {
  const timeString = resetAt 
    ? resetAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    : 'later'

  const formattedMessage = message.replace('[time]', timeString)

  return (
    <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-2xl p-6 shadow-sm my-4 flex items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="text-2xl mt-1">⏳</div>
      <div>
        <h3 className="font-semibold text-lg mb-1">Time for a quick break</h3>
        <p className="text-orange-700 text-sm leading-relaxed">
          {formattedMessage}
        </p>
      </div>
    </div>
  )
}
