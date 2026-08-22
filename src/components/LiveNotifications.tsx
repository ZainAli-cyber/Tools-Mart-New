import React, { useState, useEffect } from 'react';
import { ShoppingBag } from 'lucide-react';

const PURCHASES: { name: string; city: string; tool: string }[] = [
  { name: 'Ayesha M.', city: 'Riyadh', tool: 'Grammarly' },
  { name: 'Usman K.', city: 'Lahore', tool: 'Canva Pro' },
  { name: 'Sara T.', city: 'Dubai', tool: 'Semrush' },
  { name: 'Ahmed R.', city: 'Karachi', tool: 'ChatGPT Plus' },
  { name: 'Fatima Z.', city: 'Islamabad', tool: 'Envato Elements' },
  { name: 'Hassan B.', city: 'London', tool: 'Ahrefs' },
  { name: 'Maryam N.', city: 'Cairo', tool: 'CapCut Pro' },
  { name: 'Bilal A.', city: 'Lahore', tool: 'Jasper AI' },
  { name: 'Zara S.', city: 'Jeddah', tool: 'Udemy' },
  { name: 'Omar F.', city: 'Karachi', tool: 'vidIQ Boost' },
  { name: 'Hina Q.', city: 'Toronto', tool: 'Freepik Premium' },
  { name: 'Tariq M.', city: 'Rawalpindi', tool: 'Lovable Pro' },
  { name: 'Nadia R.', city: 'Manchester', tool: 'QuillBot' },
  { name: 'Imran H.', city: 'Islamabad', tool: 'Helium 10' },
  { name: 'Layla K.', city: 'Abu Dhabi', tool: 'Coursera' },
  { name: 'Asad J.', city: 'Lahore', tool: 'SkillShare' },
  { name: 'Rabia G.', city: 'Riyadh', tool: 'Google AI Pro' },
  { name: 'Faisal Y.', city: 'Karachi', tool: 'Motion Array' },
  { name: 'Amna S.', city: 'Multan', tool: 'Vista Create' },
  { name: 'Kamran D.', city: 'Birmingham', tool: 'Epidemic Sound' },
];

/** Fixed light-on-dark — Tailwind text-* remaps break these in light theme. */
const cardStyle: React.CSSProperties = {
  backgroundColor: 'rgba(26,18,16,0.95)',
  border: '1px solid #4a3530',
  color: '#f5f0ed',
};

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomMinutesAgo() {
  const mins = randomBetween(1, 12);
  return `${mins} MIN AGO`;
}

export const LiveNotifications: React.FC = () => {
  const [currentToast, setCurrentToast] = useState<(typeof PURCHASES)[0] | null>(null);
  const [visible, setVisible] = useState(false);
  const [minutesAgo, setMinutesAgo] = useState('3 MIN AGO');
  const [viewerCount, setViewerCount] = useState(randomBetween(72, 118));
  const [toastIndex, setToastIndex] = useState(0);

  // Shuffle order once on mount
  const [order] = useState(() => {
    const arr = [...PURCHASES];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });

  // Show toast every 30s
  useEffect(() => {
    const show = () => {
      const item = order[toastIndex % order.length];
      setCurrentToast(item);
      setMinutesAgo(randomMinutesAgo());
      setVisible(true);

      // Hide after 5s
      const hide = setTimeout(() => setVisible(false), 5000);
      return hide;
    };

    // Show first toast after 3s
    const initial = setTimeout(() => {
      const hide = show();
      setToastIndex(1);

      // Then every 30s
      const interval = setInterval(() => {
        setToastIndex((prev) => {
          const next = (prev + 1) % order.length;
          const item = order[next];
          setCurrentToast(item);
          setMinutesAgo(randomMinutesAgo());
          setVisible(true);
          setTimeout(() => setVisible(false), 5000);
          return next;
        });
      }, 30000);

      return () => { clearTimeout(hide); clearInterval(interval); };
    }, 3000);

    return () => clearTimeout(initial);
  }, []);

  // Fluctuate viewer count
  useEffect(() => {
    const iv = setInterval(() => {
      setViewerCount((prev) => {
        const delta = randomBetween(-3, 5);
        return Math.max(60, Math.min(150, prev + delta));
      });
    }, 8000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="fixed bottom-6 left-4 z-50 flex flex-col gap-2 items-start pointer-events-none">
      {/* Purchase Toast */}
      <div
        className={`pointer-events-auto transition-all duration-500 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {currentToast && (
          <div className="theme-dark-surface backdrop-blur-md rounded-2xl px-4 py-3 shadow-2xl shadow-black/40 flex items-start gap-3 max-w-[260px]" style={cardStyle}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(204,26,26,0.2)', border: '1px solid rgba(239,68,68,0.35)' }}>
              <ShoppingBag className="w-4 h-4" style={{ color: '#ef4444' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs leading-snug" style={{ color: '#efe8e3' }}>
                <span className="font-extrabold" style={{ color: '#f5f0ed' }}>{currentToast.name}</span>
                {' '}from{' '}
                <span className="font-bold" style={{ color: '#f5f0ed' }}>{currentToast.city}</span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#ddd4ce' }}>
                purchased{' '}
                <span className="font-extrabold" style={{ color: '#f87171' }}>{currentToast.tool}</span>
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-semibold tracking-wide" style={{ color: '#c9bfb8' }}>
                  {minutesAgo} · VERIFIED ✓
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Viewer count pill */}
      <div className="theme-dark-surface pointer-events-auto backdrop-blur-md rounded-full px-4 py-2 shadow-xl shadow-black/30 flex items-center gap-2" style={cardStyle}>
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs font-extrabold" style={{ color: '#f5f0ed' }}>{viewerCount}</span>
        <span className="text-xs font-medium" style={{ color: '#ddd4ce' }}>viewing now</span>
      </div>
    </div>
  );
};
