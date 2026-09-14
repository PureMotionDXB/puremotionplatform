import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = { title: "Contact | Pure Motion" };

export default function ContactPage() {
  return (
    <main className="flex-1 bg-bg">
      <Header />
      <div className="mx-auto max-w-2xl px-7 py-8">
        <h1 className="font-display text-[23px] font-bold text-ink">Contact Us</h1>
        <div className="mt-4 flex flex-col gap-2 text-[14px] text-ink-secondary">
          <p>B Floor, ONE at Me&rsquo;aisem First, Jumeirah Golf Estates, Dubai, UAE</p>
          <p>
            <a href="tel:+971542336404" className="font-semibold text-accent-strong hover:underline">
              +971 54 233 6404
            </a>
          </p>
          <p>
            <a
              href="mailto:info@puremotion.ae"
              className="font-semibold text-accent-strong hover:underline"
            >
              info@puremotion.ae
            </a>
          </p>
          <p>Instagram — @puremotion.ae</p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
