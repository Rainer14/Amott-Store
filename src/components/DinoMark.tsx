type DinoTone = 'ink' | 'bone'

interface DinoMarkProps {
  tone?: DinoTone
  animated?: boolean
  className?: string
}

export function DinoMark({
  tone = 'ink',
  animated = true,
  className = '',
}: DinoMarkProps) {
  return (
    <img
      className={[
        'dino',
        `dino--${tone}`,
        animated ? 'dino--animated' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      src="/triceratops.webp"
      alt=""
      aria-hidden="true"
      draggable={false}
      width={1157}
      height={1383}
    />
  )
}
