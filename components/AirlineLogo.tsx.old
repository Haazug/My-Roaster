'use client'

import { useState } from 'react'
import { Plane } from 'lucide-react'

export function AirlineLogo({ 
  iata, 
  icao, 
  name, 
  size = 'sm' 
}: { 
  iata?: string
  icao?: string
  name: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const [logoLoaded, setLogoLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const sizeClasses = {
    sm: 'size-10',
    md: 'size-14',
    lg: 'size-20'
  }

  const containerClasses = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4'
  }

  const code = (iata || icao || '').toUpperCase()
  const logoUrl = code ? `https://cdn.jsdelivr.net/gh/Jxck-S/airline-logos@main/svgs/${code}.svg` : ''

  return (
    <div className={`flex items-center ${containerClasses[size]}`}>
      {logoUrl && (
        <div className={`flex shrink-0 items-center justify-center rounded-full bg-white/10 overflow-hidden ${sizeClasses[size]}`}>
          {!hasError ? (
            <img
              src={logoUrl}
              alt={`${name} logo`}
              onLoad={() => setLogoLoaded(true)}
              onError={() => setHasError(true)}
              className={`w-full h-full object-cover transition-opacity ${logoLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          ) : null}
          
          {(!logoLoaded || hasError) && (
            <div className="flex items-center justify-center w-full h-full bg-[#1f88ff]/20">
              {size === 'lg' ? (
                <Plane className="size-6 text-[#1f88ff]" />
              ) : (
                <span className={`font-black text-[#1f88ff] ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
                  {code.slice(0, 2)}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className={`font-semibold truncate ${size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg'}`}>
          {name}
        </p>
        {(iata || icao) && (
          <p className={`text-white/50 truncate ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
            {iata && icao ? `${iata} · ${icao}` : iata || icao}
          </p>
        )}
      </div>
    </div>
  )
}
