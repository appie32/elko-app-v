import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ELKO App',
    short_name: 'ELKO',
    description: 'Interne inmeet- en offerteapp voor ELKO Solutions',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#f7f3eb',
    theme_color: '#111827',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
