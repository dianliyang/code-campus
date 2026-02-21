import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import PWARegister from "@/components/PWARegister";
import BackToTop from "@/components/common/BackToTop";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "CodeCampus | CS Course Aggregator",
    template: "%s | CodeCampus",
  },
  description: "Find the best computer science courses from top universities.",
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg?v=3", type: "image/svg+xml" },
      { url: "/icons/icon-72x72.png?v=3", sizes: "72x72", type: "image/png" },
      { url: "/icons/icon-96x96.png?v=3", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-128x128.png?v=3", sizes: "128x128", type: "image/png" },
      { url: "/icons/icon-192x192.png?v=3", sizes: "192x192", type: "image/png" },
    ],
    shortcut: ["/icon.svg?v=3", "/icons/icon-192x192.png?v=3"],
    apple: [
      { url: "/icons/icon-180x180.png?v=3", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-192x192.png?v=3", sizes: "192x192", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CodeCampus",
  },
  openGraph: {
    type: "website",
    siteName: "CodeCampus",
    title: "CodeCampus | CS Course Aggregator",
    description: "Find the best computer science courses from top universities.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg?v=3" type="image/svg+xml" />
        <link rel="shortcut icon" href="/icon.svg?v=3" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-180x180.png?v=3" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png?v=3" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png?v=3" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-180x180.png?v=3" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <BackToTop />
        <PWARegister />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
