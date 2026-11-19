import { getGroupForProduct } from '@/lib/product-catalog'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

export const runtime = 'nodejs'

// Definitieve ELKO-offerte: leesbaar A4, meerdere productgroepen, vaste gegevens.
// Bij veel regels krijgt de offerte een vervolgpagina in plaats van minieme tekst.
const W = 595.28
const H = 841.89
const M = 42
const RIGHT = W - M
const BROWN = rgb(0.28, 0.20, 0.14)
const BEIGE = rgb(0.94, 0.91, 0.87)
const PALE = rgb(0.978, 0.969, 0.955)
const GOLD = rgb(0.70, 0.58, 0.42)
const DARK = rgb(0.19, 0.17, 0.16)
const MUTED = rgb(0.40, 0.38, 0.35)
const WHITE = rgb(1, 1, 1)
const GROUPS = ['Horren', 'Plisségordijnen', 'Screens', 'Rolluiken', 'Overig']

const COMPANY = {
  phone: '+31 6 41 67 04 70',
  email: 'info@elkosolutions.nl',
  site: 'elkosolutions.nl',
  address: 'Hoogeveenenweg 100, 2913 LV Nieuwerkerk aan den IJssel',
}

type PdfLine = {
  id?: string
  sort_order?: number
  product_group?: string | null
  product_type?: string
  room?: string
  execution_description?: string
  width_mm?: number | null
  height_mm?: number | null
  standard_color?: string | null
  ral_code?: string | null
  mesh_type?: string | null
  bottom_profile?: string | null
  customer_note?: string | null
  quantity?: number | null
  manual_price?: number | null
  product_options?: Record<string, string> | null
}

// De standaard Helvetica-PDF-lettertypen ondersteunen niet alle Unicode-tekens.
function safe(value: unknown): string {
  return String(value ?? '')
    .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-').replace(/[×]/g, 'x')
    .replace(/[•·]/g, '-').replace(/\u00ad/g, '')
    .replace(/œ/g, 'oe').replace(/Œ/g, 'OE')
    .replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ş/g, 's')
    .replace(/[^\x20-\x7E\u00A0-\u00FF\u20AC\n\r\t]/g, '')
}
function money(value: unknown): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(Number(value) || 0)
}
function valueOrBlank(value: unknown): string {
  const text = String(value ?? '').trim()
  return !text || /^(?:nog te bepalen|n\.t\.b\.?|geen|niet van toepassing)$/i.test(text) ? '' : text
}
function friendlyColor(value: unknown): string {
  const c = valueOrBlank(value)
  if (!c) return ''
  const names: Record<string, string> = {
    '9016': 'Wit', '7016': 'Antraciet', '9005': 'Zwart',
    '9010': 'Zuiver wit', '9001': 'Crèmewit', '8019': 'Sepiabruin',
  }
  const match = c.match(/\bRAL\s*(\d{4})\b/i)
  if (match) {
    if (c.replace(/[—–-]/g, ' ').trim().toUpperCase() === `RAL ${match[1]}` && names[match[1]]) {
      return `${names[match[1]]} - RAL ${match[1]}`
    }
    return c.replace(/[—–]/g, '-').replace(/\bRAL\s*(\d{4})\b/i, 'RAL $1')
  }
  return c
}
function productTitle(line: PdfLine): string {
  const title = valueOrBlank(line.product_type) || 'Maatwerkproduct'
  return title === 'Extra werkzaamheden' ? (valueOrBlank(line.execution_description) || title) : title
}
function detailParts(line: PdfLine): string[] {
  const o = line.product_options || {}
  const group = line.product_group || getGroupForProduct(line.product_type || '')
  const parts: string[] = []
  const add = (label: string, val: unknown) => { const v = valueOrBlank(val); if (v) parts.push(label ? `${label}: ${v}` : v) }
  add('Ruimte', line.room)
  if (line.width_mm && line.height_mm) parts.push(`Afmetingen: ${line.width_mm} x ${line.height_mm} mm`)

  // Bewaar handmatig geschreven uitvoeringsspecificaties en toon geen lege keuzevelden.
  const rawDescription = String(line.execution_description || '')
  if (rawDescription && line.product_type !== 'Extra werkzaamheden') {
    for (const section of rawDescription.split(/\s*[|·]\s*/).map(p => p.trim()).filter(Boolean)) {
      if (/\b(?:nog te bepalen|n\.t\.b\.)\b/i.test(section)) continue
      if (/^ruimte\s*:/i.test(section)) continue
      if (line.width_mm && line.height_mm && /^(?:maat|afmeting|afmetingen)\s*:/i.test(section)) continue
      // Een handmatige omschrijving begint soms opnieuw met de productnaam.
      // Toon die niet dubbel direct onder de vetgedrukte producttitel.
      let cleaned = section.trim()
      const productName = valueOrBlank(line.product_type)
      const room = valueOrBlank(line.room)
      if (productName && cleaned.toLowerCase().startsWith(productName.toLowerCase())) {
        const next = cleaned.slice(productName.length)
        if (!next || /^[\s,.:;-]/.test(next)) cleaned = next.replace(/^[\s,.:;-]+/, '')
      }
      if (room && cleaned.toLowerCase().startsWith(`voor ${room.toLowerCase()}`)) {
        cleaned = cleaned.slice(room.length + 5).replace(/^[\s,.:;-]+/, '')
      }
      // Vervang herhaalde maatnotaties niet blindelings: verwijder ze
      // uitsluitend wanneer ze overeenkomen met de afzonderlijke maatvelden.
      if (line.width_mm && line.height_mm) {
        const repeated = cleaned.match(/(?:,?\s*)maat\s*(?:ca\.?|circa)?\s*([0-9.,]+)\s*[x×]\s*([0-9.,]+)\s*(?:mm)?\.?$/i)
        if (repeated) {
          const w = Number(repeated[1].replace(',', '.'))
          const h = Number(repeated[2].replace(',', '.'))
          if (w === Number(line.width_mm) && h === Number(line.height_mm)) {
            cleaned = cleaned.slice(0, repeated.index).replace(/[\s,.;:-]+$/, '')
          }
        }
      }
      if (!cleaned) continue
      parts.push(cleaned.replace(/[—–]/g, '-').replace(/(:\s*)RAL\s*(9016|7016|9005|9010|9001|8019)\b/gi, (_, prefix: string, number: string) => `${prefix}${friendlyColor(`RAL ${number}`)}`))
    }
  } else if (!rawDescription) {
    if (['Horren', 'Screens', 'Rolluiken'].includes(group)) add('Profielkleur', friendlyColor(o.profile_color || line.ral_code || line.standard_color))
    if (group === 'Horren') {
      add('Gaas', o.mesh_type || line.mesh_type)
      add('Onderprofiel', o.bottom_profile_type || line.bottom_profile)
    }
    if (group === 'Plisségordijnen') {
      add('Stofkleur', o.fabric_color)
      add('Stof', o.fabric_type)
      add('Uitvoering', o.light_control)
      add('Bediening', o.operation)
    }
    if (group === 'Screens' || group === 'Rolluiken') {
      if (group === 'Screens') add('Doekkleur', o.screen_fabric_color)
      if (group === 'Rolluiken') add('Lamellen', o.shutter_slats)
      add('Motor', o.motor_brand)
      add('Bediening', o.operation)
    }
  }
  add('', line.customer_note)
  return Array.from(new Set(parts))
}
function fit(text: unknown, font: PDFFont, size: number, width: number): string[] {
  const words = safe(text).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  if (!words.length) return []
  const rows: string[] = []
  let row = ''
  for (const word of words) {
    const test = row ? `${row} ${word}` : word
    if (font.widthOfTextAtSize(test, size) <= width) { row = test; continue }
    if (row) { rows.push(row); row = '' }
    if (font.widthOfTextAtSize(word, size) <= width) { row = word; continue }
    let part = ''
    for (const char of word) {
      if (part && font.widthOfTextAtSize(part + char, size) > width) { rows.push(part); part = '' }
      part += char
    }
    row = part
  }
  if (row) rows.push(row)
  return rows
}
function normalizedAddress(customer: any): string {
  return [customer?.street, customer?.house_number, customer?.postal_code, customer?.city].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

export async function POST(request: Request) {
  try {
    const { quoteNumber, quoteDate, customer, project, productLines, totalAmount, contactPerson, quoteStyle, installationNotes } = await request.json()
    // Persoons- en offertegegevens blijven uit de bestaande snapshot komen.
    // De opmaak is per offerte gekozen; geen globale variabele i.v.m. gelijktijdige PDF-verzoeken.
    const isExecutive = quoteStyle !== 'signature'
    const BROWN = isExecutive ? rgb(0.069, 0.157, 0.239) : rgb(0.32, 0.255, 0.216)
    const BEIGE = isExecutive ? rgb(0.937, 0.949, 0.953) : rgb(0.944, 0.919, 0.882)
    const PALE = isExecutive ? rgb(0.967, 0.974, 0.978) : rgb(0.978, 0.967, 0.951)
    const GOLD = rgb(0.725, 0.612, 0.380) // warm metaalgoud #B99C61
    const DARK = isExecutive ? rgb(0.15, 0.19, 0.22) : rgb(0.20, 0.19, 0.17)
    const MUTED = isExecutive ? rgb(0.36, 0.42, 0.46) : rgb(0.44, 0.39, 0.35)
    const WHITE = rgb(1, 1, 1)
    // Rustige wit/lichtgrijze productregels, zoals in het goedgekeurde voorbeeld.
    const ROW_SHADE = isExecutive ? rgb(0.958, 0.963, 0.965) : rgb(0.963, 0.952, 0.936)
    const ROW_WHITE = rgb(1, 1, 1)
    const GOLD_INK = rgb(0.57, 0.43, 0.26) // leesbaar warm goud op een lichte achtergrond
    const specialNotes = typeof installationNotes === 'string' ? installationNotes.trim() : ''
    if (specialNotes.length > 900) {
      return Response.json({ error: 'Bijzonderheden: maximaal 900 tekens.' }, { status: 400 })
    }
    if (!quoteNumber || !customer || !project || !Array.isArray(productLines)) {
      return Response.json({ error: 'Onvolledige offertegegevens.' }, { status: 400 })
    }
    if (productLines.length > 150) return Response.json({ error: 'Te veel productregels in één offerte.' }, { status: 400 })

    const pdf = await PDFDocument.create()
    const normal = await pdf.embedFont(StandardFonts.Helvetica)
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
    const serif = await pdf.embedFont(StandardFonts.TimesRoman)
    let page: PDFPage = pdf.addPage([W, H])
    let y = 0

    function text(str: unknown, x: number, py: number, size = 10, font: PDFFont = normal, color = DARK) {
      page.drawText(safe(str).replace(/\n/g, ' '), { x, y: py, size, font, color })
    }
    function right(str: unknown, rightEdge: number, py: number, size = 10, font: PDFFont = normal, color = DARK) {
      const v = safe(str)
      text(v, rightEdge - font.widthOfTextAtSize(v, size), py, size, font, color)
    }
    function centered(str: unknown, py: number, size = 10, font: PDFFont = normal, color = DARK) {
      const v = safe(str)
      text(v, (W - font.widthOfTextAtSize(v, size)) / 2, py, size, font, color)
    }
    function horizontal(py: number, color = GOLD, thickness = 0.6) {
      page.drawLine({ start: { x: M, y: py }, end: { x: RIGHT, y: py }, color, thickness })
    }
    function logo(ink = BROWN) {
      const top = H - 52
      const brandWidth = serif.widthOfTextAtSize('ELKO', 27)
      text('ELKO', M, top, 27, serif, ink)
      const label = 'SOLUTIONS'
      const letterSize = 8.1
      const letterWidth = [...label].reduce((n, c) => n + bold.widthOfTextAtSize(c, letterSize), 0)
      const tracking = (brandWidth - letterWidth) / (label.length - 1)
      let sx = M
      for (const ch of label) {
        text(ch, sx, top - 17, letterSize, bold, ink)
        sx += bold.widthOfTextAtSize(ch, letterSize) + tracking
      }
    }
    function firstHeader() {
      // Executive: donkerblauwe kop. Signature: warm taupe/beige.
      page.drawRectangle({ x: 0, y: H - 108, width: W, height: 108, color: isExecutive ? BROWN : BEIGE })
      page.drawRectangle({ x: 0, y: H - 110, width: W, height: 2, color: GOLD })
      const headerInk = isExecutive ? WHITE : BROWN
      logo(headerInk)
      centered('MAATWERK ZONDER CONCESSIES', H - 54, 9.1, bold, isExecutive ? GOLD : GOLD_INK)
      right('OFFERTE', RIGHT, H - 55, 22, serif, headerInk)
      right(quoteNumber, RIGHT, H - 74, 8.8, normal, isExecutive ? GOLD : BROWN)
      // Geen extra marketingzin: het merk, de slogan en de offerte krijgen rust.
      y = H - 120
    }
    function followingPage() {
      page = pdf.addPage([W, H])
      page.drawRectangle({ x: 0, y: H - 7, width: W, height: 7, color: GOLD })
      text('ELKO SOLUTIONS', M, H - 43, 14, bold, BROWN)
      right(`Offerte ${quoteNumber}`, RIGHT, H - 43, 9, normal, MUTED)
      horizontal(H - 58)
      y = H - 80
    }
    function space(height: number, threshold = 91) {
      if (y - height < threshold) followingPage()
    }
    function infoColumn(x: number, width: number, values: { title: string; primary: string; rest: string[] }) {
      text(values.title.toUpperCase(), x, y - 19, 9.1, bold, BROWN)
      let ty = y - 37
      for (const row of fit(values.primary, bold, 11.1, width)) { text(row, x, ty, 11.1, bold); ty -= 14 }
      for (const raw of values.rest) {
        for (const row of fit(raw, normal, 9.8, width)) { text(row, x, ty, 9.8, normal); ty -= 12.6 }
      }
    }
    function columnHeader() {
      space(36)
      page.drawRectangle({ x: M, y: y - 27, width: RIGHT - M, height: 27, color: BROWN })
      text('PRODUCT / SPECIFICATIES', M + 12, y - 18, 9, bold, WHITE)
      right('AANTAL', 362, y - 18, 8.4, bold, WHITE)
      right('PER STUK', 457, y - 18, 8.4, bold, WHITE)
      right('TOTAAL', RIGHT - 10, y - 18, 8.4, bold, WHITE)
      y -= 35
    }

    firstHeader()
    const recipientAddress = normalizedAddress(customer)
    const projectAddress = [project?.project_address, project?.postal_code, project?.city].filter(Boolean).join(' ').trim()
    const hasDifferentProjectAddress = !!project?.project_address &&
      !/^(?:volgens afspraak|gelijk aan klantadres|nog te bepalen|n\.?t\.?b\.?|n\/?v\/?t\.?)$/i.test(String(project.project_address).trim()) &&
      safe(projectAddress).toLowerCase().replace(/[^a-z0-9]/g, '') !== safe(recipientAddress).toLowerCase().replace(/[^a-z0-9]/g, '') &&
      safe(project.project_address).toLowerCase().replace(/[^a-z0-9]/g, '') !==
        safe([customer?.street, customer?.house_number].filter(Boolean).join(' ')).toLowerCase().replace(/[^a-z0-9]/g, '')
    const extraProjectRows = [
      `Datum: ${quoteDate || '-'}`,
      `Contactpersoon: ${contactPerson || 'Alexa'}`,
      ...(hasDifferentProjectAddress ? [`Montageadres: ${projectAddress}`] : []),
    ]
    // De infoblokken groeien alleen wanneer klantnaam of montageadres afbreekt.
    // Zo blijven adressen leesbaar zonder over de producttitel te lopen.
    const columnHeight = (primary: string, rest: string[], width: number) =>
      42 + Math.max(1, fit(primary, bold, 11.1, width).length) * 14 +
      rest.reduce((sum, value) => sum + fit(value, normal, 9.8, width).length * 12.6, 0)
    const customerLines = [
      [customer.street, customer.house_number].filter(Boolean).join(' '),
      [customer.postal_code, customer.city].filter(Boolean).join(' '),
    ].filter(Boolean)
    const panelHeight = Math.max(
      86,
      columnHeight(customer.customer_name || '-', customerLines, 219),
      columnHeight(project.project_name || 'Maatwerk', extraProjectRows, 217),
    )
    page.drawRectangle({ x: M, y: y - panelHeight, width: RIGHT - M, height: panelHeight, color: BEIGE })
    page.drawLine({ start: { x: 296, y: y - 13 }, end: { x: 296, y: y - panelHeight + 13 }, color: GOLD, thickness: 0.75 })
    infoColumn(M + 16, 219, { title: 'Geadresseerde', primary: customer.customer_name || '-', rest: [
      [customer.street, customer.house_number].filter(Boolean).join(' '),
      [customer.postal_code, customer.city].filter(Boolean).join(' '),
    ].filter(Boolean) })
    infoColumn(313, 217, { title: 'Projectgegevens', primary: project.project_name || 'Maatwerk', rest: extraProjectRows })
    y -= panelHeight + 16

    const allRaamhorren = productLines.length > 0 && productLines.every((item: PdfLine) => /raamhor|inzet.*hor/i.test(item.product_type || ''))
    text(allRaamhorren ? 'MAATWERK RAAMHORREN' : 'PRODUCTEN EN UITVOERINGEN', M, y, 12.8, bold, BROWN)
    y -= 16
    text('Afmetingen: breedte x hoogte in mm. Alle bedragen zijn inclusief btw.', M, y, 9.6, normal, MUTED)
    y -= 12
    columnHeader()

    const sorted = [...productLines].sort((a: PdfLine, b: PdfLine) => Number(a.sort_order || 0) - Number(b.sort_order || 0)) as PdfLine[]
    const map = new Map<string, PdfLine[]>()
    for (const item of sorted) {
      const raw = item.product_group || getGroupForProduct(item.product_type || '')
      const key = GROUPS.includes(raw) ? raw : 'Overig'
      map.set(key, [...(map.get(key) || []), item])
    }
    // V3: geen blokkop voor elke productgroep en geen twee kolommen met specificaties.
    // Een product heeft één duidelijke titel; de groep wordt er klein naast vermeld.
    // Specificaties lopen onder de titel over vrijwel de volledige paginabreedte.
    // Totaal en praktische informatie staan samen op de laatste pagina.
    // Onderaan moet het totaalvak boven de praktische informatie blijven.
    // De footer is nu compacter, zodat vijf normale productregels op A4 passen.
    const CLOSING_MIN_Y = 267 // compact totaalvak eindigt altijd boven het informatieblok
    const CONTINUATION_MIN_Y = 90

    type PreparedRow = {
      item: PdfLine
      group: string
      firstOfGroup: boolean
      titleLines: string[]
      specLines: string[]
      height: number
    }

    // Eerst meten, dan tekenen: bij een volle A4 iets compacter zetten,
    // zonder productinformatie weg te laten of het lettertype onleesbaar te maken.
    const normalLayout = {
      titleFontSize: 10.4, titleLeading: 12.5,
      specFontSize: 9.3, specLeading: 11.2,
      specTopGap: 2.8, topGap: 7, bottomGap: 7,
    }
    const compactLayout = {
      titleFontSize: 10.2, titleLeading: 12.1,
      specFontSize: 9.1, specLeading: 10.4,
      specTopGap: 2.4, topGap: 6, bottomGap: 5.5,
    }
    const noteLines = specialNotes
      ? fit(specialNotes.replace(/\r?\n/g, ' | '), normal, 9.6, RIGHT - M - 28)
      : []
    // Korte montage-afspraken in een klein kader; lange teksten mogen doorlopen
    // naar een tweede pagina zonder overlappingen.
    const shortNote = noteLines.length > 0 && noteLines.length <= 2
    const noteHeight = noteLines.length
      ? (shortNote ? 19 + noteLines.length * 11 : 31 + noteLines.length * 12.2)
      : 0
    const noteOuterGap = shortNote ? 8 : 24
    const noteReserve = noteHeight ? noteHeight + noteOuterGap : 0

    function prepareRows(layout: typeof normalLayout): PreparedRow[] {
      const result: PreparedRow[] = []
      for (const group of GROUPS) {
        const items = map.get(group) || []
        for (let index = 0; index < items.length; index++) {
          const item = items[index]
          const titleLines = fit(productTitle(item), bold, layout.titleFontSize, 254)
          const specifications = detailParts(item)
          const specLines = fit(specifications.join('  |  '), normal, layout.specFontSize, RIGHT - M - 22)
          const height = Math.max(titleLines.length, 1) * layout.titleLeading +
            specLines.length * layout.specLeading +
            (specLines.length ? layout.specTopGap : 0) + layout.topGap + layout.bottomGap
          result.push({ item, group, firstOfGroup: index === 0, titleLines, specLines, height })
        }
      }
      return result
    }
    const normalRows = prepareRows(normalLayout)
    const normalRowsHeight = normalRows.reduce((height, row, index) =>
      height + row.height + (row.firstOfGroup && index > 0 ? 3 : 0), 0)
    const useCompactLayout = y - normalRowsHeight - noteReserve < CLOSING_MIN_Y
    const rowLayout = useCompactLayout ? compactLayout : normalLayout
    const prepared = useCompactLayout ? prepareRows(compactLayout) : normalRows

    // Als een tweede A4 noodzakelijk is, voorkom liever een eenzaam laatste
    // product of een pagina met uitsluitend het totaal. Verdeel bij voldoende
    // ruimte in 3+2 of 4+2 regels, nooit door specificaties weg te laten.
    const measureRange = (start: number, end: number) =>
      prepared.slice(start, end).reduce((sum, row, relativeIndex) =>
        sum + row.height + (row.firstOfGroup && relativeIndex > 0 ? 3 : 0), 0)
    const wholeQuoteFits = y - measureRange(0, prepared.length) - noteReserve >= CLOSING_MIN_Y
    let plannedBreakIndex = -1
    if (!wholeQuoteFits && prepared.length >= 4) {
      const breakAt = prepared.length - 2
      const firstPageAfter = y - measureRange(0, breakAt)
      const secondPageAfter = (H - 80 - 35) - measureRange(breakAt, prepared.length)
      if (firstPageAfter >= CONTINUATION_MIN_Y &&
          secondPageAfter - noteReserve >= CLOSING_MIN_Y) {
        plannedBreakIndex = breakAt
      }
    }

    for (let index = 0; index < prepared.length; index++) {
      const entry = prepared[index]
      const { item, group, titleLines, specLines } = entry
      const lastRow = index === prepared.length - 1
      const groupGap = entry.firstOfGroup && index > 0 ? 3 : 0

      // Alleen de laatste productpagina reserveert ruimte voor het totaalblok
      // en de praktische informatie. Andere pagina's mogen verder gevuld worden.
      // De laatste rij moet óók ruimte overlaten voor de optionele montagenotitie.
      const minY = lastRow ? CLOSING_MIN_Y + noteReserve : CONTINUATION_MIN_Y
      const needsNewPage = index === plannedBreakIndex ||
        y - groupGap - entry.height < minY
      if (needsNewPage) {
        followingPage()
        columnHeader()
      } else {
        y -= groupGap
      }

      const stripeBottom = y - entry.height
      page.drawRectangle({
        x: M, y: stripeBottom, width: RIGHT - M, height: entry.height,
        color: index % 2 === 0 ? ROW_SHADE : ROW_WHITE,
      })
      y -= rowLayout.topGap
      const rowTop = y
      const displayTitles = titleLines.length ? titleLines : ['Maatwerkproduct']

      for (const titleLine of displayTitles) {
        text(titleLine, M + 12, y, rowLayout.titleFontSize, bold)
        y -= rowLayout.titleLeading
      }

      // De productgroep staat subtiel naast de titel en is geen extra kopregel.
      if (entry.firstOfGroup && displayTitles.length === 1) {
        const titleWidth = bold.widthOfTextAtSize(safe(displayTitles[0]), rowLayout.titleFontSize)
        const category = group.toUpperCase()
        const categoryWidth = normal.widthOfTextAtSize(safe(category), 7.1)
        if (titleWidth + 20 + categoryWidth < 254) {
          text(category, M + 12 + titleWidth + 12, rowTop + 0.8, 7.1, normal, MUTED)
        }
      }

      const quantity = Number(item.quantity) || 1
      right(String(quantity), 360, rowTop, 9.5, normal)
      right(money(item.manual_price), 460, rowTop, 9.2, normal)
      right(money(quantity * Number(item.manual_price || 0)), RIGHT - 10, rowTop, 9.5, bold)

      if (specLines.length) y -= rowLayout.specTopGap
      for (const specification of specLines) {
        text(specification, M + 12, y, rowLayout.specFontSize, normal, MUTED)
        y -= rowLayout.specLeading
      }
      // Door dezelfde hoogte te gebruiken bij meten én tekenen blijven regels
      // en vervolgpagina's exact op hun plaats, ook bij lange omschrijvingen.
      y = stripeBottom

    }

    // Bijzonderheden zijn optioneel en worden alleen op de offerte getoond als ze zijn ingevuld.
    // Het tekstblok blijft samen en schuift zo nodig naar de volgende pagina.
    if (specialNotes) {
      if (y - noteHeight - noteOuterGap < CLOSING_MIN_Y) {
        followingPage()
      } else {
        y -= noteOuterGap / 2
      }
      page.drawRectangle({ x: M, y: y - noteHeight, width: RIGHT - M, height: noteHeight, color: PALE })
      text('BIJZONDERHEDEN / MONTAGE', M + 13, y - (shortNote ? 12 : 20), shortNote ? 9.1 : 10, bold, BROWN)
      let noteY = y - (shortNote ? 25 : 36)
      for (const note of noteLines) {
        text(note, M + 13, noteY, shortNote ? 8.9 : 9.6, normal, DARK)
        noteY -= shortNote ? 11 : 12.2
      }
      y -= noteHeight + noteOuterGap / 2
    }

    // Het totaal staat op dezelfde pagina als de vaste afsluiting.
    if (y < CLOSING_MIN_Y) followingPage()

    page.drawRectangle({ x: M, y: y - 52, width: RIGHT - M, height: 52, color: isExecutive ? BROWN : BEIGE })
    const totalInk = isExecutive ? WHITE : BROWN
    text('TOTAALBEDRAG', M + 16, y - 22, 11.4, bold, totalInk)
    text('Inclusief btw', M + 16, y - 38, 9.6, normal, totalInk)
    right(money(totalAmount), RIGHT - 16, y - 33, 19, bold, totalInk)

    // Praktische informatie compact onder het totaal; de vier afspraken blijven leesbaar.
    // Bij y>=267 en 52 pt hoogte eindigt het totaal bij minimaal 215, boven het vaste blok (top 210).
    page.drawRectangle({ x: M, y: 187, width: RIGHT - M, height: 23, color: PALE })
    text('INCLUSIEF INMETEN, LEVERING EN VAKKUNDIGE MONTAGE', M + 12, 195.2, 9.2, bold, BROWN)

    text('PRAKTISCHE INFORMATIE', M, 175, 11.0, bold, BROWN)
    horizontal(165)

    const leftX = M + 2
    const rightX = 313
    text('LEVERTIJD', leftX, 149, 9.1, bold, BROWN)
    text('GARANTIE', rightX, 149, 9.1, bold, BROWN)
    text('3-5 weken na akkoord', leftX, 134, 9.4, normal)
    text('2 jaar, onder voorwaarden', rightX, 134, 9.4, normal)
    text('GELDIGHEID', leftX, 117, 9.1, bold, BROWN)
    text('BETALING', rightX, 117, 9.1, bold, BROWN)
    text('30 dagen vanaf de offertedatum', leftX, 102, 9.4, normal)
    text('Na montage, tenzij anders afgesproken', rightX, 102, 8.9, normal)

    // Compacte en consistente footer op alle pagina's. Drie vestigingsplaatsen op één rij.
    const pages = pdf.getPages()
    pages.forEach((p: PDFPage, index: number) => {
      p.drawLine({ start: { x: M, y: 80 }, end: { x: RIGHT, y: 80 }, thickness: .8, color: GOLD })
      const centerFooter = (content: string, py: number, size: number, font: PDFFont, ink: ReturnType<typeof rgb>) => {
        const value = safe(content)
        p.drawText(value, {
          x: (W - font.widthOfTextAtSize(value, size)) / 2,
          y: py, size, font, color: ink,
        })
      }
      centerFooter('GEPASTE BELEVING OP IEDER VLAK', 66, 8.5, bold, GOLD_INK)
      centerFooter(`${COMPANY.site}  |  ${COMPANY.phone}  |  ${COMPANY.email}`, 52, 8.0, normal, MUTED)
      centerFooter(`Hoofdkantoor: ${COMPANY.address}`, 39, 7.7, normal, MUTED)
      const places = [
        ['DEPENDANCE UTRECHT', 'Houten'],
        ['DEPENDANCE NOORD-HOLLAND', 'Amstelveen'],
        ['DEPENDANCE NOORD-BRABANT', 'Den Bosch'],
      ]
      const centers = [M + 87, W / 2, RIGHT - 87]
      places.forEach(([label, city], i) => {
        const headerWidth = bold.widthOfTextAtSize(label, 7.1)
        const cityWidth = normal.widthOfTextAtSize(city, 8.1)
        p.drawText(label, { x: centers[i] - headerWidth / 2, y: 24, size: 7.1, font: bold, color: BROWN })
        p.drawText(city, { x: centers[i] - cityWidth / 2, y: 12, size: 8.1, font: normal, color: MUTED })
      })
      if (pages.length > 1) {
        const count = `${index + 1}/${pages.length}`
        p.drawText(count, { x: RIGHT - normal.widthOfTextAtSize(count, 7.5), y: 7, size: 7.5, font: normal, color: MUTED })
      }
    })

    const bytes = await pdf.save()
    return new Response(new Blob([bytes]), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${safe(quoteNumber)}.pdf"` },
    })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'PDF maken mislukt.' }, { status: 500 })
  }
}
