import React, { useState } from 'react';
import { Bell, Trash2 } from 'lucide-react';
import type { InboxNote } from '../lib/notifications';

export const NotesInbox: React.FC<{
  notes: InboxNote[];
  onRead: (id: string) => void;
  onReadAll: () => void;
  onDelete: (id: string) => void;
  onDeleteRead: () => void;
  meta?: (note: InboxNote) => string;
  icons?: Record<string, string>;
}> = ({ notes, onRead, onReadAll, onDelete, onDeleteRead, meta, icons }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = notes.find(n => n.id === openId) || null;
  const unread = notes.some(n => !n.read);
  const hasRead = notes.some(n => n.read);

  const openNote = (note: InboxNote) => {
    setOpenId(note.id);
    if (!note.read) onRead(note.id);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-2">
        {unread && (
          <button type="button" onClick={onReadAll}
            className="px-3 py-1.5 rounded-xl border border-[#2a1e1c] bg-[#1a1210] text-xs font-bold text-slate-300 hover:text-white cursor-pointer">
            Mark all read
          </button>
        )}
        {hasRead && (
          <button type="button" onClick={() => { if (open?.read) setOpenId(null); onDeleteRead(); }}
            className="px-3 py-1.5 rounded-xl border border-[#2a1e1c] bg-[#1a1210] text-xs font-bold text-slate-400 hover:text-red-400 cursor-pointer">
            Delete read
          </button>
        )}
      </div>

      {open && (
        <div className="bg-[#130d0d] border border-red-500/20 rounded-2xl p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-white">{open.title}</h3>
              {meta && <p className="text-[10px] text-red-400 mt-0.5">{meta(open)}</p>}
            </div>
            <button type="button" onClick={() => setOpenId(null)}
              className="text-[11px] font-bold text-slate-500 hover:text-white cursor-pointer">Close</button>
          </div>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{open.message}</p>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-600">{open.time || ''}</span>
            <div className="flex gap-2">
              {!open.read && (
                <button type="button" onClick={() => onRead(open.id)}
                  className="px-3 py-1.5 rounded-xl border border-[#2a1e1c] bg-[#1a1210] text-[11px] font-bold text-slate-300 hover:text-white cursor-pointer">
                  Mark read
                </button>
              )}
              <button type="button" onClick={() => { setOpenId(null); onDelete(open.id); }}
                className="px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-600/10 text-[11px] font-bold text-red-400 hover:bg-red-600/20 cursor-pointer">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {notes.map(n => (
        <div key={n.id}
          className={`flex items-start gap-3 p-4 rounded-2xl border transition ${
            !n.read ? 'bg-red-600/5 border-red-500/20' : 'bg-[#130d0d] border-[#2a1e1c]'
          } ${openId === n.id ? 'border-red-500/40' : ''}`}>
          <button type="button" onClick={() => openNote(n)} className="flex items-start gap-3 flex-1 min-w-0 text-left cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-[#1a1210] border border-[#2a1e1c] flex items-center justify-center shrink-0 text-lg">
              {icons?.[n.type] || <Bell className="w-4 h-4 text-red-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white truncate">{n.title}</span>
                {!n.read && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
              {meta && <p className="text-[10px] text-red-400 mt-1">{meta(n)}</p>}
            </div>
          </button>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-[10px] text-slate-600">{n.time || ''}</span>
            <div className="flex gap-1">
              {!n.read && (
                <button type="button" title="Mark read" onClick={() => onRead(n.id)}
                  className="text-[10px] font-bold text-slate-500 hover:text-white cursor-pointer">Read</button>
              )}
              <button type="button" title="Delete" onClick={() => { if (openId === n.id) setOpenId(null); onDelete(n.id); }}
                className="p-1 rounded-lg text-slate-600 hover:text-red-400 cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
      {!notes.length && (
        <div className="text-center py-12 text-slate-600 text-sm bg-[#130d0d] border border-[#2a1e1c] rounded-2xl">
          No notifications
        </div>
      )}
    </div>
  );
};
