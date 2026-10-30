"use client";

import { useState } from "react";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1000);
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-servora-pale text-servora-navy selection:bg-servora-teal selection:text-white overflow-x-hidden">
      <Header />

      <main className="flex-grow w-full">
        {/* --- PAGE HEADER HERO --- */}
        <section className="relative overflow-hidden pt-12 pb-12 sm:pt-16 sm:pb-16 w-full px-4 sm:px-8 lg:px-16 bg-white border-b border-gray-100">
          <div className="w-full flex flex-col items-center text-center">
            <span className="text-servora-teal font-bold tracking-wider uppercase text-xs mb-3">
              Mavora Technologies Support & Sales
            </span>
            <h1 className="w-full text-3xl font-extrabold tracking-tight text-servora-navy sm:text-4xl lg:text-5xl">
              Get in Touch with Our Team
            </h1>
            <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-servora-deepTeal">
              Have questions about Servora POS, M-Pesa integration, multi-branch deployment, or custom hardware setups? We are here to help your restaurant grow.
            </p>
          </div>
        </section>

        {/* --- CONTACT CONTENT SECTION --- */}
        <section className="py-16 w-full px-4 sm:px-8 lg:px-16">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">
            
            {/* Contact Info Cards */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              
              {/* HQ Address Card */}
              <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center mb-4">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-servora-navy mb-1">HQ Address</h3>
                <p className="text-xs font-semibold text-servora-navy">Mavora Technologies Ltd</p>
                <p className="text-xs text-servora-deepTeal leading-relaxed mt-0.5">
                  Concert House, Wood Avenue,<br />
                  Kilimani, Nairobi, Kenya
                </p>
              </div>

              {/* Phone / Call Desk Card */}
              <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center mb-4">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-servora-navy mb-1">Phone / Call Desk</h3>
                <a href="tel:+254795707823" className="text-sm font-mono font-bold text-servora-core hover:underline block mb-2">
                  +254 795 707 823
                </a>
                <p className="text-[11px] text-servora-deepTeal leading-relaxed">
                  Available Monday – Friday<br />
                  <span className="font-semibold text-servora-navy">(8:30 AM – 5:00 PM EAT)</span>
                </p>
              </div>

              {/* Email Card */}
              <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-servora-core/10 text-servora-core flex items-center justify-center mb-4">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-servora-navy mb-1">Email Us</h3>
                <a href="mailto:info@mavoratechnologies.com" className="text-sm font-medium text-servora-core hover:underline block mb-1">
                  info@mavoratechnologies.com
                </a>
                <p className="text-[11px] text-servora-deepTeal leading-relaxed">
                  Primary channel for technical RFPs & briefs.
                </p>
              </div>

            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2 p-8 sm:p-10 rounded-2xl bg-white border border-gray-100 shadow-md">
              {submitted ? (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-servora-navy mb-2">Message Sent Successfully</h3>
                  <p className="text-sm text-servora-deepTeal max-w-md">
                    Thank you for reaching out to Mavora Technologies Ltd. Our team will review your inquiry and get back to you shortly.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-servora-core px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  <div>
                    <h2 className="text-lg font-bold text-servora-navy mb-1">Send Us a Message</h2>
                    <p className="text-xs text-servora-deepTeal">Fill out the form below and our team will get back to you within 24 hours.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-servora-navy">Full Name *</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Amina Mohammed"
                        className="h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-servora-core transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-servora-navy">Business / Restaurant Name *</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Savannah Grill & Lounge"
                        className="h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-servora-core transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-servora-navy">Email Address *</label>
                      <input
                        required
                        type="email"
                        placeholder="info@yourrestaurant.co.ke"
                        className="h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-servora-core transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-servora-navy">Phone Number *</label>
                      <input
                        required
                        type="tel"
                        placeholder="+254 700 000 000"
                        className="h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-servora-core transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-servora-navy">How can we help you? *</label>
                    <select
                      className="h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-servora-core transition-colors"
                    >
                      <option>Schedule a Live Demo / Walkthrough</option>
                      <option>Technical RFP & Brief Submission</option>
                      <option>Inquire About Pricing & Plans</option>
                      <option>M-Pesa Daraja Integration Support</option>
                      <option>Hardware & POS Terminal Setup</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-servora-navy">Message / Details *</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Tell us about your restaurant branches, service model, and specific requirements..."
                      className="p-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-servora-core transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-servora-core px-6 text-sm font-semibold text-white shadow-md shadow-servora-core/20 transition-all hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? "Sending Message..." : "Submit Inquiry"}
                  </button>
                </form>
              )}
            </div>

          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}