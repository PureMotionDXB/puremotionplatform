import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = { title: "FAQ | Pure Motion" };

export default function FaqPage() {
  return (
    <main className="flex-1 bg-bg">
      <Header />
      <div className="mx-auto max-w-2xl px-7 py-8">
        <h1 className="font-display text-[23px] font-bold text-ink">
          Frequently Asked Questions
        </h1>
        <p className="mt-3 text-[13px] text-muted">
          This page is coming soon. In the meantime, get in touch and we&rsquo;ll answer
          anything you need to know.
        </p>
      </div>
      <Footer />
    </main>
  );
}
