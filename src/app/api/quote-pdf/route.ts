
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
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR'
  }).format(Number(value) || 0)
}

function valueOrBlank(value: unknown): string {
  const text = String(value ?? '').trim()
  return !text || /^(?:nog te bepalen|n\.t\.b\.?|geen|niet van toepassing)$/i.test(text) ? '' : text
}

function friendlyColor(value: unknown): string {
  const c = valueOrBlank(value)
  if (!c) return ''
  const names: Record<string, string> = {
    '9016': 'Wit',
    '7016': 'Antraciet',
    '9005': 'Zwart',
    '9010': 'Zuiver wit',
    '9001': 'Crèmewit',
    '8019': 'Sepiabruin',
  }
  const match = c.match(/\bRAL\s*(\d{4})\b/i)
  if (match) {
    if (
      c.replace(/[—–-]/g, ' ').trim().toUpperCase() === `RAL ${match[1]}` &&
      names[match[1]]
    ) {
      return `${names[match[1]]} - RAL ${match[1]}`
    }
    return c.replace(/[—–]/g, '-').replace(/\bRAL\s*(\d{4})\b/i, 'RAL $1')
  }
  return c
}

function productTitle(line: PdfLine): string {
  const title = valueOrBlank(line.product_type) || 'Maatwerkproduct'
  return title === 'Extra werkzaamheden'
    ? (valueOrBlank(line.execution_description) || title)
    : title
}

function detailParts(line: PdfLine): string[] {
  const o = line.product_options || {}
  const group = line.product_group || getGroupForProduct(line.product_type || '')
  const parts: string[] = []

  const add = (label: string, val: unknown) => {
    const v = valueOrBlank(val)
    if (v) parts.push(label ? `${label}: ${v}` : v)
  }

  add('', line.room)
  if (line.width_mm && line.height_mm) {
    parts.push(`${line.width_mm} x ${line.height_mm}`)
  }

  const rawDescription = String(line.execution_description || '')

  if (rawDescription && line.product_type !== 'Extra werkzaamheden') {
    for (const section of rawDescription
      .split(/\s*[|·]\s*/)
      .map(p => p.trim())
      .filter(Boolean)) {
      if (/\b(?:nog te bepalen|n\.t\.b\.)\b/i.test(section)) continue
      if (/^ruimte\s*:/i.test(section)) continue
      if (
        line.width_mm &&
        line.height_mm &&
        /^(?:maat|afmeting|afmetingen)\s*:/i.test(section)
      ) continue

      parts.push(
        section
          .replace(/[—–]/g, '-')
          .replace(
            /(:\s*)RAL\s*(9016|7016|9005|9010|9001|8019)\b/gi,
            (_, prefix: string, number: string) =>
              `${prefix}${friendlyColor(`RAL ${number}`)}`
          )
      )
    }
  } else if (!rawDescription) {
    if (['Horren', 'Screens', 'Rolluiken'].includes(group)) {
      add('Profielkleur',
        friendlyColor(o.profile_color || line.ral_code || line.standard_color))
    }

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
      if (group === 'Screens') {
        add('Doekkleur', o.screen_fabric_color)
      }
      if (group === 'Rolluiken') {
        add('Lamellen', o.shutter_slats)
      }
      add('Motor', o.motor_brand)
      add('Bediening', o.operation)
    }
  }

  add('', line.customer_note)
  return Array.from(new Set(parts))
}

function fit(
  text: unknown,
  font: PDFFont,
  size: number,
  width: number
): string[] {
  const words = safe(text)
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)

  if (!words.length) return []

  const rows: string[] = []
  let row = ''

  for (const word of words) {
    const test = row ? `${row} ${word}` : word

    if (font.widthOfTextAtSize(test, size) <= width) {
      row = test
      continue
    }

    if (row) {
      rows.push(row)
      row = ''
    }

    if (font.widthOfTextAtSize(word, size) <= width) {
      row = word
      continue
    }

    let part = ''
    for (const char of word) {
      if (
        part &&
        font.widthOfTextAtSize(part + char, size) > width
      ) {
        rows.push(part)
        part = ''
      }
      part += char
    }
    row = part
  }

  if (row) rows.push(row)
  return rows
}

function normalizedAddress(customer: any): string {
  return [
    customer?.street,
    customer?.house_number,
    customer?.postal_code,
    customer?.city
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(request: Request) {
  try {
    const {
      quoteNumber,
      quoteDate,
      customer,
      project,
      productLines,
      totalAmount,
      contactPerson
    } = await request.json()

    if (
      !quoteNumber ||
      !customer ||
      !project ||
      !Array.isArray(productLines)
    ) {
      return Response.json(
        { error: 'Onvolledige offertegegevens.' },
        { status: 400 }
      )
    }

    if (productLines.length > 150) {
      return Response.json(
        { error: 'Te veel productregels in één offerte.' },
        { status: 400 }
      )
    }

    const pdf = await PDFDocument.create()
    const normal = await pdf.embedFont(StandardFonts.Helvetica)
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
    const serif = await pdf.embedFont(StandardFonts.TimesRoman)

    let page: PDFPage = pdf.addPage([W, H])
    let y = 0

    function text(
      str: unknown,
      x: number,
      py: number,
      size = 10,
      font: PDFFont = normal,
      color = DARK
    ) {
      page.drawText(
        safe(str).replace(/\n/g, ' '),
        { x, y: py, size, font, color }
      )
    }

    function right(
      str: unknown,
      rightEdge: number,
      py: number,
      size = 10,
      font: PDFFont = normal,
      color = DARK
    ) {
      const v = safe(str)
      text(
        v,
        rightEdge - font.widthOfTextAtSize(v, size),
        py,
        size,
        font,
        color
      )
    }

    function centered(
      str: unknown,
      py: number,
      size = 10,
      font: PDFFont = normal,
      color = DARK
    ) {
      const v = safe(str)
      text(
        v,
        (W - font.widthOfTextAtSize(v, size)) / 2,
        py,
        size,
        font,
        color
      )
    }

    function horizontal(
      py: number,
      color = GOLD,
      thickness = 0.6
    ) {
      page.drawLine({
        start: { x: M, y: py },
        end: { x: RIGHT, y: py },
        color,
        thickness
      })
    }

    function logo() {
      const top = H - 53
      const brandWidth = serif.widthOfTextAtSize('ELKO', 27)

      text('ELKO', M, top, 27, serif, BROWN)

      const label = 'SOLUTIONS'
      const letterSize = 8.1

      const letterWidth = [...label].reduce(
        (n, c) => n + bold.widthOfTextAtSize(c, letterSize),
        0
      )

      const tracking =
        (brandWidth - letterWidth) / (label.length - 1)

      let sx = M

      for (const ch of label) {
        text(ch, sx, top - 17, letterSize, bold, BROWN)
        sx += bold.widthOfTextAtSize(ch, letterSize) + tracking
      }
    }

    function firstHeader() {
      page.drawRectangle({
        x: 0,
        y: H - 5,
        width: W,
        height: 5,
        color: BROWN
      })

      logo()

      centered(
        'MAATWERK ZONDER CONCESSIES',
        H - 56,
        8.9,
        normal,
        MUTED
      )

      right('OFFERTE', RIGHT, H - 56, 20, bold, BROWN)
      right(quoteNumber, RIGHT, H - 74, 9, normal, MUTED)

      horizontal(H - 104)
      y = H - 123
    }

    function followingPage() {
      page = pdf.addPage([W, H])

      page.drawRectangle({
        x: 0,
        y: H - 5,
        width: W,
        height: 5,
        color: BROWN
      })

      text('ELKO SOLUTIONS', M, H - 47, 14, bold, BROWN)
      right(
        `Offerte ${quoteNumber}`,
        RIGHT,
        H - 45,
        9,
        normal,
        MUTED
      )

      horizontal(H - 61)
      y = H - 84
    }

    function space(height: number, threshold = 91) {
      if (y - height < threshold) followingPage()
    }

    function infoColumn(
      x: number,
      width: number,
      values: {
        title: string
        primary: string
        rest: string[]
      }
    ) {
      text(values.title.toUpperCase(), x, y - 19, 9.1, bold, BROWN)

      let ty = y - 37

      for (const row of fit(values.primary, bold, 11.1, width)) {
        text(row, x, ty, 11.1, bold)
        ty -= 14
      }

      for (const raw of values.rest) {
        for (const row of fit(raw, normal, 9.8, width)) {
          text(row, x, ty, 9.8, normal)
          ty -= 12.6
        }
      }
    }

    function columnHeader() {
      space(36)

      page.drawRectangle({
        x: M,
        y: y - 27,
        width: RIGHT - M,
        height: 27,
        color: BROWN
      })

      text(
        'PRODUCT / SPECIFICATIES',
        M + 12,
        y - 18,
        9,
        bold,
        WHITE
      )

      right('AANTAL', 362, y - 18, 8.4, bold, WHITE)
      right('PER STUK', 457, y - 18, 8.4, bold, WHITE)
      right('TOTAAL', RIGHT - 10, y - 18, 8.4, bold, WHITE)

      y -= 35
    }

    firstHeader()

    const recipientAddress = normalizedAddress(customer)

    const projectAddress = [
      project?.project_address,
      project?.postal_code,
      project?.city
    ].filter(Boolean).join(' ').trim()

    const hasDifferentProjectAddress =
      !!project?.project_address &&
      !/^(?:volgens afspraak|gelijk aan klantadres|nog te bepalen|n\.?t\.?b\.?|n\/?v\/?t\.?)$/i.test(
        String(project.project_address).trim()
      ) &&
      safe(projectAddress)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') !==
        safe(recipientAddress)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '') &&
      safe(project.project_address)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') !==
        safe([
          customer?.street,
          customer?.house_number
        ].filter(Boolean).join(' '))
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')

    const extraProjectRows = [
      `Datum: ${quoteDate || '-'}`,
      `Contactpersoon: ${contactPerson || 'Alexa'}`,
      ...(hasDifferentProjectAddress
        ? [`Montageadres: ${projectAddress}`]
        : [])
    ]

    const panelHeight = hasDifferentProjectAddress ? 111 : 95

    page.drawRectangle({
      x: M,
      y: y - panelHeight,
      width: RIGHT - M,
      height: panelHeight,
      color: BEIGE
    })

    page.drawLine({
      start: { x: 296, y: y - 13 },
      end: { x: 296, y: y - panelHeight + 13 },
      color: GOLD,
      thickness: 0.75
    })

    infoColumn(M + 16, 219, {
      title: 'Geadresseerde',
      primary: customer.customer_name || '-',
      rest: [
        [customer.street, customer.house_number].filter(Boolean).join(' '),
        [customer.postal_code, customer.city].filter(Boolean).join(' ')
      ].filter(Boolean)
    })

    infoColumn(313, 217, {
      title: 'Projectgegevens',
      primary: project.project_name || 'Maatwerk',
      rest: extraProjectRows
    })

    y -= panelHeight + 22

    text(
      'PRODUCTEN EN UITVOERINGEN',
      M,
      y,
      12.8,
      bold,
      BROWN
    )

    y -= 18

    text(
      'Afmetingen: breedte x hoogte in mm. Alle bedragen zijn inclusief btw.',
      M,
      y,
      9.6,
      normal,
      MUTED
    )

    y -= 15
    columnHeader()

    const sorted = [...productLines].sort(
      (a: PdfLine, b: PdfLine) =>
        Number(a.sort_order || 0) - Number(b.sort_order || 0)
    ) as PdfLine[]

    const map = new Map<string, PdfLine[]>()

    for (const item of sorted) {
      const raw =
        item.product_group ||
        getGroupForProduct(item.product_type || '')

      const key = GROUPS.includes(raw) ? raw : 'Overig'

      map.set(key, [...(map.get(key) || []), item])
    }

    for (const name of GROUPS) {
      const items = map.get(name)
      if (!items?.length) continue

      space(45)

      page.drawRectangle({
        x: M,
        y: y - 18,
        width: RIGHT - M,
        height: 18,
        color: PALE
      })

      page.drawRectangle({
        x: M,
        y: y - 18,
        width: 3,
        height: 18,
        color: GOLD
      })

      text(
        name.toUpperCase(),
        M + 11,
        y - 12.5,
        9.3,
        bold,
        BROWN
      )

      y -= 21

      for (const item of items) {
        const titleLines = fit(
          productTitle(item),
          bold,
          10.1,
          248
        )

        const specs = detailParts(item)

        const details = fit(
          specs.join('  |  '),
          normal,
          9.1,
          RIGHT - M - 22
        )

        const mainHeight =
          titleLines.length * 12.5 +
          details.length * 11.4 +
          10

        space(Math.min(mainHeight, 112))

        for (const t of titleLines) {
          space(14)
          text(t, M + 11, y, 10.1, bold)
          y -= 12.5
        }

        if (!titleLines.length) {
          text('-', M + 11, y, 9.3)
          y -= 12.5
        }

        const itemTop =
          y + (titleLines.length || 1) * 12.5

        const quantity = Number(item.quantity) || 1

        right(String(quantity), 355, itemTop, 9.5, normal)
        right(
          money(item.manual_price),
          457,
          itemTop,
          9.2,
          normal
        )
        right(
          money(quantity * Number(item.manual_price || 0)),
          RIGHT - 9,
          itemTop,
          9.5,
          bold
        )

        for (const d of details) {
          space(13)
          text(d, M + 11, y, 9.1, normal, MUTED)
          y -= 11.4
        }

        y -= 3
        horizontal(y, BEIGE, 0.5)
        y -= 6
      }
    }

    space(57)

    page.drawRectangle({
      x: M,
      y: y - 53,
      width: RIGHT - M,
      height: 53,
      color: BEIGE
    })

    text(
      'TOTAALBEDRAG',
      M + 15,
      y - 23,
      11.2,
      bold,
      BROWN
    )

    text(
      'Inclusief btw',
      M + 15,
      y - 40,
      9.3,
      normal,
      MUTED
    )

    right(
      money(totalAmount),
      RIGHT - 15,
      y - 34,
      18.5,
      bold,
      BROWN
    )

    y -= 67

    space(34)

    page.drawRectangle({
      x: M,
      y: y - 25,
      width: RIGHT - M,
      height: 25,
      color: PALE
    })

    text(
      'INCLUSIEF INMETEN, LEVERING EN VAKKUNDIGE MONTAGE',
      M + 12,
      y - 16.8,
      9.4,
      bold,
      BROWN
    )

    y -= 40

    space(88)

    text(
      'PRAKTISCHE INFORMATIE',
      M,
      y,
      11.2,
      bold,
      BROWN
    )

    horizontal(y - 9)
    y -= 27

    const termX = M + 1
    const secondX = 313

    text('LEVERTIJD', termX, y, 9.2, bold, BROWN)
    text('GARANTIE', secondX, y, 9.2, bold, BROWN)

    y -= 14

    text('3-5 weken na akkoord', termX, y, 9.5, normal)
    text('2 jaar, onder voorwaarden', secondX, y, 9.5, normal)

    y -= 25

    text('GELDIGHEID', termX, y, 9.2, bold, BROWN)
    text('BETALING', secondX, y, 9.2, bold, BROWN)

    y -= 14

    text(
      '30 dagen vanaf de offertedatum',
      termX,
      y,
      9.4
    )

    text(
      'Na montage, tenzij anders afgesproken',
      secondX,
      y,
      9.0
    )

    const pages = pdf.getPages()

    pages.forEach((p, index) => {
      p.drawLine({
        start: { x: M, y: 79 },
        end: { x: RIGHT, y: 79 },
        thickness: 0.65,
        color: GOLD
      })

      const footer = [
        'ELKO SOLUTIONS  |  MAATWERK ZONDER CONCESSIES',
        `${COMPANY.site}  |  ${COMPANY.phone}  |  ${COMPANY.email}`,
        COMPANY.address
      ]

      footer.forEach((content, n) => {
        const font = n === 0 ? bold : normal
        const size = n === 0 ? 8.1 : 7.7
        const v = safe(content)

        p.drawText(v, {
          x: (W - font.widthOfTextAtSize(v, size)) / 2,
          y: 63 - n * 12,
          size,
          font,
          color: n === 0 ? BROWN : MUTED
        })
      })

      if (pages.length > 1) {
        const count = `${index + 1}/${pages.length}`

        p.drawText(count, {
          x: RIGHT - normal.widthOfTextAtSize(count, 7.5),
          y: 32,
          size: 7.5,
          font: normal,
          color: MUTED
        })
      }
    })

    const bytes = await pdf.save()

    return new Response(new Blob([bytes]), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safe(quoteNumber)}.pdf"`
      }
    })
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error
          ? error.message
          : 'PDF maken mislukt.'
      },
      { status: 500 }
    )
  }
}
