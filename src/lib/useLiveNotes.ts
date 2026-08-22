import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { armNoteSoundUnlock, noteHeard, playNoteSound, rememberNote } from './noteAlert';
import {
  deleteNote, deleteNotes, loadNotes, markNoteRead, markNotesRead,
  noteVisible, shouldAlertNote, subscribeNotes, type InboxNote, type NotesEvent,
} from './notifications';

type Account = { id: string; role: string };

export function useLiveNotes(account: Account | null, enabled: boolean) {
  const [notes, setNotes] = useState<InboxNote[]>([]);
  const [toast, setToast] = useState<InboxNote | null>(null);
  const notesRef = useRef<InboxNote[]>([]);
  const primed = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const accountRef = useRef(account);
  accountRef.current = account;

  const showToast = useCallback((note: InboxNote) => {
    setToast(note);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

  const applyList = useCallback((next: InboxNote[]) => {
    notesRef.current = next;
    setNotes(next);
  }, []);

  const alertIncoming = useCallback((note: InboxNote) => {
    const acc = accountRef.current;
    if (!acc || !shouldAlertNote(note, acc)) return;
    if (noteHeard(note.id)) return;
    playNoteSound(note.id);
    showToast(note);
  }, [showToast]);

  const refresh = useCallback(async (alertNew = false) => {
    const acc = accountRef.current;
    if (!acc) return;
    const visible = (await loadNotes()).filter(n => noteVisible(n, acc));
    if (alertNew && primed.current) {
      const known = new Set(notesRef.current.map(n => n.id));
      for (const note of visible) {
        if (!known.has(note.id)) alertIncoming(note);
      }
    }
    primed.current = true;
    applyList(visible);
  }, [alertIncoming, applyList]);

  const onRealtimeRef = useRef<(ev?: NotesEvent) => void>(() => {});
  onRealtimeRef.current = (ev?: NotesEvent) => {
    const acc = accountRef.current;
    if (!acc) return;
    if (!ev || ev.event === 'POLL' || !ev.note) {
      void refresh(true);
      return;
    }
    const note = ev.note;
    if (ev.event === 'INSERT') {
      if (!noteVisible(note, acc)) return;
      const exists = notesRef.current.some(n => n.id === note.id);
      applyList(exists
        ? notesRef.current.map(n => n.id === note.id ? { ...n, ...note } : n)
        : [note, ...notesRef.current]);
      alertIncoming(note);
      return;
    }
    if (ev.event === 'UPDATE') {
      if (!noteVisible(note, acc)) {
        applyList(notesRef.current.filter(n => n.id !== note.id));
        rememberNote(note.id);
        return;
      }
      if (notesRef.current.some(n => n.id === note.id)) {
        applyList(notesRef.current.map(n => n.id === note.id ? { ...n, ...note } : n));
      } else {
        applyList([note, ...notesRef.current]);
        alertIncoming(note);
      }
      return;
    }
    if (ev.event === 'DELETE') {
      applyList(notesRef.current.filter(n => n.id !== note.id));
      rememberNote(note.id);
    }
  };

  useEffect(() => {
    if (!enabled || !account) {
      primed.current = false;
      applyList([]);
      return;
    }
    void refresh(false);
    const stopSound = armNoteSoundUnlock();
    const stopSub = subscribeNotes(ev => onRealtimeRef.current(ev), 9000);
    return () => {
      stopSound();
      stopSub();
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
    // Initial bind only; handlers live on refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, account?.id, account?.role]);

  const markRead = useCallback(async (id: string) => {
    applyList(notesRef.current.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await markNoteRead(id);
    } catch {
      await refresh(false);
    }
  }, [applyList, refresh]);

  const markAllRead = useCallback(async () => {
    const ids = notesRef.current.filter(n => !n.read).map(n => n.id);
    applyList(notesRef.current.map(n => ({ ...n, read: true })));
    try {
      await markNotesRead(ids);
    } catch {
      await refresh(false);
    }
  }, [applyList, refresh]);

  const remove = useCallback(async (id: string) => {
    applyList(notesRef.current.filter(n => n.id !== id));
    rememberNote(id);
    try {
      await deleteNote(id);
    } catch {
      await refresh(false);
    }
  }, [applyList, refresh]);

  const removeRead = useCallback(async () => {
    const ids = notesRef.current.filter(n => n.read).map(n => n.id);
    applyList(notesRef.current.filter(n => !n.read));
    try {
      await deleteNotes(ids);
    } catch {
      await refresh(false);
    }
  }, [applyList, refresh]);

  const dismissToast = useCallback(() => {
    setToast(null);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  const unread = useMemo(() => notes.filter(n => !n.read).length, [notes]);

  return {
    notes, unread, toast, dismissToast, refresh,
    markRead, markAllRead, remove, removeRead,
  };
}
