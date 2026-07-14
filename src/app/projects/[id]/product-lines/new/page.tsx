'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { BOTTOM_PROFILES, COLOR_CATEGORIES, MESH_TYPES, PRODUCT_TYPES, STANDARD_COLORS } from '@/lib/constants'
import { getFallbackSuggestedPrice } from '@/lib/pricing'

export default function NewProductLinePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [form, setForm] = useState({
    project_id: projectId,
    sort_order: 1,
    room: '',
    product_type: 'Raamhor op maat',
    quantity: 1,
    width_mm: '',
    height_mm: '',
    color_category: 'Standaardkleur',
    standard_color: 'Wit',
    ral_code: '',
    mesh_type: 'Standaard horgaas',
    bottom_profile: '',
    execution_description: '',
    attention_points: '',
    customer_note: '',
    suggested_price: 150,
    manual_price: 150,
  })

  useEffect(() => {
    const suggested = getFallbackSuggestedPrice({
      productType: form.product_type,
      colorCategory: form.color_category,
      meshType: form.mesh_type,
    })

    setForm((prev) => ({
      ...prev,
      suggested_price: suggested,
      manual_price: prev.manual_price === prev.suggested_price ? suggested : prev.manual_price,
    }))
  }, [form.product_type, form.color_category, form.mesh_type])

  function update(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function save(addAnother = false) {
    const payload = {
      ...form,
      width_mm: form.width_mm ? Number(form.width_mm) : null,
      height_mm: form.height_mm ? Number(form.height_mm) : null,
      quantity: Number(form.quantity || 1),
      suggested_price: Number(form.suggested_price || 0),
      manual_price: Number(form.manual_price || 0),
      bottom_profile: form.bottom_profile || null,
      ral_code: form.ral_code || null,
    }

    const { error } = await supabase.from('product_lines').insert(payload)

    if (error) {
      alert(error.message)
      return
    }

    if (addAnother) {
      setForm((prev) => ({
        ...prev,
        room: '',
        width_mm: '',
        height_mm: '',
        execution_description: '',
        attention_points: '',
        customer_note: '',
      }))
    } else {
      router.push(`/projects/${projectId}`)
    }
  }

  return (
    <div className="card">
      <h1>Productregel toevoegen</h1>

      <div className="grid grid-2">
        <label>Ruimte / locatie <input value={form.room} onChange={(e) => update('room', e.target.value)} /></label>
        <label>Producttype
          <select value={form.product_type} onChange={(e) => update('product_type', e.target.value)}>
            {PRODUCT_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label>Aantal <input type="number" value={form.quantity} onChange={(e) => update('quantity', Number(e.target.value))} /></label>
        <label>Breedte mm <input type="number" value={form.width_mm} onChange={(e) => update('width_mm', e.target.value)} /></label>
        <label>Hoogte mm <input type="number" value={form.height_mm} onChange={(e) => update('height_mm', e.target.value)} /></label>
        <label>Kleurcategorie
          <select value={form.color_category} onChange={(e) => update('color_category', e.target.value)}>
            {COLOR_CATEGORIES.map((color) => <option key={color}>{color}</option>)}
          </select>
        </label>
        <label>Standaardkleur
          <select value={form.standard_color} onChange={(e) => update('standard_color', e.target.value)}>
            {STANDARD_COLORS.map((color) => <option key={color}>{color}</option>)}
          </select>
        </label>
        <label>RAL-code <input value={form.ral_code} onChange={(e) => update('ral_code', e.target.value)} placeholder="Bijv. RAL 9016" /></label>
        <label>Gaassoort
          <select value={form.mesh_type} onChange={(e) => update('mesh_type', e.target.value)}>
            {MESH_TYPES.map((mesh) => <option key={mesh}>{mesh}</option>)}
          </select>
        </label>
        <label>Onderprofiel
          <select value={form.bottom_profile} onChange={(e) => update('bottom_profile', e.target.value)}>
            <option value="">Niet van toepassing</option>
            {BOTTOM_PROFILES.map((profile) => <option key={profile}>{profile}</option>)}
          </select>
        </label>
        <label>Richtprijs <input type="number" value={form.suggested_price} readOnly /></label>
        <label>Definitieve prijs <input type="number" value={form.manual_price} onChange={(e) => update('manual_price', Number(e.target.value))} /></label>
      </div>

      <label style={{ marginTop: 16 }}>Uitvoering / omschrijving
        <textarea value={form.execution_description} onChange={(e) => update('execution_description', e.target.value)} />
      </label>

      <label style={{ marginTop: 16 }}>Aandachtspunten
        <textarea value={form.attention_points} onChange={(e) => update('attention_points', e.target.value)} />
      </label>

      <label style={{ marginTop: 16 }}>Klantgerichte opmerking voor offerte
        <textarea value={form.customer_note} onChange={(e) => update('customer_note', e.target.value)} />
      </label>

      <div className="row" style={{ marginTop: 16 }}>
        <button onClick={() => save(false)}>Opslaan</button>
        <button className="button secondary" onClick={() => save(true)}>Opslaan en nieuwe toevoegen</button>
      </div>
    </div>
  )
}
