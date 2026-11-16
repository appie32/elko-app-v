
'use client'

import { useParams } from 'next/navigation'
import ProductLineEditor from '@/components/ProductLineEditor'

export default function NewProductLinePage() {
  const params = useParams()
  const projectId = params.id as string

  return <ProductLineEditor projectId={projectId} />
}
