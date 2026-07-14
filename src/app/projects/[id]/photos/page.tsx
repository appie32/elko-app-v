'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { PHOTO_TYPES } from '@/lib/constants'

export default function PhotosPage() {
  const params = useParams()
  const projectId = params.id as string

  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [photoType, setPhotoType] = useState('Overzicht')
  const [message, setMessage] = useState('')

  async function upload() {
    if (!file) return

    const filePath = `${projectId}/${Date.now()}-${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('project-photos')
      .upload(filePath, file)

    if (uploadError) {
      alert(uploadError.message)
      return
    }

    const { data: publicUrlData } = supabase.storage
      .from('project-photos')
      .getPublicUrl(filePath)

    const { error: insertError } = await supabase.from('photos').insert({
      project_id: projectId,
      file_url: publicUrlData.publicUrl,
      file_name: file.name,
      description,
      photo_type: photoType,
    })

    if (insertError) {
      alert(insertError.message)
      return
    }

    setMessage('Foto opgeslagen.')
    setFile(null)
    setDescription('')
  }

  return (
    <div className="card">
      <h1>Foto toevoegen</h1>
      <div className="grid">
        <label>Foto <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
        <label>Type foto
          <select value={photoType} onChange={(e) => setPhotoType(e.target.value)}>
            {PHOTO_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label>Omschrijving
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <button onClick={upload}>Foto uploaden</button>
        {message && <p className="muted">{message}</p>}
      </div>
    </div>
  )
}
