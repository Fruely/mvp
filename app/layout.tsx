import '@/styles/globals.css'
import { Inter } from "next/font/google"

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-inter",
})

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
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans text-textPrimary antialiased bg-white">{children}</body>
    </html>
  )
}
