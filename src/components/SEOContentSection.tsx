import React, { useState } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Zap,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';

interface SEOContentSectionProps {
  toolName: string;
  howToUseSteps: string[];
  whyUseFeatures: { title: string; desc: string }[];
  faqs: { question: string; answer: string }[];
}

export const SEOContentSection: React.FC<SEOContentSectionProps> = ({
  toolName,
  howToUseSteps,
  whyUseFeatures,
  faqs,
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  return (
    <div className="mt-12 space-y-10">
      {/* How to use section */}
      <div className="glow-card rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">How to Use {toolName}</h2>
            <p className="text-xs text-slate-400">Step-by-step user guide for maximum results</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {howToUseSteps.map((step, index) => (
            <div
              key={index}
              className="glow-card rounded-2xl p-4 flex flex-col justify-between"
            >
              <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center font-extrabold text-sm mb-3">
                0{index + 1}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Why Use Features */}
      <div className="glow-card rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Why Choose Trump SEO {toolName}?</h2>
            <p className="text-xs text-slate-400">Key performance benefits and features</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {whyUseFeatures.map((feat, index) => (
            <div key={index} className="glow-card rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {feat.title}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Accordion */}
      {faqs.length > 0 && (
        <div className="glow-card rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-2xl">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Frequently Asked Questions</h2>
              <p className="text-xs text-slate-400">Common questions about our {toolName}</p>
            </div>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="glow-card rounded-2xl overflow-hidden transition"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-200 hover:text-white transition cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        isOpen ? 'rotate-180 text-red-400' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-slate-400 leading-relaxed border-t border-slate-900 pt-3">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
