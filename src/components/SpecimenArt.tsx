import type { SpecimenKind } from '../types'

interface SpecimenArtProps {
  kind: SpecimenKind
}

export function SpecimenArt({ kind }: SpecimenArtProps) {
  switch (kind) {
    case 'ammonite':
      return (
        <svg
          className="sa"
          viewBox="0 0 200 160"
          aria-hidden="true"
          focusable="false"
        >
          <circle
            className="sa-fill sa-fill--accent"
            cx="100"
            cy="84"
            r="54"
          />
          <g className="sa-line sa-thin">
            {Array.from({ length: 12 }, (_, index) => (
              <line
                key={index}
                x1="100"
                y1="30"
                x2="100"
                y2="42"
                transform={`rotate(${index * 30} 100 84)`}
              />
            ))}
          </g>
          <path
            className="sa-line sa-spiral"
            d="M100 84C106 84 110 89 110 95C110 103 103 109 94 109C82 109 74 100 74 88C74 72 88 60 104 60C124 60 138 78 138 96C138 116 121 132 100 132C75 132 55 113 55 86C55 55 80 30 110 30C142 30 166 55 166 86"
          />
          <circle className="sa-accent" cx="100" cy="84" r="3" />
        </svg>
      )

    case 'trilobite':
      return (
        <svg
          className="sa"
          viewBox="0 0 200 160"
          aria-hidden="true"
          focusable="false"
        >
          <path
            className="sa-fill sa-fill--moss"
            d="M100 24C124 24 142 40 146 62C148 72 147 82 143 92C138 104 126 114 114 120L100 136L86 120C74 114 62 104 57 92C53 82 52 72 54 62C58 40 76 24 100 24Z"
          />
          <g className="sa-line sa-thin">
            <path d="M100 56V126" />
            <path d="M58 60C78 54 122 54 142 60" />
            <path d="M62 72C82 68 118 68 138 72" />
            <path d="M58 84C80 80 120 80 142 84" />
            <path d="M60 96C82 92 118 92 140 96" />
            <path d="M66 108C84 104 116 104 134 108" />
            <path d="M76 118C88 114 112 114 124 118" />
            <path d="M90 52L78 34" />
            <path d="M110 52L122 34" />
            <path d="M58 78L44 84" />
            <path d="M56 90L42 96" />
            <path d="M58 102L45 110" />
            <path d="M64 112L54 120" />
            <path d="M142 78L156 84" />
            <path d="M144 90L158 96" />
            <path d="M142 102L155 110" />
            <path d="M136 112L146 120" />
          </g>
          <circle className="sa-eye" cx="84" cy="54" r="5" />
          <circle className="sa-eye" cx="116" cy="54" r="5" />
        </svg>
      )

    case 'tooth':
      return (
        <svg
          className="sa"
          viewBox="0 0 200 160"
          aria-hidden="true"
          focusable="false"
        >
          <path
            className="sa-fill sa-fill--sand"
            d="M100 18C112 32 126 52 132 74C138 98 132 124 100 146C68 124 62 98 68 74C74 52 88 32 100 18Z"
          />
          <g className="sa-line sa-thin">
            <path d="M84 48L78 56M77 64L71 71M72 82L66 88M69 100L64 106M70 116L66 121M77 130L73 134" />
            <path d="M116 48L122 56M123 64L129 71M128 82L134 88M131 100L136 106M130 116L134 121M123 130L127 134" />
            <path d="M78 120C88 126 112 126 122 120" />
            <path d="M100 118L94 132" />
            <path d="M100 118L106 132" />
          </g>
          <path
            className="sa-line sa-line--bone sa-thin"
            d="M84 46C90 60 94 74 94 90"
          />
        </svg>
      )

    case 'vertebra':
      return (
        <svg
          className="sa"
          viewBox="0 0 200 160"
          aria-hidden="true"
          focusable="false"
        >
          <path
            className="sa-fill sa-fill--bone"
            d="M100 30C108 30 114 38 114 49V64C132 60 148 66 156 78C160 86 158 94 150 98L126 104C126 114 118 122 108 124C104 132 96 132 92 124C82 122 74 114 74 104L50 98C42 94 40 86 44 78C52 66 68 60 86 64V49C86 38 92 30 100 30Z"
          />
          <ellipse className="sa-hole" cx="100" cy="84" rx="13" ry="16" />
          <g className="sa-line sa-thin">
            <path d="M78 72C74 78 74 88 80 96" />
            <path d="M122 72C126 78 126 88 120 96" />
            <path d="M88 60C90 66 90 72 88 78" />
            <path d="M112 60C110 66 110 72 112 78" />
            <path d="M92 112C96 108 104 108 108 112" />
          </g>
        </svg>
      )

    case 'loupe':
      return (
        <svg
          className="sa"
          viewBox="0 0 200 160"
          aria-hidden="true"
          focusable="false"
        >
          <path
            className="sa-brass-outline"
            d="M124 96L154 134"
          />
          <path className="sa-brass" d="M124 96L154 134" />
          <circle
            className="sa-line sa-brass-ring"
            cx="88"
            cy="72"
            r="42"
            fill="none"
          />
          <circle
            className="sa-line sa-thin"
            cx="88"
            cy="72"
            r="35"
            fill="none"
          />
          <circle className="sa-lens" cx="88" cy="72" r="33" />
          <g className="sa-line sa-thin sa-lens-lines">
            <path d="M88 42V102" />
            <path d="M58 72H118" />
          </g>
          <path
            className="sa-line sa-line--bone sa-thin"
            d="M68 52C76 46 86 44 94 46"
          />
        </svg>
      )

    case 'notebook':
      return (
        <svg
          className="sa"
          viewBox="0 0 200 160"
          aria-hidden="true"
          focusable="false"
        >
          <rect
            className="sa-fill sa-fill--peat"
            x="58"
            y="18"
            width="84"
            height="124"
            rx="3"
          />
          <rect
            className="sa-fill sa-fill--peat-soft"
            x="58"
            y="18"
            width="11"
            height="124"
          />
          <rect
            className="sa-fill"
            x="80"
            y="54"
            width="44"
            height="30"
          />
          <g className="sa-line sa-thin">
            <path d="M88 64H116" />
            <path d="M88 72H110" />
          </g>
          <line
            className="sa-band"
            x1="128"
            y1="18"
            x2="128"
            y2="142"
          />
          <path className="sa-accent" d="M133 130L143 130L143 142Z" />
          <g className="sa-accent">
            <circle cx="94" cy="108" r="2.6" />
            <circle cx="103" cy="106" r="2.6" />
            <circle cx="112" cy="108" r="2.6" />
            <path d="M94 114C98 118 108 118 112 114C110 110 96 110 94 114Z" />
          </g>
        </svg>
      )

    case 'amber':
      return (
        <svg
          className="sa"
          viewBox="0 0 200 160"
          aria-hidden="true"
          focusable="false"
        >
          <g className="sa-line sa-thin">
            <path d="M68 14C80 38 90 50 100 62C110 50 120 38 132 14" />
            <circle cx="100" cy="62" r="5" />
          </g>
          <path
            className="sa-fill sa-fill--accent"
            d="M100 68C121 83 131 96 127 112C124 128 110 137 100 140C90 137 76 128 73 112C69 96 79 83 100 68Z"
          />
          <path
            className="sa-line sa-line--bone sa-thin"
            d="M86 92C82 102 82 112 88 120"
          />
          <ellipse
            className="sa-inclusion"
            cx="100"
            cy="106"
            rx="2.6"
            ry="6"
            transform="rotate(18 100 106)"
          />
          <g className="sa-line sa-thin">
            <path d="M96 100L91 96" />
            <path d="M104 100L109 96" />
            <path d="M96 112L91 116" />
            <path d="M104 112L109 116" />
          </g>
        </svg>
      )

    case 'print':
      return (
        <svg
          className="sa"
          viewBox="0 0 200 160"
          aria-hidden="true"
          focusable="false"
        >
          <rect className="sa-fill" x="40" y="16" width="120" height="128" />
          <rect
            className="sa-fill sa-fill--chalk"
            x="50"
            y="26"
            width="100"
            height="108"
          />
          <rect
            className="sa-fill sa-fill--chalk-deep"
            x="50"
            y="26"
            width="100"
            height="52"
          />
          <circle
            className="sa-fill sa-fill--accent"
            cx="120"
            cy="52"
            r="11"
          />
          <rect
            className="sa-fill sa-fill--moss"
            x="50"
            y="78"
            width="100"
            height="14"
          />
          <rect
            className="sa-fill sa-fill--sand"
            x="50"
            y="92"
            width="100"
            height="12"
          />
          <rect
            className="sa-fill sa-fill--peat"
            x="50"
            y="104"
            width="100"
            height="16"
          />
          <rect
            className="sa-fill sa-fill--bone"
            x="50"
            y="120"
            width="100"
            height="14"
          />
          <path
            className="sa-fill sa-fill--peat"
            d="M64 80C70 80 75 78 79 74C81 71 83 69 86 67L88 70L86 73C90 74 92 77 92 81L89 81L89 78C85 80 80 81 77 81L77 85L74 85L74 81L68 81L68 85L65 85L65 81L62 81Z"
          />
          <rect
            className="sa-line sa-thin"
            x="50"
            y="26"
            width="100"
            height="108"
            fill="none"
          />
        </svg>
      )

    default:
      return null
  }
}
