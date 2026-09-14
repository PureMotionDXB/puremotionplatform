import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = { title: "Studio Policies | Pure Motion" };

export default function StudioPoliciesPage() {
  return (
    <main className="flex-1 bg-bg">
      <Header />
      <div className="mx-auto max-w-2xl px-7 py-8">
        <h1 className="font-display text-[23px] font-bold text-ink">Studio Policies</h1>
        <p className="mt-3 text-[13px] text-muted">
          Our full studio policies are coming soon. In the meantime, booking, cancellation,
          and class etiquette rules are covered in our{" "}
          <Link href="/terms" className="font-semibold text-accent-strong hover:underline">
            Terms &amp; Conditions
          </Link>
          .
        </p>
      </div>
      <Footer />
    </main>
  );
}
