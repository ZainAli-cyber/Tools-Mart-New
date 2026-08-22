import React from 'react';
import type { InboxNote } from '../../lib/notifications';
import { NotesInbox } from '../../components/NotesInbox';

export const InboxPage: React.FC<{
  notes: InboxNote[];
  onRead: (id: string) => void;
  onReadAll: () => void;
  onDelete: (id: string) => void;
  onDeleteRead: () => void;
}> = ({ notes, onRead, onReadAll, onDelete, onDeleteRead }) => (
  <div className="space-y-4">
    <div>
      <h2 className="text-lg font-black text-white">Notifications</h2>
      <p className="text-xs text-slate-500">Updates sent to your account. Support tickets are in Inbox.</p>
    </div>
    <NotesInbox notes={notes} onRead={onRead} onReadAll={onReadAll} onDelete={onDelete} onDeleteRead={onDeleteRead} />
  </div>
);
