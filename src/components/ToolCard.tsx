import React from 'react';
import {
  Wrench,
  Heart,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  BarChart2,
  FileSpreadsheet,
  Type,
  ListFilter,
  PieChart,
  Search,
  TrendingUp,
  FileCode,
  Eye,
  Share2,
  Layers,
  Bot,
  Network,
  Compass,
  Award,
  Zap,
  Server,
  Link2,
  Unlink,
  QrCode,
  Minimize2,
  Code2,
  FileJson,
  KeyRound,
  Binary,
  Link,
  AlignLeft,
} from 'lucide-react';
import { ToolItem } from '../types';

interface ToolCardProps {
  tool: ToolItem;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent, toolId: string) => void;
  onSelectTool: (slug: string) => void;
}

// Icon mapper helper
const getToolIcon = (iconName: string) => {
  switch (iconName) {
    case 'ShieldCheck': return <ShieldCheck className="w-5 h-5 text-red-500" />;
    case 'RefreshCw': return <RefreshCw className="w-5 h-5 text-amber-500" />;
    case 'CheckCircle2': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    case 'BarChart2': return <BarChart2 className="w-5 h-5 text-blue-500" />;
    case 'FileSpreadsheet': return <FileSpreadsheet className="w-5 h-5 text-purple-500" />;
    case 'Type': return <Type className="w-5 h-5 text-indigo-500" />;
    case 'ListFilter': return <ListFilter className="w-5 h-5 text-pink-500" />;
    case 'PieChart': return <PieChart className="w-5 h-5 text-amber-500" />;
    case 'Search': return <Search className="w-5 h-5 text-blue-500" />;
    case 'TrendingUp': return <TrendingUp className="w-5 h-5 text-emerald-500" />;
    case 'FileCode': return <FileCode className="w-5 h-5 text-purple-500" />;
    case 'Eye': return <Eye className="w-5 h-5 text-indigo-500" />;
    case 'Share2': return <Share2 className="w-5 h-5 text-blue-500" />;
    case 'Layers': return <Layers className="w-5 h-5 text-amber-500" />;
    case 'Bot': return <Bot className="w-5 h-5 text-emerald-500" />;
    case 'Network': return <Network className="w-5 h-5 text-red-500" />;
    case 'Compass': return <Compass className="w-5 h-5 text-cyan-500" />;
    case 'Award': return <Award className="w-5 h-5 text-amber-500" />;
    case 'Zap': return <Zap className="w-5 h-5 text-yellow-500" />;
    case 'Server': return <Server className="w-5 h-5 text-blue-500" />;
    case 'Link2': return <Link2 className="w-5 h-5 text-purple-500" />;
    case 'Unlink': return <Unlink className="w-5 h-5 text-red-500" />;
    case 'QrCode': return <QrCode className="w-5 h-5 text-pink-500" />;
    case 'Minimize2': return <Minimize2 className="w-5 h-5 text-emerald-500" />;
    case 'Code2': return <Code2 className="w-5 h-5 text-blue-500" />;
    case 'FileJson': return <FileJson className="w-5 h-5 text-amber-500" />;
    case 'KeyRound': return <KeyRound className="w-5 h-5 text-purple-500" />;
    case 'Binary': return <Binary className="w-5 h-5 text-cyan-500" />;
    case 'Link': return <Link className="w-5 h-5 text-blue-500" />;
    case 'AlignLeft': return <AlignLeft className="w-5 h-5 text-indigo-500" />;
    default: return <Wrench className="w-5 h-5 text-red-500" />;
  }
};

export const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  isFavorite,
  onToggleFavorite,
  onSelectTool,
}) => {
  return (
    <div
      onClick={() => onSelectTool(tool.slug)}
      className="group relative bg-slate-900/90 hover:bg-slate-800/90 hover:border-red-500/40 rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1 shadow-md hover:shadow-xl hover:shadow-red-950/20 flex flex-col justify-between cursor-pointer overflow-hidden"
    >
      {/* Top Header info */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-slate-950 group-hover:border-red-500/30 group-hover:scale-110 transition-all duration-200">
            {getToolIcon(tool.iconName)}
          </div>

          <div className="flex items-center gap-1.5">
            {tool.isAiPowered && (
              <span className="flex items-center gap-1 text-[10px] font-extrabold bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                <Sparkles className="w-2.5 h-2.5" /> AI
              </span>
            )}
            {tool.isPopular && !tool.isAiPowered && (
              <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Hot
              </span>
            )}

            <button
              onClick={(e) => onToggleFavorite(e, tool.id)}
              className="p-1.5 rounded-xl text-slate-500 hover:text-red-500 hover:bg-slate-950 transition cursor-pointer"
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'text-red-500 fill-red-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white group-hover:text-red-400 transition-colors mb-1.5 line-clamp-1">
          {tool.name}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
          {tool.shortDesc}
        </p>
      </div>

      {/* Card Footer Link */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-red-400 transition-colors">
        <span>Use Tool</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
};
