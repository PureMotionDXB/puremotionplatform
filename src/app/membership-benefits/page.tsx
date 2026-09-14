import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = { title: "Membership Benefits | Pure Motion" };

export default function MembershipBenefitsPage() {
  return (
    <main className="flex-1 bg-bg">
      <Header />
      <div className="mx-auto max-w-2xl px-7 py-8">
        <h1 className="font-display text-[23px] font-bold text-ink">Membership Benefits</h1>
        <p className="mt-3 text-[13px] text-muted">
          A full breakdown of what comes with an Unlimited Membership is coming soon. See
          current membership pricing on our{" "}
          <Link href="/pricing" className="font-semibold text-accent-strong hover:underline">
            Packages
          </Link>{" "}
          page.
        </p>
      </div>
      <Footer />
    </main>
  );
}
