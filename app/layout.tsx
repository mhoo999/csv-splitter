import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'csv splitter',
  description: 'CSV 파일을 컬럼별로 분리하여 Excel 파일로 변환',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
