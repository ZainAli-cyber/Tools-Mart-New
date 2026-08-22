import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Award,
  Users,
  Globe,
  Wrench,
  Sparkles,
  Heart,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Star,
  CheckCircle2,
  Zap,
  ArrowRight,
  TrendingUp,
  FileText,
  Search,
  Code2,
  Lock,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface AboutPageProps {
  onNavigate: (path: string) => void;
}

// Auto Slider Slide Item Definition
interface SliderItem {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  desc: string;
  icon: React.ReactNode;
  category: string;
  slug?: string;
  quoteAuthor?: string;
  quoteRole?: string;
  rating?: number;
}

const SLIDER_ITEMS: SliderItem[] = [
  {
    id: 'slide-1',
    badge: 'Flagship AI Tool',
    title: 'AI Article Rewriter & Paraphraser',
    subtitle: 'Human-Grade Rewriting Powered by Gemini AI',
    desc: 'Transform any text into 100% unique, engaging, and search-engine optimized articles. Choose between SEO-Optimized, Creative, Professional, and Casual tones with automatic keyword preservation.',
    icon: <Sparkles className="w-8 h-8 text-amber-400" />,
    category: 'Content Analysis',
    slug: 'article-rewriter',
  },
  {
    id: 'slide-2',
    badge: 'Deep Duplicate Detection',
    title: 'Instant Plagiarism Checker',
    subtitle: 'Comprehensive Search Database Verification',
    desc: 'Verify text originality down to single sentences. Get instant uniqueness percentages, similarity highlights, and detailed summary reports before publishing content.',
    icon: <ShieldCheck className="w-8 h-8 text-red-500" />,
    category: 'Content Analysis',
    slug: 'plagiarism-checker',
  },
  {
    id: 'slide-3',
    badge: 'User Testimonial',
    title: '"Saved Our Agency $15,000 Annually"',
    subtitle: 'Trusted by over 100,000 Marketers and Webmasters Worldwide',
    desc: 'AI TOOLZ MART gives us instant, accurate keyword density counts, schema JSON-LD markups, and meta tag generators without monthly subscription fees. It is our daily go-to tool suite.',
    icon: <Star className="w-8 h-8 text-amber-400 fill-amber-400" />,
    category: 'Verified Review',
    quoteAuthor: 'Marcus Vance',
    quoteRole: 'Head of Growth at Apex Digital Agency',
    rating: 5,
  },
  {
    id: 'slide-4',
    badge: 'Keyword Intelligence',
    title: 'Keyword Density & Frequency Analyzer',
    subtitle: 'Prevent Over-Optimization & Google Penalties',
    desc: 'Analyze single-word, two-word, and three-word phrase density in real-time. Calculate exact percentages to ensure natural readability and top SERP ranking.',
    icon: <TrendingUp className="w-8 h-8 text-emerald-400" />,
    category: 'Keywords Tools',
    slug: 'keyword-density-checker',
  },
  {
    id: 'slide-5',
    badge: 'Structured Data Generator',
    title: 'Schema JSON-LD Markup Builder',
    subtitle: 'Capture Rich Snippets in Google Search Results',
    desc: 'Generate valid, error-free Google Schema markup for FAQ, Article, Organization, Product, LocalBusiness, and Breadcrumb structures with instant copy & export.',
    icon: <Code2 className="w-8 h-8 text-blue-400" />,
    category: 'Meta & Schema',
    slug: 'schema-markup-generator',
  },
  {
    id: 'slide-6',
    badge: 'User Testimonial',
    title: '"The Best Free SEO Platform Available"',
    subtitle: 'Seamless Performance with Zero Ads or Registration Paywalls',
    desc: 'Finding a completely free, fast, and secure suite of webmaster tools that respects user privacy is rare. AI TOOLZ MART delivers exceptional speed and precision every single time.',
    icon: <Heart className="w-8 h-8 text-red-500 fill-red-500" />,
    category: 'Verified Review',
    quoteAuthor: 'Elena Rostova',
    quoteRole: 'Senior Technical SEO Consultant',
    rating: 5,
  },
];

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  // Auto Slider State
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // Auto Slider Effect (Changes slide every 3.5 seconds)
  useEffect(() => {
    if (isPlaying) {
      autoPlayRef.current = setInterval(() => {
        setActiveSlideIndex((prev) => (prev + 1) % SLIDER_ITEMS.length);
      }, 3500);
    } else if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
    }

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isPlaying]);

  const handleNextSlide = () => {
    setActiveSlideIndex((prev) => (prev + 1) % SLIDER_ITEMS.length);
  };

  const handlePrevSlide = () => {
    setActiveSlideIndex((prev) => (prev - 1 + SLIDER_ITEMS.length) % SLIDER_ITEMS.length);
  };

  const currentSlide = SLIDER_ITEMS[activeSlideIndex];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Hero Banner Header */}
      <div className="text-center space-y-6 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-slate-900 rounded-full px-4 py-1.5 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-300">
            AI TOOLZ MART Cloud &bull; About Our Platform
          </span>
          <span className="bg-red-600/20 text-red-400 border border-red-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
            100% Free Suite
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
          Democratizing Professional SEO &{' '}
          <span className="bg-gradient-to-r from-red-500 via-amber-400 to-red-400 bg-clip-text text-transparent">
            Webmaster Optimization
          </span>
        </h1>

        <p className="text-slate-400 text-xs sm:text-sm max-w-3xl mx-auto leading-relaxed">
          AI TOOLZ MART was founded on a simple, uncompromising vision: to provide bloggers, digital agencies, web developers, and students with unlimited access to high-precision, enterprise-grade search engine optimization utilities — completely free, without credit cards, paywalls, or mandatory account registration.
        </p>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => onNavigate('/tools')}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xl shadow-red-900/30 transition flex items-center gap-2 cursor-pointer"
          >
            <span>Explore All 80+ Tools</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate('/contact')}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Get In Touch
          </button>
        </div>
      </div>

      {/* Statistics Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-5xl mx-auto">
        <div className="glow-card rounded-2xl p-5 text-center space-y-1 shadow-lg">
          <div className="text-2xl sm:text-3xl font-black text-white flex items-center justify-center gap-1.5">
            <Wrench className="w-6 h-6 text-red-500" /> 80+
          </div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Free Web Utilities</p>
        </div>

        <div className="glow-card rounded-2xl p-5 text-center space-y-1 shadow-lg">
          <div className="text-2xl sm:text-3xl font-black text-white flex items-center justify-center gap-1.5">
            <Users className="w-6 h-6 text-amber-400" /> 100K+
          </div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Daily SEO Checks</p>
        </div>

        <div className="glow-card rounded-2xl p-5 text-center space-y-1 shadow-lg">
          <div className="text-2xl sm:text-3xl font-black text-white flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-6 h-6 text-emerald-400" /> 100%
          </div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Data Privacy</p>
        </div>

        <div className="glow-card rounded-2xl p-5 text-center space-y-1 shadow-lg">
          <div className="text-2xl sm:text-3xl font-black text-white flex items-center justify-center gap-1.5">
            <Globe className="w-6 h-6 text-blue-400" /> $0
          </div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Subscription Cost</p>
        </div>
      </div>

      {/* FEATURED AUTO SLIDER SECTION */}
      <section className="glow-card rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-amber-400" /> Interactive Showcase
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Featured Tools & Community Reviews
            </h2>
          </div>

          {/* Auto Slider Controls (Play/Pause, Arrows) */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2.5 rounded-xl bg-slate-950 text-slate-300 hover:text-white transition cursor-pointer"
              title={isPlaying ? 'Pause Auto-Slide' : 'Play Auto-Slide'}
            >
              {isPlaying ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              onClick={handlePrevSlide}
              className="p-2.5 rounded-xl bg-slate-950 text-slate-300 hover:text-white transition cursor-pointer"
              title="Previous Slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleNextSlide}
              className="p-2.5 rounded-xl bg-slate-950 text-slate-300 hover:text-white transition cursor-pointer"
              title="Next Slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Slide Display Box */}
        <div
          onMouseEnter={() => setIsPlaying(false)}
          onMouseLeave={() => setIsPlaying(true)}
          className="glow-card rounded-2xl p-6 sm:p-8 min-h-[220px] transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden"
        >
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-900 rounded-2xl">
                {currentSlide.icon}
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-red-400 bg-red-600/20 border border-red-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {currentSlide.badge}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                  {currentSlide.title}
                </h3>
              </div>
            </div>

            <p className="text-xs font-bold text-amber-400">{currentSlide.subtitle}</p>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {currentSlide.desc}
            </p>

            {/* Author details for testimonials */}
            {currentSlide.quoteAuthor && (
              <div className="pt-2 border-t border-slate-900 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-600 text-white font-extrabold text-xs flex items-center justify-center">
                  {currentSlide.quoteAuthor.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{currentSlide.quoteAuthor}</div>
                  <div className="text-[10px] text-slate-400">{currentSlide.quoteRole}</div>
                </div>
              </div>
            )}
          </div>

          {/* Right Action Callout in Slide */}
          <div className="shrink-0 flex flex-col items-start md:items-end justify-center gap-3 border-t md:border-t-0 md:border-l border-slate-900 pt-4 md:pt-0 md:pl-6">
            <span className="text-xs font-bold text-slate-400">Category: {currentSlide.category}</span>

            {currentSlide.rating && (
              <div className="flex items-center gap-1 text-amber-400">
                {Array.from({ length: currentSlide.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
            )}

            {currentSlide.slug && (
              <button
                onClick={() => onNavigate(`/tool/${currentSlide.slug}`)}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                <span>Launch Tool Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Pagination Dots */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {SLIDER_ITEMS.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setActiveSlideIndex(idx)}
              className={`h-2.5 rounded-full transition-all cursor-pointer ${
                activeSlideIndex === idx ? 'w-8 bg-red-600' : 'w-2.5 bg-slate-800 hover:bg-slate-700'
              }`}
              title={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Detailed Story & Mission Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Story Card */}
        <div className="glow-card rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl w-fit">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Our Story & Engineering Philosophy</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            For years, small business owners, bloggers, and aspiring digital marketers faced a major hurdle: standard webmaster and SEO software suites were locked behind expensive monthly subscriptions, capping usage with strict daily quotas and artificial waiting queues.
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            AI TOOLZ MART was created to eliminate those barriers. We engineered a ultra-fast, serverless tool suite that handles article rewriting, plagiarism verification, keyword density calculations, meta tag generation, and schema markup directly in your browser with zero subscription charges.
          </p>
        </div>

        {/* Core Principles Card */}
        <div className="glow-card rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-2xl w-fit">
            <Award className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Our Core Commitments</h2>
          <ul className="space-y-3 text-xs text-slate-300">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>100% Free Forever:</strong> No surprise fees, trial expirations, or hidden credit card requests.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Gemini AI Intelligence:</strong> Next-gen AI algorithms providing contextual human-grade content rewrites.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Zero Permanent Data Retention:</strong> All inputted text and code files are processed transiently and deleted instantly.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Instant Speed:</strong> Fast response times backed by high-performance cloud architecture.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Comprehensive Categories Directory Overview */}
      <div className="glow-card rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-2xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Full Webmaster & SEO Suite Capabilities</h2>
            <p className="text-xs text-slate-400">Everything you need to audit, write, and rank</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glow-card rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <FileText className="w-4 h-4 text-red-500" />
              Content & Writing Utilities
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Plagiarism Checkers, AI Article Rewriters, Grammar Correctors, Word Counters, Text Summarizers, and Case Converters.
            </p>
          </div>

          <div className="glow-card rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Search className="w-4 h-4 text-amber-400" />
              Keyword Analysis Tools
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Keyword Density Checkers, Seed Keyword Generator, SERP Rank Trackers, and Long-Tail Suggestion Analyzers.
            </p>
          </div>

          <div className="glow-card rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <Code2 className="w-4 h-4 text-blue-400" />
              Meta Tags & Schema
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Google SERP Meta Tag Generators, Schema JSON-LD Builders, Robots.txt Creators, and XML Sitemap Generators.
            </p>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="glow-card rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">About Page - Frequently Asked Questions</h2>
            <p className="text-xs text-slate-400">Everything you need to know about AI TOOLZ MART Cloud</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glow-card rounded-2xl p-5 space-y-2">
            <h3 className="text-sm font-bold text-white">Is AI TOOLZ MART truly 100% free with no hidden limits?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Yes, absolutely. All 80+ tools on our platform are completely free to use without mandatory sign-ups, credit cards, or daily usage caps.
            </p>
          </div>

          <div className="glow-card rounded-2xl p-5 space-y-2">
            <h3 className="text-sm font-bold text-white">Is my article content safe and confidential when checked?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your privacy is strictly guarded. When you paste text into our Plagiarism Checker or Article Rewriter, the data is processed transiently in memory and never stored in permanent databases.
            </p>
          </div>

          <div className="glow-card rounded-2xl p-5 space-y-2">
            <h3 className="text-sm font-bold text-white">Which AI model powers the content rewriters and schema tools?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              We leverage Google's latest Gemini AI models on the server side to deliver human-grade rewriting, precise grammar corrections, and structured JSON-LD code formatting.
            </p>
          </div>
        </div>
      </div>

      {/* Call To Action Banner */}
      <div className="bg-gradient-to-r from-red-950/60 via-slate-900 to-slate-950 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Ready to Optimize Your Search Engine Rankings?</h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
          Join thousands of bloggers, SEO experts, and web developers who rely on AI TOOLZ MART every single day.
        </p>
        <div className="pt-2">
          <button
            onClick={() => onNavigate('/tools')}
            className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xl shadow-red-900/30 transition cursor-pointer"
          >
            Start Using 80+ Free SEO Tools Now
          </button>
        </div>
      </div>
    </div>
  );
};

