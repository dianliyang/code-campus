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
    default: "Flash | Smart Learning Platform",
    template: "%s | Flash",
  },
  description: "Find the best computer science courses from top universities.",
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icon.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Flash",
  },
  openGraph: {
    type: "website",
    siteName: "Flash",
    title: "Flash | Smart Learning Platform",
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=MuseoModerno:ital,wght@0,100..900;1,100..900&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon.png" />
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
