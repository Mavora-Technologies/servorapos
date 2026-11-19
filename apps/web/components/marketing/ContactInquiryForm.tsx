// apps/web/components/marketing/ContactInquiryForm.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const WHATSAPP_NUMBER = '254795707823';

const BUSINESS_TYPES = [
  'Restaurant',
  'Café',
  'Hotel or Resort',
  'Bar or Lounge',
  'Fast Food / Quick Service',
  'Bakery',
  'Cloud Kitchen',
  'Catering Business',
  'Multi-Branch Hospitality Group',
  'Other',
] as const;

const OUTLET_COUNTS = [
  '1 outlet',
  '2–3 outlets',
  '4–10 outlets',
  'More than 10 outlets',
  'Planning to open',
] as const;

const ENQUIRY_TYPES = [
  'Book a Live Product Demo',
  'Request a Pricing Consultation',
  'Request a POS Hardware Quotation',
  'Discuss an Integration',
  'General Business Enquiry',
  'Existing Customer Support',
] as const;

const CONTACT_METHODS = ['WhatsApp', 'Phone Call', 'Email'] as const;

const SERVICE_INTERESTS = [
  'Servora POS System',
  'Restaurant Management Software',
  'Hotel F&B Management',
  'Bar & Lounge Management',
  'Cloud Kitchen Management',
  'Kitchen Display System',
  'Inventory & Recipe Costing',
  'M-Pesa Integration',
  'Multi-Branch Management',
  'POS Hardware & Installation',
  'Pricing & Subscription Plans',
  'Custom Integration or Technical Consultation',
] as const;

interface FormState {
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  preferredContact: (typeof CONTACT_METHODS)[number];
  businessType: string;
  city: string;
  county: string;
  country: string;
  outletCount: string;
  enquiryType: string;
  interests: string[];
  preferredDate: string;
  preferredTime: string;
  message: string;
  consent: boolean;
}

interface FormErrors {
  fullName?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  interests?: string;
  consent?: string;
}

export default function ContactInquiryForm() {
  const searchParams = useSearchParams();

  const [form, setForm] = useState<FormState>({
    fullName: '',
    businessName: '',
    email: '',
    phone: '',
    preferredContact: 'WhatsApp',
    businessType: 'Restaurant',
    city: '',
    county: '',
    country: 'Kenya',
    outletCount: '1 outlet',
    enquiryType: 'Book a Live Product Demo',
    interests: ['Servora POS System'],
    preferredDate: '',
    preferredTime: '',
    message: '',
    consent: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  // Pre-fill context when arriving from /pricing or custom plan builder
  useEffect(() => {
    const plan = searchParams.get('plan');
    const billing = searchParams.get('billing');
    const outlets = searchParams.get('outlets');
    const features = searchParams.get('features');
    const notes = searchParams.get('notes');

    if (!plan && !features && !notes) return;

    const prefillLines: string[] = [];
    if (plan) {
      prefillLines.push(
        `Selected Plan: ${plan.charAt(0).toUpperCase() + plan.slice(1)}${
          billing ? ` (${billing} billing)` : ''
        }`
      );
    }
    if (features) {
      prefillLines.push(`Requested Modules: ${features}`);
    }
    if (notes) {
      prefillLines.push(`Additional Notes: ${notes}`);
    }

    const mappedOutlets =
      outlets === '2-3'
        ? '2–3 outlets'
        : outlets === '4-10'
          ? '4–10 outlets'
          : outlets === '10+'
            ? 'More than 10 outlets'
            : '1 outlet';

    setForm((prev) => ({
      ...prev,
      outletCount: outlets ? mappedOutlets : prev.outletCount,
      enquiryType: plan ? 'Request a Pricing Consultation' : prev.enquiryType,
      interests: Array.from(
        new Set([
          ...prev.interests,
          ...(plan ? ['Pricing & Subscription Plans'] : []),
        ])
      ),
      message: prev.message || prefillLines.join('\n'),
    }));
  }, [searchParams]);

  const toggleInterest = (interest: string) => {
    setErrors((prev) => ({ ...prev, interests: undefined }));
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((item) => item !== interest)
        : [...prev.interests, interest],
    }));
  };

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};
    if (!form.fullName.trim()) {
      nextErrors.fullName = 'Please enter your full name.';
    }
    if (!form.businessName.trim()) {
      nextErrors.businessName = 'Please enter your business or venue name.';
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email.trim() || !emailPattern.test(form.email.trim())) {
      nextErrors.email = 'Please enter a valid work email address.';
    }
    const cleanedPhone = form.phone.replace(/[\s\-()]/g, '');
    if (!cleanedPhone || cleanedPhone.length < 9 || !/^\+?\d{9,15}$/.test(cleanedPhone)) {
      nextErrors.phone = 'Please enter a valid Kenyan or international phone number.';
    }
    if (form.interests.length === 0) {
      nextErrors.interests = 'Please select at least one area of interest.';
    }
    if (!form.consent) {
      nextErrors.consent = 'Please confirm that Mavora Technologies may contact you.';
    }
    return nextErrors;
  };

  const buildWhatsAppMessage = () => {
    const locationParts = [form.city.trim(), form.county.trim(), form.country.trim()].filter(
      Boolean
    );
    const locationStr = locationParts.length > 0 ? locationParts.join(', ') : 'Not specified';

    const lines = [
      'Hello Mavora Technologies,',
      'I would like to enquire about Servora.',
      '',
      'Contact Details:',
      `Name: ${form.fullName.trim()}`,
      `Business: ${form.businessName.trim()}`,
      `Email: ${form.email.trim()}`,
      `Phone: ${form.phone.trim()}`,
      `Preferred Contact Method: ${form.preferredContact}`,
      '',
      'Business Information:',
      `Business Type: ${form.businessType}`,
      `Location: ${locationStr}`,
      `Number of Outlets: ${form.outletCount}`,
      '',
      'Enquiry:',
      `Request Type: ${form.enquiryType}`,
      `Interested Services: ${form.interests.join(', ')}`,
    ];

    if (form.preferredDate) {
      lines.push(`Preferred Demo Date: ${form.preferredDate}`);
    }
    if (form.preferredTime) {
      lines.push(`Preferred Time: ${form.preferredTime}`);
    }
    if (form.message.trim()) {
      lines.push('', 'Additional Requirements:', form.message.trim());
    }

    lines.push('', 'I would like to learn more about how Servora can support my business.');
    return lines.join('\n');
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    const encodedMessage = encodeURIComponent(buildWhatsAppMessage());
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    setWhatsappUrl(url);

    window.open(url, '_blank', 'noopener,noreferrer');

    setTimeout(() => {
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div>
      <div className="pb-6 border-b border-gray-100 mb-6">
        <span className="inline-block rounded-full bg-servora-core/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-servora-core">
          Demo &amp; Consultation Request
        </span>
        <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-servora-navy tracking-tight">
          Request a Servora Demo or Consultation
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-servora-deepTeal">
          Tell us a little about your business so we can prepare a relevant demonstration. Submitting opens a pre-filled WhatsApp message directly with our Nairobi sales desk.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-7">
        {/* A. Contact Information */}
        <fieldset className="space-y-4">
          <legend className="text-xs font-extrabold uppercase tracking-wider text-servora-navy font-mono">
            1. Contact Information
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fullName" className="block text-xs font-bold text-servora-navy mb-1.5">
                Full Name <span className="text-red-600">*</span>
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                autoComplete="name"
                value={form.fullName}
                onChange={(e) => {
                  setForm({ ...form, fullName: e.target.value });
                  setErrors((prev) => ({ ...prev, fullName: undefined }));
                }}
                placeholder="e.g., Jane Wanjiku"
                aria-invalid={Boolean(errors.fullName)}
                className="w-full h-11 rounded-xl border border-gray-200 bg-servora-pale/40 px-3.5 text-xs text-servora-navy placeholder:text-gray-400 focus:border-servora-core focus:bg-white focus:outline-none"
              />
              {errors.fullName && (
                <p role="alert" className="mt-1 text-[11px] font-semibold text-red-600">
                  {errors.fullName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="businessName"
                className="block text-xs font-bold text-servora-navy mb-1.5"
              >
                Business / Venue Name <span className="text-red-600">*</span>
              </label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                required
                autoComplete="organization"
                value={form.businessName}
                onChange={(e) => {
                  setForm({ ...form, businessName: e.target.value });
                  setErrors((prev) => ({ ...prev, businessName: undefined }));
                }}
                placeholder="e.g., Kilimani Bistro & Lounge"
                aria-invalid={Boolean(errors.businessName)}
                className="w-full h-11 rounded-xl border border-gray-200 bg-servora-pale/40 px-3.5 text-xs text-servora-navy placeholder:text-gray-400 focus:border-servora-core focus:bg-white focus:outline-none"
              />
              {errors.businessName && (
                <p role="alert" className="mt-1 text-[11px] font-semibold text-red-600">
                  {errors.businessName}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-bold text-servora-navy mb-1.5">
                Work Email <span className="text-red-600">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="name@yourvenue.co.ke"
                aria-invalid={Boolean(errors.email)}
                className="w-full h-11 rounded-xl border border-gray-200 bg-servora-pale/40 px-3.5 text-xs text-servora-navy placeholder:text-gray-400 focus:border-servora-core focus:bg-white focus:outline-none"
              />
              {errors.email && (
                <p role="alert" className="mt-1 text-[11px] font-semibold text-red-600">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-xs font-bold text-servora-navy mb-1.5">
                Phone Number <span className="text-red-600">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => {
                  setForm({ ...form, phone: e.target.value });
                  setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                placeholder="+254 7XX XXX XXX"
                aria-invalid={Boolean(errors.phone)}
                className="w-full h-11 rounded-xl border border-gray-200 bg-servora-pale/40 px-3.5 text-xs text-servora-navy placeholder:text-gray-400 focus:border-servora-core focus:bg-white focus:outline-none"
              />
              {errors.phone && (
                <p role="alert" className="mt-1 text-[11px] font-semibold text-red-600">
                  {errors.phone}
                </p>
              )}
            </div>
          </div>

          <div>
            <span className="block text-xs font-bold text-servora-navy mb-2">
              Preferred Contact Method
            </span>
            <div className="flex flex-wrap gap-2">
              {CONTACT_METHODS.map((method) => {
                const active = form.preferredContact === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setForm({ ...form, preferredContact: method })}
                    aria-pressed={active}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      active
                        ? 'bg-servora-navy text-white border-servora-navy'
                        : 'bg-servora-pale/60 text-servora-navy border-gray-200 hover:border-servora-core'
                    }`}
                  >
                    {method}
                  </button>
                );
              })}
            </div>
          </div>
        </fieldset>

        {/* B. Business Information */}
        <fieldset className="space-y-4 pt-4 border-t border-gray-100">
          <legend className="text-xs font-extrabold uppercase tracking-wider text-servora-navy font-mono">
            2. Business Information
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="businessType"
                className="block text-xs font-bold text-servora-navy mb-1.5"
              >
                Business Type
              </label>
              <select
                id="businessType"
                value={form.businessType}
                onChange={(e) => setForm({ ...form, businessType: e.target.value })}
                className="w-full h-11 rounded-xl border border-gray-200 bg-servora-pale/40 px-3.5 text-xs font-semibold text-servora-navy focus:border-servora-core focus:bg-white focus:outline-none"
              >
                {BUSINESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="outletCount"
                className="block text-xs font-bold text-servora-navy mb-1.5"
              >
                Number of Outlets
              </label>
              <select
                id="outletCount"
                value={form.outletCount}
                onChange={(e) => setForm({ ...form, outletCount: e.target.value })}
                className="w-full h-11 rounded-xl border border-gray-200 bg-servora-pale/40 px-3.5 text-xs font-semibold text-servora-navy focus:border-servora-core focus:bg-white focus:outline-none"
              >
                {OUTLET_COUNTS.map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="city" className="block text-xs font-bold text-servora-navy mb-1.5">
                Town / City
              </label>
              <input
                id="city"
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="e.g., Nairobi"
                className="w-full h-11 rounded-xl border border-gray-200 bg-servora-pale/40 px-3.5 text-xs text-servora-navy placeholder:text-gray-400 focus:border-servora-core focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="county" className="block text-xs font-bold text-servora-navy mb-1.5">
                County / Region
              </label>
              <input
                id="county"
                type="text"
                value={form.county}
                onChange={(e) => setForm({ ...form, county: e.target.value })}
                placeholder="e.g., Nairobi County"
                className="w-full h-11 rounded-xl border border-gray-200 bg-servora-pale/40 px-3.5 text-xs text-servora-navy placeholder:text-gray-400 focus:border-servora-core focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="country" className="block text-xs font-bold text-servora-navy mb-1.5">
                Country
              </label>
              <input
                id="country"
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full h-11 rounded-xl border border-gray-200 bg-servora-pale/40 px-3.5 text-xs text-servora-navy focus:border-servora-core focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </fieldset>

        {/* C & D. Enquiry Type & Interests */}
        <fieldset className="space-y-4 pt-4 border-t border-gray-100">
          <legend className="text-xs font-extrabold uppercase tracking-wider text-servora-navy font-mono">
            3. Enquiry &amp; Areas of Interest
          </legend>

          <div>
            <label
              htmlFor="enquiryType"
              className="block text-xs font-bold text-servora-navy mb-1.5"
            >
              Enquiry Type
            </label>
            <select
              id="enquiryType"
              value={form.enquiryType}
              onChange={(e) => setForm({ ...form, enquiryType: e.target.value })}
              className="w-full h-11 rounded-xl border border-gray-200 bg-servora-pale/40 px-3.5 text-xs font-semibold text-servora-navy focus:border-servora-core focus:bg-white focus:outline-none"
            >
              {ENQUIRY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-xs font-bold text-servora-navy mb-2">
              What Are You Interested In? <span className="text-red-600">*</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {SERVICE_INTERESTS.map((interest) => {
                const selected = form.interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    aria-pressed={selected}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                      selected
                        ? 'bg-servora-core text-white border-servora-core shadow-2xs'
                        : 'bg-servora-pale/60 text-servora-navy border-gray-200 hover:border-servora-core'
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
            {errors.interests && (
              <p role="alert" className="mt-1.5 text-[11px] font-semibold text-red-600">
                {errors.interests}
              </p>
            )}
          </div>
        </fieldset>

        {/* E & F. Schedule & Additional Information */}
        <fieldset className="space-y-4 pt-4 border-t border-gray-100">
          <legend className="text-xs font-extrabold uppercase tracking-wider text-servora-navy font-mono">
            4. Preferred Demo Schedule &amp; Requirements
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="preferredDate"
                className="block text-xs font-bold text-servora-navy mb-1.5"
              >
                Preferred Date (Optional)
              </label>
              <input
                id="preferredDate"
                type="date"
                value={form.preferredDate}
                onChange={(e) => setForm({ ...form, preferredDate: e.target.value })}
                className="w-full h-11 rounded-xl border border-gray-200 bg-servora-pale/40 px-3.5 text-xs text-servora-navy focus:border-servora-core focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="preferredTime"
                className="block text-xs font-bold text-servora-navy mb-1.5"
              >
                Preferred Time (Optional)
              </label>
              <input
                id="preferredTime"
                type="time"
                value={form.preferredTime}
                onChange={(e) => setForm({ ...form, preferredTime: e.target.value })}
                className="w-full h-11 rounded-xl border border-gray-200 bg-servora-pale/40 px-3.5 text-xs text-servora-navy focus:border-servora-core focus:bg-white focus:outline-none"
              />
            </div>
          </div>
          <p className="text-[11px] text-servora-deepTeal">
            Our team will confirm availability for your preferred date and time during business hours (Monday – Friday, 8:30 AM – 5:00 PM EAT).
          </p>

          <div>
            <label htmlFor="message" className="block text-xs font-bold text-servora-navy mb-1.5">
              Tell Us More About Your Requirements
            </label>
            <textarea
              id="message"
              rows={4}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Describe your current operations, challenges, or the features you would like to explore..."
              className="w-full rounded-xl border border-gray-200 bg-servora-pale/40 p-3.5 text-xs text-servora-navy placeholder:text-gray-400 focus:border-servora-core focus:bg-white focus:outline-none"
            />
          </div>
        </fieldset>

        {/* G. Consent */}
        <div className="pt-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => {
                setForm({ ...form, consent: e.target.checked });
                setErrors((prev) => ({ ...prev, consent: undefined }));
              }}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-servora-core focus:ring-servora-core"
            />
            <span className="text-xs text-servora-deepTeal leading-relaxed">
              I agree to be contacted by Mavora Technologies regarding this enquiry.{' '}
              <span className="text-red-600">*</span>
            </span>
          </label>
          {errors.consent && (
            <p role="alert" className="mt-1 text-[11px] font-semibold text-red-600">
              {errors.consent}
            </p>
          )}
        </div>

        {/* H. Submit */}
        <div className="space-y-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex h-12 items-center justify-center rounded-xl bg-servora-core px-7 text-sm font-bold text-white shadow-lg shadow-servora-core/25 transition-all hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? 'Opening WhatsApp...' : 'Submit Enquiry & Request a Demo →'}
          </button>

          {whatsappUrl && (
            <div
              role="status"
              className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900"
            >
              <p className="font-bold">Ready to continue on WhatsApp.</p>
              <p className="mt-1 leading-relaxed">
                Your structured enquiry has been prepared for our Nairobi team. If WhatsApp did not open automatically,{' '}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline text-emerald-800"
                >
                  click here to send your message on WhatsApp
                </a>
                .
              </p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}