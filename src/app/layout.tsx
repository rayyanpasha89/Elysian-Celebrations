import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { fontVariables } from "@/lib/fonts";
import { ScrollProgress } from "@/components/shared/scroll-progress";
import "./globals.css";

const siteTitle = "Elysian Celebrations — Luxury Destination Weddings";
const siteDescription =
  "Discover, plan, and celebrate your dream destination wedding. Curated destinations, trusted vendors, and transparent budgeting—from first vision to last dance.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://elysiancelebrations.com",
  ),
  title: {
    default: siteTitle,
    template: "%s | Elysian Celebrations",
  },
  description: siteDescription,
  keywords: [
    "destination wedding",
    "luxury wedding planner",
    "wedding planning",
    "Udaipur wedding",
    "Goa wedding",
    "destination wedding India",
  ],
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    locale: "en_IN",
    siteName: "Elysian Celebrations",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <ScrollProgress />
        {children}
        <Toaster position="bottom-right" richColors toastOptions={{ className: "font-sans" }} />
      </body>
    </html>
  );

  return <ClerkProvider>{content}</ClerkProvider>;
}
