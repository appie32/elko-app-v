'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

const PRODUCT_TYPES = [
  'Raamhor op maat',
  'Klik-plissé raamhor op maat',
  'Enkele plissé hordeur op maat',
  'Dubbele plissé hordeur op maat',
  'Schuifpui plissé hordeur op maat',
  'Dakraamhor op maat',
  'Voorzethor op maat',
  'Extra werkzaamheden',
  'Overig',
]

const DOOR_PRODUCT_TYPES = [
  'Enkele plissé hordeur op maat',
  'Dubbele plissé hordeur op maat',
  'Schuifpui plissé hordeur op maat',
  'Enkele plissé hordeur',
  'Dubbele plissé hordeur',
  'Schuifpui plissé hordeur',
]

const COLORS = [
  { label: 'Wit', ral: 'RAL 9016', value: 'Wit — RAL 9016', hex: '#f7f7f2' },
  { label: 'Antraciet', ral: 'RAL 7016', value: 'Antraciet — RAL 7016', hex: '#383e42' },
  { label: 'Zwart', ral: 'RAL 9005', value: 'Zwart — RAL 9005', hex: '#111111' },
  { label: 'Zuiver wit', ral: 'RAL 9010', value: 'Zuiver wit — RAL 9010', hex: '#f1efe4' },
  { label: 'Crèmewit', ral: 'RAL 9001', value: 'Crèmewit — RAL 9001', hex: '#e9dfc7' },
  { label: 'RAL-kleur op maat', ral: 'Eigen kleur', value: 'RAL-kleur op maat', hex: '#d8d8d8' },
]

const PROFILE_WIDTHS = [
  { label: 'Standaard profiel', value: 'Standaard profiel 4 cm', detail: '4 cm' },
  { label: 'Slim profiel', value: 'Slim profiel 3 cm', detail: '3 cm' },
]

const STANDARD_MESH_TYPES = [
  'Standaard horgaas',
  'Premium horgaas / anti-pollen gaas',
]

const CLICK_PLISSE_MESH_TYPES = [
  'Standaard horgaas',
]

const BOTTOM_PROFILE_TYPES = [
  'Laag onderprofiel',
  'Hoog onderprofiel',
]

const BOTTOM_PROFILE_COLORS = [
  'Wit',
  'Zwart',
  'Aluminium',
]

function isDoorProduct(productType: string) {
  return DOOR_PRODUCT_TYPES.includes(productType)
}

function isClickPlisseWindow(productType: string) {
  return productType === 'Klik-plissé raamhor op maat' || productType === 'Klik-plissé raamhor'
}

function getMeshOptions(productType: string) {
  if (isClickPlisseWindow(productType)) return CLICK_PLISSE_MESH_TYPES
  return STANDARD_MESH_TYPES
}

function getSuggestedPrice(productType: string, profileColor: string, meshType: string) {
  const isRal = profileColor === 'RAL-kleur op maat'
  const isPremium = meshType === 'Premium horgaas / anti-pollen gaas'

  if (
    productType.includes('Raamhor') ||
    productType.includes('Dakraamhor') ||
    productType.includes('Voorzethor')
  ) {
    return isRal || isPremium ? 175 : 150
  }

  if (productType.includes('Klik-plissé raamhor')) {
    return isRal ? 175 : 150
  }

  if (productType.includes('Enkele plissé hordeur')) {
    return isRal || isPremium ? 350 : 300
  }

  if (productType.includes('Dubbele plissé hordeur')) {
    if (isRal && isPremium) return 695
    if (isRal || isPremium) return 645
    return 595
  }

  if (productType.includes('Schuifpui plissé hordeur')) {
    if (isRal && isPremium) return 445
    if (isRal || isPremium) return 395
    return 345
  }

  return 0
}

function normalizeProductType(productType: string) {
  if (productType === 'Klik-plissé raamhor') return 'Klik-plissé raamhor op maat'
  if (productType === 'Enkele plissé hordeur') return 'Enkele plissé hordeur op maat'
  if (productType === 'Dubbele plissé hordeur') return 'Dubbele plissé hordeur op maat'
  if (productType === 'Schuifpui plissé hordeur') return 'Schuifpui plissé hordeur op maat'
  return productType || 'Raamhor op maat'
}

function normalizeColor(line: any) {
  if (line.ral_code) return 'RAL-kleur op maat'

  const standard = line.standard_color || ''

  const match = COLORS.find((color) => {
    return color.value === standard || standard.includes(color.ral) || standard === color.label
  })

  return match?.value || 'Wit — RAL 9016'
}

function parseBottomProfile(bottomProfile: string) {
  const value = bottomProfile || ''

  let type = 'Laag onderprofiel'
  let color = 'Wit'

  if (value.toLowerCase().includes('hoog')) type = 'Hoog onderprofiel'
  if (value.toLowerCase().includes('zwart')) color = 'Zwart'
  if (value.toLowerCase().includes('aluminium')) color = 'Aluminium'

  return { type, color }
}

function cleanColor(profileColor: string, ralCode: string) {
  if (profileColor === 'RAL-kleur op maat') {
    return ralCode || 'RAL-kleur op maat'
  }

  return profileColor
}

function buildDescription(form: any) {
  const color = cleanColor(form.profile_color, form.ral_code)

  const dimensions =
    form.width_mm && form.height_mm
      ? `, maat ca. ${form.width_mm} x ${form.height_mm} mm`
      : ''

  if (form.product_type === 'Extra werkzaamheden') {
    return form.execution_description || 'Extra werkzaamheden volgens besproken uitvoering.'
  }

  if (isDoorProduct(form.product_type)) {
    return `${form.product_type} voor ${form.room || 'ruimte'}, uitgevoerd in ${color}, ${form.profile_width.toLowerCase()}, met ${form.mesh_type.toLowerCase()}, ${form.bottom_profile_type.toLowerCase()} in ${form.bottom_profile_color.toLowerCase()}${dimensions}.`
  }

  return `${form.product_type} voor ${form.room || 'ruimte'}, uitgevoerd in ${color}, ${form.profile_width.toLowerCase()}, met ${form.mesh_type.toLowerCase()}${dimensions}.`
}

export default function EditProductLinePage() {
  const params = useParams()
  const router = useRouter()

  const projectId = params.id as string
  const lineId = params.lineId as string

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState<any | null>(null)

  useEffect(() => {
    async function loadLine() {
      const { data, error } = await supabase
        .from('product_lines')
        .select('*')
        .eq('id', lineId)
        .single()

      if (error) {
        setMessage(error.message)
        return
      }

      const bottom = parseBottomProfile(data.bottom_profile)

      setForm({
        room: data.room || '',
        product_type: normalizeProductType(data.product_type),
        quantity: String(data.quantity || 1),
        width_mm: data.width_mm ? String(data.width_mm) : '',
        height_mm: data.height_mm ? String(data.height_mm) : '',
        profile_color: normalizeColor(data),
        ral_code: data.ral_code || '',
        profile_width: data.execution_description?.includes('slim profiel 3 cm')
          ? 'Slim profiel 3 cm'
          : 'Standaard profiel 4 cm',
        mesh_type: data.mesh_type || 'Standaard horgaas',
        bottom_profile_type: bottom.type,
        bottom_profile_color: bottom.color,
        execution_description: data.execution_description || '',
        attention_points: data.attention_points || '',
        customer_note: data.customer_note || '',
        suggested_price: String(data.suggested_price || 0),
        manual_price: String(data.manual_price || 0),
      })
    }

    loadLine()
  }, [lineId])

  const doorProduct = form ? isDoorProduct(form.product_type) : false
  const meshOptions = form ? getMeshOptions(form.product_type) : STANDARD_MESH_TYPES

  const autoDescription = useMemo(() => {
    if (!form) return ''
    return buildDescription(form)
  }, [form])

  if (!form) {
    return <div className="card">Laden... {message}</div>
  }

  function update(field: string, value: string) {
    setForm((prev: any) => {
      const next = { ...prev, [field]: value }

      const options = getMeshOptions(next.product_type)
      if (!options.includes(next.mesh_type)) {
        next.mesh_type = options[0]
      }

      const suggested = String(
        getSuggestedPrice(next.product_type, next.profile_color, next.mesh_type)
      )

      if (next.manual_price === next.suggested_price || next.manual_price === '') {
        next.manual_price = suggested
      }

      next.suggested_price = suggested

      return next
    })

    setMessage('')
  }

  async function save() {
    if (saving) return

    if (!form.room.trim()) {
      setMessage('Vul eerst de ruimte / locatie in.')
      return
    }

    setSaving(true)
    setMessage('Opslaan...')

    const colorCategory =
      form.profile_color === 'RAL-kleur op maat'
        ? 'RAL-kleur op maat'
        : 'Standaardkleur'

    const standardColor =
      form.profile_color === 'RAL-kleur op maat'
        ? null
        : form.profile_color

    const bottomProfile = doorProduct
      ? `${form.bottom_profile_type} - ${form.bottom_profile_color}`
      : 'Niet van toepassing'

    const payload = {
      room: form.room,
      product_type: form.product_type,
      quantity: Number(form.quantity || 1),
      width_mm: form.width_mm ? Number(form.width_mm) : null,
      height_mm: form.height_mm ? Number(form.height_mm) : null,
      color_category: colorCategory,
      standard_color: standardColor,
      ral_code:
        form.profile_color === 'RAL-kleur op maat'
          ? form.ral_code || null
          : null,
      mesh_type: form.mesh_type,
      bottom_profile: bottomProfile,
      execution_description: autoDescription,
      attention_points: form.attention_points,
      customer_note: form.customer_note,
      suggested_price: Number(form.suggested_price || 0),
      manual_price: Number(form.manual_price || 0),
    }

    const { error } = await supabase
      .from('product_lines')
      .update(payload)
      .eq('id', lineId)

    if (error) {
      setSaving(false)
      setMessage(error.message)
      return
    }

    router.push(`/projects/${projectId}`)
  }

  async function deleteLine() {
    const confirmed = confirm(`Productregel verwijderen: ${form.product_type} - ${form.room}?`)
    if (!confirmed) return

    const { error } = await supabase
      .from('product_lines')
      .delete()
      .eq('id', lineId)

    if (error) {
      setMessage(error.message)
      return
    }

    router.push(`/projects/${projectId}`)
  }

  return (
    <div className="card">
      <h1>Productregel aanpassen</h1>

      <p className="muted">
        Pas ruimte, maat, kleur, uitvoering of prijs aan. Daarna wordt de offerteomschrijving opnieuw opgebouwd.
      </p>

      <h2>Product</h2>

      <div className="grid grid-2">
        {PRODUCT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={form.product_type === type ? 'button' : 'button secondary'}
            onClick={() => update('product_type', type)}
            style={{ textAlign: 'left' }}
          >
            {type}
          </button>
        ))}
      </div>

      <h2 style={{ marginTop: 24 }}>Ruimte en maat</h2>

      <div className="grid grid-2">
        <label>
          Ruimte / locatie
          <input
            value={form.room}
            onChange={(e) => update('room', e.target.value)}
            placeholder="Bijv. woonkamer, slaapkamer, tuindeur"
          />
        </label>

        <label>
          Aantal
          <input
            type="number"
            value={form.quantity}
            onFocus={(e) => e.target.select()}
            onChange={(e) => update('quantity', e.target.value)}
            placeholder="1"
          />
        </label>

        <label>
          Breedte mm
          <input
            type="number"
            value={form.width_mm}
            onFocus={(e) => e.target.select()}
            onChange={(e) => update('width_mm', e.target.value)}
            placeholder="Bijv. 890"
          />
        </label>

        <label>
          Hoogte mm
          <input
            type="number"
            value={form.height_mm}
            onFocus={(e) => e.target.select()}
            onChange={(e) => update('height_mm', e.target.value)}
            placeholder="Bijv. 2200"
          />
        </label>
      </div>

      <h2 style={{ marginTop: 24 }}>Profielkleur</h2>

      <div className="grid grid-2">
        {COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            className={form.profile_color === color.value ? 'button' : 'button secondary'}
            onClick={() => update('profile_color', color.value)}
            style={{
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.25)',
                background: color.hex,
                display: 'inline-block',
              }}
            />
            <span>
              <strong>{color.label}</strong>
              <br />
              <span style={{ opacity: 0.8 }}>{color.ral}</span>
            </span>
          </button>
        ))}
      </div>

      {form.profile_color === 'RAL-kleur op maat' && (
        <label style={{ marginTop: 16 }}>
          RAL-code / omschrijving
          <input
            value={form.ral_code}
            onChange={(e) => update('ral_code', e.target.value)}
            placeholder="Bijv. RAL 9010 mat"
          />
        </label>
      )}

      <h2 style={{ marginTop: 24 }}>Profiel</h2>

      <div className="grid grid-2">
        {PROFILE_WIDTHS.map((profile) => (
          <button
            key={profile.value}
            type="button"
            className={form.profile_width === profile.value ? 'button' : 'button secondary'}
            onClick={() => update('profile_width', profile.value)}
            style={{ textAlign: 'left' }}
          >
            <strong>{profile.label}</strong>
            <br />
            {profile.detail}
          </button>
        ))}
      </div>

      <h2 style={{ marginTop: 24 }}>Gaas en onderprofiel</h2>

      <div className="grid grid-2">
        <label>
          Gaassoort
          <select
            value={form.mesh_type}
            onChange={(e) => update('mesh_type', e.target.value)}
          >
            {meshOptions.map((mesh) => (
              <option key={mesh}>{mesh}</option>
            ))}
          </select>
        </label>

        {doorProduct && (
          <>
            <label>
              Onderprofiel
              <select
                value={form.bottom_profile_type}
                onChange={(e) => update('bottom_profile_type', e.target.value)}
              >
                {BOTTOM_PROFILE_TYPES.map((profile) => (
                  <option key={profile}>{profile}</option>
                ))}
              </select>
            </label>

            <label>
              Onderprofielkleur
              <select
                value={form.bottom_profile_color}
                onChange={(e) => update('bottom_profile_color', e.target.value)}
              >
                {BOTTOM_PROFILE_COLORS.map((color) => (
                  <option key={color}>{color}</option>
                ))}
              </select>
            </label>
          </>
        )}

        <label>
          Richtprijs
          <input type="number" value={form.suggested_price} readOnly />
        </label>

        <label>
          Definitieve prijs
          <input
            type="number"
            value={form.manual_price}
            onFocus={(e) => e.target.select()}
            onChange={(e) => update('manual_price', e.target.value)}
          />
        </label>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2>Samenvatting voor offerte</h2>
        <p className="muted">{autoDescription}</p>
      </div>

      <label style={{ marginTop: 16 }}>
        Extra klantgerichte opmerking voor offerte
        <textarea
          value={form.customer_note}
          onChange={(e) => update('customer_note', e.target.value)}
        />
      </label>

      <label style={{ marginTop: 16 }}>
        Interne aandachtspunten voor montage
        <textarea
          value={form.attention_points}
          onChange={(e) => update('attention_points', e.target.value)}
        />
      </label>

      {message && <p className="muted">{message}</p>}

      <div className="row" style={{ marginTop: 16 }}>
        <button disabled={saving} onClick={save}>
          {saving ? 'Opslaan...' : 'Wijzigingen opslaan'}
        </button>

        <button className="button secondary" onClick={deleteLine}>
          Verwijderen
        </button>

        <button className="button secondary" onClick={() => router.push(`/projects/${projectId}`)}>
          Annuleren
        </button>
      </div>
    </div>
  )
}
