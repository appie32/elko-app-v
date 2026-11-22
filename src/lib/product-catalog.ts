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

// De gaaskeuzes zijn productgebonden. Bestaande offertes/snapshots wijzigen niet.
export const STANDARD_MESH = 'Standaard horgaas'
export const PREMIUM_MESH = 'Premium / pollenwerend gaas'
export const PETSCREEN_MESH = 'Petscreen'
export function getMeshOptions(product: string): string[] {
  const name = getProductNameForPicker(product)
  if (name === 'Klikplissé raamhor') return [STANDARD_MESH]
  if (name === 'Luxe schuifhordeur') return [PETSCREEN_MESH]
  if (name === 'Scharnierhordeur') return [STANDARD_MESH, PREMIUM_MESH, PETSCREEN_MESH]
  if (['Opbouw plissé raamhor', 'Dakraamhor', 'Enkele plissé hordeur',
    'Dubbele plissé hordeur', 'Duo opbouw plissé raamhor', 'Plissé & hor'].includes(name)) {
    return [STANDARD_MESH, PREMIUM_MESH]
  }
  return []
}

export function defaultFinishForColor(color: string): 'Mat' | 'Glans' {
  // Wit RAL 9016 wordt standaard glans; overige bekende kleuren standaard mat.
  return color.includes('9016') ? 'Glans' : 'Mat'
}

export function suggestedPriceForSelection(productName: string, options: ProductOptions, width?: string | number, height?: string | number): number | null {
  const name = getProductNameForPicker(productName)
  const selectedColor = String(options.profile_color || '')
  const standard = /RAL\s*(9016|7016)\b/.test(selectedColor)
  const mesh = String(options.mesh_type || '').toLowerCase()
  const premium = /premium|pollenwerend|anti[- ]?pollen/.test(mesh)
  switch (name) {
    case 'Klikplissé raamhor':
    case 'Opbouw plissé raamhor': return 167.50
    case 'Dakraamhor': {
      const w = Number(width), h = Number(height)
      if (!(w > 0 && h > 0)) return null
      return (w * h <= 1_000_000) ? 150 : 167.50
    }
    case 'Enkele plissé hordeur': return (standard ? 275 : 300) + (premium ? 25 : 0)
    case 'Dubbele plissé hordeur': return 595 + (standard ? 0 : 50) + (premium ? 50 : 0)
    default: return null
  }
}


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
  return getMeshOptions(name).length > 0
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
  profile_finish?: string
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
    profile_width: 'Breed profiel 4 cm', profile_finish: 'Glans',
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
  return suggestedPriceForSelection(name, startingOptions())
}

/** Product-specifieke profielkeuze: geen misleidende 3/4 cm-optie bij andere systemen. */
export function profileWidthMode(name: string): 'select' | 'fixed4' | 'none' {
  if (['Opbouw plissé raamhor','Duo opbouw plissé raamhor','Dakraamhor',
    'Plissé in frame','Plissé & hor','Veranda plissé','Dakraam plissé'].includes(name)) return 'select'
  if (['Enkele plissé hordeur','Dubbele plissé hordeur'].includes(name)) return 'fixed4'
  return 'none'
}

export function hasProfileFinish(name: string): boolean {
  return getGroupForProduct(name) === 'Horren' || profileWidthMode(name) !== 'none'
}

export function preferredProfileWidth(name: string): string {
  return profileWidthMode(name) === 'fixed4' ? 'Breed profiel 4 cm'
    : profileWidthMode(name) === 'select' ? 'Breed profiel 4 cm' : ''
}

function isSpecified(value: unknown): value is string {
  return typeof value === 'string' && !!value.trim() && !/^(nog te bepalen|n\.?t\.?b\.?|geen)$/i.test(value.trim())
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
  const add = (label: string, value?: string) => {
    if (isSpecified(value)) details.push(`${label}: ${value.trim()}`)
  }
  add('Ruimte', room)
  if (width && height) details.push(`Maat: ${width} × ${height} mm`)
  const color = o.profile_color === 'RAL-kleur op maat'
    ? (ralCode.trim() ? `RAL ${ralCode.replace(/RAL\s*/i,'').trim()}` : '') : (o.profile_color || '')
  if (group === 'Horren') {
    add('Profielkleur', color)
    if (hasProfileFinish(product)) add('Afwerking', o.profile_finish)
    if (profileWidthMode(product) === 'select') add('Profiel', o.profile_width)
    if (profileWidthMode(product) === 'fixed4') details.push('Profiel: 4 cm')
    if (usesMesh(product)) add('Gaas', o.mesh_type)
    if (isHorDoor(product)) {
      add('Onderprofiel', o.bottom_profile_type)
      add('Onderprofielkleur', o.bottom_profile_color)
    }
    if (product === 'Duo opbouw plissé raamhor') {
      add('Stofuitvoering', o.light_control)
      add('Stofkleur', o.fabric_color)
    }
  }
  if (group === 'Plisségordijnen') {
    if (profileWidthMode(product) !== 'none') {
      add('Profielkleur', color)
      add('Afwerking', o.profile_finish)
      add('Profiel', o.profile_width)
    }
    add('Stof/collectie', o.fabric_type)
    add('Stofkleur / kleurnummer', o.fabric_color)
    add('Lichtregeling', o.light_control)
    add('Bediening', o.operation)
    add('Montagewijze', o.mounting)
    if (product === 'Plissé & hor') add('Gaas', o.mesh_type)
  }
  if (group === 'Screens' || group === 'Rolluiken') {
    add('Kast/geleiderkleur', color)
    add('Kast', o.cassette)
    add('Geleiders', o.guides)
    if (group === 'Screens') {
      add('Doek/collectie', o.screen_fabric)
      add('Doekkleur', o.screen_fabric_color)
    }
    if (group === 'Rolluiken') add('Lamellen', o.shutter_slats)
    add('Motor', o.motor_brand)
    add('Bediening', o.operation)
    add('Montage', o.mounting)
  }
  if (isSpecified(o.notes_extra)) details.push(o.notes_extra.trim())
  return details.join(' | ') || product
}
