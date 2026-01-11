import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CSV Splitter - 컬럼 분리 서비스',
  description: 'CSV 파일을 컬럼별로 분리하여 Excel 파일로 변환',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
