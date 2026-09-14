import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = { title: "About | Pure Motion" };

const studioSpaces = [
  {
    name: "The Power Room",
    body: "Home to 10 custom-ordered Merrithew reformers, the Power Room is where we build strength, control, and confidence. Dynamic Reformer Pilates classes challenge you with purposeful movement and guidance throughout.",
  },
  {
    name: "The Sanctuary",
    body: "With calming sage tones and a quieter atmosphere, the Sanctuary offers space for Mat Pilates, Yoga, and Sound Healing. A place to move mindfully, reconnect with your breath, and leave feeling more grounded.",
  },
];

export default function AboutPage() {
  return (
    <main className="flex-1 bg-bg">
      <Header />
      <div className="mx-auto max-w-3xl px-7 py-8">
        <h1 className="font-display text-[28px] font-bold text-ink">
          Movement that brings us together.
        </h1>

        <div className="mt-5 flex flex-col gap-4 text-[14.5px] leading-relaxed text-ink-secondary">
          <p>
            Pure Motion launched in 2025 with a simple idea: create a studio where people
            feel connected&mdash;to their bodies, their practice, and each other.
          </p>
          <p>
            Set in Jumeirah Golf Estates, our boutique studio brings together Reformer
            Pilates, Mat Pilates, Yoga, and Sound Healing. Thoughtful classes and personal
            guidance give you space to build strength, find balance, and take time for
            yourself.
          </p>
          <p>
            From your first visit to your weekly routine, we want you to feel welcome,
            supported, and inspired to keep moving.
          </p>
        </div>

        <section className="mt-12">
          <h2 className="font-display text-[22px] font-bold text-ink">
            More than a class. A place to find your rhythm.
          </h2>
          <div className="mt-4 flex flex-col gap-4 text-[14.5px] leading-relaxed text-ink-secondary">
            <p>
              Some days, you come to challenge yourself. Other days, you need to slow down
              and reset. There&rsquo;s room for both at Pure Motion.
            </p>
            <p>
              Our instructors meet you where you are, helping you move with confidence
              whether you&rsquo;re stepping onto a reformer for the first time or deepening
              an established practice. Along the way, familiar faces become connections, and
              time in the studio becomes a part of your week you look forward to.
            </p>
          </div>
        </section>

        <section className="mt-12">
          <span className="text-[11px] font-bold uppercase tracking-wider text-accent-strong">
            Our studio
          </span>
          <h2 className="mt-2 font-display text-[22px] font-bold text-ink">
            Two spaces. Room to strengthen and unwind.
          </h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-secondary">
            Our studio is designed to support different ways of moving and feeling well,
            with expert instruction and a personal approach in every class.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {studioSpaces.map((s) => (
              <div key={s.name} className="rounded-2xl border border-border bg-surface p-5">
                <h3 className="font-display text-[16px] font-bold text-ink">{s.name}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <span className="text-[11px] font-bold uppercase tracking-wider text-accent-strong">
            Our purpose
          </span>
          <h2 className="mt-2 font-display text-[22px] font-bold text-ink">
            Make movement a meaningful part of everyday life.
          </h2>
          <div className="mt-3 flex flex-col gap-4 text-[14.5px] leading-relaxed text-ink-secondary">
            <p>
              We believe a lasting practice starts with finding movement you enjoy and a
              place where you feel you belong.
            </p>
            <p>
              Our purpose is to help you build that practice&mdash;with classes that support
              your well-being, instructors who encourage your progress, and a community that
              grows alongside you.
            </p>
          </div>
        </section>

        <Link
          href="/schedule"
          className="mt-8 inline-block rounded-[9px] bg-accent-strong px-4 py-2.5 text-[13px] font-bold text-accent-ink transition hover:brightness-110"
        >
          Book your first class &rarr;
        </Link>
      </div>
      <Footer />
    </main>
  );
}
