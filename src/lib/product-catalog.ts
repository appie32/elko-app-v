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
