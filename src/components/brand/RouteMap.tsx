// Topographic contours and a waypoint trail for the job cover.
export default function RouteMap() {
  const rings = (
    cx: number,
    cy: number,
    count: number,
    sx: number,
    sy: number,
    phase: number,
  ) =>
    Array.from({ length: count }, (_, i) => {
      const r = 8 + i * 7
      const points =
        Array.from({ length: 151 }, (_, j) => {
          const a = (j * Math.PI) / 75
          const q =
            1 +
            0.13 * Math.sin(a * 3 + phase) +
            0.07 * Math.cos(a * 5 + phase + i * 0.025) +
            0.045 * Math.sin(a * 7)
          return (
            (j ? 'L' : 'M') +
            (cx + Math.cos(a) * r * q * sx).toFixed(1) +
            ',' +
            (cy + Math.sin(a) * r * q * sy).toFixed(1)
          )
        }).join(' ') + 'Z'
      return (
        <path
          key={i}
          d={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={i % 5 === 0 ? 1.35 : 0.8}
        />
      )
    })
  return (
    <svg
      className="route-map"
      viewBox="0 0 470 175"
      aria-hidden="true"
      preserveAspectRatio="xMidYMin slice"
    >
      <g color="#83bcff" opacity=".36">
        {rings(350, 190, 32, 1.12, 0.67, 0.7)}
      </g>
      <g color="#b2ceff" opacity=".22">
        {rings(110, -75, 23, 1.15, 0.7, 2)}
      </g>
      <path
        d="M91 156 C103 115 146 132 174 113 S151 78 206 79 S250 108 277 84 S304 47 351 49"
        fill="none"
        stroke="#e0efff"
        strokeWidth="2"
        strokeDasharray="4 6"
        strokeLinecap="round"
      />
      <g fill="#fff">
        <circle cx="91" cy="156" r="4" />
        <circle cx="206" cy="79" r="4" />
        <circle cx="277" cy="84" r="4" />
      </g>
      <ellipse cx="351" cy="58" rx="15" ry="5" fill="#033998" opacity=".32" />
      <path
        d="M351 56s-12-13-12-21a12 12 0 0 1 24 0c0 8-12 21-12 21Z"
        fill="#f5fbff"
      />
      <circle cx="351" cy="35" r="4.5" fill="#346bed" />
    </svg>
  )
}
