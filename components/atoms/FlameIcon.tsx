'use client'

import { useEffect, useRef } from 'react'

interface FlameIconProps {
  size?: number
  className?: string
  visible?: boolean
}

export function FlameIcon({ size = 64, className = '', visible = true }: FlameIconProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    // Randomize turbulence seed for unique flicker on each mount
    const turbulence = svgRef.current?.querySelector('feTurbulence')
    if (turbulence) {
      turbulence.setAttribute('seed', String(Math.floor(Math.random() * 100)))
    }
  }, [])

  return (
    <div
      className={`transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'} ${className}`}
      style={{ width: size, height: size * 1.4 }}
      aria-hidden="true"
    >
      <svg
        ref={svgRef}
        viewBox="0 0 64 90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={{ filter: 'url(#flame-filter)' }}
      >
        <defs>
          <filter id="flame-filter" x="-30%" y="-30%" width="160%" height="160%">
            {/* Turbulence for organic flame movement */}
            <feTurbulence
              type="turbulence"
              baseFrequency="0.025 0.06"
              numOctaves="3"
              seed="1"
              result="turbulence"
            >
              <animate
                attributeName="baseFrequency"
                values="0.025 0.06; 0.03 0.07; 0.025 0.06"
                dur="0.4s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="seed"
                values="1;5;2;8;3;1"
                dur="0.6s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="turbulence"
              scale="4"
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            >
              <animate
                attributeName="scale"
                values="4;6;3;5;4"
                dur="0.3s"
                repeatCount="indefinite"
              />
            </feDisplacementMap>
            <feGaussianBlur stdDeviation="0.5" in="displaced" result="blurred" />
            {/* Outer glow */}
            <feGaussianBlur stdDeviation="8" in="SourceGraphic" result="glow" />
            <feComposite in="blurred" in2="glow" operator="over" result="composite" />
            <feBlend in="composite" in2="glow" mode="screen" />
          </filter>

          {/* Radial gradient — core to tip */}
          <radialGradient id="flame-core" cx="50%" cy="80%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="20%" stopColor="#FFF5C2" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#E8CC7A" stopOpacity="0.7" />
            <stop offset="80%" stopColor="#C9A84C" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#5C1A2E" stopOpacity="0" />
          </radialGradient>

          {/* Outer flame gradient */}
          <linearGradient id="flame-outer" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#E8CC7A" stopOpacity="0.7" />
            <stop offset="80%" stopColor="#C9A84C" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#5C1A2E" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Outer flame */}
        <path
          d="M32 2 C28 18 16 22 14 38 C12 52 20 64 32 68 C44 64 52 52 50 38 C48 22 36 18 32 2Z"
          fill="url(#flame-outer)"
          opacity="0.8"
        >
          <animate
            attributeName="d"
            values="
              M32 2 C28 18 16 22 14 38 C12 52 20 64 32 68 C44 64 52 52 50 38 C48 22 36 18 32 2Z;
              M32 4 C30 16 17 24 15 38 C13 53 21 65 32 68 C43 65 51 53 49 38 C47 24 34 16 32 4Z;
              M32 2 C27 20 15 20 13 37 C11 51 19 63 32 68 C45 63 53 51 51 37 C49 20 37 20 32 2Z;
              M32 2 C28 18 16 22 14 38 C12 52 20 64 32 68 C44 64 52 52 50 38 C48 22 36 18 32 2Z
            "
            dur="0.5s"
            repeatCount="indefinite"
          />
        </path>

        {/* Inner core */}
        <path
          d="M32 20 C29 30 23 34 22 42 C21 50 26 56 32 58 C38 56 43 50 42 42 C41 34 35 30 32 20Z"
          fill="url(#flame-core)"
        >
          <animate
            attributeName="d"
            values="
              M32 20 C29 30 23 34 22 42 C21 50 26 56 32 58 C38 56 43 50 42 42 C41 34 35 30 32 20Z;
              M32 22 C30 31 24 35 23 43 C22 51 27 57 32 58 C37 57 42 51 41 43 C40 35 34 31 32 22Z;
              M32 18 C28 29 22 33 21 41 C20 49 25 55 32 58 C39 55 44 49 43 41 C42 33 36 29 32 18Z;
              M32 20 C29 30 23 34 22 42 C21 50 26 56 32 58 C38 56 43 50 42 42 C41 34 35 30 32 20Z
            "
            dur="0.4s"
            repeatCount="indefinite"
          />
        </path>

        {/* Candle body */}
        <rect x="26" y="68" width="12" height="20" rx="2" fill="#2A1A0A" opacity="0.9" />
        <rect x="28" y="66" width="8" height="4" rx="1" fill="#1A0A05" opacity="0.7" />

        {/* Wick */}
        <line
          x1="32"
          y1="68"
          x2="32"
          y2="62"
          stroke="#0A0A0B"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
