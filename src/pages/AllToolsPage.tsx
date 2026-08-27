import React, { useState } from 'react';
import { Star, MessageCircle, Search, ArrowRight } from 'lucide-react';
import { loadTools } from '../data/toolStore';

interface AllToolsPageProps {
  onNavigate: (path: string) => void;
  favorites: string[];
  onToggleFavorite: (e: React.MouseEvent, toolId: string) => void;
  initialCategory?: string;
  initialFavoritesOnly?: boolean;
}

const WA_BASE = 'https://wa.me/923275855578';
const waLink = (text: string) => `${WA_BASE}?text=${encodeURIComponent(`Hi ZynexTools, I want to buy ${text}.`)}`;
const CATEGORIES = ['All', 'SEO', 'Design', 'AI', 'Learning', 'Video', 'Audio', 'YouTube', 'AI Dev'];

export const AllToolsPage: React.FC<AllToolsPageProps> = ({ onNavigate }) => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const allTools = loadTools();
  const filtered = allTools.filter((t) => {
    const matchCat = activeCategory === 'All' || t.category === activeCategory;
    const matchSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="text-center space-y-3">
        <span className="text-xs font-bold uppercase tracking-widest text-red-500">Tool Directory</span>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white">All 80+ Premium Tools</h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">Browse all group buy SEO, AI, design, and learning tools available in our plans.</p>
      </div>

      {/* Search */}
      <div className="max-w-xl mx-auto">
        <div className="relative glow-card rounded-2xl p-2 flex items-center gap-2">
          <Search className="w-5 h-5 text-red-500 ml-2 shrink-0" />
          <input type="text" placeholder="Search tools (Semrush, Canva, Ahrefs…)"
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none py-1" />
        </div>
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeCategory === cat ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : 'glow-card text-slate-300 hover:text-white'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map((tool) => (
          <div key={tool.id}
            className="glow-card rounded-2xl p-5 flex flex-col gap-4 cursor-pointer group"
            onClick={() => onNavigate(`/tools/${tool.id}`)}>
            <div className="flex items-start gap-3">
              <img src={tool.favicon} alt={tool.name} className="w-12 h-12 rounded-xl border border-slate-700 bg-white p-0.5" />
              <div className="flex-1">
                {(tool.isPrivate || tool.isSemiPrivate) && (
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border inline-block mb-1 ${tool.isSemiPrivate ? 'bg-red-600/20 text-red-400 border-red-500/30' : 'bg-red-600/20 text-red-400 border-red-500/30'}`}>
                    {tool.isSemiPrivate ? 'Semi-Private' : 'Private'}
                  </span>
                )}
                {!tool.isPrivate && !tool.isSemiPrivate && (
                  <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full inline-block mb-1">Hot Deal −{tool.discount}%</span>
                )}
                <h3 className="text-sm font-bold text-white group-hover:text-red-400 transition">{tool.name}</h3>
                <span className="text-[11px] text-slate-500">{tool.category}</span>
              </div>
            </div>
            {tool.desc && <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{tool.desc}</p>}
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
              <span className="text-[11px] text-slate-400 ml-1">{tool.rating}</span>
            </div>
            <div className="flex items-center justify-between mt-auto">
              <div>
                <span className="text-base font-black text-white">Rs {tool.price.toLocaleString()}</span>
                <span className="text-xs text-slate-500 ml-1 line-through">Rs {tool.originalPrice.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 ml-1">/mo</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onNavigate(`/tools/${tool.id}`); }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition cursor-pointer">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 glow-card rounded-3xl p-8 space-y-4">
          <Search className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No tools match your filter</h3>
          <button onClick={() => { setActiveCategory('All'); setSearchQuery(''); }}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-red-700 transition">
            Reset Filters
          </button>
        </div>
      )}

      {/* CTA */}
      <div className="glow-card rounded-3xl p-8 text-center space-y-4">
        <h2 className="text-xl font-extrabold text-white">Ready to get started?</h2>
        <p className="text-sm text-slate-400">Choose a plan and get all these tools in one subscription from just $5/mo</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a href="https://zynextools.com/signup" target="_blank" rel="noopener noreferrer"
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl flex items-center gap-2 transition">
            Sign Up Now <ArrowRight className="w-4 h-4" />
          </a>
          <a href={WA_BASE} target="_blank" rel="noopener noreferrer"
            className="px-6 py-3 btn-secondary-red font-bold text-sm rounded-xl flex items-center gap-2 transition">
            <MessageCircle className="w-4 h-4" /> WhatsApp Us
          </a>
        </div>
      </div>
    </div>
  );
};
