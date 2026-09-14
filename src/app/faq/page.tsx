import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = { title: "FAQ | Pure Motion" };

const faqs = [
  {
    q: "Do you have beginner classes?",
    a: "Yes, absolutely. Our classes are designed to be welcoming for all levels, including beginners. Our instructors will guide you every step of the way and offer options that feel right for your body. Please look out for Beginner classes on our schedule, and our Mixed classes also support beginners.",
  },
  {
    q: "Are your classes mixed or ladies only?",
    a: "Our classes are mixed and open to everyone. We’ve built a space that feels comfortable, safe, and inclusive for all. We also have dedicated ladies only classes on our schedule.",
  },
  {
    q: "Do you offer free trials?",
    a: "We don’t offer free trials, but we do have amazing introductory offers for first-time clients so you can experience the studio and see how it feels for you.",
  },
  {
    q: "Do you have any offers?",
    a: "Yes, we regularly share special offers and seasonal promotions with our community. The best way to stay updated is through our Instagram or website.",
  },
  {
    q: "Where are you located?",
    a: "We’re based in Jumeirah Golf Estates, Dubai. The studio is easy to access with plenty of free parking available in the building.",
  },
  {
    q: "How do I book a class?",
    a: "You can book all of our classes right here on the website — it’s quick and easy.",
  },
  {
    q: "What should I bring to class?",
    a: "Just yourself and comfortable clothing. For Reformer classes, grip socks are required and available to purchase at the studio if you need.",
  },
  {
    q: "What is your cancellation policy?",
    a: "We have a 12-hour cancellation policy to be fair to all clients. Cancelling or not showing up within 12 hours of your class will result in a lost credit and an AED 40 late fee.",
  },
  {
    q: "Can I arrive late to class?",
    a: "We have a strict 5-minute late policy to respect the flow of the class and everyone in the room. After that, the doors are closed.",
  },
  {
    q: "Do you offer private sessions?",
    a: "Yes, we do offer private and semi-private sessions. Just reach out to us and we’ll help you arrange something that suits you.",
  },
  {
    q: "Do you have memberships or packages?",
    a: "Yes, we offer a range of packages and memberships depending on what works best for your routine. Visit our Packages page to explore.",
  },
  {
    q: "Is there parking available?",
    a: "Yes, there is plenty of free parking available within the building, dedicated to our clients, in the basement level.",
  },
  {
    q: "What classes do you offer?",
    a: "We offer Reformer Pilates, Mat Pilates, and Yoga, all designed to support both body and mind.",
  },
];

export default function FaqPage() {
  return (
    <main className="flex-1 bg-bg">
      <Header />
      <div className="mx-auto max-w-2xl px-7 py-8">
        <h1 className="font-display text-[26px] font-bold text-ink">
          Frequently Asked Questions
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-secondary">
          Everything you might want to know before you step into the studio &mdash; classes,
          booking, packages, and the small details in between. If you don&rsquo;t find your
          answer here, we&rsquo;re only a message away.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-border bg-surface px-4 py-3.5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-bold text-ink">
                {item.q}
                <span className="shrink-0 text-[18px] leading-none text-accent-strong group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-secondary">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
