import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';

import { AuthProvider } from '@/contexts/AuthContext';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Odinthor — Your Eyes to your Business',
  description:
    'Odinthor helps solo business owners manage invoices, expenses, payroll, and taxes from one clean dashboard.',
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
};

const fontVariables = {
  '--font-plus-jakarta-sans': "'Plus Jakarta Sans'",
  '--font-ibm-plex-mono': "'IBM Plex Mono'",
} as React.CSSProperties;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" style={fontVariables}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        />
      
      <script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Faccountflo9759back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.21" />
      <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.3" /></head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster position="bottom-right" richColors />
</body>
    </html>
  );
}