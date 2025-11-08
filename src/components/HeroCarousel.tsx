import { useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  images: string[]
  interval?: number // ms
  className?: string
}

export default function HeroCarousel({ images, interval = 1500, className = '' }: Props) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef<number | null>(null)

  // Preload images
  const sources = useMemo(() => images.filter(Boolean), [images])
  useEffect(() => {
    sources.forEach(src => { const img = new Image(); img.src = src })
  }, [sources])

  // Autoplay
  useEffect(() => {
    if (!sources.length) return
    if (timer.current) window.clearInterval(timer.current)
    if (!paused) {
      timer.current = window.setInterval(() => {
        setI(prev => (prev + 1) % sources.length)
      }, interval)
    }
    return () => { if (timer.current) window.clearInterval(timer.current) }
  }, [sources, interval, paused])

  if (!sources.length) return null

  return (
    <div
      className={
        'relative rounded-3xl border border-emerald-200/60 bg-white/60 shadow-sm overflow-hidden ' +
        className
      }
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {sources.map((src, idx) => (
        <img
          key={src + idx}
          src={src}
          alt={`slide-${idx}`}
          className={
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ' +
            (idx === i ? 'opacity-100' : 'opacity-0')
          }
          draggable={false}
        />
      ))}

      {/* Gradient veil so text on top (if any) is readable */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/40 to-transparent" />

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {sources.map((_, idx) => (
          <span
            key={idx}
            className={
              'h-1.5 w-1.5 rounded-full transition ' +
              (idx === i ? 'bg-emerald-600' : 'bg-emerald-300/70')
            }
          />
        ))}
      </div>
    </div>
  )
}
