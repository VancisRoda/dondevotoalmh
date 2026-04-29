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
  title: "¿Dónde voto al MH?",
  description:
    "Consulta tu DNI en el padrón definitivo del Movimiento Humanista y descarga tu comprobante en PDF.",
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
