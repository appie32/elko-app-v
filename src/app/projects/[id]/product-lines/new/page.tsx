'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

const PRODUCT_TYPES = [
  'Raamhor op maat',
  'Klik-plissé raamhor',
  'Enkele plissé hordeur',
  'Dubbele plissé hordeur',
  'Schuifpui plissé hordeur',
  'Extra werkzaamheden',
  'Overig',
]

const DOOR_PRODUCT_TYPES = [
  'Enkele plissé hordeur',
  'Dubbele plissé hordeur',
  'Schuifpui plissé hordeur',
]

const PROFILE_COLORS = [
  'Wit',
  'Antraciet',
  'Bruin',
  'RAL-kleur op maat',
]

const MESH_TYPES = [
  'Standaard horgaas',
  'Premium horgaas / anti-pollen gaas',
]

const BOTTOM_PROFILE_COLORS = [
  'Wit',
  'Zwart',
  'Aluminium',
]

function isDoorProduct(productType: string) {
  return DOOR_PRODUCT_TYPES.includes(productType)
}

function getSuggestedPrice(productType: string, profileColor: string, meshType: string) {
  const isRal = profileColor === 'RAL-kleur op maat'
  const isPremium = meshType === 'Premium horgaas / anti-pollen gaas'

  if (productType === 'Raamhor op maat' || productType === 'Klik-plissé raamhor') {
    return isRal || isPremium ? 175 : 150
  }

  if (productType === 'Enkele plissé hordeur') {
    return isRal || isPremium ? 350 : 300
  }

  if (productType === 'Dubbele plissé hordeur') {
    if (isRal && isPremium) return 695
    if (isRal || isPremium) return 645
    return 595
  }

  if (productType === 'Schuifpui plissé hordeur') {
    if (isRal && isPremium) return 445
    if (isRal || isPremium) return 395
    return 345
  }

  return 0
}

function buildDescription(form: any) {
  const color =
    form.profile_color === 'RAL-kleur op maat'
      ? form.ral_code || 'RAL-kleur op maat'
      : form.profile_color

  const dimensions =
    form.width_mm && form.height_mm
      ? `, maat ca. ${form.width_mm} x ${form.height_mm} mm`
      : ''

  if (form.product_type === 'Extra werkzaamheden') {
    return form.execution_description || 'Extra werkzaamheden volgens besproken uitvoering.'
  }

  if (isDoorProduct(form.product_type)) {
    return `${form.product_type} voor ${form.room || 'ruimte'}, uitgevoerd in ${color} profiel met ${form.mesh_type.toLowerCase()} en laag onderprofiel in ${form.bottom_profile.toLowerCase()}${dimensions}.`
  }

  return `${form.product_type} voor ${form.room || 'ruimte'}, uitgevoerd in ${color} profiel met ${form.mesh_type.toLowerCase()}${dimensions}.`
}

export default function NewProductLinePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    project_id: projectId,
    sort_order: 1,
    room: '',
    product_type: 'Raamhor op maat',
    quantity: 1,
    width_mm: '',
    height_mm: '',
    profile_color: 'Wit',
    ral_code: '',
    mesh_type: 'Standaard horgaas',
    bottom_profile: 'Wit',
    execution_description: '',
    attention_points: '',
    customer_note: '',
    suggested_price: 150,
    manual_price: 150,
  })

  const doorProduct = isDoorProduct(form.product_type)

  const autoDescription = useMemo(() => {
    return buildDescription(form)
  }, [form])

  useEffect(() => {
    const suggested = getSuggestedPrice(
      form.product_type,
      form.profile_color,
      form.mesh_type
    )

    setForm((prev) => ({
      ...prev,
      suggested_price: suggested,
      manual_price:
        prev.manual_price === prev.suggested_price
          ? suggested
          : prev.manual_price,
      bottom_profile: isDoorProduct(prev.product_type)
        ? prev.bottom_profile || 'Wit'
        : 'Niet van toepassing',
    }))
  }, [form.product_type, form.profile_color, form.mesh_type])

  function update(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setMessage('')
  }

  async function save(addAnother = false) {
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

    const payload = {
      project_id: projectId,
      sort_order: Number(form.sort_order || 1),
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
      bottom_profile: doorProduct ? form.bottom_profile : 'Niet van toepassing',
      execution_description: form.execution_description || autoDescription,
      attention_points: form.attention_points,
      customer_note: form.customer_note,
      suggested_price: Number(form.suggested_price || 0),
      manual_price: Number(form.manual_price || 0),
    }

    const { error } = await supabase.from('product_lines').insert(payload)

    if (error) {
      setSaving(false)
      setMessage(error.message)
      return
    }

    if (addAnother) {
      setMessage('Productregel opgeslagen. Je kunt nu de volgende regel invoeren.')

      setForm((prev) => ({
        ...prev,
        room: '',
        width_mm: '',
        height_mm: '',
        execution_description: '',
        attention_points: '',
        customer_note: '',
      }))

      setSaving(false)
    } else {
      router.push(`/projects/${projectId}`)
    }
  }

  return (
    <div className="card">
      <h1>Productregel toevoegen</h1>
      <p className="muted">
        Vul de hor in. Onderprofiel verschijnt alleen bij hordeuren.
      </p>

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
          Producttype
          <select
            value={form.product_type}
            onChange={(e) => update('product_type', e.target.value)}
          >
            {PRODUCT_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>

        <label>
          Aantal
          <input
            type="number"
            value={form.quantity}
            onChange={(e) => update('quantity', Number(e.target.value))}
          />
        </label>

        <label>
          Breedte mm
          <input
            type="number"
            value={form.width_mm}
            onChange={(e) => update('width_mm', e.target.value)}
          />
        </label>

        <label>
          Hoogte mm
          <input
            type="number"
            value={form.height_mm}
            onChange={(e) => update('height_mm', e.target.value)}
          />
        </label>

        <label>
          Profielkleur
          <select
            value={form.profile_color}
            onChange={(e) => update('profile_color', e.target.value)}
          >
            {PROFILE_COLORS.map((color) => (
              <option key={color}>{color}</option>
            ))}
          </select>
        </label>

        {form.profile_color === 'RAL-kleur op maat' && (
          <label>
            RAL-code
            <input
              value={form.ral_code}
              onChange={(e) => update('ral_code', e.target.value)}
              placeholder="Bijv. RAL 9016"
            />
          </label>
        )}

        <label>
          Gaassoort
          <select
            value={form.mesh_type}
            onChange={(e) => update('mesh_type', e.target.value)}
          >
            {MESH_TYPES.map((mesh) => (
              <option key={mesh}>{mesh}</option>
            ))}
          </select>
        </label>

        {doorProduct && (
          <>
            <label>
              Onderprofiel
              <input value="Laag onderprofiel" readOnly />
            </label>

            <label>
              Onderprofielkleur
              <select
                value={form.bottom_profile}
                onChange={(e) => update('bottom_profile', e.target.value)}
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
            onChange={(e) => update('manual_price', Number(e.target.value))}
          />
        </label>
      </div>

      {Number(form.quantity) > 1 && (
        <div className="card" style={{ marginTop: 16 }}>
          <strong>Let op bij meerdere stuks</strong>
          <p className="muted">
            Gebruik aantal alleen als de horren dezelfde maat en uitvoering
            hebben. Hebben ze verschillende maten? Maak dan losse regels aan.
          </p>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Automatische offerteomschrijving</h2>
        <p className="muted">{autoDescription}</p>
      </div>

      <label style={{ marginTop: 16 }}>
        Extra klantgerichte opmerking voor offerte
        <textarea
          value={form.customer_note}
          onChange={(e) => update('customer_note', e.target.value)}
          placeholder="Alleen invullen als er iets extra's in de offerte moet komen."
        />
      </label>

      <label style={{ marginTop: 16 }}>
        Interne aandachtspunten voor montage
        <textarea
          value={form.attention_points}
          onChange={(e) => update('attention_points', e.target.value)}
          placeholder="Bijv. dorpel controleren, extra vulstuk meenemen, plakplint verwijderen."
        />
      </label>

      {message && <p className="muted">{message}</p>}

      <div className="row" style={{ marginTop: 16 }}>
        <button disabled={saving} onClick={() => save(false)}>
          {saving ? 'Opslaan...' : 'Opslaan'}
        </button>

        <button
          disabled={saving}
          className="button secondary"
          onClick={() => save(true)}
        >
          {saving ? 'Opslaan...' : 'Opslaan en nieuwe toevoegen'}
        </button>
      </div>
    </div>
  )
}
