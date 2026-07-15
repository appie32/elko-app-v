import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export const runtime = 'nodejs'

function formatEuro(amount: number | string | null | undefined) {
  const value = Number(amount || 0)

  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function lineTotal(line: any) {
  return Number(line.quantity || 1) * Number(line.manual_price || 0)
}

function normalizeProductName(productType: string | null | undefined) {
  const value = String(productType || '').trim()

  if (!value) return 'Maatwerk hor'
  if (value === 'Klik-plissé raamhor') return 'Klik-plissé raamhor op maat'
  if (value === 'Enkele plissé hordeur') return 'Enkele plissé hordeur op maat'
  if (value === 'Dubbele plissé hordeur') return 'Dubbele plissé hordeur op maat'
  if (value === 'Schuifpui plissé hordeur') return 'Schuifpui plissé hordeur op maat'

  return value
}

function productTitle(line: any) {
  const productName = normalizeProductName(line.product_type)
  const room = line.room ? ` voor ${line.room}` : ''

  if (line.product_type === 'Extra werkzaamheden') {
    return line.execution_description || `Extra werkzaamheden${room}`
  }

  return `${productName}${room}`
}

function productDetail(line: any) {
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

    if (line.bottom_profile && line.bottom_profile !== 'Niet van toepassing') {
      details.push(`Onderprofiel: ${line.bottom_profile}`)
    }
  }

  if (line.customer_note) {
    details.push(line.customer_note)
  }

  return details.join(' | ')
}

function cleanText(value: string) {
  return String(value || '')
    .replace(/[•]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
}

function wrapText(text: string, maxChars: number) {
  const words = cleanText(text).split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word

    if (next.length > maxChars) {
      if (current) lines.push(current)
      current = word
    } else {
      current = next
    }
  }

  if (current) lines.push(current)

  return lines
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      quoteNumber,
      quoteDate,
      customer,
      project,
      productLines,
      totalAmount,
    } = body

    const pdfDoc = await PDFDocument.create()

    let page = pdfDoc.addPage([595.28, 841.89])
    const { width, height } = page.getSize()

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const darkBrown = rgb(0.29, 0.21, 0.13)
    const beige = rgb(0.91, 0.86, 0.79)
    const sand = rgb(0.80, 0.72, 0.62)
    const darkGray = rgb(0.18, 0.18, 0.18)
    const white = rgb(1, 1, 1)

    const margin = 46
    let y = height - 48

    function newPage() {
      page = pdfDoc.addPage([595.28, 841.89])
      y = height - 48
    }

    function ensureSpace(space: number) {
      if (y - space < 70) {
        newPage()
      }
    }

    function drawText(
      text: string,
      x: number,
      yy: number,
      size = 10,
      options?: { bold?: boolean; color?: any }
    ) {
      page.drawText(cleanText(text), {
        x,
        y: yy,
        size,
        font: options?.bold ? fontBold : fontRegular,
        color: options?.color || darkGray,
      })
    }

    function drawWrapped(
      text: string,
      x: number,
      size = 10,
      maxChars = 78,
      lineHeight = 14,
      options?: { bold?: boolean; color?: any }
    ) {
      const lines = wrapText(text, maxChars)

      for (const line of lines) {
        ensureSpace(lineHeight + 4)
        drawText(line, x, y, size, options)
        y -= lineHeight
      }
    }

    // Header
    page.drawRectangle({
      x: 0,
      y: height - 142,
      width,
      height: 142,
      color: darkBrown,
    })

    drawText('Elko Solutions', margin, height - 58, 18, {
      bold: true,
      color: white,
    })

    drawText('Elko Horren', margin, height - 82, 11, {
      color: beige,
    })

    drawText('OFFERTE MAATWERK HORREN', margin, height - 116, 20, {
      bold: true,
      color: white,
    })

    drawText('Gepaste beleving op ieder vlak', margin, height - 136, 10, {
      color: beige,
    })

    drawText(`Offertenummer: ${quoteNumber || '-'}`, 390, height - 62, 9, {
      color: white,
    })

    drawText(`Datum: ${quoteDate || new Date().toLocaleDateString('nl-NL')}`, 390, height - 80, 9, {
      color: white,
    })

    y = height - 184

    // Customer/project block
    page.drawRectangle({
      x: margin,
      y: y - 92,
      width: width - margin * 2,
      height: 92,
      color: beige,
    })

    drawText('Voor', margin + 18, y - 24, 9, { color: darkBrown, bold: true })
    drawText(customer?.customer_name || '-', margin + 18, y - 44, 12, { bold: true })

    const customerAddress = [
      [customer?.street, customer?.house_number].filter(Boolean).join(' '),
      [customer?.postal_code, customer?.city].filter(Boolean).join(' '),
    ].filter(Boolean)

    drawText(customerAddress.join(' | ') || '-', margin + 18, y - 64, 9)

    drawText('Project', 330, y - 24, 9, { color: darkBrown, bold: true })
    drawText(project?.project_name || '-', 330, y - 44, 12, { bold: true })
    drawText(project?.city || customer?.city || '-', 330, y - 64, 9)

    y -= 132

    drawWrapped(
      'Bedankt voor uw aanvraag. Op basis van de besproken situatie hebben wij onderstaande offerte opgesteld voor maatwerk horren, inclusief levering en montage.',
      margin,
      10.5,
      88,
      15
    )

    y -= 12

    // Table header
    ensureSpace(52)

    page.drawRectangle({
      x: margin,
      y: y - 24,
      width: width - margin * 2,
      height: 26,
      color: darkBrown,
    })

    drawText('Omschrijving', margin + 12, y - 16, 9, { bold: true, color: white })
    drawText('Aantal', 410, y - 16, 9, { bold: true, color: white })
    drawText('Bedrag', 480, y - 16, 9, { bold: true, color: white })

    y -= 44

    const sortedLines = [...(productLines || [])].sort(
      (a: any, b: any) => Number(a.sort_order || 0) - Number(b.sort_order || 0)
    )

    for (const line of sortedLines) {
      ensureSpace(74)

      const startY = y
      const title = productTitle(line)
      const detail = productDetail(line)
      const amount = lineTotal(line)

      drawText(title, margin + 12, y, 10.5, { bold: true })
      y -= 16

      const detailLines = wrapText(detail, 62)

      for (const detailLine of detailLines.slice(0, 4)) {
        drawText(detailLine, margin + 12, y, 8.5, { color: rgb(0.36, 0.36, 0.36) })
        y -= 12
      }

      drawText(String(line.quantity || 1), 420, startY, 10)
      drawText(formatEuro(amount), 470, startY, 10, { bold: true })

      y -= 12

      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 0.5,
        color: sand,
      })

      y -= 18
    }

    ensureSpace(70)

    page.drawRectangle({
      x: margin,
      y: y - 44,
      width: width - margin * 2,
      height: 44,
      color: beige,
    })

    drawText('Totaal incl. btw', margin + 18, y - 28, 13, {
      bold: true,
      color: darkBrown,
    })

    drawText(formatEuro(totalAmount), 430, y - 28, 15, {
      bold: true,
      color: darkBrown,
    })

    y -= 84

    ensureSpace(110)

    drawText('Toelichting', margin, y, 13, { bold: true, color: darkBrown })
    y -= 22

    const notes = [
      'De offerte is gebaseerd op de ingevoerde maatvoering en besproken uitvoering.',
      'Bij montage controleren wij de situatie en zorgen wij voor een nette afwerking.',
      'Betaling kan na montage worden voldaan, tenzij anders afgesproken.',
      'Garantie: 2 jaar op materiaal en fabricage bij normaal gebruik.',
    ]

    for (const note of notes) {
      drawWrapped(`- ${note}`, margin, 9.5, 86, 14)
    }

    y -= 20

    drawWrapped('Met vriendelijke groet,', margin, 10, 86, 14)
    drawText('Elko Solutions', margin, y, 11, { bold: true, color: darkBrown })
    y -= 16
    drawText('Elko Horren', margin, y, 10)

    // Footer all pages
    const pages = pdfDoc.getPages()
    pages.forEach((pdfPage, index) => {
      pdfPage.drawLine({
        start: { x: margin, y: 46 },
        end: { x: width - margin, y: 46 },
        thickness: 0.5,
        color: sand,
      })

      pdfPage.drawText('Elko Solutions | Elko Horren', {
        x: margin,
        y: 28,
        size: 8,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      })

      pdfPage.drawText(`Pagina ${index + 1} van ${pages.length}`, {
        x: width - margin - 72,
        y: 28,
        size: 8,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      })
    })

    const bytes = await pdfDoc.save()

    return new Response(new Blob([bytes]), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${quoteNumber || 'elko-offerte'}.pdf"`,
      },
    })
  } catch (error: any) {
    return Response.json(
      {
        error: error?.message || 'PDF kon niet worden gemaakt.',
      },
      {
        status: 500,
      }
    )
  }
}
