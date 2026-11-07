/**
 * A little robot that floats around looking for the page with a magnifying glass.
 * Pure SVG + CSS (no image, no library), and it stands still for people who asked their device for less motion.
 */
export default function LostRobot({ className = '' }) {
  const stars = [[22, 40, 0], [212, 34, 0.6], [34, 150, 1.1], [206, 140, 1.7], [120, 12, 0.3], [64, 18, 1.4], [178, 18, 0.9]];
  return (
    <div className={className} aria-hidden="true">
      <style>{`
        .lr-float{animation:lr-float 3.4s ease-in-out infinite}
        .lr-shadow{transform-box:fill-box;transform-origin:center;animation:lr-shadow 3.4s ease-in-out infinite}
        .lr-antenna{transform-box:fill-box;transform-origin:50% 100%;animation:lr-wobble 2.2s ease-in-out infinite}
        .lr-bulb{animation:lr-pulse 1.4s ease-in-out infinite}
        .lr-eye{transform-box:fill-box;transform-origin:center;animation:lr-blink 4.2s infinite}
        .lr-arm{transform-box:fill-box;transform-origin:90% 15%;animation:lr-wave 1.8s ease-in-out infinite}
        .lr-lens{transform-box:fill-box;transform-origin:20% 80%;animation:lr-search 3.6s ease-in-out infinite}
        .lr-flame{transform-box:fill-box;transform-origin:50% 0;animation:lr-flame .35s ease-in-out infinite alternate}
        .lr-star{transform-box:fill-box;transform-origin:center;animation:lr-twinkle 2.6s ease-in-out infinite}
        .lr-q{animation:lr-bob 2.4s ease-in-out infinite}
        @keyframes lr-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
        @keyframes lr-shadow{0%,100%{transform:scaleX(1);opacity:.28}50%{transform:scaleX(.78);opacity:.16}}
        @keyframes lr-wobble{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}
        @keyframes lr-pulse{0%,100%{opacity:1}50%{opacity:.45}}
        @keyframes lr-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
        @keyframes lr-wave{0%,100%{transform:rotate(-14deg)}50%{transform:rotate(16deg)}}
        @keyframes lr-search{0%,100%{transform:rotate(-12deg)}50%{transform:rotate(14deg)}}
        @keyframes lr-flame{from{transform:scaleY(.7)}to{transform:scaleY(1.25)}}
        @keyframes lr-twinkle{0%,100%{opacity:.25;transform:scale(.7)}50%{opacity:1;transform:scale(1.15)}}
        @keyframes lr-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @media (prefers-reduced-motion: reduce){.lr-float,.lr-shadow,.lr-antenna,.lr-bulb,.lr-eye,.lr-arm,.lr-lens,.lr-flame,.lr-star,.lr-q{animation:none}}
      `}</style>
      <svg viewBox="0 0 240 230" className="mx-auto h-auto w-[min(70vw,15rem)] overflow-visible" role="presentation" focusable="false">
        <defs>
          <linearGradient id="lr-body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2E7BFF" /><stop offset="1" stopColor="#1F4FD8" /></linearGradient>
          <linearGradient id="lr-head" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4A90FF" /><stop offset="1" stopColor="#17A2D8" /></linearGradient>
          <radialGradient id="lr-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#35D989" stopOpacity=".9" /><stop offset="1" stopColor="#35D989" stopOpacity="0" /></radialGradient>
        </defs>

        {stars.map(([x, y, d], i) => (
          <path key={i} className="lr-star" style={{ animationDelay: `${d}s` }} d={`M${x} ${y - 5} L${x + 1.6} ${y - 1.6} L${x + 5} ${y} L${x + 1.6} ${y + 1.6} L${x} ${y + 5} L${x - 1.6} ${y + 1.6} L${x - 5} ${y} L${x - 1.6} ${y - 1.6}Z`} fill="#FFD166" />
        ))}

        <ellipse className="lr-shadow" cx="120" cy="214" rx="48" ry="7" fill="#06113A" />

        <g className="lr-float">
          {/* jets */}
          <g className="lr-flame"><path d="M98 188 Q102 208 106 188Z" fill="#FF9F43" /><path d="M134 188 Q138 208 142 188Z" fill="#FF9F43" /></g>
          {/* body */}
          <rect x="82" y="124" width="76" height="66" rx="26" fill="url(#lr-body)" />
          <rect x="102" y="142" width="36" height="22" rx="11" fill="#06113A" opacity=".35" />
          <circle cx="120" cy="153" r="6" fill="#35D989" /><circle cx="120" cy="153" r="13" fill="url(#lr-glow)" />
          {/* left arm waves */}
          <g className="lr-arm"><rect x="56" y="132" width="30" height="14" rx="7" fill="#2E7BFF" /><circle cx="56" cy="139" r="8" fill="#E8F0FF" /></g>
          {/* right arm holds the magnifying glass */}
          <g className="lr-lens">
            <rect x="152" y="136" width="30" height="14" rx="7" fill="#2E7BFF" />
            <line x1="188" y1="150" x2="210" y2="176" stroke="#7A4B2A" strokeWidth="7" strokeLinecap="round" />
            <circle cx="182" cy="140" r="17" fill="#CFEFFF" fillOpacity=".55" stroke="#0B2A78" strokeWidth="5" />
            <path d="M174 133 Q178 128 185 128" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".9" />
          </g>
          {/* head */}
          <g className="lr-antenna"><line x1="120" y1="64" x2="120" y2="42" stroke="#0B2A78" strokeWidth="5" strokeLinecap="round" /><circle className="lr-bulb" cx="120" cy="38" r="8" fill="#FF6B8A" /></g>
          <rect x="72" y="62" width="96" height="76" rx="30" fill="url(#lr-head)" />
          <rect x="84" y="76" width="72" height="46" rx="20" fill="#06113A" />
          <ellipse className="lr-eye" cx="104" cy="96" rx="8.5" ry="10.5" fill="#7CF0B2" />
          <ellipse className="lr-eye" cx="136" cy="96" rx="8.5" ry="10.5" fill="#7CF0B2" />
          <circle cx="107" cy="92" r="2.6" fill="#fff" /><circle cx="139" cy="92" r="2.6" fill="#fff" />
          <path d="M112 112 Q120 106 128 112" stroke="#7CF0B2" strokeWidth="3.4" strokeLinecap="round" fill="none" />
          <circle cx="76" cy="100" r="6" fill="#0B2A78" /><circle cx="164" cy="100" r="6" fill="#0B2A78" />
        </g>

        <text className="lr-q" x="30" y="92" fontSize="26" fontWeight="700" fill="#17A2D8" style={{ animationDelay: '.2s' }}>?</text>
        <text className="lr-q" x="198" y="96" fontSize="20" fontWeight="700" fill="#8B5CF6" style={{ animationDelay: '1s' }}>?</text>
      </svg>
    </div>
  );
}
