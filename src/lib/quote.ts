import type { Customer, Project, ProductLine } from './types'

export function formatEuro(amount: number | string | null | undefined): string {
  const value = Number(amount || 0)
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

export function formatEuroPdf(amount: number | string | null | undefined): string {
  const value = Number(amount || 0)
  return `EUR ${new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`
}

export function productTitle(line: ProductLine): string {
  if (line.product_type === 'Extra werkzaamheden') {
    return line.execution_description || `Extra werkzaamheden - ${line.room}`
  }

  return `${line.product_type} - ${line.room}`
}

export function productDetail(line: ProductLine): string {
  const parts: string[] = []

  if (line.standard_color) parts.push(`kleur profiel: ${line.standard_color.toLowerCase()}`)
  if (line.ral_code) parts.push(`kleur profiel: ${line.ral_code}`)
  if (line.bottom_profile) parts.push(`onderprofiel: ${line.bottom_profile.toLowerCase()}`)
  if (line.mesh_type) parts.push(`gaas: ${line.mesh_type.toLowerCase()}`)
  if (line.width_mm && line.height_mm) parts.push(`maat ca. ${line.width_mm} x ${line.height_mm} mm`)
  if (line.execution_description) parts.push(line.execution_description)
  if (line.customer_note) parts.push(line.customer_note)

  return parts.join(' | ')
}

export function buildProjectSummary(productLines: ProductLine[]): string {
  if (productLines.length === 0) {
    return 'de besproken maatwerkopdracht'
  }

  const counts = new Map<string, number>()
  for (const line of productLines) {
    const key = line.product_type
    counts.set(key, (counts.get(key) || 0) + Number(line.quantity || 1))
  }

  const parts = Array.from(counts.entries()).map(([type, count]) => {
    return `${count} ${type.toLowerCase()}${count > 1 && !type.toLowerCase().endsWith('en') ? 'en' : ''}`
  })

  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} en ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')} en ${parts[parts.length - 1]}`
}

export function buildQuoteText(params: {
  customer: Customer
  project: Project
  productLines: ProductLine[]
  totalAmount: number
}): string {
  const { customer, project, productLines, totalAmount } = params
  const summary = buildProjectSummary(productLines)

  const lines = productLines
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((line) => {
      const detail = productDetail(line)
      return `${productTitle(line)}
${detail}
Aantal: ${line.quantity || 1} | Prijs: ${formatEuro(line.manual_price)} | Totaal: ${formatEuro(Number(line.quantity || 1) * Number(line.manual_price || 0))}`
    })
    .join('\n\n')

  return `Offerte maatwerk horren

Volledig verzorgd: nauwkeurig inmeten, levering en vakkundige montage.

Uitgangspunten

Op basis van de besproken en/of aangeleverde informatie is deze offerte opgesteld voor ${summary}.

${lines}

Totaal opdracht incl. btw: ${formatEuro(totalAmount)}

Toelichting

• De genoemde bedragen zijn inclusief btw.
• Tijdens het inmeten controleren wij de situatie en definitieve maatvoering.
• De volledige betaling mag na montage worden voldaan.
• 2 jaar garantie op materiaal en fabricage bij normaal gebruik.

Wij kijken ernaar uit om samen tot een mooi en gebruiksvriendelijk eindresultaat te komen.

Met vriendelijke groet,

Alexa
Fly Horren / ELKO Solutions`
}

export function buildAccompanyingMessage(params: {
  customer: Customer
  project: Project
  totalAmount: number
}): string {
  const { customer, project, totalAmount } = params

  return `Beste ${customer.customer_name},

In de bijlage ontvangt u onze offerte voor ${project.project_name}.

Het totaalbedrag komt uit op ${formatEuro(totalAmount)}, inclusief inmeten, levering en vakkundige montage.

Als alles klopt en u hiermee akkoord bent, ontvangen wij graag uw bevestiging. Daarna zetten wij de bestelling definitief door en nemen wij contact met u op zodra de montage ingepland kan worden.

Met vriendelijke groet,

Alexa
Fly Horren / ELKO Solutions`
}
