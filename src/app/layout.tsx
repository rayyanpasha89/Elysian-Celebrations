import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { fontVariables } from "@/lib/fonts";
import { ScrollProgress } from "@/components/shared/scroll-progress";
import { TestAuthSwitcher } from "@/components/testing/test-auth-switcher";
import { isTestAuthEnabled } from "@/lib/test-auth";
import "./globals.css";

const siteTitle = "Elysian Celebrations — Luxury Event Planning";
const siteDescription =
  "Discover, design, and operate destination events with curated venues, trusted vendors, and a planning board that connects every day, function, and service.";

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
    "destination event",
    "luxury event planner",
    "event planning",
    "Udaipur event",
    "Goa event",
    "destination event India",
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
  const testAuthEnabled = isTestAuthEnabled();
  const content = (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <ScrollProgress />
        {children}
        {testAuthEnabled ? <TestAuthSwitcher /> : null}
        <Toaster position="bottom-right" richColors toastOptions={{ className: "font-sans" }} />
      </body>
    </html>
  );

  return <ClerkProvider>{content}</ClerkProvider>;
}
