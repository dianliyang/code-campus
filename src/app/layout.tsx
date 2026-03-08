import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import PWARegister from "@/components/PWARegister";
import BackToTop from "@/components/common/BackToTop";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "Athena | Smart Learning Platform",
    template: "%s | Athena",
  },
  description: "Find the best computer science courses from top universities.",
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/athena.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Athena",
  },
  openGraph: {
    type: "website",
    siteName: "Athena",
    title: "Athena | Smart Learning Platform",
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
        <link rel="apple-touch-icon" href="/apple-touch-icon" sizes="180x180" />
        <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/athena.svg" type="image/svg+xml" />
      </head>
      <body className="antialiased">
        <TooltipProvider>
          {children}
          <Toaster position="bottom-right" />
          <BackToTop />
          <PWARegister />
          <SpeedInsights />
          <Analytics />
        </TooltipProvider>
      </body>
    </html>
  );
}
