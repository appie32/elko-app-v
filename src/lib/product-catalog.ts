/** ELKO productnamen overgenomen van elkosolutions.nl, november 2026. */
export const PRODUCT_GROUPS = [
  { key: 'Horren', icon: '🪟', products: [
    'Klikplissé raamhor',
    'Opbouw plissé raamhor',
    'Dakraamhor',
    'Enkele plissé hordeur',
    'Dubbele plissé hordeur',
    'Luxe schuifhordeur',
    'Scharnierhordeur',
    'Duo opbouw plissé raamhor',
  ] },
  { key: 'Plisségordijnen', icon: '🪟', products: [
    'Plisségordijnen',
    'Plissé in frame',
    'Duo / Day & Night plissé',
    'Plissé & hor',
    'Veranda plissé',
    'Dakraam plissé',
  ] },
  { key: 'Screens', icon: '☀️', products: [
    'Solar screens',
    'Elektrische screens',
  ] },
  { key: 'Rolluiken', icon: '🏠', products: [
    'Solar rolluiken',
    'Elektrische rolluiken',
  ] },
  { key: 'Overig', icon: '🛠️', products: [
    'Extra werkzaamheden', 'Overig',
  ] },
] as const

export type ProductGroup = (typeof PRODUCT_GROUPS)[number]['key']

/** Oude productnamen blijven herkenbaar en bewerkbaar. */
const legacyNames: Record<string, string> = {
  'Klik-plissé raamhor': 'Klikplissé raamhor',
  'Klik-plissé raamhor op maat': 'Klikplissé raamhor',
  'Raamhor op maat': 'Opbouw plissé raamhor',
  'Enkele plissé hordeur op maat': 'Enkele plissé hordeur',
  'Dubbele plissé hordeur op maat': 'Dubbele plissé hordeur',
  'Schuifpui plissé hordeur': 'Luxe schuifhordeur',
  'Schuifpui plissé hordeur op maat': 'Luxe schuifhordeur',
  'Dakraamhor op maat': 'Dakraamhor',
  'Voorzethor op maat': 'Opbouw plissé raamhor',
}

export function getGroupForProduct(productName: string): ProductGroup {
  for (const group of PRODUCT_GROUPS) {
    if ((group.products as readonly string[]).includes(productName)) return group.key
  }
  const name = productName.toLowerCase()
  if (/hor|raamhor|hordeur|schuifpui/.test(name)) return 'Horren'
  if (/gordijn|plissé|plisse/.test(name)) return 'Plisségordijnen'
  if (/screen/.test(name)) return 'Screens'
  if (/rolluik/.test(name)) return 'Rolluiken'
  return 'Overig'
}

export function getProductNameForPicker(value: string): string {
  return legacyNames[value] || value
}

export function productsForGroup(groupKey: ProductGroup): string[] {
  return [...(PRODUCT_GROUPS.find(group => group.key === groupKey)?.products || [])]
}

export function isHorDoor(name: string): boolean {
  return ['Enkele plissé hordeur', 'Dubbele plissé hordeur', 'Luxe schuifhordeur', 'Scharnierhordeur'].includes(name)
}

export function usesMesh(name: string): boolean {
  return getGroupForProduct(name) === 'Horren' || name === 'Plissé & hor'
}

export const PROFILE_COLORS = [
  { label: 'Wit RAL 9016', value: 'Wit — RAL 9016', hex: '#f6f7f4' },
  { label: 'Antraciet RAL 7016', value: 'Antraciet — RAL 7016', hex: '#383e42' },
  { label: 'Zwart RAL 9005', value: 'Zwart — RAL 9005', hex: '#111111' },
  { label: 'Zuiver wit RAL 9010', value: 'Zuiver wit — RAL 9010', hex: '#f1efe4' },
  { label: 'Crèmewit RAL 9001', value: 'Crèmewit — RAL 9001', hex: '#e9dfc7' },
  { label: 'Sepiabruin RAL 8019', value: 'Sepiabruin — RAL 8019', hex: '#3f342f' },
  { label: 'Eigen RAL-kleur', value: 'RAL-kleur op maat', hex: '#c8c0b6' },
]

export type ProductOptions = {
  profile_color?: string
  profile_width?: string
  mesh_type?: string
  bottom_profile_type?: string
  bottom_profile_color?: string
  fabric_color?: string
  fabric_type?: string
  light_control?: string
  operation?: string
  mounting?: string
  screen_fabric?: string
  screen_fabric_color?: string
  cassette?: string
  guides?: string
  motor_brand?: string
  shutter_slats?: string
  notes_extra?: string
}

export function startingOptions(): ProductOptions {
  return {
    profile_color: 'Wit — RAL 9016',
    profile_width: 'Standaard profiel 4 cm',
    mesh_type: 'Standaard horgaas',
    bottom_profile_type: 'Laag onderprofiel',
    bottom_profile_color: 'Wit',
    fabric_color: '', fabric_type: '', light_control: 'Lichtdoorlatend',
    operation: 'Nog te bepalen', mounting: 'Nog te bepalen',
    screen_fabric: '', screen_fabric_color: '', cassette: '', guides: '', motor_brand: 'Nog te bepalen',
    shutter_slats: '', notes_extra: '',
  }
}

export function suggestedPrice(name: string): number | null {
  // Alleen beperkte, bekende richtprijzen. Overige producten hebben een handmatig offertebedrag.
  const prices: Record<string, number> = {
    'Klikplissé raamhor': 150,
    'Opbouw plissé raamhor': 150,
    'Enkele plissé hordeur': 300,
    'Dubbele plissé hordeur': 595,
  }
  return prices[name] ?? null
}

export function buildProductDescription(input: {
  product: string
  room: string
  width: string
  height: string
  options: ProductOptions
  ralCode: string
}): string {
  const { product, room, width, height, options: o, ralCode } = input
  if (product === 'Extra werkzaamheden' || product === 'Overig') return o.notes_extra?.trim() || product
  const group = getGroupForProduct(product)
  const details: string[] = []
  if (room.trim()) details.push(`Ruimte: ${room.trim()}`)
  if (width && height) details.push(`Maat: ${width} × ${height} mm`)
  if (group === 'Horren') {
    const color = o.profile_color === 'RAL-kleur op maat' ? (ralCode || 'eigen RAL-kleur') : (o.profile_color || '')
    if (color) details.push(`Profielkleur: ${color}`)
    if (o.profile_width) details.push(`Profiel: ${o.profile_width}`)
    if (usesMesh(product) && o.mesh_type) details.push(`Gaas: ${o.mesh_type}`)
    if (isHorDoor(product)) {
      details.push(`Onderprofiel: ${o.bottom_profile_type || 'nog te bepalen'} (${o.bottom_profile_color || 'kleur n.t.b.'})`)
    }
    if (product === 'Duo opbouw plissé raamhor' && o.light_control) details.push(`Stof: ${o.light_control}`)
    if (product === 'Duo opbouw plissé raamhor' && o.fabric_color) details.push(`Stofkleur: ${o.fabric_color}`)
  }
  if (group === 'Plisségordijnen') {
    if (o.fabric_color) details.push(`Stofkleur: ${o.fabric_color}`)
    if (o.fabric_type) details.push(`Stof/collectie: ${o.fabric_type}`)
    if (o.light_control) details.push(`Lichtregeling: ${o.light_control}`)
    if (o.operation) details.push(`Bediening: ${o.operation}`)
    if (o.mounting) details.push(`Montage: ${o.mounting}`)
    if (product === 'Plissé & hor' && o.mesh_type) details.push(`Gaas: ${o.mesh_type}`)
  }
  if (group === 'Screens' || group === 'Rolluiken') {
    const color = o.profile_color === 'RAL-kleur op maat' ? (ralCode || 'eigen RAL-kleur') : (o.profile_color || '')
    if (color) details.push(`Kast/geleiderkleur: ${color}`)
    if (o.cassette) details.push(`Kast: ${o.cassette}`)
    if (o.guides) details.push(`Geleiders: ${o.guides}`)
    if (group === 'Screens') {
      if (o.screen_fabric) details.push(`Doek/collectie: ${o.screen_fabric}`)
      if (o.screen_fabric_color) details.push(`Doekkleur: ${o.screen_fabric_color}`)
    }
    if (group === 'Rolluiken' && o.shutter_slats) details.push(`Lamellen: ${o.shutter_slats}`)
    if (o.motor_brand) details.push(`Motor: ${o.motor_brand}`)
    if (o.operation) details.push(`Bediening: ${o.operation}`)
    if (o.mounting) details.push(`Montage: ${o.mounting}`)
  }
  if (o.notes_extra?.trim()) details.push(o.notes_extra.trim())
  return details.join(' · ') || product
}
