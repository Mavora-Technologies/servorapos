// apps/web/app/contact/page.tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import ContactInquiryForm from '../../components/marketing/ContactInquiryForm';
import FaqAccordionClient from '@/components/marketing/FaqAccordionClient';
import { SITE_CONFIG, buildPageMetadata } from '@/lib/seo';
import { JsonLd, buildBreadcrumbSchema, buildFaqSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata({
  title: 'Contact Servora Kenya | Book a Restaurant POS Demo | Mavora Technologies',
  description:
    'Contact Mavora Technologies in Kilimani, Nairobi, to book a Servora POS demo, request a hospitality software consultation, or enquire about restaurant management, M-Pesa integration, and POS hardware.',
  path: '/contact',
  keywords: [
    'Contact Servora Kenya',
    'Book Restaurant POS Demo Kenya',
    'Restaurant POS Consultation Nairobi',
    'Hospitality Software Consultation Kenya',
    'Mavora Technologies Contact',
    'Hotel F&B Software Demo',
    'Restaurant Management System Demo',
    'POS Hardware Installation Kenya',
    'M-Pesa POS Integration Consultation',
    'Restaurant Inventory Management Software',
  ],
});

const WHATSAPP_DIRECT_LINK = `https://wa.me/254795707823?text=${encodeURIComponent(
  'Hello Mavora Technologies, I would like to learn more about Servora for my hospitality business.'
)}`;

const MAPS_LINK =
  'https://www.google.com/maps/search/?api=1&query=Concert+House+Wood+Avenue+Kilimani+Nairobi+Kenya';

const DEMO_CAPABILITIES = [
  {
    title: 'Point of Sale & Order Management',
    desc: 'Walk through order entry, modifiers, table service, split billing, and cashier shift workflows.',
  },
  {
    title: 'Kitchen Display System (KDS)',
    desc: 'See how orders route digitally to Grill, Bar, Cold Pantry, and Packaging screens.',
  },
  {
    title: 'Inventory & Recipe Costing',
    desc: 'Explore configured menu Bills of Materials (BOM), ingredient-level stock deduction, and food cost visibility.',
  },
  {
    title: 'Payments & M-Pesa Daraja',
    desc: 'Review Safaricom M-Pesa STK Push prompts, C2B Till callbacks, and multi-tender reconciliation.',
  },
  {
    title: 'Business Analytics',
    desc: 'Inspect daily sales summaries, best-selling items, payment breakdowns, and stock valuation.',
  },
  {
    title: 'Multi-Outlet Management',
    desc: 'See how hospitality groups oversee multiple branches, central stores, and stock transfers.',
  },
];

const HOSPITALITY_INDUSTRIES = [
  { name: 'Restaurants & Cafés', href: '/solutions/restaurants' },
  { name: 'Hotels & Resorts', href: '/solutions/hotels' },
  { name: 'Bars & Lounges', href: '/solutions/bars-lounges' },
  { name: 'Cloud Kitchens', href: '/solutions/cloud-kitchens' },
  { name: 'Fast-Food & QSR', href: '/solutions/cloud-kitchens' },
  { name: 'Bakeries & Grill Houses', href: '/solutions/restaurants' },
  { name: 'Multi-Branch Groups', href: '/features' },
  { name: 'POS Hardware & Setup', href: '/hardware-pos' },
];

const CONSULTATION_STEPS = [
  {
    step: '01',
    title: 'Tell Us About Your Business',
    detail: 'Share your venue type, location, outlet count, and operational goals.',
  },
  {
    step: '02',
    title: 'Understand Your Requirements',
    detail: 'Our Nairobi team reviews your needs and maps the relevant Servora modules.',
  },
  {
    step: '03',
    title: 'Experience a Servora Demo',
    detail: 'Explore POS, KDS, recipe BOMs, and M-Pesa workflows in a practical walkthrough.',
  },
  {
    step: '04',
    title: 'Plan Your Implementation',
    detail: 'Discuss subscription tiers, POS hardware requirements, onboarding, and setup.',
  },
];

const CONTACT_FAQS = [
  {
    question: 'How can I book a Servora product demonstration?',
    answer:
      'Complete the enquiry form on this page or message our Kilimani team directly on WhatsApp (+254 795 707 823). We will confirm a convenient time for a tailored walkthrough.',
  },
  {
    question: 'Can I request a personalized demonstration for my restaurant, bar, or hotel?',
    answer:
      'Yes. Tell us your business type and priority workflows—such as table service, bar tabs, KDS routing, or multi-outlet hotel F&B—and we will tailor the demo around your operations.',
  },
  {
    question: 'Does Servora support Safaricom M-Pesa integration?',
    answer:
      'Yes. Servora supports Safaricom M-Pesa Daraja STK Push and C2B Till callback workflows on Business, Professional, and Enterprise plans.',
  },
  {
    question: 'Can Mavora Technologies provide POS hardware?',
    answer:
      'Yes. Mavora Technologies sources, configures, tests, and installs touchscreen POS terminals, 80mm thermal receipt printers, RJ11 cash drawers, and KDS screens in Kenya.',
  },
  {
    question: 'Where is Mavora Technologies located?',
    answer:
      'Mavora Technologies Ltd is located at Concert House, Wood Avenue, Kilimani, Nairobi, Kenya. Our office hours are Monday – Friday, 8:30 AM – 5:00 PM EAT.',
  },
  {
    question: 'How can existing customers reach the team?',
    answer:
      'Existing customers can select "Existing Customer Support" in the enquiry form, call our direct desk, email us, or reach us on WhatsApp during operating hours.',
  },
];

export default function ContactPage() {
  const contactPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Servora by Mavora Technologies Ltd',
    url: `${SITE_CONFIG.url}/contact`,
    mainEntity: {
      '@id': `${SITE_CONFIG.url}/#organization`,
    },
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <JsonLd
        data={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Contact', path: '/contact' },
          ]),
          contactPageSchema,
          buildFaqSchema(CONTACT_FAQS),
        ]}
      />
      <Header />

      <main className="flex-grow w-full">
        {/* --- SECTION 1: SPLIT-LAYOUT HERO --- */}
        <section className="relative overflow-hidden pt-8 pb-12 sm:pt-12 sm:pb-16 lg:pt-14 lg:pb-20 w-full px-4 sm:px-8 lg:px-16 bg-gradient-to-b from-white via-servora-pale/60 to-servora-pale border-b border-gray-200/60">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-6 flex flex-col items-start text-left">
              <nav aria-label="Breadcrumb" className="mb-3 text-xs text-servora-deepTeal">
                <ol className="inline-flex items-center gap-1.5">
                  <li>
                    <Link href="/" className="hover:text-servora-core font-semibold">
                      Home
                    </Link>
                  </li>
                  <li>/</li>
                  <li className="font-bold text-servora-navy">Contact &amp; Demo Request</li>
                </ol>
              </nav>

              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-servora-teal shadow-2xs ring-1 ring-inset ring-servora-core/15 mb-4">
                Let&apos;s Talk Hospitality Technology
              </span>

              <h1 className="w-full text-[clamp(1.85rem,3.6vw,3.25rem)] font-extrabold tracking-tight text-servora-navy leading-[1.12]">
                Let&apos;s Transform the Way You Manage Your{' '}
                <span className="bg-gradient-to-r from-servora-core via-servora-bright to-servora-teal bg-clip-text text-transparent">
                  Hospitality Business.
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-servora-deepTeal">
                Whether you&apos;re opening a new restaurant, managing a growing hotel, improving kitchen operations, or expanding across multiple outlets, our Nairobi team is ready to help you discover how Servora can simplify your operations.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <a
                  href="#contact-form"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-servora-core px-7 text-xs sm:text-sm font-bold text-white shadow-lg shadow-servora-core/25 transition-all hover:bg-blue-700"
                >
                  Book a Live Demo &rarr;
                </a>
                <a
                  href={WHATSAPP_DIRECT_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-7 text-xs sm:text-sm font-bold text-servora-navy shadow-2xs transition-all hover:border-emerald-600 hover:text-emerald-700"
                >
                  Talk to Our Team on WhatsApp
                </a>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="lg:col-span-6 w-full">
              <div className="rounded-3xl bg-servora-navy p-2.5 sm:p-3 shadow-2xl ring-1 ring-white/15 overflow-hidden">
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-slate-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/resources/restaurant-pos-kenya.png"
                    alt="Hospitality team using a Servora POS terminal with M-Pesa integration at a Kenyan restaurant counter"
                    className="h-full w-full object-cover object-center"
                  />
                </div>
                <div className="mt-2.5 px-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-300">
                  <span className="font-semibold text-white">
                    {SITE_CONFIG.parentCompany.name} &bull; Kilimani, Nairobi
                  </span>
                  <span className="font-mono text-servora-teal">Mon – Fri, 8:30 AM – 5:00 PM EAT</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 2: TWO-COLUMN CONTACT EXPERIENCE --- */}
        <section id="contact-form" className="py-16 sm:py-24 w-full px-4 sm:px-8 lg:px-16 scroll-mt-16">
          <div className="w-full max-w-7xl mx-auto">
            <div className="max-w-3xl mb-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-servora-navy tracking-tight">
                Tell Us About Your Business
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-servora-deepTeal">
                Share a few details about your operations and what you want to improve. Our team will help identify the right Servora solution for your business.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Contact Information Panel */}
              <aside className="lg:col-span-4 space-y-5">
                {/* Headquarters */}
                <div className="rounded-2xl bg-white border border-gray-200/80 p-6 shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center mb-4">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-extrabold text-servora-navy">Visit Our Headquarters</h3>
                  <p className="mt-1 text-xs font-bold text-servora-navy">
                    {SITE_CONFIG.parentCompany.name}
                  </p>
                  <p className="mt-0.5 text-xs text-servora-deepTeal leading-relaxed">
                    Concert House, Wood Avenue, Kilimani, Nairobi, Kenya
                  </p>
                  <a
                    href={MAPS_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-xs font-bold text-servora-core hover:underline"
                  >
                    Open in Google Maps &rarr;
                  </a>
                </div>

                {/* WhatsApp & Direct Phone */}
                <div className="rounded-2xl bg-white border border-gray-200/80 p-6 shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-extrabold text-servora-navy">Talk to Our Team</h3>
                  <a
                    href={WHATSAPP_DIRECT_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex w-full h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                  >
                    Chat on WhatsApp (+254 795 707 823)
                  </a>
                  <a
                    href={`tel:${SITE_CONFIG.parentCompany.telephone}`}
                    className="mt-3 block text-sm font-mono font-extrabold text-servora-core hover:underline"
                  >
                    {SITE_CONFIG.parentCompany.displayPhone}
                  </a>
                  <p className="mt-1.5 text-[11px] text-servora-deepTeal">
                    Monday – Friday &bull;{' '}
                    <span className="font-semibold text-servora-navy">8:30 AM – 5:00 PM EAT</span>
                  </p>
                </div>

                {/* Email */}
                <div className="rounded-2xl bg-white border border-gray-200/80 p-6 shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-servora-core/10 text-servora-core flex items-center justify-center mb-4">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-extrabold text-servora-navy">Send Us an Email</h3>
                  <a
                    href={`mailto:${SITE_CONFIG.parentCompany.email}`}
                    className="mt-1 block text-sm font-bold text-servora-core hover:underline break-all"
                  >
                    {SITE_CONFIG.parentCompany.email}
                  </a>
                  <p className="mt-1.5 text-xs text-servora-deepTeal leading-relaxed">
                    For product enquiries, technical requirements, procurement briefs, and business consultations.
                  </p>
                </div>

                {/* Not Sure Where to Start */}
                <div className="rounded-2xl bg-servora-navy text-white p-6 shadow-sm">
                  <h3 className="text-base font-extrabold">Not Sure Where to Start?</h3>
                  <p className="mt-1.5 text-xs text-gray-300 leading-relaxed">
                    Our team can help you understand the Servora modules, subscription options, and deployment requirements for your hospitality business.
                  </p>
                  <a
                    href="#contact-form"
                    className="mt-4 inline-block text-xs font-bold text-servora-teal hover:underline"
                  >
                    Request a Consultation &rarr;
                  </a>
                </div>
              </aside>

              {/* Right Column: Interactive Form */}
              <div className="lg:col-span-8 rounded-3xl bg-white border border-gray-200/90 p-6 sm:p-10 shadow-md">
                <Suspense
                  fallback={
                    <div className="py-12 text-center text-xs text-servora-deepTeal">
                      Loading consultation form...
                    </div>
                  }
                >
                  <ContactInquiryForm />
                </Suspense>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 3: WHAT YOU CAN EXPLORE IN A DEMO --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Tailored Walkthrough
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                See What Servora Can Do for Your Business
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-servora-deepTeal">
                Get a practical walkthrough of the tools that connect your hospitality operations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {DEMO_CAPABILITIES.map((cap) => (
                <div
                  key={cap.title}
                  className="rounded-2xl bg-servora-pale border border-gray-200/80 p-6"
                >
                  <h3 className="text-base font-extrabold text-servora-navy mb-2">{cap.title}</h3>
                  <p className="text-xs text-servora-deepTeal leading-relaxed">{cap.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 4: CONSULTATION PROCESS --- */}
        <section className="py-16 sm:py-20 w-full bg-servora-navy text-white px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="inline-block rounded-full bg-servora-teal/20 px-3.5 py-1 text-[11px] font-bold text-servora-teal uppercase tracking-widest ring-1 ring-inset ring-servora-teal/30">
                What Happens Next
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-white tracking-tight">
                From First Conversation to Smarter Operations
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CONSULTATION_STEPS.map((item) => (
                <div
                  key={item.step}
                  className="rounded-2xl bg-white/5 border border-white/10 p-5"
                >
                  <span className="inline-block text-[11px] font-mono font-extrabold text-servora-teal bg-servora-teal/15 px-2.5 py-0.5 rounded mb-3">
                    STEP {item.step}
                  </span>
                  <h3 className="text-sm font-extrabold text-white mb-1.5">{item.title}</h3>
                  <p className="text-xs text-gray-300 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 5: SOLUTIONS FOR EVERY HOSPITALITY OPERATION --- */}
        <section className="py-16 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-servora-navy tracking-tight">
                Solutions for Every Hospitality Operation
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {HOSPITALITY_INDUSTRIES.map((ind) => (
                <Link
                  key={ind.name}
                  href={ind.href}
                  className="rounded-2xl bg-white border border-gray-200/80 p-4 text-center text-xs font-extrabold text-servora-navy hover:border-servora-core hover:text-servora-core transition-all shadow-2xs"
                >
                  {ind.name} &rarr;
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 6: CONTACT FAQS --- */}
        <section className="py-16 sm:py-24 w-full bg-white border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-[11px] font-bold text-servora-teal uppercase tracking-widest bg-servora-core/10 px-3.5 py-1 rounded-full">
                Pre-Sales FAQ
              </span>
              <h2 className="mt-3 text-[clamp(1.6rem,2.8vw,2.5rem)] font-extrabold text-servora-navy tracking-tight">
                Common Consultation &amp; Demo Questions
              </h2>
            </div>

            <FaqAccordionClient faqs={CONTACT_FAQS} />
          </div>
        </section>

        {/* --- SECTION 7: FINAL CONVERSION CTA --- */}
        <section className="py-16 sm:py-24 w-full bg-servora-pale border-t border-gray-200/60 px-4 sm:px-8 lg:px-16">
          <div className="max-w-7xl mx-auto rounded-3xl bg-gradient-to-br from-servora-navy via-[#072a6b] to-servora-core p-8 sm:p-14 lg:p-16 text-white shadow-2xl flex flex-col items-center text-center relative overflow-hidden ring-1 ring-white/15">
            <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-servora-teal/20 blur-3xl pointer-events-none" />

            <span className="inline-block rounded-full bg-servora-teal/20 px-4 py-1.5 text-xs font-bold text-servora-teal uppercase tracking-wider mb-5 ring-1 ring-inset ring-servora-teal/30">
              Real People. Practical Solutions. Smarter Hospitality.
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-4 tracking-tight leading-tight max-w-4xl text-white">
              Your Next Step Towards Smarter Hospitality Starts Here.
            </h2>
            <p className="text-sm sm:text-base text-gray-200 max-w-2xl mb-8 leading-relaxed">
              Let&apos;s explore how Servora can simplify your operations, strengthen business visibility, and support your growth.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full sm:w-auto">
              <a
                href="#contact-form"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-servora-navy shadow-xl transition-all hover:bg-servora-pale"
              >
                Book a Servora Demo &rarr;
              </a>
              <a
                href={WHATSAPP_DIRECT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-8 text-sm font-bold text-white transition-all hover:bg-white/20 backdrop-blur-xs"
              >
                Chat with Us on WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}