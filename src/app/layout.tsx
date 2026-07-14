import './globals.css'
import type { ReactNode } from 'react'
import TopNav from '@/components/TopNav'

export const metadata = {
  title: 'ELKO App v1',
  description: 'Interne inmeet- en offerteapp voor ELKO Solutions',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <TopNav />
        <main>{children}</main>
      </body>
    </html>
  )
}
