import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = { title: "Events | Pure Motion" };

export default function EventsPage() {
  return (
    <main className="flex-1 bg-bg">
      <Header />
      <div className="mx-auto max-w-2xl px-7 py-8">
        <h1 className="font-display text-[23px] font-bold text-ink">Events</h1>
        <p className="mt-3 text-[13px] text-muted">
          Workshops, sound healing sessions, and community events will be listed here soon.
        </p>
      </div>
      <Footer />
    </main>
  );
}
