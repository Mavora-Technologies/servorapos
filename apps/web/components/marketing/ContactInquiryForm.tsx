// apps/web/components/marketing/ContactInquiryForm.tsx
'use client';

import { useState } from 'react';
import { SITE_CONFIG } from '@/lib/seo';

const WHATSAPP_NUMBER = '254795707823';

export default function ContactInquiryForm() {
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [inquiryTopic, setInquiryTopic] = useState('Schedule a Live Demo / Walkthrough');
  const [branchCount, setBranchCount] = useState('1 Outlet / Branch');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [lastWhatsappUrl, setLastWhatsappUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const buildWhatsAppLink = () => {
    const formattedText = [
      `*SERVORA HOSPITALITY INQUIRY*`,
      `• *Name:* ${fullName.trim()}`,
      `• *Business:* ${businessName.trim()}`,
      `• *Phone:* ${phone.trim()}`,
      `• *Email:* ${email.trim()}`,
      `• *Scale:* ${branchCount}`,
      `• *Topic:* ${inquiryTopic}`,
      ``,
      `*Details:*`,
      message.trim(),
    ].join('\n');

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(formattedText)}`;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    // Silent spam bot trap
    if (honeypot.trim() !== '') {
      return;
    }

    if (!fullName.trim() || !businessName.trim() || !email.trim() || !phone.trim() || !message.trim()) {
      setErrorMsg('Please fill in all required fields before submitting.');
      return;
    }

    const waUrl = buildWhatsAppLink();
    setLastWhatsappUrl(waUrl);
    setSubmitted(true);

    // Redirect / open WhatsApp chat with prefilled enterprise inquiry
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleReset = () => {
    setSubmitted(false);
    setFullName('');
    setBusinessName('');
    setEmail('');
    setPhone('');
    setMessage('');
    setLastWhatsappUrl('');
    setErrorMsg(null);
  };

  if (submitted) {
    return (
      <div className="py-10 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-servora-navy mb-2">
          Redirecting to Mavora Technologies WhatsApp Desk
        </h3>
        <p className="text-xs sm:text-sm text-servora-deepTeal max-w-md leading-relaxed">
          Your inquiry for <strong>{businessName}</strong> has been formatted for our Nairobi sales and engineering desk ({SITE_CONFIG.parentCompany.displayPhone}). If WhatsApp did not open automatically, click below.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <a
            href={lastWhatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-600 px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700"
          >
            Open WhatsApp Chat Now
          </a>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 bg-white px-6 text-sm font-semibold text-servora-navy transition-all hover:border-servora-core cursor-pointer"
          >
            Submit Another Inquiry
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold text-servora-navy mb-1">
          Book a Live Demo or Consultation via WhatsApp
        </h2>
        <p className="text-xs text-servora-deepTeal">
          Complete your details below to launch a direct WhatsApp conversation with our Nairobi hospitality specialists.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
          {errorMsg}
        </div>
      )}

      {/* Anti-spam honeypot */}
      <input
        type="text"
        name="website_url"
        tabIndex={-1}
        autoComplete="off"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="hidden"
        aria-hidden="true"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-fullName" className="text-xs font-semibold text-servora-navy">
            Full Name *
          </label>
          <input
            id="contact-fullName"
            required
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Amina Mohammed"
            className="h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-servora-core transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-businessName" className="text-xs font-semibold text-servora-navy">
            Hotel / Restaurant / Business Name *
          </label>
          <input
            id="contact-businessName"
            required
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Savannah Grill & Lounge"
            className="h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-servora-core transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-email" className="text-xs font-semibold text-servora-navy">
            Work Email Address *
          </label>
          <input
            id="contact-email"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operations@yourhospitality.co.ke"
            className="h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-servora-core transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-phone" className="text-xs font-semibold text-servora-navy">
            Phone / WhatsApp Number *
          </label>
          <input
            id="contact-phone"
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+254 700 000 000"
            className="h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-servora-core transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-topic" className="text-xs font-semibold text-servora-navy">
            How can we help you? *
          </label>
          <select
            id="contact-topic"
            value={inquiryTopic}
            onChange={(e) => setInquiryTopic(e.target.value)}
            className="h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-servora-core transition-colors"
          >
            <option>Schedule a Live Demo / Walkthrough</option>
            <option>Hotel F&amp;B &amp; Multi-Outlet Deployment</option>
            <option>Inquire About Pricing &amp; Plans</option>
            <option>M-Pesa Daraja &amp; KRA eTIMS Integration</option>
            <option>POS Hardware &amp; Terminal Bundles</option>
            <option>Technical RFP &amp; Brief Submission</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-branches" className="text-xs font-semibold text-servora-navy">
            Number of Outlets / Branches *
          </label>
          <select
            id="contact-branches"
            value={branchCount}
            onChange={(e) => setBranchCount(e.target.value)}
            className="h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-servora-core transition-colors"
          >
            <option>1 Outlet / Branch</option>
            <option>2 – 5 Branches</option>
            <option>6 – 15 Branches</option>
            <option>15+ Multi-Property Group</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-message" className="text-xs font-semibold text-servora-navy">
          Operational Requirements &amp; Message *
        </label>
        <textarea
          id="contact-message"
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us about your restaurant, bar, café, or hotel F&B outlets, service model, and timeline..."
          className="p-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-servora-core transition-colors"
        />
      </div>

      <button
        type="submit"
        className="inline-flex h-11 items-center justify-center rounded-lg bg-servora-core px-6 text-sm font-semibold text-white shadow-md shadow-servora-core/20 transition-all hover:bg-blue-700 cursor-pointer"
      >
        Submit Your Inquiry &rarr;
      </button>
    </form>
  );
}