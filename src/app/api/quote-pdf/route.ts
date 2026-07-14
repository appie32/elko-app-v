import { NextRequest } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const runtime = 'nodejs'

type ProductLinePayload = {
  room: string
  product_type: string
  quantity: number
  width_mm?: number | null
  height_mm?: number | null
  standard_color?: string | null
  ral_code?: string | null
  mesh_type?: string | null
  bottom_profile?: string | null
  execution_description?: string | null
  customer_note?: string | null
  manual_price: number
}

function euro(amount: number | string | null | undefined) {
  const value = Number(amount || 0)
  return `EUR ${new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`
}

function wrapText(text: string, maxChars: number) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current.trim()) lines.push(current.trim())
      current = word
    } else {
      current = `${current} ${word}`.trim()
    }
  }

  if (current.trim()) lines.push(current.trim())
  return lines
}

function productTitle(line: ProductLinePayload) {
  if (line.product_type === 'Extra werkzaamheden') {
    return line.execution_description || `Extra werkzaamheden - ${line.room}`
  }

  return `${line.product_type} - ${line.room}`
}

function productDetails(line: ProductLinePayload) {
  const parts: string[] = []

  if (line.ral_code) {
    parts.push(`kleur profiel: ${line.ral_code}`)
  } else if (line.standard_color) {
    parts.push(`kleur profiel: ${line.standard_color.toLowerCase()}`)
  }

  if (line.bottom_profile) parts.push(`onderprofiel: ${line.bottom_profile.toLowerCase()}`)
  if (line.mesh_type) parts.push(`gaas: ${line.mesh_type.toLowerCase()}`)
  if (line.width_mm && line.height_mm) parts.push(`maat ca. ${line.width_mm} x ${line.height_mm} mm`)
  if (line.customer_note) parts.push(line.customer_note)

  return parts.join(' | ')
}

function projectSummary(lines: ProductLinePayload[]) {
  if (!lines.length) return 'de besproken maatwerkopdracht'

  const map = new Map<string, number>()
  for (const line of lines) {
    map.set(line.product_type, (map.get(line.product_type) || 0) + Number(line.quantity || 1))
  }

  const parts = Array.from(map.entries()).map(([type, count]) => `${count} ${type.toLowerCase()}`)
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} en ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')} en ${parts[parts.length - 1]}`
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const quoteNumber = String(body.quoteNumber || 'ELKO-OFFERTE')
  const quoteDate = String(body.quoteDate || new Date().toLocaleDateString('nl-NL'))
  const documentType = String(body.documentType || 'OFFERTE')
  const customer = body.customer || {}
  const project = body.project || {}
  const productLines: ProductLinePayload[] = body.productLines || []
  const totalAmount = Number(body.totalAmount || 0)
  const subject = String(body.subject || 'maatwerk horren')

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let logoImage = null
  try {
    const logoBytes = await readFile(join(process.cwd(), 'public', 'elko-logo-white.png'))
    logoImage = await pdfDoc.embedPng(logoBytes)
  } catch {
    logoImage = null
  }

  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 56
  const dark = rgb(0.09, 0.14, 0.16)
  const text = rgb(0.14, 0.18, 0.21)
  const muted = rgb(0.45, 0.50, 0.54)
  const light = rgb(0.96, 0.97, 0.98)
  const gold = rgb(0.78, 0.53, 0.22)
  const border = rgb(0.82, 0.85, 0.87)

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  function addFooter(pageNumber: number) {
    page.drawLine({
      start: { x: margin, y: 54 },
      end: { x: pageWidth - margin, y: 54 },
      thickness: 0.7,
      color: border,
    })
    page.drawText('ELKO Solutions   |   Fly Horren   |   @fly.horren', {
      x: margin,
      y: 35,
      size: 8,
      font,
      color: muted,
    })
    page.drawText(`Pagina ${pageNumber}`, {
      x: pageWidth - margin - 45,
      y: 35,
      size: 8,
      font,
      color: muted,
    })
  }

  function newPage() {
    addFooter(pdfDoc.getPageCount())
    page = pdfDoc.addPage([pageWidth, pageHeight])
    y = pageHeight - margin
  }

  function ensureSpace(height: number) {
    if (y - height < 78) newPage()
  }

  function drawTextLine(value: string, x: number, yy: number, size = 10, isBold = false, color = text) {
    page.drawText(value, {
      x,
      y: yy,
      size,
      font: isBold ? bold : font,
      color,
    })
  }

  function drawWrapped(value: string, x: number, maxWidthChars: number, size = 9.5, leading = 13, color = text, isBold = false) {
    const lines = wrapText(value, maxWidthChars)
    for (const line of lines) {
      ensureSpace(leading + 2)
      page.drawText(line, {
        x,
        y,
        size,
        font: isBold ? bold : font,
        color,
      })
      y -= leading
    }
  }

  // Header
  page.drawRectangle({
    x: 0,
    y: pageHeight - 104,
    width: pageWidth,
    height: 104,
    color: dark,
  })

  if (logoImage) {
    const logoWidth = 98
    const scale = logoWidth / logoImage.width
    const logoHeight = logoImage.height * scale
    page.drawImage(logoImage, {
      x: margin,
      y: pageHeight - 67,
      width: logoWidth,
      height: logoHeight,
    })
  } else {
    page.drawText('ELKO', { x: margin, y: pageHeight - 55, size: 18, font: bold, color: rgb(1, 1, 1) })
    page.drawText('SOLUTIONS', { x: margin, y: pageHeight - 70, size: 7, font: bold, color: gold })
  }

  page.drawText(documentType.toUpperCase(), {
    x: pageWidth - margin - 92,
    y: pageHeight - 55,
    size: 16,
    font: bold,
    color: rgb(1, 1, 1),
  })
  page.drawText('MAATWERK HORREN', {
    x: pageWidth - margin - 104,
    y: pageHeight - 75,
    size: 8,
    font: bold,
    color: rgb(0.88, 0.91, 0.93),
  })

  y = pageHeight - 145

  // Blocks
  page.drawText('Voor:', { x: margin, y, size: 9, font: bold, color: text })
  page.drawText(String(customer.customer_name || ''), { x: margin + 50, y, size: 9, font, color: text })
  y -= 14
  if (customer.street || customer.house_number) {
    page.drawText(`${customer.street || ''} ${customer.house_number || ''}`.trim(), { x: margin + 50, y, size: 9, font, color: text })
    y -= 14
  }
  page.drawText(`${customer.postal_code || ''} ${customer.city || project.city || ''}`.trim(), { x: margin + 50, y, size: 9, font, color: text })
  y -= 14
  if (customer.phone) {
    page.drawText(`Tel: ${customer.phone}`, { x: margin + 50, y, size: 9, font, color: text })
    y -= 14
  }
  if (customer.email) {
    page.drawText(`E-mail: ${customer.email}`, { x: margin + 50, y, size: 9, font, color: text })
  }

  const rightX = 325
  let ry = pageHeight - 145
  page.drawText(`${documentType[0] + documentType.slice(1).toLowerCase()}nummer:`, { x: rightX, y: ry, size: 9, font: bold, color: text })
  page.drawText(quoteNumber, { x: rightX + 87, y: ry, size: 9, font, color: text })
  ry -= 14
  page.drawText('Datum:', { x: rightX, y: ry, size: 9, font: bold, color: text })
  page.drawText(quoteDate, { x: rightX + 87, y: ry, size: 9, font, color: text })
  ry -= 14
  page.drawText('Betreft:', { x: rightX, y: ry, size: 9, font: bold, color: text })
  page.drawText(subject, { x: rightX + 87, y: ry, size: 9, font, color: text })

  y = pageHeight - 235

  page.drawText(`${documentType[0] + documentType.slice(1).toLowerCase()} maatwerk horren`, {
    x: margin,
    y,
    size: 19,
    font: bold,
    color: text,
  })
  y -= 22
  page.drawText('Volledig verzorgd: nauwkeurig inmeten, levering en vakkundige montage.', {
    x: margin,
    y,
    size: 10,
    font,
    color: muted,
  })
  y -= 38

  page.drawText('Uitgangspunten', { x: margin, y, size: 11, font: bold, color: text })
  y -= 28

  drawWrapped(`Op basis van de besproken en/of aangeleverde informatie is deze ${documentType.toLowerCase()} opgesteld voor ${projectSummary(productLines)}.`, margin, 95, 9.2, 12)

  y -= 10

  // Table header
  const tableX = margin
  const tableW = pageWidth - margin * 2
  const col1 = tableX
  const col2 = tableX + 335
  const col3 = tableX + 402
  const col4 = tableX + 482

  ensureSpace(80)
  page.drawRectangle({ x: tableX, y: y - 22, width: tableW, height: 22, color: dark })
  page.drawText('Omschrijving', { x: col1 + 6, y: y - 14, size: 8, font: bold, color: rgb(1, 1, 1) })
  page.drawText('Aantal', { x: col2 + 22, y: y - 14, size: 8, font: bold, color: rgb(1, 1, 1) })
  page.drawText('Prijs', { x: col3 + 46, y: y - 14, size: 8, font: bold, color: rgb(1, 1, 1) })
  page.drawText('Totaal', { x: col4 + 36, y: y - 14, size: 8, font: bold, color: rgb(1, 1, 1) })
  y -= 22

  productLines.forEach((line, index) => {
    const detailLines = wrapText(productDetails(line), 58)
    const rowH = Math.max(50, 28 + detailLines.length * 10)
    ensureSpace(rowH + 2)

    page.drawRectangle({
      x: tableX,
      y: y - rowH,
      width: tableW,
      height: rowH,
      color: index % 2 === 0 ? rgb(1, 1, 1) : light,
    })

    // vertical lines
    ;[col2, col3, col4].forEach((x) => {
      page.drawLine({ start: { x, y }, end: { x, y: y - rowH }, thickness: 0.6, color: border })
    })

    page.drawText(productTitle(line), { x: col1 + 6, y: y - 16, size: 8.3, font: bold, color: text })
    let dy = y - 30
    for (const detail of detailLines) {
      page.drawText(detail, { x: col1 + 6, y: dy, size: 7.2, font, color: muted })
      dy -= 9
    }

    const qty = String(line.quantity || 1)
    const price = euro(line.manual_price)
    const total = euro(Number(line.manual_price || 0) * Number(line.quantity || 1))

    page.drawText(qty, { x: col2 + 48, y: y - 25, size: 8.5, font, color: text })
    page.drawText(price, { x: col3 + 20, y: y - 25, size: 8.5, font, color: text })
    page.drawText(total, { x: col4 + 18, y: y - 25, size: 8.5, font: bold, color: text })

    y -= rowH
  })

  // Total bar
  y -= 28
  ensureSpace(44)
  page.drawRectangle({
    x: tableX,
    y: y - 28,
    width: tableW,
    height: 28,
    borderColor: gold,
    borderWidth: 1,
    color: rgb(0.99, 0.97, 0.93),
  })
  page.drawText(`Totaal ${documentType.toLowerCase() === 'factuur' ? 'opdracht' : 'basisuitvoering'} incl. btw`, {
    x: tableX + 6,
    y: y - 18,
    size: 9,
    font: bold,
    color: text,
  })
  page.drawText(euro(totalAmount), {
    x: tableX + tableW - 82,
    y: y - 18,
    size: 9,
    font: bold,
    color: text,
  })
  y -= 56

  ensureSpace(120)
  page.drawText('Toelichting', { x: margin, y, size: 14, font: bold, color: text })
  y -= 22

  const notes = [
    'De genoemde bedragen zijn inclusief btw.',
    'Tijdens het inmeten controleren wij de situatie en definitieve maatvoering.',
    'De volledige betaling mag na montage worden voldaan.',
    '2 jaar garantie op materiaal en fabricage bij normaal gebruik.',
  ]

  for (const note of notes) {
    drawWrapped(`• ${note}`, margin, 96, 9, 12)
  }

  y -= 6
  drawWrapped('Wij kijken ernaar uit om samen tot een mooi en gebruiksvriendelijk eindresultaat te komen.', margin, 90, 10, 13, text, true)

  y -= 25
  page.drawText('Met vriendelijke groet,', { x: margin, y, size: 9, font, color: text })
  y -= 14
  page.drawText('Alexa', { x: margin, y, size: 9, font: bold, color: text })
  y -= 14
  page.drawText('Fly Horren / ELKO Solutions', { x: margin, y, size: 9, font, color: text })

  addFooter(pdfDoc.getPageCount())

  const bytes = await pdfDoc.save()

  return new Response(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${quoteNumber}.pdf"`,
    },
  })
}
