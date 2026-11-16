'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import {
  PRODUCT_GROUPS,
  PROFILE_COLORS,
  buildProductDescription,
  getGroupForProduct,
  isHorDoor,
  productsForGroup,
  startingOptions,
  suggestedPrice,
  usesMesh,
  type ProductGroup,
  type ProductOptions,
} from '@/lib/product-catalog'

const firstProduct = PRODUCT_GROUPS[0].products[0]
type FormValues = {
  group: ProductGroup
  product: string
  room: string
  quantity: string
  width: string
  height: string
  ralCode: string
  unitPrice: string
  attentionPoints: string
  customerNote: string
  description: string
  options: ProductOptions
}

function initialForm(): FormValues {
  return {
    group: 'Horren', product: firstProduct, room: '', quantity: '1', width: '', height: '',
    ralCode: '', unitPrice: String(suggestedPrice(firstProduct) ?? ''),
    attentionPoints: '', customerNote: '', description: '', options: startingOptions(),
  }
}

const fieldStyle: CSSProperties = { marginTop: 8 }
const sectionStyle: CSSProperties = { marginTop: 24 }
const selectedStyle: CSSProperties = { border: '2px solid #4A3520', background: '#f4ede2', color: '#30271d', borderRadius: 14 }
const neutralStyle: CSSProperties = { border: '1px solid #d7d0c5', background: '#fff', color: '#30271d', borderRadius: 14 }

export default function ProductLineEditor({ projectId, lineId }: { projectId: string; lineId?: string }) {
  const router = useRouter()
  const editing = Boolean(lineId)
  const [form, setForm] = useState<FormValues>(() => initialForm())
  const [loading, setLoading] = useState(Boolean(lineId))
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [manualDescription, setManualDescription] = useState(false)

  useEffect(() => {
    if (!lineId) return
    let active = true
    async function load() {
      const { data, error } = await supabase.from('product_lines').select('*')
        .eq('id', lineId).eq('project_id', projectId).single()
      if (!active) return
      if (error || !data) { setLoadError(error?.message || 'Productregel niet gevonden'); setLoading(false); return }
      const savedOptions = data.product_options && typeof data.product_options === 'object' && !Array.isArray(data.product_options)
        ? data.product_options as ProductOptions : {}
      const bottom = String(data.bottom_profile || '')
      const options: ProductOptions = {
        ...startingOptions(),
        profile_color: data.ral_code ? 'RAL-kleur op maat' : (data.profile_color || data.standard_color || 'Wit — RAL 9016'),
        mesh_type: data.mesh_type || 'Standaard horgaas',
        bottom_profile_type: bottom.toLowerCase().includes('hoog') ? 'Hoog onderprofiel' : 'Laag onderprofiel',
        bottom_profile_color: bottom.toLowerCase().includes('zwart') ? 'Zwart' : bottom.toLowerCase().includes('aluminium') ? 'Aluminium' : 'Wit',
        profile_width: String(data.execution_description || '').toLowerCase().includes('3 cm') ? 'Slim profiel 3 cm' : 'Standaard profiel 4 cm',
        ...savedOptions,
      }
      const group: ProductGroup = (PRODUCT_GROUPS.some(g => g.key === data.product_group)
        ? data.product_group : getGroupForProduct(data.product_type)) as ProductGroup
      setForm({
        group, product: data.product_type || firstProduct, room: data.room || '',
        quantity: String(data.quantity ?? 1),
        width: data.width_mm == null ? '' : String(data.width_mm),
        height: data.height_mm == null ? '' : String(data.height_mm),
        ralCode: data.ral_code || '', unitPrice: String(data.manual_price ?? ''),
        attentionPoints: data.attention_points || '', customerNote: data.customer_note || '',
        description: data.execution_description || '', options,
      })
      setManualDescription(true) // bestaande omschrijving nooit stilzwijgend overschrijven
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [projectId, lineId])

  const autoDescription = useMemo(() => buildProductDescription({
    product: form.product, room: form.room, width: form.width, height: form.height,
    options: form.options, ralCode: form.ralCode,
  }), [form])

  const descriptionToSave = manualDescription ? form.description : autoDescription
  const products = useMemo(() => {
    const base = productsForGroup(form.group)
    if (form.product && !base.includes(form.product)) base.unshift(form.product)
    return base
  }, [form.group, form.product])

  function update<K extends keyof Omit<FormValues,'options'>>(key: K, value: FormValues[K]) {
    setForm(previous => ({ ...previous, [key]: value }))
    setNotice('')
  }
  function changeOptions(key: keyof ProductOptions, value: string) {
    setForm(previous => ({ ...previous, options: { ...previous.options, [key]: value } }))
    setNotice('')
  }
  function switchGroup(group: ProductGroup) {
    const product = productsForGroup(group)[0]
    setForm(previous => ({ ...previous, group, product, unitPrice: String(suggestedPrice(product) ?? ''), description: '' }))
    setManualDescription(false)
    setNotice('')
  }
  function switchProduct(product: string) {
    const beforeSuggestion = suggestedPrice(form.product)
    const afterSuggestion = suggestedPrice(product)
    const shouldReplace = form.unitPrice === '' || form.unitPrice === String(beforeSuggestion ?? '')
    setForm(previous => ({
      ...previous, product, unitPrice: shouldReplace ? String(afterSuggestion ?? '') : previous.unitPrice,
      options: { ...previous.options, mesh_type: product === 'Klikplissé raamhor' ? 'Standaard horgaas' : previous.options.mesh_type },
      description: '',
    }))
    setManualDescription(false)
    setNotice('')
  }

  async function save(addAnother: boolean) {
    if (saving) return
    if (!form.room.trim()) { setNotice('Vul de ruimte of locatie in.'); return }
    const qty = Number(form.quantity)
    if (!Number.isInteger(qty) || qty < 1 || qty > 999) { setNotice('Aantal moet een geheel getal tussen 1 en 999 zijn.'); return }
    for (const [label, value] of [['Breedte', form.width], ['Hoogte', form.height]]) {
      if (value && (!Number.isInteger(Number(value)) || Number(value) <= 0)) { setNotice(`${label} moet een positief aantal millimeters zijn.`); return }
    }
    const price = form.unitPrice === '' ? 0 : Number(form.unitPrice.replace(',', '.'))
    if (!Number.isFinite(price) || price < 0) { setNotice('Vul een geldig bedrag per stuk in.'); return }
    if (form.options.profile_color === 'RAL-kleur op maat' && !form.ralCode.trim()
      && (form.group === 'Horren' || form.group === 'Screens' || form.group === 'Rolluiken')) {
      setNotice('Vul de RAL-code in bij eigen RAL-kleur.'); return
    }
    const color = form.options.profile_color || ''
    const ral = color === 'RAL-kleur op maat' ? form.ralCode.trim() : null
    const isHor = form.group === 'Horren'
    const bottom = isHorDoor(form.product)
      ? `${form.options.bottom_profile_type || ''} - ${form.options.bottom_profile_color || ''}` : 'Niet van toepassing'
    const payload = {
      room: form.room.trim(), product_group: form.group, product_type: form.product,
      quantity: qty, width_mm: form.width ? Number(form.width) : null,
      height_mm: form.height ? Number(form.height) : null,
      color_category: ral ? 'RAL-kleur op maat' : 'Standaardkleur',
      standard_color: ral ? null : ((isHor || form.group === 'Screens' || form.group === 'Rolluiken') ? color : null),
      profile_color: ral ? null : ((isHor || form.group === 'Screens' || form.group === 'Rolluiken') ? color : null),
      ral_code: ral,
      mesh_type: usesMesh(form.product) ? form.options.mesh_type || 'Standaard horgaas' : null,
      bottom_profile: bottom,
      product_options: { ...form.options },
      execution_description: descriptionToSave.trim() || autoDescription,
      attention_points: form.attentionPoints.trim(), customer_note: form.customerNote.trim(),
      manual_price: price,
      suggested_price: suggestedPrice(form.product),
    }
    setSaving(true)
    setNotice('Productregel opslaan...')
    try {
      if (editing) {
        const { error } = await supabase.from('product_lines').update(payload)
          .eq('id', lineId!).eq('project_id', projectId)
        if (error) throw error
      } else {
        const { data, error: sortError } = await supabase.from('product_lines')
          .select('sort_order').eq('project_id', projectId).order('sort_order', { ascending: false }).limit(1)
        if (sortError) throw sortError
        const sortOrder = Number(data?.[0]?.sort_order || 0) + 1
        const { error } = await supabase.from('product_lines').insert({ ...payload, project_id: projectId, sort_order: sortOrder })
        if (error) throw error
      }
      if (addAnother && !editing) {
        setForm(previous => ({ ...previous, room: '', quantity: '1', width: '', height: '', customerNote: '',
          attentionPoints: '', description: '', options: { ...previous.options, notes_extra: '' } }))
        setManualDescription(false)
        setNotice('Opgeslagen. Je kunt de volgende productregel invoeren, ook uit een andere productgroep.')
        setSaving(false)
        return
      }
      router.push(`/projects/${projectId}`)
      router.refresh()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String((error as {message?:string})?.message || error)
      setNotice(`Opslaan mislukt: ${msg}${/product_group|product_options|column.*does not exist|schema cache/i.test(msg) ? ' — voer eerst het meegeleverde SQL-script uit in Supabase.' : ''}`)
      setSaving(false)
    }
  }

  function simpleSelect(label: string, key: keyof ProductOptions, choices: string[]) {
    return <label key={key} style={fieldStyle}>{label}
      <select value={form.options[key] || ''} onChange={event => changeOptions(key, event.target.value)}>
        {!choices.includes(form.options[key] || '') && <option value={form.options[key] || ''}>{form.options[key] || 'Selecteer'}</option>}
        {choices.map(choice => <option key={choice} value={choice}>{choice}</option>)}
      </select>
    </label>
  }

  if (loading) return <div className="card">Productregel laden...</div>
  if (loadError) return <div className="card" role="alert">Laden mislukt: {loadError}</div>

  return <div className="card">
    <h1>{editing ? 'Productregel aanpassen' : 'Product toevoegen'}</h1>
    <p className="muted">Kies een productgroep en uitvoering. Eén project kan verschillende productgroepen bevatten.</p>
    <h2 style={sectionStyle}>1. Productgroep</h2>
    <div className="grid grid-2">
      {PRODUCT_GROUPS.map(group => <button type="button" key={group.key}
        style={{ ...(form.group === group.key ? selectedStyle : neutralStyle), justifyContent: 'flex-start', gap: 12, minHeight: 64, fontSize: 15 }}
        onClick={() => switchGroup(group.key)}>
        <span aria-hidden="true" style={{ fontSize: 24 }}>{group.icon}</span>{group.key}
      </button>)}
    </div>
    <h2 style={sectionStyle}>2. Product</h2>
    <div className="grid grid-2">
      {products.map(product => <button type="button" key={product}
        style={{ ...(form.product === product ? selectedStyle : neutralStyle), minHeight: 54, textAlign: 'left', justifyContent: 'flex-start' }}
        onClick={() => switchProduct(product)}>{product}</button>)}
    </div>
    <h2 style={sectionStyle}>3. Inmeten</h2>
    <div className="grid grid-2">
      <label>Ruimte / locatie *<input value={form.room} onChange={e => update('room', e.target.value)} placeholder="Bijv. slaapkamer, raam links" /></label>
      <label>Aantal *<input type="number" min="1" step="1" value={form.quantity} onChange={e => update('quantity', e.target.value)} onFocus={e => e.target.select()} /></label>
      <label>Breedte in mm<input type="number" min="1" step="1" value={form.width} onChange={e => update('width', e.target.value)} onFocus={e => e.target.select()} placeholder="Bijv. 890" /></label>
      <label>Hoogte in mm<input type="number" min="1" step="1" value={form.height} onChange={e => update('height', e.target.value)} onFocus={e => e.target.select()} placeholder="Bijv. 2200" /></label>
    </div>
    {Number(form.quantity) > 1 && <p className="muted">Aantal groter dan 1 geldt alleen voor producten met dezelfde maten en uitvoering. Voeg anders aparte regels toe.</p>}
    <h2 style={sectionStyle}>4. Uitvoering — {form.group}</h2>
    {(form.group === 'Horren' || form.group === 'Screens' || form.group === 'Rolluiken') && <>
      <p className="muted">Kleuren op het scherm zijn een benadering. De RAL-code is leidend.</p>
      <div className="grid grid-2">
        {PROFILE_COLORS.map(color => <button type="button" key={color.value}
          style={{ ...(form.options.profile_color === color.value ? selectedStyle : neutralStyle), display: 'flex', justifyContent: 'flex-start', gap: 12, minHeight: 57 }}
          onClick={() => changeOptions('profile_color', color.value)}>
          <span style={{ width: 27, height: 27, borderRadius: 6, background: color.hex, border: '1px solid #a9a29a', flexShrink: 0 }} />
          {color.label}
        </button>)}
      </div>
      {form.options.profile_color === 'RAL-kleur op maat' && <label style={fieldStyle}>RAL-code *<input value={form.ralCode} onChange={e => update('ralCode', e.target.value)} placeholder="Bijv. RAL 7035 mat" /></label>}
    </>}
    {form.group === 'Horren' && <div className="grid grid-2" style={fieldStyle}>
      {simpleSelect('Profielbreedte', 'profile_width', ['Standaard profiel 4 cm','Slim profiel 3 cm', 'Nog te bepalen'])}
      {usesMesh(form.product) && simpleSelect('Gaassoort', 'mesh_type', form.product === 'Klikplissé raamhor' ? ['Standaard horgaas'] : ['Standaard horgaas', 'Premium / anti-pollen gaas', 'Extra transparant gaas', 'Petscreen'])}
      {isHorDoor(form.product) && <>
        {simpleSelect('Onderprofiel', 'bottom_profile_type', ['Laag onderprofiel', 'Hoog onderprofiel', 'Nog te bepalen'])}
        {simpleSelect('Onderprofielkleur', 'bottom_profile_color', ['Wit', 'Zwart', 'Aluminium', 'Nog te bepalen'])}
      </>}
      {form.product === 'Duo opbouw plissé raamhor' && <>
        {simpleSelect('Gordijnstof', 'light_control', ['Lichtdoorlatend','Lichtwerend','Verduisterend', 'Nog te bepalen'])}
        <label>Stofkleur<input value={form.options.fabric_color || ''} onChange={e => changeOptions('fabric_color', e.target.value)} /></label>
      </>}
    </div>}
    {form.group === 'Plisségordijnen' && <div className="grid grid-2" style={fieldStyle}>
      <label>Stofkleur / kleurnummer<input value={form.options.fabric_color || ''} onChange={e => changeOptions('fabric_color', e.target.value)} placeholder="Bijv. antraciet 102" /></label>
      <label>Stofsoort / collectie<input value={form.options.fabric_type || ''} onChange={e => changeOptions('fabric_type', e.target.value)} placeholder="Bijv. honeycomb isolerend" /></label>
      {simpleSelect('Lichtdoorlaat', 'light_control', ['Lichtdoorlatend', 'Lichtwerend', '100% verduisterend', 'Nog te bepalen'])}
      {simpleSelect('Bediening', 'operation', ['Top-down bottom-up (TDBU)', 'Top-down', 'Bottom-up', 'Handgreep', 'Koord', 'Nog te bepalen'])}
      {simpleSelect('Montage', 'mounting', ['In de dag', 'Op de dag', 'Zonder boren / in frame', 'Dakraam', 'Veranda / plafond', 'Nog te bepalen'])}
      {form.product === 'Plissé & hor' && simpleSelect('Gaassoort', 'mesh_type', ['Standaard horgaas','Premium / anti-pollen gaas','Nog te bepalen'])}
    </div>}
    {(form.group === 'Screens' || form.group === 'Rolluiken') && <div className="grid grid-2" style={fieldStyle}>
      <label>Kastvorm / afmetingen<input value={form.options.cassette || ''} onChange={e => changeOptions('cassette', e.target.value)} placeholder="Bijv. kast 100 mm, vierkant" /></label>
      <label>Geleiders<input value={form.options.guides || ''} onChange={e => changeOptions('guides', e.target.value)} placeholder="Bijv. ZIP-geleiders" /></label>
      {form.group === 'Screens' && <>
        <label>Doeksoort / collectie<input value={form.options.screen_fabric || ''} onChange={e => changeOptions('screen_fabric', e.target.value)} placeholder="Bijv. Soltis / Copaco" /></label>
        <label>Doekkleur<input value={form.options.screen_fabric_color || ''} onChange={e => changeOptions('screen_fabric_color', e.target.value)} placeholder="Bijv. grijs / zwart" /></label>
      </>}
      {form.group === 'Rolluiken' && <label>Lamellen / kleur<input value={form.options.shutter_slats || ''} onChange={e => changeOptions('shutter_slats', e.target.value)} placeholder="Bijv. aluminium, antraciet" /></label>}
      {simpleSelect('Motorfabrikant', 'motor_brand', ['Nog te bepalen', 'Somfy', 'AOK', 'Anders'])}
      {simpleSelect('Bediening', 'operation', ['Nog te bepalen', 'Afstandsbediening', 'Wandschakelaar', 'App / smart home', 'Schakelaar + afstandsbediening'])}
      {simpleSelect('Montagewijze', 'mounting', ['Nog te bepalen', 'Op de dag', 'In de dag', 'Gevelmontage'])}
      <p className="muted">De aandrijving is gekoppeld aan het gekozen product: {form.product.startsWith('Solar') ? 'solar' : 'elektrisch'}.</p>
    </div>}
    <label style={sectionStyle}>Aanvullende uitvoering / bijzonderheden
      <textarea value={form.options.notes_extra || ''} onChange={e => changeOptions('notes_extra', e.target.value)} placeholder="Bijv. draairichting, vaste vleugel, montageruimte, voedingspunt" />
    </label>
    <h2 style={sectionStyle}>5. Prijs en offerte</h2>
    <div className="grid grid-2">
      <label>Prijs per stuk incl. btw (€)<input inputMode="decimal" value={form.unitPrice} onChange={e => update('unitPrice', e.target.value)} placeholder="Handmatig invoeren" /></label>
      <label>Totaal incl. btw (€)<input readOnly value={new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format((Number(form.unitPrice.replace(',','.')) || 0) * (Number(form.quantity) || 0))} /></label>
    </div>
    {suggestedPrice(form.product) != null && <p className="muted">Indicatieve richtprijs voor {form.product}: € {suggestedPrice(form.product)} per stuk. Controleer altijd de definitieve maatwerkprijs.</p>}
    {!form.unitPrice && <p className="muted">Zonder prijs kun je de inmeting als conceptregel opslaan (bedrag € 0,00). Vul de prijs in voordat je de offerte verstuurt.</p>}
    <div className="card" style={{ background: '#f9f6f1', marginTop: 16 }}>
      <h3>Offerteomschrijving</h3>
      <p className="muted">Automatisch opgebouwd uit de gekozen productopties. Je kunt hem hieronder zelf aanpassen.</p>
      <label><textarea value={manualDescription ? form.description : autoDescription} onChange={e => { setManualDescription(true); update('description', e.target.value) }} /></label>
      {manualDescription && <button type="button" className="button secondary" style={{ marginTop: 10 }} onClick={() => { setManualDescription(false); update('description', '') }}>Automatische omschrijving gebruiken</button>}
    </div>
    <label style={fieldStyle}>Klantgerichte opmerking<textarea value={form.customerNote} onChange={e => update('customerNote', e.target.value)} /></label>
    <label style={fieldStyle}>Interne montage- en inmeetnotities (niet op offerte)<textarea value={form.attentionPoints} onChange={e => update('attentionPoints', e.target.value)} /></label>
    {notice && <p role="status" style={{ color: notice.includes('mislukt') ? '#9b2525' : '#4A3520', marginTop: 15 }}>{notice}</p>}
    <div className="row" style={{ marginTop: 18 }}>
      <button disabled={saving} onClick={() => save(false)}>{saving ? 'Opslaan...' : editing ? 'Wijzigingen opslaan' : 'Productregel opslaan'}</button>
      {!editing && <button className="button secondary" disabled={saving} onClick={() => save(true)}>Opslaan en volgende toevoegen</button>}
      <button className="button secondary" disabled={saving} onClick={() => router.push(`/projects/${projectId}`)}>Terug naar project</button>
    </div>
  </div>
}
