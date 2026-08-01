import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Greenstone Management System',
  description: 'Management system for Greenstone daily business operations.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
