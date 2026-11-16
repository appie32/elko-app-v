import { getGroupForProduct } from '@/lib/product-catalog'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

export const runtime = 'nodejs'

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 46
const BROWN = rgb(0.29, 0.21, 0.13)
const BEIGE = rgb(0.91, 0.86, 0.79)
const SAND = rgb(0.8, 0.72, 0.62)
const DARK = rgb(0.18, 0.18, 0.18)
const LIGHT = rgb(0.4, 0.4, 0.4)
const WHITE = rgb(1, 1, 1)

type PdfLine = {
  sort_order?: number
  product_group?: string | null
  product_type?: string
  room?: string
  execution_description?: string
  width_mm?: number
  height_mm?: number
  standard_color?: string
  ral_code?: string
  mesh_type?: string
  bottom_profile?: string
  customer_note?: string
  quantity?: number
  manual_price?: number
}

// Helvetica is a standard PDF font without full Unicode support.
// Remove/translate unsupported glyphs rather than letting a PDF fail.
function safe(input: unknown): string {
  return String(input ?? '')
    .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-').replace(/[•]/g, '-')
    .replace(/œ/g, 'oe').replace(/Œ/g, 'OE')
    .replace(/š/g, 's').replace(/Š/g, 'S').replace(/ž/g, 'z').replace(/Ž/g, 'Z')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G').replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/\u00ad/g, '')
    .replace(/[^\x20-\x7E\u00A0-\u00FF\u20AC\n\r\t]/g, '?')
}

function money(value: unknown): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(Number(value || 0))
}

function productTitle(line: PdfLine): string {
  const original = String(line.product_type || 'Maatwerk hor')
  const normalized = ['Klik-plissé raamhor', 'Enkele plissé hordeur', 'Dubbele plissé hordeur', 'Schuifpui plissé hordeur'].includes(original)
    ? `${original} op maat` : original
  if (original === 'Extra werkzaamheden') return line.execution_description || original
  return `${normalized}${line.room ? ` voor ${line.room}` : ''}`
}

function productDetail(line: PdfLine): string {
  const parts: string[] = []
  if (line.execution_description) parts.push(line.execution_description)
  else {
    if (line.width_mm && line.height_mm) parts.push(`${line.width_mm} x ${line.height_mm} mm`)
    if (line.ral_code || line.standard_color) parts.push(`Kleur: ${line.ral_code || line.standard_color}`)
    if (line.mesh_type) parts.push(`Gaas: ${line.mesh_type}`)
    if (line.bottom_profile && line.bottom_profile !== 'Niet van toepassing') parts.push(`Onderprofiel: ${line.bottom_profile}`)
  }
  if (line.customer_note) parts.push(line.customer_note)
  return parts.join(' | ')
}

function fit(text: unknown, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = safe(text).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  const out: string[] = []
  let current = ''
  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(attempt, size) <= maxWidth) { current = attempt; continue }
    if (current) { out.push(current); current = '' }
    if (font.widthOfTextAtSize(word, size) <= maxWidth) { current = word; continue }
    let part = ''
    for (const char of word) {
      if (part && font.widthOfTextAtSize(part + char, size) > maxWidth) { out.push(part); part = '' }
      part += char
    }
    current = part
  }
  if (current) out.push(current)
  return out
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { quoteNumber, quoteDate, customer, project, productLines, totalAmount, introText, contactPerson } = body
    if (!quoteNumber || !customer || !project || !Array.isArray(productLines)) {
      return Response.json({ error: 'Onvolledige offertegegevens.' }, { status: 400 })
    }
    if (productLines.length > 150) {
      return Response.json({ error: 'Te veel productregels in één offerte.' }, { status: 400 })
    }

    const pdfDoc = await PDFDocument.create()
    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    let page: PDFPage = pdfDoc.addPage([PAGE_W, PAGE_H])
    let y = PAGE_H - 175

    function line(text: unknown, x: number, posY: number, size = 10, useBold = false, color = DARK) {
      page.drawText(safe(text).replace(/\n/g, ' '), { x, y: posY, size, font: useBold ? bold : regular, color })
    }
    function lineRight(text: unknown, right: number, posY: number, size = 10, useBold = false, color = DARK) {
      const content = safe(text)
      const font = useBold ? bold : regular
      line(content, right - font.widthOfTextAtSize(content, size), posY, size, useBold, color)
    }
    function nextPage() {
      page = pdfDoc.addPage([PAGE_W, PAGE_H])
      page.drawRectangle({ x: 0, y: PAGE_H - 56, width: PAGE_W, height: 56, color: BROWN })
      line('ELKO Solutions', MARGIN, PAGE_H - 34, 14, true, WHITE)
      lineRight(`Offerte ${quoteNumber}`, PAGE_W - MARGIN, PAGE_H - 34, 9, false, WHITE)
      y = PAGE_H - 88
    }
    function room(height: number) { if (y - height < 70) nextPage() }
    function paragraph(text: unknown, size = 10, lineHeight = 15) {
      const paragraphs = safe(text).split(/\r?\n/)
      for (const p of paragraphs) {
        if (!p.trim()) { y -= lineHeight / 2; continue }
        const lines = fit(p, regular, size, PAGE_W - 2 * MARGIN)
        for (const content of lines) {
          room(lineHeight + 4)
          line(content, MARGIN, y, size)
          y -= lineHeight
        }
      }
    }
    function tableHeader() {
      room(54)
      page.drawRectangle({ x: MARGIN, y: y - 27, width: PAGE_W - 2 * MARGIN, height: 29, color: BROWN })
      line('Omschrijving', MARGIN + 11, y - 17, 9, true, WHITE)
      line('Aantal', 410, y - 17, 9, true, WHITE)
      lineRight('Bedrag', PAGE_W - MARGIN - 10, y - 17, 9, true, WHITE)
      y -= 49
    }

    // First-page identity band
    page.drawRectangle({ x: 0, y: PAGE_H - 143, width: PAGE_W, height: 143, color: BROWN })
    line('ELKO Solutions', MARGIN, PAGE_H - 45, 19, true, WHITE)
    line('Maatwerk zonder concessies', MARGIN, PAGE_H - 64, 11, false, BEIGE)
    line('OFFERTE MAATWERK', MARGIN, PAGE_H - 105, 18, true, WHITE)
    line('Maatwerk zonder concessies.', MARGIN, PAGE_H - 125, 9, false, BEIGE)
    lineRight(`Nr: ${quoteNumber}`, PAGE_W - MARGIN, PAGE_H - 42, 9, false, WHITE)
    lineRight(`Datum: ${quoteDate || '-'}`, PAGE_W - MARGIN, PAGE_H - 59, 9, false, WHITE)

    // Customer/project panel
    const boxY = y - 94
    page.drawRectangle({ x: MARGIN, y: boxY, width: PAGE_W - 2 * MARGIN, height: 98, color: BEIGE })
    line('KLANT', MARGIN + 15, y - 15, 9, true, BROWN)
    line('PROJECT', 328, y - 15, 9, true, BROWN)
    const customerName = fit(customer.customer_name || '-', bold, 11, 225)
    const projectName = fit(project.project_name || '-', bold, 11, 200)
    customerName.slice(0, 2).forEach((t: string, index: number) => line(t, MARGIN + 15, y - 35 - index * 13, 11, true))
    projectName.slice(0, 2).forEach((t: string, index: number) => line(t, 328, y - 35 - index * 13, 11, true))
    const address = [customer.street, customer.house_number, customer.postal_code, customer.city].filter(Boolean).join(' ')
    const location = [project.project_address, project.city].filter(Boolean).join(', ')
    fit(address, regular, 8, 221).slice(0, 2).forEach((t: string, index: number) => line(t, MARGIN + 15, y - 65 - index * 12, 8))
    fit(location, regular, 8, 201).slice(0, 2).forEach((t: string, index: number) => line(t, 328, y - 65 - index * 12, 8))
    y -= 127

    paragraph(introText || 'Bedankt voor uw aanvraag. Hieronder vindt u onze offerte voor maatwerk, inclusief levering en montage.', 10, 15)
    y -= 15
    tableHeader()

    const sorted = [...productLines].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)) as PdfLine[]
    const groupOrder = ['Horren', 'Plisségordijnen', 'Screens', 'Rolluiken', 'Overig']
    const grouped = new Map<string, PdfLine[]>()
    for (const item of sorted) {
      const key = item.product_group || getGroupForProduct(item.product_type || '')
      const name = groupOrder.includes(key) ? key : 'Overig'
      grouped.set(name, [...(grouped.get(name) || []), item])
    }
    for (const groupName of groupOrder) {
      const items = grouped.get(groupName)
      if (!items?.length) continue
      room(44)
      page.drawRectangle({ x: MARGIN, y: y - 22, width: PAGE_W - 2 * MARGIN, height: 24, color: BEIGE })
      line(groupName, MARGIN + 10, y - 15, 10, true, BROWN)
      y -= 38
      for (const item of items) {
      const titleLines = fit(productTitle(item), bold, 10, 320)
      const detailLines = fit(productDetail(item), regular, 8.7, 319)
      let isFirst = true
      for (const piece of [...titleLines.map((text) => ({ text, main: true })), ...detailLines.map((text) => ({ text, main: false }))]) {
        if (y - 18 < 76) { nextPage(); tableHeader() }
        line(piece.text, MARGIN + 11, y, piece.main ? 10 : 8.7, piece.main, piece.main ? DARK : LIGHT)
        if (isFirst) {
          line(String(item.quantity || 1), 414, y, 9)
          lineRight(money(Number(item.quantity || 1) * Number(item.manual_price || 0)), PAGE_W - MARGIN - 10, y, 9, true)
          isFirst = false
        }
        y -= piece.main ? 15 : 12
      }
      if (isFirst) {
        if (y - 18 < 76) { nextPage(); tableHeader() }
        line('-', MARGIN + 11, y, 9)
        y -= 15
      }
      y -= 7
      if (y < 72) { nextPage(); tableHeader() }
      page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: .5, color: SAND })
      y -= 20
      }
    }
    room(75)
    page.drawRectangle({ x: MARGIN, y: y - 49, width: PAGE_W - 2 * MARGIN, height: 49, color: BEIGE })
    line('Totaal incl. btw', MARGIN + 15, y - 30, 13, true, BROWN)
    lineRight(money(totalAmount), PAGE_W - MARGIN - 14, y - 30, 15, true, BROWN)
    y -= 81
    room(120)
    line('Toelichting', MARGIN, y, 12, true, BROWN)
    y -= 22
    paragraph('De offerte is gebaseerd op de opgegeven maatvoering en uitvoering.\nBetaling na montage, tenzij anders afgesproken.\nGarantie: 2 jaar volgens de toepasselijke garantievoorwaarden.', 9, 14)
    y -= 21
    room(48)
    line('Met vriendelijke groet,', MARGIN, y, 10)
    y -= 18
    line(`${contactPerson || 'ELKO'} - ELKO Solutions`, MARGIN, y, 11, true, BROWN)

    const allPages = pdfDoc.getPages()
    allPages.forEach((p, index) => {
      p.drawLine({ start: { x: MARGIN, y: 46 }, end: { x: PAGE_W - MARGIN, y: 46 }, thickness: .5, color: SAND })
      p.drawText('ELKO Solutions | Maatwerk zonder concessies', { x: MARGIN, y: 28, size: 8, font: regular, color: LIGHT })
      const count = `Pagina ${index + 1} van ${allPages.length}`
      p.drawText(count, { x: PAGE_W - MARGIN - regular.widthOfTextAtSize(count, 8), y: 28, size: 8, font: regular, color: LIGHT })
    })

    const bytes = await pdfDoc.save()
    return new Response(new Blob([bytes]), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${safe(quoteNumber)}.pdf"` },
    })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'PDF maken mislukt.' }, { status: 500 })
  }
}
