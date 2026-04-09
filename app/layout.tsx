import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Droit au But 3D',
  description: 'Jeu de plateau multijoueur 3D — style Mario Party',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={inter.className} style={{ background: '#0a0a1a' }}>
        {children}
      </body>
    </html>
  );
}
