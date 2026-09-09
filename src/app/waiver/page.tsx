import Link from "next/link";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Liability Waiver | Pure Motion",
};

export default function WaiverPage() {
  return (
    <main className="flex-1 bg-bg">
      <div className="mx-auto max-w-2xl px-7 py-8">
        <Link href="/" className="text-[13px] font-semibold text-muted hover:text-ink">
          &larr; Pure Motion
        </Link>
        <h1 className="mt-2 font-display text-[22px] font-bold text-ink">
          Liability Waiver &amp; Release Form
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          Pure Motion Pilates Sport Coaching Services L.L.C. — applies to Yoga, Reformer
          Pilates, Mat Pilates, and any other sport-related activities booked through Pure
          Motion or its third-party platform(s).
        </p>

        <div className="mt-6 flex flex-col gap-4 text-[13.5px] leading-relaxed text-ink-secondary">
          <p>
            I acknowledge that the activities at Pure Motion Pilates Sport Coaching Services
            L.L.C., including but not limited to Yoga, Reformer Pilates, and Mat Pilates,
            involve physical activity that carries inherent risks. I confirm that I am
            voluntarily choosing to participate in these activities. I understand that
            participation is entirely voluntary and that I am responsible for my own safety
            and well-being during each class.
          </p>

          <Section title="1. Age Requirement, Booking Restrictions & Parental Consent">
            I confirm that I am 18 years of age or older. An exception applies only to
            participants aged 13–18 enrolled in the NEXT GEN Teen Pilates classes.
            Participants under the age of 18 are strictly prohibited from booking classes,
            attending the studio, or participating in any activities unless they are
            registered for the NEXT GEN Teen Pilates program and have obtained prior written
            consent from a parent or legal guardian. By providing such consent, the parent or
            legal guardian agrees to all terms of this waiver and accepts full responsibility
            for the minor&rsquo;s participation, including any associated risks,
            responsibilities, and liabilities.
          </Section>

          <Section title="2. Health Declaration">
            I hereby declare that I am in a physical health condition and do not have any
            medical conditions that would limit or affect my ability to participate safely in
            the activities offered by Pure Motion Pilates Sport Coaching Services L.L.C. I
            understand it is my responsibility to consult a physician before engaging in any
            physical activities. If I am pregnant, I confirm that I have consulted my
            physician and received medical clearance to participate in any activities /
            classes at the Studio or any other location which the Studio is hosting activities
            at.
          </Section>

          <Section title="3. Acknowledgement of Fitness to Participate">
            I confirm that I am physically fit and have no medical, physical, or mental
            conditions that would impair my ability to safely participate in activities. I
            understand that it is my responsibility to pace myself and engage only in
            activities that I feel capable of performing. I understand it is my responsibility
            to listen to my body, pace myself, and modify or stop participation as needed based
            on my own physical capabilities.
          </Section>

          <Section title="4. Waiver & Release">
            <p>
              To the fullest extent permitted by law I hereby release and hold harmless Pure
              Motion Pilates Sport Coaching Services L.L.C., its owners, employees,
              instructors, and agents from any and all liabilities or claims, demands, legal
              action for damages related to any injury, illness, loss, or damages that may
              result from my participation, whether caused by carelessness, negligence or
              gross negligence. I understand that this waiver includes, but is not limited to,
              any physical injury, death, illness, (physical or mental) or property damage
              sustained during my attendance and in the future. This includes, but is not
              limited to, injuries sustained during or after class participation, or while on
              studio premises.
            </p>
            <p className="mt-3">
              I consent to Pure Motion Pilates Sport Coaching Services L.L.C. collecting and
              processing my personal information for booking and communication purposes, in
              accordance with applicable data protection laws.
            </p>
            <p className="mt-3">
              I acknowledge that instructors and staff at Pure Motion Pilates Sport Coaching
              Services L.L.C. are not medical professionals and do not provide medical advice,
              diagnosis, or treatment. Any guidance provided during classes is of a general
              fitness nature only and should not be considered medical advice.
            </p>
            <p className="mt-3">
              I understand that the use of Pilates reformer machines and other studio equipment
              carries inherent risks. I agree to use all equipment as instructed and
              acknowledge that failure to follow instructions or misuse of equipment may
              increase the risk of injury. I voluntarily assume all risks associated with the
              use of such equipment.
            </p>
            <p className="mt-3">
              I acknowledge that some instructors teaching at Pure Motion Pilates Sport
              Coaching Services L.L.C. may operate as independent contractors. I agree that
              Pure Motion Pilates Sport Coaching Services L.L.C. shall not be liable for the
              actions or omissions of any independent contractor beyond the extent required by
              applicable law.
            </p>
            <p className="mt-3">
              In the event of an emergency, I authorize Pure Motion Pilates Sport Coaching
              Services L.L.C. and its representatives to obtain emergency medical treatment on
              my behalf. I understand that I am solely responsible for any medical costs
              incurred.
            </p>
          </Section>

          <Section title="5. Acknowledgement of Understanding">
            I confirm that I have read and fully understand this liability waiver and release
            form. I acknowledge that by accepting this waiver, I am waiving certain legal
            rights and agree to all terms outlined above.
          </Section>

          <Section title="6. Severability Clause">
            I agree that if any provision of this waiver is found to be invalid, illegal, or
            unenforceable under the applicable laws, such provision shall be deemed omitted,
            and the remaining provisions of this waiver shall remain in full force and effect.
            Pure Motion Sport Coaching Services L.L.C shall use their best efforts to replace
            it with a valid provision that reflects as closely as possible the intended effect
            of the invalid provision. Any resulting ambiguity in interpretation shall, as far
            as possible, be resolved by reference to the original intent of the invalid
            provision.
          </Section>

          <Section title="7. Photography & Videography Consent">
            I acknowledge that Pure Motion Pilates Sport Coaching Services L.L.C. reserves the
            right to take photos and videos of sessions for marketing, promotional, and
            educational purposes. The studio will verbally announce when such recordings are
            taking place. If I do not wish to be included, I understand that it is my
            responsibility to inform the instructor or staff before the session begins.
          </Section>

          <Section title="8. Booking Under Your Own Name">
            I confirm that I am booking the class under my own legal name. I understand that
            bookings made under someone else&rsquo;s name are not permitted and may result in
            cancellation or denial of entry.
          </Section>

          <Section title="9. Check-In Policy">
            <p>I understand and agree to abide by the following:</p>
            <ul className="mt-2 list-disc pl-5">
              <li>I will not check in if I am not attending the class.</li>
              <li>This rule applies to me and to all members without exception.</li>
              <li>
                If I cannot make it to class, I will not check in on behalf of myself or anyone
                else.
              </li>
              <li>
                I acknowledge that violating this policy is a breach of Pure Motion studio
                guidelines and may result in suspension of my membership.
              </li>
            </ul>
          </Section>

          <Section title="10. Indemnification">
            I agree to indemnify, defend, and hold harmless Pure Motion Pilates Sport Coaching
            Services L.L.C., its owners, employees, contractors, and instructors from and
            against any and all claims, liabilities, damages, costs, or expenses (including
            legal fees) arising from my actions, omissions, or participation in any class or
            activity, including but not limited to damage to property or injury to myself or
            others.
          </Section>

          <Section title="11. Cancellation & No-Show Policy">
            <p>
              I agree to abide by Pure Motion Pilates Sport Coaching Services L.L.C.&rsquo;s
              booking and cancellation policies, and understand that failure to do so may
              result in the studio&rsquo;s no-show fee or loss of class credit.
            </p>
            <p className="mt-3">
              By accepting these terms and conditions, I acknowledge that participating in
              activities and using the facilities at Pure Motion Pilates Sport Coaching
              Services L.L.C. may involve a significant risk of physical injury, including but
              not limited to sprains, strains, illness, permanent disability, or even death. I
              understand that certain classes may be physically strenuous, and I voluntarily
              assume all risks associated with participation, including those resulting from
              the negligence of the studio or its instructors.
            </p>
          </Section>

          <Section title="12. Limitation of Liability">
            I agree that Pure Motion Pilates Sport Coaching Services L.L.C., its owners,
            employees, and instructors shall not be held liable under contract, statute, or
            otherwise for any injury, loss, damage, death, or economic harm — whether direct,
            indirect, or consequential — arising from or connected to my participation.
          </Section>

          <Section title="13. Personal Belongings">
            I further agree that Pure Motion Sport Coaching Services L.L.C. is not responsible
            for any lost, stolen, or damaged personal belongings left unattended on the
            premises.
          </Section>

          <Section title="14. Governing Law">
            This Liability Waiver and Release shall be governed by and construed in accordance
            with the laws of the United Arab Emirates, as applied in the Emirate of Dubai. The
            courts of Dubai shall have exclusive jurisdiction over any dispute arising out of
            or in connection with this waiver or my participation in any activities at Pure
            Motion Pilates Sport Coaching Services L.L.C.
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
