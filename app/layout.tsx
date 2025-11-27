import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bill Splitter - Divide Cuentas de Restaurantes",
  description: "Aplicación para dividir cuentas de restaurantes usando OCR",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

