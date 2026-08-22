import React from 'react';
import { Shield, FileText, Network, ArrowRight } from 'lucide-react';
import { TOOLS } from '../data/toolsData';
import { CATEGORIES } from '../data/categoriesData';

interface LegalPageProps {
  type: 'privacy' | 'terms' | 'sitemap';
  onNavigate: (path: string) => void;
}

export const LegalPage: React.FC<LegalPageProps> = ({ type, onNavigate }) => {
  if (type === 'sitemap') {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <div className="space-y-3 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-wider">
            <Network className="w-4 h-4" /> Visual Map
          </div>
          <h1 className="text-3xl font-extrabold text-white">AI TOOLZ MART HTML Sitemap</h1>
          <p className="text-xs text-slate-400">Complete listing of all tools, category sections, and pages.</p>
        </div>

        <div className="space-y-8">
          {CATEGORIES.map((cat) => {
            const catTools = TOOLS.filter((t) => t.category === cat.id);
            return (
              <div key={cat.id} className="glow-card rounded-3xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center justify-between border-b border-slate-800 pb-3">
                  <span>{cat.name}</span>
                  <span className="text-xs text-slate-500">{catTools.length} Tools</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {catTools.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onNavigate(`/tool/${t.slug}`)}
                      className="p-3 bg-slate-950 hover:bg-slate-800 rounded-xl text-left text-xs font-semibold text-slate-300 hover:text-red-400 transition flex items-center justify-between cursor-pointer"
                    >
                      <span>{t.name}</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-50" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-3 border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white">
          {type === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
        </h1>
        <p className="text-xs text-slate-400">Effective Date: July 2026</p>
      </div>

      <div className="glow-card rounded-3xl p-8 text-slate-300 text-xs leading-relaxed space-y-4 font-sans">
        {type === 'privacy' ? (
          <>
            <h2 className="text-base font-bold text-white">1. Information Collection and Privacy Commitment</h2>
            <p>
              At AI TOOLZ MART Cloud, accessible from https://aitoolzmart.com, one of our main priorities is the privacy of our visitors. We do not require account registration or store personal identity records.
            </p>

            <h2 className="text-base font-bold text-white">2. Content Data Security</h2>
            <p>
              Text articles, URLs, images, or code snippets submitted into our tools (such as Article Rewriting, Plagiarism Checking, or Schema Generation) are processed on-demand in memory and are strictly not stored in permanent databases.
            </p>

            <h2 className="text-base font-bold text-white">3. Cookies and Local Storage</h2>
            <p>
              We utilize browser localStorage solely to store user preferences such as Dark Mode settings and saved Favorite Tools. No third-party tracking cookies are deployed.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-base font-bold text-white">1. Terms of Use</h2>
            <p>
              By accessing and using AI TOOLZ MART, you agree to comply with all applicable copyright and fair-use laws. All tools provided on this website are 100% free for commercial and personal usage.
            </p>

            <h2 className="text-base font-bold text-white">2. Disclaimer of Warranties</h2>
            <p>
              The tools and AI suggestions are provided "as is" without warranty of any kind. While we strive for maximum accuracy, users should verify critical code and article outputs before publishing.
            </p>

            <h2 className="text-base font-bold text-white">3. Limitation of Liability</h2>
            <p>
              AI TOOLZ MART shall not be liable for any direct or indirect damages resulting from web page ranking changes or service interruptions.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
