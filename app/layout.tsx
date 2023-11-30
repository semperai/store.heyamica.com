import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'store.heyamica.com',
  description: 'Storage api for heyamica.com',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
