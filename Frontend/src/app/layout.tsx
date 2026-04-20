import type { Metadata } from 'next';
import './globals.css';
import { ClientLayout } from './layout-client';

export const metadata: Metadata = {
  title: 'SoftCosy',
  description: 'Gestion des stocks et inventaires',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}