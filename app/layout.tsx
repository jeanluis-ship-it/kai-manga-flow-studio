import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MANGAI Creator Studio',
  description: 'Crea tu universo, personajes y manga con la asistencia de KAI.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
