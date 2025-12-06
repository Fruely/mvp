import '@/styles/globals.css'

export const metadata = {
  title: 'Freuly - Специалист на твоём языке',
  description: 'Найди специалиста, который говорит на твоём языке',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
