import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Elko App',
    short_name: 'Elko',
    description: 'Interne inmeet- en offerteapp voor Elko Solutions',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#E7DCC9',
    theme_color: '#4A3520',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
