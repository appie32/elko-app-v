'use client'

import { useEffect, useState } from 'react'
import ProductPictogram from '@/components/ProductPictogram'

// Foto's van de ELKO-website kunnen later één-op-één in public/elko-producten/
// worden gezet. Bij afwezigheid blijft het bestaande pictogram zichtbaar.
// Er worden geen onbevestigde externe foto-URL's gebruikt.
const images: Record<string, string> = {
  'Klikplissé raamhor': 'klikplisse-raamhor.webp',
  'Opbouw plissé raamhor': 'opbouw-plisse-raamhor.webp',
  'Dakraamhor': 'dakraamhor.webp',
  'Enkele plissé hordeur': 'enkele-plisse-hordeur.webp',
  'Dubbele plissé hordeur': 'dubbele-plisse-hordeur.webp',
  'Luxe schuifhordeur': 'luxe-schuifhordeur.webp',
  'Scharnierhordeur': 'scharnierhordeur.webp',
  'Duo opbouw plissé raamhor': 'duo-opbouw-plisse-raamhor.webp',
  'Plisségordijnen': 'plissegordijnen.webp',
  'Plissé in frame': 'plisse-in-frame.webp',
  'Duo / Day & Night plissé': 'duo-day-night-plisse.webp',
  'Plissé & hor': 'plisse-en-hor.webp',
  'Veranda plissé': 'veranda-plisse.webp',
  'Dakraam plissé': 'dakraam-plisse.webp',
  'Solar screens': 'solar-screen.webp',
  'Elektrische screens': 'elektrisch-screen.webp',
  'Solar rolluiken': 'solar-rolluik.webp',
  'Elektrische rolluiken': 'elektrisch-rolluik.webp',
}

type Props = { group: string; product?: string; size?: number }
export default function ProductThumbnail({ group, product, size = 42 }: Props) {
  const [failed, setFailed] = useState(false)
  const filename = product ? images[product] : undefined
  useEffect(() => { setFailed(false) }, [filename])
  if (!filename || failed) return <ProductPictogram group={group} product={product} size={size}/>
  return <img src={`/elko-producten/${filename}`} width={size} height={size}
    onError={() => setFailed(true)} alt="" loading="lazy"
    style={{ width:size, height:size, objectFit:'cover', borderRadius:7, border:'1px solid #e8e1d8', flexShrink:0 }} />
}
