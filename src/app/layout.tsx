import type { Metadata } from "next";
import { Anton, Oswald, Roboto_Condensed } from "next/font/google";

import "./globals.css";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
});

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
});

const robotoCondensed = Roboto_Condensed({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://dondevotoalmh.vercel.app"),
  title: "¿Dónde voto al MH?",
  description: "Consultá tu mesa y tu orden de votación con tu DNI.",
  openGraph: {
    title: "¿Dónde voto al MH?",
    description: "Consultá tu mesa y tu orden de votación con tu DNI.",
    siteName: "¿Dónde voto al MH?",
    type: "website",
    locale: "es_AR",
    images: [
      {
        url: "/favicon.png",
        width: 1600,
        height: 1600,
        alt: "Movimiento Humanista",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "¿Dónde voto al MH?",
    description: "Consultá tu mesa y tu orden de votación con tu DNI.",
    images: ["/favicon.png"],
  },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png", sizes: "1600x1600" }],
    shortcut: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/favicon.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${anton.variable} ${oswald.variable} ${robotoCondensed.variable}`}
      lang="es"
    >
      <body>{children}</body>
    </html>
  );
}
