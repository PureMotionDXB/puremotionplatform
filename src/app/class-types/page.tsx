import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = { title: "Class Types | Pure Motion" };

export default function ClassTypesPage() {
  return (
    <main className="flex-1 bg-bg">
      <Header />
      <div className="mx-auto max-w-2xl px-7 py-8">
        <h1 className="font-display text-[23px] font-bold text-ink">Class Types</h1>
        <p className="mt-3 text-[13px] text-muted">
          A full guide to our Reformer, Mat, and Yoga classes is coming soon. In the
          meantime, browse what&rsquo;s on this week on the schedule.
        </p>
      </div>
      <Footer />
    </main>
  );
}
