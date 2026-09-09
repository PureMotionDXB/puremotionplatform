import Link from "next/link";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Privacy Policy | Pure Motion",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="flex-1 bg-bg">
      <div className="mx-auto max-w-2xl px-7 py-8">
        <Link href="/" className="text-[13px] font-semibold text-muted hover:text-ink">
          &larr; Pure Motion
        </Link>
        <h1 className="mt-2 font-display text-[22px] font-bold text-ink">Privacy Policy</h1>
        <p className="mt-1 text-[13px] text-muted">
          How Pure Motion collects, uses, and protects your information when you visit
          www.puremotion.ae.
        </p>

        <div className="mt-6 flex flex-col gap-4 text-[13.5px] leading-relaxed text-ink-secondary">
          <p>
            This Privacy Policy is on behalf of Pure Motion Pilates Sport Coaching Services
            L.L.C, trading as Pure Motion, registered in the UAE, with its registered office
            at Jumeirah Golf Estates, Dubai, UAE. Pure Motion Pilates Sport Coaching Services
            L.L.C maintains this website, www.puremotion.ae. This policy applies only to
            activities www.puremotion.ae engages in on its website and does not apply to
            activities unrelated to the website or conducted offline.
          </p>

          <Section title="Information Collection">
            <p>
              www.puremotion.ae collects certain anonymous data regarding the usage of the
              website. This data does not personally identify users by itself or in
              combination with other information, and it is collected to improve the
              performance of the website. The anonymous data collected by www.puremotion.ae
              may include information such as browser type and the length of visits to the
              site.
            </p>
            <p className="mt-3">
              You may also be asked to provide personally identifiable information on
              www.puremotion.ae, which may include your name, address, phone number, and
              email address. This information is collected when you register for services,
              make purchases, or send feedback via the website. Providing personally
              identifiable information is optional.
            </p>
          </Section>

          <Section title="Use and Disclosure of Information">
            <p>
              Except as otherwise stated below, we do not sell, trade, or rent your
              personally identifiable information collected on the site to others. The
              information collected by www.puremotion.ae is used to process orders, update
              you about your order status, notify you of products or special offers, and
              improve the functionality of the site.
            </p>
            <p className="mt-3">
              We may disclose your membership details to third parties as necessary to
              process your membership, improve our site&rsquo;s functionality, conduct
              statistical analyses, and deliver promotional emails from us.
            </p>
            <p className="mt-3">
              All credit/debit card details and personally identifiable information will not
              be stored, sold, shared, rented, or leased to third parties.
            </p>
          </Section>

          <Section title="Cookies">
            <p>
              Cookies are small pieces of data stored in a user&rsquo;s browser.
              www.puremotion.ae utilizes cookies to determine if you have visited our home
              page before. However, no other personal information is collected. We may use
              non-personal &ldquo;aggregated data&rdquo; to enhance our website&rsquo;s
              operation or analyse interest in various areas of the site.
            </p>
            <p className="mt-3">
              If you provide www.puremotion.ae with content for publishing or feedback, we
              may publish your username or other identifying data with your permission.
            </p>
          </Section>

          <Section title="Legal Compliance">
            www.puremotion.ae may disclose personally identifiable information to comply
            with legal obligations, such as responding to a subpoena, court order, or other
            legal requests. We may also provide such information to law enforcement agencies
            or as required by law. In the event of bankruptcy, or if there is a transfer of
            assets or ownership of www.puremotion.ae due to mergers or acquisitions, your
            personally identifiable information may be transferred.
          </Section>

          <Section title="Data Security">
            www.puremotion.ae takes steps to ensure data privacy and security through various
            hardware and software methodologies. However, we cannot guarantee the security of
            any information disclosed online.
          </Section>

          <Section title="Third-Party Websites">
            www.puremotion.ae may contain links to other websites. We are not responsible for
            the privacy practices of those websites. If you provide information to such third
            parties, different rules regarding the collection and use of your personal
            information may apply. We strongly encourage you to review the privacy policies
            of any third-party sites you visit.
          </Section>

          <Section title="Minors">
            www.puremotion.ae does not knowingly collect personal information from minors
            under the age of 18. Minors are not permitted to use the www.puremotion.ae
            website or services, and we request that minors under 18 not submit any personal
            information. Since we do not collect information from minors, www.puremotion.ae
            does not knowingly distribute personal information regarding minors under 18.
          </Section>

          <Section title="Corrections and Updates">
            If you wish to modify or update any information www.puremotion.ae has received,
            please contact us at: info@puremotion.ae
          </Section>

          <Section title="Modifications of the Privacy Policy">
            The Website Policies and Terms &amp; Conditions may change or update occasionally
            to meet requirements and standards. Customers are encouraged to frequently visit
            these sections to stay updated on changes to the website. Modifications will be
            effective on the day they are posted.
          </Section>
        </div>
      </div>
      <Footer />
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[14px] font-bold text-ink">{title}</h2>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}
