import type { Metadata } from "next";
import { Cinzel, Noto_Sans } from "next/font/google";
import { SiteJsonLd } from "@/components/seo/site-json-ld";
import { getSiteUrl } from "@/lib/site";
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

const siteUrl = getSiteUrl();
const defaultDescription =
  "HighHeavenSect — a casual SEA English Where Winds Meet (WWM) guild. Community site for schedule, quizzes, giveaways, and Discord. The Martial Path is long, but no cultivator walks it alone.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  title: {
    default: "HighHeavenSect | WWM guild · SEA English",
    template: "%s | HighHeavenSect",
  },
  description: defaultDescription,
  keywords: [
    "HighHeavenSect",
    "High Heaven Sect",
    "Where Winds Meet",
    "WWM",
    "WWM guild",
    "Where Winds Meet guild",
    "SEA guild",
    "English guild",
    "WWM community",
    "wuxia guild",
  ],
  applicationName: "HighHeavenSect",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: ["/icon.svg"],
    apple: ["/icon.svg"],
  },
  openGraph: {
    type: "website",
    locale: "en",
    url: siteUrl,
    siteName: "HighHeavenSect",
    title: "HighHeavenSect | Where Winds Meet (WWM) SEA English guild",
    description: defaultDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: "HighHeavenSect | WWM SEA English guild",
    description: defaultDescription,
  },
  robots: { index: true, follow: true },
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
        <SiteJsonLd />
        {children}
      </body>
    </html>
  );
}
