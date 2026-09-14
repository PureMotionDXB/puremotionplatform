import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = { title: "About | Pure Motion" };

export default function AboutPage() {
  return (
    <main className="flex-1 bg-bg">
      <Header />
      <div className="mx-auto max-w-2xl px-7 py-8">
        <h1 className="font-display text-[23px] font-bold text-ink">About Pure Motion</h1>
        <p className="mt-3 text-[13px] text-muted">
          Our full studio story is coming soon. Pure Motion is a boutique Pilates studio in
          Jumeirah Golf Estates, Dubai.
        </p>
      </div>
      <Footer />
    </main>
  );
}
