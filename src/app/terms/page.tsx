import Link from "next/link";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Terms & Conditions | Pure Motion",
};

export default function TermsPage() {
  return (
    <main className="flex-1 bg-bg">
      <div className="mx-auto max-w-2xl px-7 py-8">
        <Link href="/" className="text-[13px] font-semibold text-muted hover:text-ink">
          &larr; Pure Motion
        </Link>
        <h1 className="mt-2 font-display text-[22px] font-bold text-ink">
          Terms &amp; Conditions
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          The terms that govern membership, bookings, and classes at Pure Motion, Jumeirah
          Golf Estates, Dubai. Please read both documents carefully before booking.
        </p>

        <div className="mt-6 flex flex-col gap-4 text-[13.5px] leading-relaxed text-ink-secondary">
          <Section title="1. Interpretation and Variation">
            <p>In these Terms and Conditions, the following definitions apply:</p>
            <p className="mt-3">
              &ldquo;Studio&rdquo; means Pure Motion Pilates Sport Coaching Services L.L.C
              (known as &ldquo;Pure Motion&rdquo;)
            </p>
            <p className="mt-3">
              &ldquo;Client&rdquo; refers to any person who has completed and submitted the
              registration form on the Pure Motion website or app and whose registration has
              been accepted by the Studio.
            </p>
            <p className="mt-3">
              &ldquo;Studio Space&rdquo; refers to Pure Motion located at LG-03, Tulip
              Business Developers, Jumeirah Golf Estates, Dubai UAE or any additional studios
              Pure Motion may open.
            </p>
            <p className="mt-3">
              These Terms and Conditions are incorporated into the Client&rsquo;s
              registration.
            </p>
            <p className="mt-3">
              Pure Motion reserves the right to amend these Terms and Conditions as
              necessary. Any changes will be communicated to Clients and are binding until
              revoked.
            </p>
            <p className="mt-3">
              These Terms are governed by the laws of Dubai, UAE, and subject to the
              exclusive jurisdiction of Dubai courts.
            </p>
          </Section>

          <Section title="2. Membership">
            <p>
              2.1. Upon completing the registration form, a Client becomes a member of the
              Studio, subject to these Terms and Conditions.
            </p>
            <p className="mt-3">
              2.2. The Studio may expel or suspend any Client whose conduct is deemed
              injurious to the Studio or breaches these Terms. Suspended members are not
              entitled to refunds for the suspension period.
            </p>
            <p className="mt-3">
              2.3. Membership is strictly restricted to individuals aged 18 years or older.
              Clients under 18 are not permitted to register or attend sessions at the
              Studio.
            </p>
          </Section>

          <Section title="3. Studio Access and Opening Times">
            <p>
              3.1. Session schedules may vary and are available on Pure Motion&rsquo;s
              website or app.
            </p>
            <p className="mt-3">
              3.2. Pure Motion may restrict access to its facilities temporarily for
              cleaning, maintenance, or other necessary reasons.
            </p>
          </Section>

          <Section title="4. Payment Terms">
            4.1. Session and class pack prices are listed on the Pure Motion website / mobile
            application. Payment is required before attending a session and is non-refundable
            and non-transferable subject to the cancellation policies.
          </Section>

          <Section title="5. Bookings and Cancellations">
            <p>
              5.1. Clients need to book a class through the website or mobile application in
              order to attend. Cancellations or rescheduling must be made at least 12 hours in
              advance through the website or mobile application.
            </p>
            <p className="mt-3">
              5.2. Class packs are available in 1, 5, and 10-session packages, with specific
              validity periods. These packs are non-transferable and for individual use only.
            </p>
            <p className="mt-3">
              5.3. Third-Party Booking Policy: Bookings made through third-party platforms
              such as ClassPass are non-transferable and cannot be modified or cancelled
              through our studio. Any changes, cancellations, or issues related to these
              bookings must be managed directly through the third-party platform. Pure Motion
              is only responsible for class bookings made directly through our official
              booking system.
            </p>
            <p className="mt-3">
              5.4. Late Cancellation &amp; No-Show Policy: Members who fail to attend a
              booked class without providing timely cancellation (late cancellation) or do
              not show up for their scheduled class will incur a charge of AED 40.
            </p>
          </Section>

          <Section title="6. Fitness and Health">
            <p>
              6.1. Clients confirm they are physically able to participate in sessions at
              Pure Motion. Clients with medical conditions must consult a doctor before
              engaging in classes and inform the Studio of any health issues that could
              impact their participation.
            </p>
            <p className="mt-3">
              6.2. The Studio reserves the right to deny access to anyone whose health may be
              at risk.
            </p>
          </Section>

          <Section title="7. Limitation of Liability">
            <p>
              7.1. The Studio is not liable for the unavailability of specific classes,
              instructors, or equipment. Clients accept the risk of injury from participating
              in activities and are advised to seek medical advice if needed.
            </p>
            <p className="mt-3">
              7.2. The Studio does not accept responsibility for loss or damage to property
              or personal injury within the Studio.
            </p>
          </Section>

          <Section title="8. Use of Facilities">
            <p>8.1. Clients are entitled to use the Studio&rsquo;s facilities as available.</p>
            <p className="mt-3">
              8.2. Photos taken on Studio premises are not permitted for commercial use
              without prior consent.
            </p>
          </Section>

          <Section title="9. Personal Belongings">
            9.1. Personal belongings brought to the Studio are at the Client&rsquo;s own
            risk. Pure Motion accepts no liability for lost or damaged items.
          </Section>

          <Section title="10. Class Etiquette">
            <p>
              10.1. Clients should dress appropriately for classes, with grip socks required
              for all Reformer Pilates sessions. Mobile phones are not allowed in classes, and
              chitchat should be minimized to avoid disrupting other clients.
            </p>
            <p className="mt-3">
              10.2. Clients must follow all instructions given by instructors.
            </p>
          </Section>

          <Section title="11. Safety and Hygiene">
            <p>
              11.1. For safety reasons, only water is permitted in the Studio, and pets are
              not allowed, except for guide dogs. Smoking and vaping are prohibited within
              Studio premises.
            </p>
            <p className="mt-3">
              11.2. Children under the age of 13 are not permitted to remain in the Studio
              lobby or premises unattended at any time and must be supervised by a parent or
              guardian.
            </p>
          </Section>

          <Section title="12. General Provisions">
            <p>
              12.1. Clients are required to keep their contact details updated with Pure
              Motion.
            </p>
            <p className="mt-3">
              12.2. Pure Motion may assign membership benefits to third parties and reserves
              the right to communicate with members by email.
            </p>
            <p className="mt-3">
              12.3. Clients must adhere to Studio guidelines and comply with reasonable
              instructions issued by Studio management.
            </p>
          </Section>

          <Section title="13. Intellectual Property">
            13.1. All content on the Pure Motion website, app, social media, and within the
            Studio, including text, graphics, logos, and other materials, is protected by
            copyright and intellectual property laws. This content is provided for personal
            use only and may not be reproduced or used for commercial purposes without
            permission.
          </Section>

          <Section title="14. Termination">
            14.1. Pure Motion may terminate a Client&rsquo;s access to the Studio at any time
            without cause or notice. Upon termination, these Terms remain in effect.
          </Section>

          <Section title="15. Governing Law">
            15.1. These terms and any dispute or claim arising out of, or in connection with,
            it, its subject matter or formation (including non-contractual disputes or
            claims) is governed by, and construed in accordance with, the laws of the Emirate
            of Dubai and the United Arab Emirates.
          </Section>

          <div className="mt-4 border-t border-border pt-6">
            <h2 className="font-display text-[18px] font-bold text-ink">
              Studio Terms &amp; Conditions
            </h2>

            <p className="mt-3">
              By registering for and participating in any Pure Motion&reg; classes, services,
              or activities, you confirm that you have read, understood, and agreed to be
              bound by these Terms &amp; Conditions. If you do not agree to any part of these
              Terms &amp; Conditions, you should not participate in our classes or services.
            </p>
            <p className="mt-3">
              Pure Motion&reg; reserves the right to amend, update, or replace these Terms
              &amp; Conditions at any time. Any changes will be published on our website and
              will take effect immediately upon posting. Your continued participation in our
              classes or use of our services following any updates constitutes acceptance of
              the revised Terms &amp; Conditions.
            </p>
            <p className="mt-3">
              Throughout these Terms &amp; Conditions, references to &ldquo;Pure
              Motion&reg;&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;
              refer to Pure Motion&reg; and its operators.
            </p>
          </div>

          <Section title="1. Our Prices">
            <p>
              All class prices, packages, memberships, and timetables are published on our
              website and are subject to change at any time without prior notice.
            </p>
            <p className="mt-3">
              To participate in Pure Motion&reg; classes, you must create an account, which
              will be governed by these Terms &amp; Conditions and our Privacy Policy. All
              classes must be booked in advance through our website or via the Mindbody app
              where Pure Motion&reg; is listed.
            </p>
          </Section>

          <Section title="2. Payments, Refunds & Transfers">
            All purchases, including class credits, packages, memberships, promotional
            offers, and retail items, are strictly non-refundable and non-transferable,
            except where required by applicable UAE law. Credits, packages, and memberships
            may not be shared, assigned, or transferred to another person. These packages
            cannot be frozen, extended, or modified once purchased.
          </Section>

          <Section title="3. Medical Notice">
            <p>
              Before participating in any Pure Motion&reg; classes, you are advised to
              consult a qualified healthcare professional to ensure you are fit for physical
              exercise and aware of any relevant medical limitations.
            </p>
            <p className="mt-3">
              You agree to exercise within your own limits and to stop immediately if you
              experience pain, discomfort, dizziness, or any unusual symptoms. You are
              responsible for informing your instructor of any injuries, medical conditions,
              or physical limitations that may affect your participation.
            </p>
            <p className="mt-3">
              All classes and use of equipment are undertaken at your own risk. To the
              fullest extent permitted by law, Pure Motion&reg;, its instructors, staff, and
              affiliates accept no liability for injury, loss, or damage arising from
              participation.
            </p>
            <p className="mt-3">
              By participating, you acknowledge these risks and consent to physical
              adjustments and tactile cueing by instructors for safety and alignment.
            </p>
          </Section>

          <Section title="4. Conditions of Entry">
            <p>
              Pure Motion&reg; reserves the right to refuse entry to, or remove from the
              studio, any individual whose behaviour is unsafe, disruptive, aggressive, or
              who appears to be under the influence of alcohol or drugs.
            </p>
            <p className="mt-3">
              Please arrive at least 5 minutes prior to the start of class. Late arrivals may
              forfeit their booked spot and may not be admitted once the class has begun.
              Early departures are discouraged, as they can disrupt the class experience.
            </p>
            <p className="mt-3">Smoking is strictly prohibited on all studio premises.</p>
            <p className="mt-3">
              We ask all clients to treat fellow participants, instructors, and studio
              property with respect at all times. Appropriate workout attire and grip socks
              are required for all classes. Pure Motion&reg; branded grip socks are available
              for purchase at AED 70 + VAT.
            </p>
            <p className="mt-3">
              Mobile phones must be silenced during classes unless required for urgent or
              professional reasons.
            </p>
          </Section>

          <Section title="5. Cancellation Policy">
            Cancel bookings via our website or the Mindbody App at least 12 hours before
            class to avoid charges. Cancellations made within 12 hours will incur the full
            class cost. We encourage you to cancel even within the window so others may
            attend.
          </Section>

          <Section title="6. Waitlists">
            If a class is fully booked, you may add yourself to the waitlist. Should a space
            become available, you will be automatically added to the class and notified via
            email. It is your responsibility to monitor your email and remove yourself from
            the waitlist if you are no longer available to attend. Once you are moved from
            the waitlist into a class, our standard 12-hour cancellation policy applies.
          </Section>

          <Section title="7. Schedule">
            <p>
              Class schedules may change or be cancelled without notice. No compensation is
              provided for schedule changes. You will not be charged if a class is cancelled.
            </p>
            <p className="mt-3">Opening hours may change. Permanent changes will be communicated.</p>
          </Section>

          <Section title="8. Personal Safety">
            <p>
              Participation in physical exercise involves inherent risks. You must inform
              your instructor of any medical conditions, injuries, pregnancy, or other
              factors that may affect your ability to participate safely prior to each class.
            </p>
            <p className="mt-3">
              Pure Motion&reg; instructors and staff are not medically trained and do not
              provide medical advice. If you have any uncertainty regarding your health or
              fitness to exercise, you should seek medical clearance from a qualified
              healthcare professional before participating.
            </p>
            <p className="mt-3">
              By taking part in our classes, you acknowledge and voluntarily accept all
              associated risks. To the fullest extent permitted by UAE law, Pure Motion&reg;
              shall not be liable for any injury, loss, or damage arising from participation
              in classes or use of facilities, except in cases of gross negligence or wilful
              misconduct.
            </p>
          </Section>

          <Section title="9. Pregnancy">
            Pregnant clients may continue to attend regular classes up until birth at their
            own discretion and risk, provided they inform their instructor prior to each
            class so appropriate trimester-specific modifications can be offered. For
            post-partum clients, medical clearance from a qualified doctor is required before
            returning to classes. This is typically after six (6) weeks post-delivery,
            however timing may vary depending on individual circumstances.
          </Section>

          <Section title="10. Personal Belongings">
            Pure Motion&reg; is not responsible for the safekeeping of personal belongings.
            All personal items are brought onto the premises at your own risk, and you are
            solely responsible for their security at all times.
          </Section>

          <Section title="11. Your Personal Information">
            <p>
              Your information will be handled in accordance with our{" "}
              <Link href="/privacy-policy" className="font-semibold text-accent-strong hover:underline">
                Privacy Policy
              </Link>{" "}
              and the UAE Federal Decree Law No. 45 of 2021 (Data Protection Law).
            </p>
            <p className="mt-3">
              By creating an account or booking, you consent to our collection and use of
              your personal data.
            </p>
          </Section>

          <Section title="12. Liability Waiver">
            By creating an account with Pure Motion&reg;, you acknowledge that you have read
            and agreed to our{" "}
            <Link href="/waiver" className="font-semibold text-accent-strong hover:underline">
              Liability Waiver
            </Link>{" "}
            in addition to these Terms &amp; Conditions. Except as required by applicable
            law, Pure Motion&reg;, its owners, staff, and affiliates shall not be liable for
            any direct or indirect injury, loss, or damage arising from participation in
            classes, use of facilities, theft, unauthorised access, or data loss. This
            limitation of liability applies even if Pure Motion&reg; has been advised of the
            possibility of such damages.
          </Section>

          <Section title="Acceptance">
            By booking at our studio you are agreeing electronically, you confirm that you
            have read, understood, and agree to be bound by the above Terms &amp;
            Conditions.
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
