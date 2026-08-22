import React, { useMemo, useState } from 'react';
import { Check, Lock, Search, ShoppingBag, ArrowUpRight } from 'lucide-react';
import type { Tool } from '../../admin/data/adminStore';
import { waLink } from '../../lib/accountStore';
import { useToolLaunch } from '../components/ToolLaunchFlow';

interface Props {
  allTools: Tool[];
  ownedTools: string[];
  planActive: boolean;
  adminWhatsapp: string;
  onExtensions?: () => void;
}

export const CustomerShopPage: React.FC<Props> = ({ allTools, ownedTools, planActive, adminWhatsapp, onExtensions }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const { launch, ui: launchUi } = useToolLaunch({ onOpenExtensionsPage: onExtensions });

  const owned = useMemo(
    () => new Set(ownedTools.map(tool => tool.toLowerCase())),
    [ownedTools],
  );
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(allTools.map(tool => tool.category)))],
    [allTools],
  );
  const visible = allTools.filter(tool =>
    (category === 'All' || tool.category === category) &&
    (!search || tool.name.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-5">
      {launchUi}
      <section
        className="reseller-band relative overflow-hidden rounded-2xl border border-red-500/30 p-5 sm:p-6"
        style={{ background: 'linear-gradient(120deg, #4a0f14 0%, #2a0d0d 55%, #130d0d 100%)' }}
      >
        <div className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-red-600/20 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-400/30 bg-red-600/20">
            <ShoppingBag className="h-6 w-6 text-red-300" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-300">Customer Shop</p>
            <h2 className="mt-1 text-2xl font-black text-white">Explore Premium Tools</h2>
            <p className="mt-1 text-xs text-slate-300">
              Open tools assigned to your account or contact the admin to unlock more.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-[#2a1e1c] bg-[#130d0d] p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search available tools..."
            className="w-full rounded-xl border border-[#2a1e1c] bg-[#0d0908] py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-red-500/50"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(item => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                category === item
                  ? 'bg-red-600 text-white'
                  : 'border border-[#2a1e1c] bg-[#1a1210] text-slate-400 hover:text-white'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {visible.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map(tool => {
            const accessible = owned.has(tool.name.toLowerCase()) && planActive;
            return (
              <article
                key={tool.id}
                className={`flex flex-col overflow-hidden rounded-2xl border bg-[#130d0d] transition ${
                  accessible
                    ? 'border-emerald-500/30 hover:border-emerald-500/50'
                    : 'border-[#2a1e1c] hover:border-red-500/35'
                }`}
              >
                <div className="relative flex items-center gap-3 border-b border-[#2a1e1c] bg-[#1a1210] p-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-2 ${accessible ? '' : 'grayscale opacity-60'}`}>
                    {tool.favicon
                      ? <img src={tool.favicon} alt={tool.name} className="h-full w-full object-contain" />
                      : <span className="text-lg font-black text-slate-800">{tool.name[0]}</span>}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-black text-white">{tool.name}</h3>
                    <p className="text-[10px] text-slate-500">{tool.category}</p>
                  </div>
                  <span className={`ml-auto rounded-full border px-2 py-1 text-[8px] font-black uppercase ${
                    accessible
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : 'border-slate-600/40 bg-slate-700/30 text-slate-400'
                  }`}>
                    {accessible ? 'Accessible' : 'Locked'}
                  </span>
                </div>

                <div className="flex-1 p-4">
                  <p className="line-clamp-3 text-xs leading-relaxed text-slate-400">{tool.desc}</p>
                  {!accessible && (
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-sm font-black text-white">Rs. {tool.price.toLocaleString()}</span>
                      {tool.originalPrice > tool.price && (
                        <span className="text-[10px] text-slate-600 line-through">Rs. {tool.originalPrice.toLocaleString()}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-[#2a1e1c] p-3">
                  {accessible ? (
                    <button
                      type="button"
                      onClick={() => launch(tool)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-black text-white transition hover:bg-emerald-700 cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" /> Open Tool <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <a
                      href={waLink(adminWhatsapp, `Hi Admin, I want to subscribe to ${tool.name}.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2.5 text-xs font-black text-white transition hover:bg-red-700"
                    >
                      <Lock className="h-3.5 w-3.5" /> Unlock Tool
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#2a1e1c] bg-[#130d0d] py-16 text-center">
          <Search className="mx-auto h-6 w-6 text-red-400" />
          <p className="mt-3 text-sm font-bold text-white">No tools found</p>
        </div>
      )}
    </div>
  );
};
