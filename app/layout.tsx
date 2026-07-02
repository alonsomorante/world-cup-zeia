import type { Metadata } from "next";
import { Bebas_Neue, Crimson_Pro } from "next/font/google";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-display",
  subsets: ["latin"],
});

const crimsonPro = Crimson_Pro({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quiniela Mundial 2026",
  description: "Adivina los resultados con tus compañeros de trabajo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${bebasNeue.variable} ${crimsonPro.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body bg-[#f7f3e8] text-[#1a1a1a]">
        {children}
      </body>
    </html>
  );
}
