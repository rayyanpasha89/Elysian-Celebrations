import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SmoothScrollProvider } from "@/components/shared/smooth-scroll-provider";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SmoothScrollProvider>
      <Navbar />
      <main className="flex-1 overflow-x-clip bg-ivory">{children}</main>
      <Footer />
    </SmoothScrollProvider>
  );
}
