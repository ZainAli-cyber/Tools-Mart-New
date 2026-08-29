import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Heart,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Zap,
  MessageCircle,
  LogIn,
  LayoutDashboard,
} from 'lucide-react';
import { GROUP_BUY_TOOLS } from '../data/groupBuyTools';
import { portalStatus } from '../lib/portalAuth';
import { ChatBotWidget } from './ChatBotWidget';
import { BrandLogo } from './BrandLogo';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  favorites: string[];
}

const NAV_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Tools', path: '/tools' },
  { label: 'Plans', path: '/plans' },
  { label: 'Reseller', path: '/resellers-portal' },

  { label: 'FAQ', path: '/faq' },
  { label: 'Contact', path: '/contact' },
  { label: 'About', path: '/about' },
];

const WA_LINK = 'https://wa.me/923275855578?text=Hi%20ZynexTools%2C%20I%20am%20messaging%20you%20from%20your%20website.%20I%20need%20help%20please';

export const Header: React.FC<HeaderProps> = ({
  currentPath,
  onNavigate,
  favorites,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [auth, setAuth] = useState(portalStatus());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Re-check the session whenever the route changes, so the button flips
  // between Login and Dashboard without a full reload.
  useEffect(() => { setAuth(portalStatus()); }, [currentPath]);

  const searchResults = searchQuery.trim()
    ? GROUP_BUY_TOOLS.filter(
        (tool) =>
          tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tool.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : GROUP_BUY_TOOLS.slice(0, 6);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') setIsSearchOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isSearchOpen]);

  return (
    <>
      {/* Top Banner */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-red-600 text-white font-bold text-[10px] uppercase px-1.5 py-0.5 rounded tracking-wide">
              100% Free
            </span>
            <span>Over 80+ Premium SEO & Webmaster Utilities</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> Instant Processing
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-red-400" /> Powered by Gemini AI
            </span>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="hover:text-white transition flex items-center gap-1 cursor-pointer bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-[11px]"
            >
              Search Tools <kbd className="text-[9px] bg-slate-900 px-1 rounded text-slate-300">Ctrl K</kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <button
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2 cursor-pointer group text-left shrink-0"
          >
            <BrandLogo
              variant="website"
              className="w-auto object-contain object-left group-hover:scale-105 transition-transform duration-200"
            />
          </button>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {NAV_LINKS.map((link) => (
              <button
                key={link.path}
                onClick={() => onNavigate(link.path)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  currentPath === link.path
                    ? 'bg-red-600/15 text-red-400 border border-red-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Search (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
            </button>

            {favorites.length > 0 && (
              <button
                onClick={() => onNavigate('/tools?favorites=true')}
                className="relative p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                <Heart className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {favorites.length}
                </span>
              </button>
            )}

            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-xs font-black text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition shadow-lg shadow-emerald-900/30 flex items-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5" /> <span className="hidden sm:inline">WhatsApp</span>
            </a>

            {auth.loggedIn ? (
              <a
                href={auth.dashboard}
                className="px-4 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-lg shadow-red-900/30 flex items-center gap-1.5"
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
              </a>
            ) : (
              <button
                onClick={() => onNavigate('/login')}
                className="px-4 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-lg shadow-red-900/30 flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" /> Login
              </button>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-slate-950 px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.path}
                onClick={() => { onNavigate(link.path); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  currentPath === link.path
                    ? 'bg-red-600/15 text-red-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                {link.label}
              </button>
            ))}
            <div className="pt-3 space-y-2">
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-black text-white bg-emerald-500 rounded-xl">
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </a>
              {auth.loggedIn ? (
                <a href={auth.dashboard}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-black text-white bg-red-600 rounded-xl">
                  <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                </a>
              ) : (
                <button onClick={() => { onNavigate('/login'); setIsMobileMenuOpen(false); }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-black text-white bg-red-600 rounded-xl cursor-pointer">
                  <LogIn className="w-3.5 h-3.5" /> Login
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <ChatBotWidget />

      {/* Search Modal */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
        >
          <div
            className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 p-4 border-b border-slate-800">
              <Search className="w-5 h-5 text-red-500 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search tools (Semrush, Canva, Ahrefs…)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
              />
              <button
                onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-xl"
              >
                Esc
              </button>
            </div>
            <div className="p-2 max-h-80 overflow-y-auto">
              {searchResults.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => { setIsSearchOpen(false); setSearchQuery(''); onNavigate('/tools'); }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-slate-800 rounded-xl transition text-left cursor-pointer"
                >
                  <img src={tool.favicon} alt={tool.name} className="w-8 h-8 rounded-xl border border-slate-700 bg-white p-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-white">{tool.name}</div>
                    <div className="text-xs text-slate-400">{tool.category}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
