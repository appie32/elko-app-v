'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { PHOTO_TYPES } from '@/lib/constants'

type ProjectPhoto = {
  id: string
  file_url: string
  description: string | null
  photo_type: string | null
  product_line_id: string | null
  created_at: string
}
type PhotoProduct = { id: string; room: string; product_type: string }

export default function PhotosPage() {
  const params = useParams()
  const projectId = params.id as string
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [photoType, setPhotoType] = useState('Overzicht')
  const [productLineId, setProductLineId] = useState('')
  const [photos, setPhotos] = useState<ProjectPhoto[]>([])
  const [products, setProducts] = useState<PhotoProduct[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    const [photoResult, productResult] = await Promise.all([
      supabase.from('photos').select('id,file_url,description,photo_type,product_line_id,created_at')
        .eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('product_lines').select('id,room,product_type').eq('project_id', projectId).order('sort_order'),
    ])
    if (photoResult.error || productResult.error) {
      setMessage(`Foto's laden mislukt: ${photoResult.error?.message || productResult.error?.message}`)
    }
    setPhotos((photoResult.data || []) as ProjectPhoto[])
    setProducts((productResult.data || []) as PhotoProduct[])
    setLoading(false)
  }

  useEffect(() => {
    const chosenLine = new URLSearchParams(window.location.search).get('lineId')
    if (chosenLine) { setProductLineId(chosenLine); setPhotoType('Inmeting') }
    refresh()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  async function upload() {
    if (!file || busy) { setMessage('Selecteer eerst een foto.'); return }
    if (file.size > 15 * 1024 * 1024) { setMessage('Maximaal 15 MB per foto.'); return }
    setBusy(true)
    setMessage('Foto uploaden...')
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)
      const path = `${projectId}/${productLineId || 'algemeen'}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('project-photos')
        .upload(path, file, { contentType: file.type || undefined })
      if (uploadError) throw uploadError
      const { data: publicUrl } = supabase.storage.from('project-photos').getPublicUrl(path)
      const { error: dbError } = await supabase.from('photos').insert({
        project_id: projectId,
        product_line_id: productLineId || null,
        file_url: publicUrl.publicUrl,
        file_name: file.name,
        description: description.trim(),
        photo_type: photoType,
      })
      if (dbError) throw dbError
      setFile(null)
      setDescription('')
      setMessage('Foto opgeslagen en gekoppeld aan dit project.')
      await refresh()
    } catch (err: unknown) {
      setMessage(`Foto uploaden mislukt: ${err instanceof Error ? err.message : 'Onbekende fout'}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="card">
        <h1>Projectfoto's en inmeetalbum</h1>
        <p className="muted">Foto's kun je algemeen bewaren of koppelen aan een specifiek product. Dit is dezelfde fotomap als in het project.</p>
        <div className="grid grid-2">
          <label>Foto maken of kiezen
            <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)}/>
          </label>
          <label>Type foto
            <select value={photoType} onChange={e => setPhotoType(e.target.value)}>
              {PHOTO_TYPES.map(type => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label>Koppel aan productregel (optioneel)
            <select value={productLineId} onChange={e => setProductLineId(e.target.value)}>
              <option value="">Algemene projectfoto</option>
              {products.map(product => <option key={product.id} value={product.id}>{product.room} — {product.product_type}</option>)}
            </select>
          </label>
          <label>Omschrijving
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Bijv. draaikiepraam slaapkamer" />
          </label>
        </div>
        {file && <p className="muted">Gekozen: {file.name}</p>}
        <div className="row" style={{marginTop:16}}>
          <button disabled={busy || !file} onClick={upload}>{busy?'Uploaden...':'Foto opslaan'}</button>
          <Link href={`/projects/${projectId}`} className="button secondary">Terug naar project</Link>
        </div>
        {message && <p role="status" className="muted">{message}</p>}
      </div>
      <div className="card">
        <h2>Foto's ({photos.length})</h2>
        {loading && <p className="muted">Foto's laden...</p>}
        {!loading && photos.length === 0 && <p className="muted">Nog geen foto's bij dit project.</p>}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(190px, 1fr))',gap:14}}>
          {photos.map(photo => {
            const product = products.find(item=>item.id===photo.product_line_id)
            return <div key={photo.id} style={{border:'1px solid #e3ded5',borderRadius:12,overflow:'hidden',background:'#fff'}}>
              <a href={photo.file_url} target="_blank" rel="noopener noreferrer">
                <img src={photo.file_url} alt={photo.description || photo.photo_type || 'Projectfoto'}
                  loading="lazy" style={{width:'100%',height:155,objectFit:'cover',display:'block'}}/>
              </a>
              <div style={{padding:10,fontSize:12}}>
                <strong>{photo.photo_type || 'Projectfoto'}</strong>
                <div>{photo.description || 'Geen omschrijving'}</div>
                {product && <div style={{color:'#78624b',marginTop:4}}>{product.room} — {product.product_type}</div>}
              </div>
            </div>
          })}
        </div>
      </div>
    </>
  )
}
