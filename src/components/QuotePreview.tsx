
import { getGroupForProduct } from '@/lib/product-catalog'
import {
  formatEuro,
  lineTotal,
  productDetail,
  productTitle,
} from '@/lib/quote'
import type { Customer, ProductLine, Project } from '@/lib/types'

type Props = {
  customer: Customer
  project: Project
  lines: ProductLine[]
  quoteNumber?: string
  quoteDate?: string
  contactPerson: string
  total: number
}

const groups = [
  'Horren',
  'Plisségordijnen',
  'Screens',
  'Rolluiken',
  'Overig',
]

function friendlyDetails(line: ProductLine): string {
  return productDetail(line)
    .replace(/Profielkleur:\s*RAL\s*9016/gi, 'Profielkleur: Wit - RAL 9016')
    .replace(/Profielkleur:\s*RAL\s*7016/gi, 'Profielkleur: Antraciet - RAL 7016')
    .replace(/Profielkleur:\s*RAL\s*9005/gi, 'Profielkleur: Zwart - RAL 9005')
    .replace(/Profielkleur:\s*RAL\s*9010/gi, 'Profielkleur: Zuiver wit - RAL 9010')
    .replace(/Profielkleur:\s*RAL\s*9001/gi, 'Profielkleur: Crèmewit - RAL 9001')
}

export default function QuotePreview({
  customer,
  project,
  lines,
  quoteNumber,
  quoteDate,
  contactPerson,
  total,
}: Props) {
  const customerAddress = [
    customer.street,
    customer.house_number,
    customer.postal_code,
    customer.city,
  ].filter(Boolean).join(' ')

  const montageAddress = String(project.project_address || '').trim()

  const normalize = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]/g, '')

  const streetAddress = [
    customer.street,
    customer.house_number,
  ].filter(Boolean).join(' ')

  const differentAddress =
    montageAddress &&
    !/^(volgens afspraak|gelijk aan klantadres|nog te bepalen)$/i.test(montageAddress) &&
    normalize(montageAddress) !== normalize(customerAddress) &&
    normalize(montageAddress) !== normalize(streetAddress)

  const date = quoteDate
    ? new Date(`${quoteDate.slice(0, 10)}T12:00:00`).toLocaleDateString('nl-NL')
    : new Date().toLocaleDateString('nl-NL')

  const grouped = groups.map(name => ({
    name,
    items: lines.filter(line => {
      const item = line as ProductLine & { product_group?: string }
      return (item.product_group || getGroupForProduct(line.product_type)) === name
    }),
  })).filter(group => group.items.length > 0)

  const headingStyle = {
    color: '#4A3520',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '.06em',
  } as const

  return (
    <section style={{
      background: '#fff',
      border: '1px solid #e1d7ca',
      borderRadius: 14,
      overflow: 'hidden',
      color: '#302b26',
      fontSize: 15,
      lineHeight: 1.55,
    }}>
      <div style={{ height: 6, background: '#4A3520' }} />

      <div style={{ padding: '26px 24px 18px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
          gap: 18,
          flexWrap: 'wrap',
          borderBottom: '1px solid #bca88e',
          paddingBottom: 22,
        }}>
          <div style={{ textAlign: 'center', width: 118 }}>
            <div style={{
              fontFamily: 'Georgia, serif',
              fontSize: 36,
              lineHeight: 1,
              color: '#4A3520',
            }}>
              ELKO
            </div>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '.32em',
              marginTop: 5,
              color: '#4A3520',
            }}>
              SOLUTIONS
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 11,
              letterSpacing: '.08em',
              color: '#8e806d',
            }}>
              MAATWERK ZONDER CONCESSIES
            </div>
            <div style={{
              fontWeight: 800,
              fontSize: 27,
              color: '#4A3520',
              marginTop: 6,
            }}>
              OFFERTE
            </div>
            <div style={{ fontSize: 13, color: '#756a60' }}>
              {quoteNumber || 'Concept - nog niet opgeslagen'}
            </div>
          </div>
        </div>

        <div style={{
          background: '#f1e9df',
          padding: 19,
          marginTop: 22,
          borderRadius: 6,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 23,
        }}>
          <div>
            <div style={headingStyle}>GEADRESSEERDE</div>
            <strong style={{ display: 'block', marginTop: 8 }}>
              {customer.customer_name}
            </strong>
            <div>{[customer.street, customer.house_number].filter(Boolean).join(' ')}</div>
            <div>{[customer.postal_code, customer.city].filter(Boolean).join(' ')}</div>
          </div>

          <div>
            <div style={headingStyle}>PROJECTGEGEVENS</div>
            <strong style={{ display: 'block', marginTop: 8 }}>
              {project.project_name}
            </strong>
            <div>Datum: {date}</div>
            <div>Contactpersoon: {contactPerson}</div>
            {differentAddress && (
              <div>Montageadres: {montageAddress}</div>
            )}
          </div>
        </div>

        <h3 style={{
          color: '#4A3520',
          fontSize: 18,
          marginTop: 30,
          marginBottom: 5,
        }}>
          Producten en uitvoeringen
        </h3>
        <p style={{
          color: '#70665b',
          fontSize: 13,
          marginTop: 0,
          marginBottom: 18,
        }}>
          Afmetingen: breedte × hoogte in mm. Alle bedragen zijn inclusief btw.
        </p>

        {grouped.map(group => (
          <div key={group.name} style={{ marginBottom: 22 }}>
            <div style={{
              background: '#f6f2ed',
              borderLeft: '4px solid #b89e77',
              padding: '9px 12px',
              ...headingStyle,
            }}>
              {group.name.toUpperCase()}
            </div>

            {group.items.map((line, index) => (
              <div key={line.id || index} style={{
                borderBottom: '1px solid #e7dfd6',
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: 15,
                padding: '15px 8px',
              }}>
                <div style={{ minWidth: 0 }}>
                  <strong>{productTitle(line)}</strong>
                  <div style={{
                    fontSize: 13,
                    color: '#635d56',
                    marginTop: 5,
                    overflowWrap: 'anywhere',
                  }}>
                    {friendlyDetails(line)}
                  </div>
                  <div style={{
                    color: '#776d63',
                    fontSize: 13,
                    marginTop: 7,
                  }}>
                    {line.quantity || 1} × {formatEuro(line.manual_price)} per stuk
                  </div>
                </div>

                <strong style={{
                  color: '#4A3520',
                  whiteSpace: 'nowrap',
                }}>
                  {formatEuro(lineTotal(line))}
                </strong>
              </div>
            ))}
          </div>
        ))}

        <div style={{
          background: '#e9ded0',
          padding: '20px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          borderRadius: 7,
          marginTop: 8,
        }}>
          <div>
            <strong style={{ color: '#4A3520' }}>TOTAALBEDRAG</strong>
            <div style={{ fontSize: 13 }}>Inclusief btw</div>
          </div>
          <strong style={{ fontSize: 24, color: '#4A3520' }}>
            {formatEuro(total)}
          </strong>
        </div>

        <div style={{
          background: '#f7f3ec',
          color: '#4A3520',
          marginTop: 16,
          padding: 13,
          fontSize: 14,
          fontWeight: 700,
          borderRadius: 5,
        }}>
          Inclusief inmeten, levering en vakkundige montage.
        </div>

        <h3 style={{
          color: '#4A3520',
          fontSize: 17,
          borderBottom: '1px solid #bca88e',
          paddingBottom: 8,
          marginTop: 30,
        }}>
          Praktische informatie
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 18,
          fontSize: 14,
        }}>
          <div>
            <strong>Levertijd</strong>
            <div>3-5 weken na akkoord</div>
          </div>
          <div>
            <strong>Garantie</strong>
            <div>2 jaar, onder voorwaarden</div>
          </div>
          <div>
            <strong>Geldigheid</strong>
            <div>30 dagen vanaf de offertedatum</div>
          </div>
          <div>
            <strong>Betaling</strong>
            <div>Na montage, tenzij anders afgesproken</div>
          </div>
        </div>
      </div>

      <footer style={{
        borderTop: '1px solid #bca88e',
        margin: '12px 24px 0',
        padding: '18px 2px 24px',
        textAlign: 'center',
        color: '#695e51',
        fontSize: 12,
        lineHeight: 1.8,
      }}>
        <strong style={{ color: '#4A3520' }}>
          ELKO SOLUTIONS · MAATWERK ZONDER CONCESSIES
        </strong>
        <div>elkosolutions.nl · +31 6 41 67 04 70</div>
        <div>info@elkosolutions.nl</div>
        <div>Hoogeveenenweg 100, 2913 LV Nieuwerkerk aan den IJssel</div>
      </footer>
    </section>
  )
}
