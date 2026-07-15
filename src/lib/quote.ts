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

  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

export function normalizeProductName(productType: string | null | undefined): string {
  const value = String(productType || '').trim()

  if (!value) return 'Maatwerk hor'

  if (value === 'Klik-plissé raamhor') return 'Klik-plissé raamhor op maat'
  if (value === 'Enkele plissé hordeur') return 'Enkele plissé hordeur op maat'
  if (value === 'Dubbele plissé hordeur') return 'Dubbele plissé hordeur op maat'
  if (value === 'Schuifpui plissé hordeur') return 'Schuifpui plissé hordeur op maat'

  return value
}

export function productTitle(line: ProductLine): string {
  const productName = normalizeProductName(line.product_type)
  const room = line.room ? ` voor ${line.room}` : ''

  if (line.product_type === 'Extra werkzaamheden') {
    return line.execution_description || `Extra werkzaamheden${room}`
  }

  return `${productName}${room}`
}

export function productDetail(line: ProductLine): string {
  const details: string[] = []

  if (line.execution_description) {
    details.push(line.execution_description)
  } else {
    if (line.width_mm && line.height_mm) {
      details.push(`Maat ca. ${line.width_mm} x ${line.height_mm} mm`)
    }

    if (line.ral_code) {
      details.push(`Profielkleur: ${line.ral_code}`)
    } else if (line.standard_color) {
      details.push(`Profielkleur: ${line.standard_color}`)
    }

    if (line.mesh_type) {
      details.push(`Gaas: ${line.mesh_type}`)
    }

    if (
      line.bottom_profile &&
      line.bottom_profile !== 'Niet van toepassing'
    ) {
      details.push(`Onderprofiel: ${line.bottom_profile}`)
    }
  }

  if (line.customer_note) {
    details.push(line.customer_note)
  }

  return details.join(' · ')
}

export function lineTotal(line: ProductLine): number {
  return Number(line.quantity || 1) * Number(line.manual_price || 0)
}

export function buildProjectSummary(productLines: ProductLine[]): string {
  if (!productLines.length) {
    return 'maatwerk horren'
  }

  const counts = new Map<string, number>()

  for (const line of productLines) {
    const name = normalizeProductName(line.product_type)
    counts.set(name, (counts.get(name) || 0) + Number(line.quantity || 1))
  }

  const parts = Array.from(counts.entries()).map(([type, count]) => {
    return `${count}x ${type}`
  })

  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} en ${parts[1]}`

  return `${parts.slice(0, -1).join(', ')} en ${parts[parts.length - 1]}`
}

export function buildQuoteIntro(params: {
  customer: Customer
  project: Project
  productLines: ProductLine[]
}): string {
  const { customer, project, productLines } = params
  const summary = buildProjectSummary(productLines)

  return `Beste ${customer.customer_name},

Bedankt voor uw aanvraag. Op basis van de besproken situatie hebben wij een offerte opgesteld voor ${summary} bij ${project.project_name}.

De offerte is inclusief maatwerk, levering en montage. Wij zorgen voor een nette afwerking die past bij de situatie en uitstraling van de woning.`
}

export function buildAccompanyingMessage(params: {
  customer: Customer
  project: Project
  totalAmount: number
}): string {
  const { customer, project, totalAmount } = params

  return `Beste ${customer.customer_name},

Bedankt voor uw aanvraag. Hierbij ontvangt u onze offerte voor ${project.project_name}.

Het totaalbedrag komt uit op ${formatEuro(totalAmount)}, inclusief maatwerk, levering en montage.

Bij akkoord zetten wij de bestelling definitief door en stemmen wij de verdere planning met u af.

Met vriendelijke groet,

Elko Solutions
Elko Horren`
}

export function buildQuoteText(params: {
  customer: Customer
  project: Project
  productLines: ProductLine[]
  totalAmount: number
}): string {
  const { customer, project, productLines, totalAmount } = params

  const sortedLines = [...productLines].sort(
    (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)
  )

  const intro = buildQuoteIntro({ customer, project, productLines })

  const rows = sortedLines.map((line, index) => {
    const amount = lineTotal(line)
    const detail = productDetail(line)

    return `${index + 1}. ${productTitle(line)}
${detail}
Aantal: ${line.quantity || 1}
Bedrag: ${formatEuro(amount)}`
  })

  return `${intro}

Offerte

${rows.join('\n\n')}

Totaal incl. btw: ${formatEuro(totalAmount)}

Toelichting
• De offerte is gebaseerd op de ingevoerde maatvoering en besproken uitvoering.
• Bij montage controleren wij de situatie en zorgen wij voor een nette afwerking.
• Betaling kan na montage worden voldaan, tenzij anders afgesproken.
• Garantie: 2 jaar op materiaal en fabricage bij normaal gebruik.

Met vriendelijke groet,

Elko Solutions
Elko Horren`
}
