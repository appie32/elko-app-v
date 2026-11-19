'use client'

import type { CSSProperties } from 'react'

type Props = {
  group: string
  product?: string
  size?: number
  style?: CSSProperties
}

/** Eigen vectorpictogrammen: scherp op telefoon/tablet en geen externe afbeeldings-URL nodig. */
export default function ProductPictogram({ group, product = '', size = 45, style }: Props) {
  const p = product.toLowerCase()
  const isHor = group === 'Horren'
  const isFabric = group === 'Plisségordijnen'
  const isDoor = /deur|schuif/.test(p)
  const isRoof = /dakraam/.test(p)
  const isDuo = /duo|day.*night|pliss[eé] & hor/.test(p)
  const stroke = '#23384a'
  const accent = '#B89B5E'
  const muted = '#90a3b0'
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true"
      style={{ flexShrink: 0, display: 'block', ...style }} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="60" height="60" rx="11" fill="#F7F4EF" />
      {group === 'Overig' ? <>
        <path d="M21 18l7 7-5 5-7-7a12 12 0 0 0 14 16l12 12 8-8-12-12a12 12 0 0 0-17-13Z" stroke={stroke} strokeWidth="2.5" />
        <circle cx="45" cy="45" r="2.5" fill={accent}/>
      </> : <>
        {isRoof ? <path d="M10 25 32 8l22 17" stroke={stroke} strokeWidth="3"/> : null}
        <rect x={isDoor?16:12} y={isRoof?25:12} width={isDoor?32:40} height={isRoof?29:40} rx="2" stroke={stroke} strokeWidth="2.7"/>
        {isHor ? <>
          {isDoor ? <>
            <path d="M32 14v37" stroke={accent} strokeWidth="2"/>
            {Array.from({length:6},(_,i)=><path key={i} d={`M${19+i*4.8} 17v32`} stroke={muted} strokeWidth=".9" />)}
            <circle cx="29" cy="33" r="1.8" fill={accent} stroke="none"/>
          </> : <>
            {Array.from({length:8},(_,i)=><path key={i} d={`M15 ${16+i*4.5}h34`} stroke={muted} strokeWidth=".85"/>)}
            {Array.from({length:6},(_,i)=><path key={i} d={`M${16+i*6} 16v33`} stroke={muted} strokeWidth=".7"/>)}
            <path d={isDuo?'M12 33h40':'M31 12v40'} stroke={accent} strokeWidth="2.6" />
          </>}
        </> : isFabric ? <>
          <path d="M17 14v36M47 14v36" stroke={stroke} strokeWidth="1.5"/>
          {Array.from({length:7},(_,i)=><path key={i} d={`M17 ${18+i*4.3}l15 2 15-2`} stroke={i%2?accent:muted} strokeWidth="1.6"/>)}
          {isDuo?<path d="M32 16v33" stroke={accent} strokeWidth="2"/>:null}
        </> : group === 'Screens' ? <>
          <rect x="9" y="9" width="46" height="9" rx="3" fill={stroke} stroke="none"/>
          <path d="M15 18v30h34V18" fill="#DAE2E7" stroke={muted} strokeWidth="1.4"/>
          <path d="M15 23 49 46M15 34 36 48M26 18l23 18" stroke={accent} strokeWidth="1.5"/>
          <path d="M14 49h36" stroke={stroke} strokeWidth="2.5"/>
        </> : <>
          <rect x="9" y="9" width="46" height="9" rx="3" fill={stroke} stroke="none"/>
          {Array.from({length:8},(_,i)=><path key={i} d={`M15 ${21+i*3.4}h34`} stroke={i%2?stroke:muted} strokeWidth="2"/>)}
          <path d="M15 51h34" stroke={accent} strokeWidth="2.5"/>
        </>}
      </>}
    </svg>
  )
}
