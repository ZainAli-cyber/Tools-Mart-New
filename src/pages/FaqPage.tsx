import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';

const FAQS = [
  {
    q: 'Are these tools genuine and safe to use?',
    a: 'Yes, we provide only genuine tools directly purchased from trusted sources. We ensure access is secure, reliable, and complies with all sharing policies.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We accept UPI, PayPal, Binance, bank transfers, and secure payment gateways for hassle-free transactions.',
  },
  {
    q: 'How long does it take to get access?',
    a: 'Access is typically granted within 5 minutes after payment confirmation.',
  },
  {
    q: 'What if I face issues while using a tool?',
    a: 'Clear your cookies and cache, then restart the tool. If the problem persists, contact us via email or Help Desk for prompt assistance.',
  },
  {
    q: 'Is my data secure?',
    a: 'Absolutely! We prioritize your privacy and ensure your data is never shared with third parties. All transactions are processed securely.',
  },
  {
    q: 'What does Group Buy SEO Tools mean?',
    a: 'Group Buy means you get SEO tools access at an affordable price compared to the original. These accounts are best for medium usage — heavy users should not purchase.',
  },
  {
    q: 'Do you offer a refund?',
    a: 'We only refund if our tools do not work for more than 48 hours. Please clear everything with Live Chat Support before purchasing. See our Refund Policy for details.',
  },
  {
    q: 'What is your account activation process?',
    a: 'You will get instant access on your email after payment confirmation.',
  },
  {
    q: 'Can I use Proxy/VPN IPs?',
    a: 'No, you cannot access your account via proxies or RDPs. It may result in a permanent ban on your account.',
  },
  {
    q: 'Can I share my account?',
    a: 'We do not allow account sharing. If our system detects sharing, your account will be permanently banned.',
  },
  {
    q: 'What is the access mode?',
    a: 'Access is provided via a Chrome extension. Download and install our extension — the guide is available in the Member Dashboard. A few tools have direct access.',
  },
  {
    q: 'Does your service work for Mac users?',
    a: 'Yes, our service works on both Windows & Mac.',
  },
];

export const FaqPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden pt-14 pb-16 px-4 sm:px-6 lg:px-8 border-b border-red-900/20 text-center" style={{ background: 'var(--hero-bg)' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-red-600/10 blur-3xl pointer-events-none rounded-full" />
        <div className="relative max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-red-500">Support</span>
          <h1 className="text-3xl sm:text-5xl font-black text-white">Frequently Asked Questions</h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Everything you need to know before getting started. Still curious? Message us on WhatsApp any time.
          </p>
        </div>
      </section>

      {/* FAQ List */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-3">
        {FAQS.map((faq, i) => (
          <div key={i} className="glow-card rounded-2xl overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-slate-800/50 transition"
            >
              <span className="text-sm font-bold text-white pr-4">{faq.q}</span>
              {openIndex === i
                ? <ChevronUp className="w-4 h-4 text-red-500 shrink-0" />
                : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
            </button>
            {openIndex === i && (
              <div className="px-5 pb-5 text-sm text-slate-400 leading-relaxed border-t border-slate-800 pt-4">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Still have questions CTA */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 text-center space-y-5">
        <div className="glow-card rounded-3xl p-10 space-y-4">
          <h2 className="text-2xl font-extrabold text-white">Still have questions?</h2>
          <p className="text-sm text-slate-400">Our team is one message away — we reply within an hour.</p>
          <a
            href="https://wa.me/923275855578?text=Hi%20ZynexTools%2C%20I%20have%20a%20question"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl transition shadow-lg"
          >
            <MessageCircle className="w-4 h-4" /> Ask on WhatsApp
          </a>
        </div>
      </section>
    </div>
  );
};
