import { useId } from 'react';

/** Original lightweight wheel artwork. Pointer input remains owned by the surrounding pad. */
export function CockpitWheel() {
  const id = useId(), rim = `${id}-rim`, metal = `${id}-metal`, hub = `${id}-hub`, grip = `${id}-grip`;
  return <svg className="cockpit-wheel-art" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={rim} x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#638087" /><stop offset=".18" stopColor="#24464f" /><stop offset=".52" stopColor="#102c37" /><stop offset=".82" stopColor="#36565d" /><stop offset="1" stopColor="#102b34" /></linearGradient>
      <linearGradient id={metal} x1="0" y1="0" x2=".85" y2="1"><stop stopColor="#b2c6bc" /><stop offset=".3" stopColor="#6d8987" /><stop offset=".52" stopColor="#36565e" /><stop offset="1" stopColor="#173b46" /></linearGradient>
      <radialGradient id={hub} cx=".4" cy=".3" r=".8"><stop stopColor="#41646a" /><stop offset="1" stopColor="#153641" /></radialGradient>
      <pattern id={grip} width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".8" fill="#061f2b" opacity=".55" /><circle cx="2" cy="3" r=".65" fill="#9bb0a6" opacity=".18" /></pattern>
    </defs>
    <circle cx="120" cy="121" r="107" fill="none" stroke="#071f29" strokeWidth="27" />
    <circle cx="120" cy="118" r="104" fill="none" stroke={`url(#${rim})`} strokeWidth="23" />
    <circle cx="120" cy="118" r="116" fill="none" stroke="#9fb9b0" strokeOpacity=".22" strokeWidth="1.3" />
    <circle cx="120" cy="118" r="91" fill="none" stroke="#c4d5c0" strokeOpacity=".23" strokeWidth="1.2" />
    <path d="M25 76a104 104 0 0 0 0 84m190-84a104 104 0 0 1 0 84" fill="none" stroke={`url(#${grip})`} strokeWidth="22" />
    <path d="m29 99 65 10 26 8 26-8 65-10-5 28-62 10-13 69h-22l-13-69-62-10-5-28Z" fill={`url(#${metal})`} stroke="#9ab4ac" strokeOpacity=".35" strokeWidth="1.2" />
    <path d="m42 107 51 8m54 0 51-8m-78 39v49" fill="none" stroke="#c6d4bc" strokeOpacity=".15" strokeWidth="2" />
    <circle cx="120" cy="119" r="42" fill="#102e39" stroke="#718e88" strokeWidth="1.5" />
    <circle cx="120" cy="119" r="34" fill={`url(#${hub})`} stroke="#071f2b" strokeWidth="2" />
    <path d="M105 107h31l-2 7h-11l-6 20h-8l6-20h-12l2-7Z" fill="#ffda86" />
    <path d="M110 14h20" stroke="#b58843" strokeWidth="9" strokeLinecap="round" /><path d="M110 12h20" stroke="#ffe0a0" strokeWidth="7" strokeLinecap="round" />
    {[[-31, 0], [31, 0], [0, 31]].map(([x, y]) => <g key={`${x}:${y}`}><circle cx={120 + x} cy={119 + y} r="2.2" fill="#0a2530" /><path d={`m${119 + x} ${119 + y}h2`} stroke="#829890" strokeWidth=".7" /></g>)}
  </svg>;
}
