import React from 'react';
import { Bell } from 'lucide-react';
import type { InboxNote } from '../lib/notifications';

export const NoteAlertToast: React.FC<{
  note: InboxNote | null;
  onOpen: () => void;
  onClose: () => void;
}> = ({ note, onOpen, onClose }) => {
  if (!note) return null;
  const snippet = (note.message || '').replace(/\s+/g, ' ').trim();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed top-16 right-4 z-[80] w-80 max-w-[calc(100vw-2rem)] text-left bg-[#130d0d] border border-red-500/40 rounded-2xl shadow-2xl shadow-black/50 p-3 cursor-pointer hover:border-red-500/60 transition"
    >
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4 text-red-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-white truncate">{note.title || 'Notification'}</p>
          {snippet && <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{snippet}</p>}
        </div>
        <span
          role="button"
          tabIndex={0}
          onClick={e => { e.stopPropagation(); onClose(); }}
          onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onClose(); } }}
          className="text-[10px] font-bold text-slate-500 hover:text-white cursor-pointer"
        >
          ✕
        </span>
      </div>
    </button>
  );
};
