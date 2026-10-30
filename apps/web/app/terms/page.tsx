import Link from "next/link";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";

export default function TermsPage() {
  const currentYear = 2026;

  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <Header />

      <main className="flex-grow w-full">
        
        {/* --- HERO SECTION --- */}
        <section className="relative overflow-hidden pt-16 pb-12 sm:pt-20 sm:pb-16 w-full px-4 sm:px-8 lg:px-16 bg-white border-b border-gray-100">
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center">
            <span className="text-servora-teal font-bold tracking-wider uppercase text-xs mb-3">
              Legal & Compliance
            </span>
            <h1 className="w-full text-3xl font-extrabold tracking-tight text-servora-navy sm:text-4xl lg:text-5xl leading-[1.15]">
              Terms of Service
            </h1>
            <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-servora-deepTeal">
              Please read these terms carefully before subscribing to Servora POS or engaging Mavora Technologies Ltd for hardware procurement and software services.
            </p>
            <div className="mt-4 text-xs font-medium text-servora-deepTeal">
              Last Updated: January {currentYear} &bull; Effective for Servora Platform Users
            </div>
          </div>
        </section>

        {/* --- CONTENT SECTION --- */}
        <section className="py-16 w-full px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-4xl mx-auto bg-white p-8 sm:p-12 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-8 text-servora-deepTeal text-xs sm:text-sm leading-relaxed">
            
            {/* Section 1 */}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-servora-navy mb-3">1. Agreement to Terms</h2>
              <p>
                By accessing or using the Servora SaaS platform, mobile applications, point-of-sale terminals, or requesting hardware procurement services from Mavora Technologies Ltd (&ldquo;Company&rdquo;), you agree to be bound by these Terms of Service. If you are entering into these terms on behalf of a restaurant, bar, café, or corporate entity, you represent that you possess the legal authority to bind that entity.
              </p>
            </div>

            {/* Section 2 */}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-servora-navy mb-3">2. Software License & Access</h2>
              <p>
                Subject to your compliance with these Terms and your active subscription payment, Mavora Technologies grants you a limited, non-exclusive, non-transferable, revocable license to access and use the Servora platform for internal restaurant management and operational workflows in Kenya and authorized jurisdictions.
              </p>
            </div>

            {/* Section 3 */}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-servora-navy mb-3">3. Subscriptions, Fees, and Billing</h2>
              <p className="mb-2">Servora operates on a recurring subscription model (Monthly, Bi-Annual, or Annual billing cycles):</p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>Subscription fees must be settled in advance according to your selected tier (Starter, Business, Professional, or Enterprise).</li>
                <li>All payments are processed securely through authorized channels including official bank transfers and Safaricom M-Pesa integrations.</li>
                <li>Fees are non-refundable except as expressly determined by Mavora Technologies management or mandated under applicable Kenyan consumer protection laws.</li>
              </ul>
            </div>

            {/* Section 4 */}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-servora-navy mb-3">4. Hardware Procurement & Outsourcing</h2>
              <p>
                When you engage Mavora Technologies to procure, import, test, or install POS hardware terminals, thermal receipt printers, and cash drawers:
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5 mt-2">
                <li>Hardware quotations are valid for 14 days unless otherwise specified in your formal technical brief.</li>
                <li>Risk of loss or damage passes to the merchant upon successful on-site delivery and handover in Kilimani or designated restaurant outlets.</li>
                <li>Hardware warranties are governed by respective manufacturer defect policies alongside our configuration support guarantee.</li>
              </ul>
            </div>

            {/* Section 5 */}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-servora-navy mb-3">5. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by Kenyan law, Mavora Technologies Ltd shall not be liable for any indirect, incidental, special, consequential, or punitive damages—including loss of profits, revenue, data, or business interruption—arising out of or related to your use of the Servora platform or hardware peripherals.
              </p>
            </div>

            {/* Section 6 */}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-servora-navy mb-3">6. Governing Law</h2>
              <p>
                These Terms shall be governed by, construed, and enforced in accordance with the laws of the Republic of Kenya. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts located in Nairobi, Kenya.
              </p>
            </div>

            {/* Section 7 */}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-servora-navy mb-3">7. Contact Information</h2>
              <p className="mb-3">
                For questions regarding these Terms of Service, billing inquiries, or legal notices, please reach out to our team:
              </p>
              <div className="p-4 rounded-xl bg-servora-pale border border-gray-200 flex flex-col gap-1 text-xs">
                <span className="font-bold text-servora-navy">Mavora Technologies Ltd</span>
                <span>Concert House, Wood Avenue, Kilimani - Nairobi, Kenya</span>
                <span>Email: <a href="mailto:info@mavoratechnologies.com" className="text-servora-core font-semibold hover:underline">info@mavoratechnologies.com</a></span>
                <span>Phone: <a href="tel:+254795707823" className="text-servora-core font-semibold hover:underline">+254 795 707 823</a></span>
              </div>
            </div>

          </div>
        </section>

        {/* --- CTA BANNER --- */}
        <section className="py-16 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-7xl mx-auto rounded-2xl bg-white p-8 sm:p-12 border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <span className="inline-block rounded-md bg-servora-core/10 px-3 py-1 text-[11px] font-bold text-servora-core uppercase tracking-wider mb-2">
                Need Clarification?
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-servora-navy mb-2">
                Get in Touch with Our Legal & Sales Team
              </h2>
              <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed max-w-xl">
                Our Kilimani office is available to discuss custom enterprise contracts and service level agreements (SLAs).
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-servora-core px-7 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}