
'use client'

import { useParams } from 'next/navigation'
import ProductLineEditor from '@/components/ProductLineEditor'

export default function EditProductLinePage() {
  const params = useParams()

  const projectId = params.id as string
  const lineId = params.lineId as string

  return (
    <ProductLineEditor
      projectId={projectId}
      lineId={lineId}
    />
  )
}
