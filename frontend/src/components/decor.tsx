/**
 * Decorative pieces of the design language: the wavy band transitions, the
 * twinkling sparkles and the circular illustration medallions. All are
 * presentational — every one is aria-hidden.
 */

/** Hand-drawn wave that joins two full-bleed bands. `fill` is the colour of the band being entered. */
export function Wave({ fill, flip = false, className = '' }: { fill: string; flip?: boolean; className?: string }) {
  const d = flip
    ? 'M0,0 L1440,0 L1440,34 C1200,88 960,8 720,32 C480,56 240,90 0,40 Z'
    : 'M0,44 C240,92 480,4 720,28 C960,52 1200,90 1440,54 L1440,90 L0,90 Z'
  return (
    <div className={`pointer-events-none absolute inset-x-0 w-full leading-[0] ${flip ? '-top-px' : '-bottom-px'} ${className}`} aria-hidden>
      <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="block h-10 w-full sm:h-[68px]">
        <path d={d} fill={fill} />
      </svg>
    </div>
  )
}

export function Sparkle({ className = '', size = 16, delay = 0 }: { className?: string; size?: number; delay?: number }) {
  return (
    <span className={`pointer-events-none absolute z-10 animate-twinkle text-white ${className}`}
      style={{ fontSize: size, animationDelay: `${delay}s`, animationDuration: `${3 + delay}s` }} aria-hidden>✦</span>
  )
}

/** Circular illustration with the white/sand/paper rings from the design language. */
export function Medallion({ src, size = 170, small = false, className = '' }: {
  src: string; size?: number; small?: boolean; className?: string
}) {
  return (
    <div className={`${small ? 'medallion-sm' : 'medallion'} ${className}`} style={{ width: size, height: size }} aria-hidden>
      <img src={src} alt="" loading="lazy" />
    </div>
  )
}

export const ART = {
  hero: '/art/hero.svg',
  reading: '/art/step-reading.svg',
  writing: '/art/step-writing.svg',
  insights: '/art/step-insights.svg',
  welcome: '/art/welcome.svg',
  classroom: '/art/classroom.svg',
  readAloud: '/art/read-aloud.svg',
  story: '/art/story.svg',
  progress: '/art/progress.svg',
  checkIn: '/art/check-in.svg',
  family: '/art/family.svg',
} as const
