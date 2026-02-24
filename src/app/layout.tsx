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
    icon: [{ url: "/icon.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
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
      <head />
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
