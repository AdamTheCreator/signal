import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SIGNAL — AI Learning Platform',
  description: 'Personalized intelligence and learning system for OpenAI SE preparation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
