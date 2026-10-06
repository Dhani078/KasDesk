'use client'

import React from 'react'
import Link from 'next/link'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  href?: string
  className?: string
}

export function KasDeskLogo({
  size = 'md',
  showText = true,
  href,
  className = '',
}: LogoProps) {
  const iconSizes = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-12 w-12',
  }

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base sm:text-lg',
    lg: 'text-2xl',
  }

  const logoMark = (
    <div className={`relative inline-flex items-center gap-2.5 group cursor-pointer ${className}`}>
      {/* Premium Isometric Glowing Hex-Vault SVG Emblem */}
      <div
        className={`relative ${iconSizes[size]} shrink-0 transition-transform duration-300 ease-out group-hover:scale-105 active:scale-95`}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full drop-shadow-[0_4px_12px_rgba(79,127,232,0.35)] transition-all duration-300 group-hover:drop-shadow-[0_6px_20px_rgba(56,189,248,0.55)]"
        >
          <defs>
            <linearGradient id="kdLeftFacet" x1="6" y1="8" x2="24" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4F7FE8" />
              <stop offset="1" stopColor="#2247B6" />
            </linearGradient>
            <linearGradient id="kdRightFacet" x1="24" y1="8" x2="42" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38BDF8" />
              <stop offset="0.6" stopColor="#4F7FE8" />
              <stop offset="1" stopColor="#1E3A8A" />
            </linearGradient>
            <linearGradient id="kdCoreGlow" x1="16" y1="16" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="0.7" stopColor="#67E8F9" stopOpacity="0.8" />
              <stop offset="1" stopColor="#38BDF8" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="kdTopLid" x1="12" y1="6" x2="36" y2="20" gradientUnits="userSpaceOnUse">
              <stop stopColor="#60A5FA" />
              <stop offset="1" stopColor="#3B82F6" />
            </linearGradient>
          </defs>

          {/* Outer Rounded Shield / Vault Silhouette */}
          <rect
            x="4"
            y="4"
            width="40"
            height="40"
            rx="12"
            className="fill-canvas stroke-border-outer"
            strokeWidth="1.5"
          />

          {/* Left Dynamic Wing / Fold */}
          <path
            d="M12 15C12 13.3431 13.3431 12 15 12H24V36H15C13.3431 36 12 34.6569 12 33V15Z"
            fill="url(#kdLeftFacet)"
          />

          {/* Right Dynamic Wing / Growth Polygon */}
          <path
            d="M24 12H33C34.6569 12 36 13.3431 36 15V33C36 34.6569 34.6569 36 33 36H24V12Z"
            fill="url(#kdRightFacet)"
          />

          {/* Modern Geometric "K" Notch & Negative Space Bridge */}
          <path
            d="M20 17H24V31H20V17Z"
            fill="#FFFFFF"
            fillOpacity="0.95"
          />
          <path
            d="M24 23L30 17H34L27 24L34 31H30L24 25V23Z"
            fill="#FFFFFF"
            fillOpacity="0.95"
          />

          {/* Central Prismatic Sparkle Accent */}
          <circle cx="24" cy="24" r="2" fill="url(#kdCoreGlow)" />
        </svg>
      </div>

      {/* Typography with Smooth Financial Accent */}
      {showText && (
        <span
          className={`font-bold tracking-tight text-text-primary ${textSizes[size]} transition-colors duration-200`}
        >
          <span>Kas</span>
          <span className="bg-gradient-to-r from-accent to-sky-400 bg-clip-text text-transparent font-extrabold">
            Desk
          </span>
        </span>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {logoMark}
      </Link>
    )
  }

  return logoMark
}
