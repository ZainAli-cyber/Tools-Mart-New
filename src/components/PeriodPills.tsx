import React from 'react';
import { PERIOD_OPTIONS, type PeriodKey } from '../lib/period';

export const PeriodPills: React.FC<{ value: PeriodKey; onChange: (value: PeriodKey) => void }> = ({ value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {PERIOD_OPTIONS.map(option => (
      <button
        key={option.id}
        type="button"
        onClick={() => onChange(option.id)}
        className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition cursor-pointer ${
          value === option.id
            ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
            : 'bg-[#1a1210] border border-[#2a1e1c] text-slate-400 hover:text-white'
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);
