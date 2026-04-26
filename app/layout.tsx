import type { Metadata } from "next";
import { Cinzel, Noto_Sans } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const noto = Noto_Sans({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "HighHeavenSect | Walk the Martial Path",
  description:
    "A casual SEA English wuxia guild. The Martial Path is long, but no cultivator walks it alone.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${cinzel.variable} ${noto.variable} min-h-screen bg-void font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
