import React from 'react';
import { BookOpen, Calendar, Clock, ArrowRight, User } from 'lucide-react';
import { BLOG_POSTS } from '../data/blogData';
import { BlogPost } from '../types';

interface BlogPageProps {
  onNavigate: (path: string) => void;
}

export const BlogPage: React.FC<BlogPageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Page Header */}
      <div className="space-y-3 border-b border-slate-800 pb-6 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-wider bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
          <BookOpen className="w-3.5 h-3.5" /> SEO Insights & Guides
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white">
          AI TOOLZ MART Knowledge Base
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          In-depth tutorials, ranking strategies, and webmaster guides to help you master search engine optimization.
        </p>
      </div>

      {/* Blog Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {BLOG_POSTS.map((post) => (
          <div
            key={post.id}
            onClick={() => onNavigate(`/blog/${post.slug}`)}
            className="group bg-slate-900 rounded-3xl overflow-hidden shadow-xl transition-all duration-200 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
          >
            <div>
              {/* Image Banner */}
              <div className="relative h-48 overflow-hidden bg-slate-950">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-3 left-3 bg-red-600 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                  {post.category}
                </span>
              </div>

              {/* Content */}
              <div className="p-6 space-y-3">
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" /> {post.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" /> {post.readTime}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors line-clamp-2">
                  {post.title}
                </h2>

                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {post.excerpt}
                </p>
              </div>
            </div>

            <div className="px-6 pb-6 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-red-500 group-hover:text-red-400">
              <span>Read Full Article</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const BlogPostPage: React.FC<{ slug: string; onNavigate: (path: string) => void }> = ({
  slug,
  onNavigate,
}) => {
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Article Not Found</h2>
        <button onClick={() => onNavigate('/blog')} className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold">
          Back to Blog
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <button
        onClick={() => onNavigate('/blog')}
        className="text-xs font-bold text-slate-400 hover:text-white transition flex items-center gap-2"
      >
        &larr; Back to Articles
      </button>

      <div className="space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-red-400 bg-red-600/20 border border-red-500/30 px-3 py-1 rounded-full">
          {post.category}
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-white">{post.title}</h1>

        <div className="flex items-center gap-4 text-xs text-slate-400 border-b border-slate-800 pb-4">
          <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {post.author}</span>
          <span>&bull;</span>
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {post.date}</span>
          <span>&bull;</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {post.readTime}</span>
        </div>
      </div>

      <div className="rounded-3xl overflow-hidden shadow-2xl h-80 bg-slate-950">
        <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
      </div>

      <div className="glow-card rounded-3xl p-6 sm:p-10 text-slate-300 text-sm leading-relaxed space-y-4 font-sans">
        <p className="text-base text-white font-semibold italic border-l-4 border-red-500 pl-4 py-1 bg-slate-950/50 rounded-r-xl">
          {post.excerpt}
        </p>

        <div className="whitespace-pre-wrap leading-loose space-y-4">
          {post.content}
        </div>
      </div>
    </div>
  );
};
