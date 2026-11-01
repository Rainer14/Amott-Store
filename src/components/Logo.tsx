import { DinoMark } from './DinoMark'

interface LogoProps {
  tone?: 'ink' | 'bone'
}

export function Logo({ tone = 'ink' }: LogoProps) {
  return (
    <span className="brand">
      <DinoMark tone={tone} className="brand__dino" />
      <span className="brand__word">
        amott<span className="brand__dot">.</span>
      </span>
    </span>
  )
}
