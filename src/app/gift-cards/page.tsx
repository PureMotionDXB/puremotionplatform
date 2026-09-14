import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = { title: "Gift Cards | Pure Motion" };

export default function GiftCardsPage() {
  return (
    <main className="flex-1 bg-bg">
      <Header />
      <div className="mx-auto max-w-2xl px-7 py-8">
        <h1 className="font-display text-[23px] font-bold text-ink">Gift Cards</h1>
        <p className="mt-3 text-[13px] text-muted">
          Gift cards are coming soon. Want to give the gift of movement in the meantime?
          Reach out and we&rsquo;ll sort it out for you directly.
        </p>
      </div>
      <Footer />
    </main>
  );
}
