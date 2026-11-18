// apps/web/components/marketing/FaqAccordionClient.tsx
'use client';

import { useState } from 'react';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqAccordionProps {
  faqs: FaqItem[];
}

export default function FaqAccordionClient({ faqs }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // Default first item open

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <article
            key={faq.question}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs transition-all"
          >
            <button
              type="button"
              onClick={() => toggleFaq(index)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between p-6 sm:p-8 text-left cursor-pointer focus:outline-none group"
            >
              <h3 className="text-base sm:text-lg font-bold text-servora-navy group-hover:text-servora-core transition-colors pr-4">
                {faq.question}
              </h3>
              <div
                className={`w-8 h-8 rounded-full bg-servora-pale text-servora-core flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 bg-servora-core text-white' : ''
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isOpen && (
              <div className="px-6 pb-6 sm:px-8 sm:pb-8 pt-0 animate-in fade-in duration-200">
                <p className="text-xs sm:text-sm text-servora-deepTeal leading-relaxed border-t border-gray-100 pt-4">
                  {faq.answer}
                </p>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}