import React from 'react';
import type { PlanOption } from '../lib/accountStore';

export const CUSTOM_PLAN_KEY = '__custom__';

const inp = 'w-full bg-[#0d0908] border border-[#2a1e1c] focus:border-red-500/60 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition';
const lbl = 'text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5';

export function applyCatalogPlan(name: string, options: PlanOption[]) {
  return options.find(plan => plan.name === name) || null;
}

export const CustomPlanFields: React.FC<{
  options: PlanOption[];
  plan: string;
  customName: string;
  fee: number;
  days: number;
  required?: boolean;
  allowEmpty?: boolean;
  onPlan: (value: string) => void;
  onCustomName: (value: string) => void;
  onFee: (value: number) => void;
  onDays: (value: number) => void;
}> = ({
  options, plan, customName, fee, days, required, allowEmpty = true,
  onPlan, onCustomName, onFee, onDays,
}) => {
  const catalog = applyCatalogPlan(plan, options);
  const isCustom = plan === CUSTOM_PLAN_KEY;
  const listPrice = catalog?.fee;
  const customPrice = listPrice != null && fee !== listPrice;

  return (
    <div className="space-y-3">
      <div>
        <label className={lbl}>{required ? 'Assign Plan *' : 'Plan'}</label>
        <select value={plan} onChange={e => onPlan(e.target.value)} className={inp}>
          {allowEmpty && <option value="">{required ? '-- Required: Select a Plan --' : 'No plan'}</option>}
          {options.map(item => (
            <option key={item.name} value={item.name}>
              {item.name} — list Rs {item.fee.toLocaleString()} / {item.days}d
            </option>
          ))}
          <option value={CUSTOM_PLAN_KEY}>Custom package — set your own price</option>
        </select>
      </div>

      {isCustom && (
        <div>
          <label className={lbl}>Custom package name *</label>
          <input value={customName} onChange={e => onCustomName(e.target.value)} className={inp} placeholder="e.g. Agency Deal / Festival Offer" />
        </div>
      )}

      {plan && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Selling price (PKR) *</label>
            <input type="number" min={0} value={fee} onChange={e => onFee(Math.max(0, Number(e.target.value) || 0))} className={inp} />
            {customPrice && (
              <p className="text-[10px] text-amber-400 mt-1">List price Rs {listPrice.toLocaleString()} · selling at custom price</p>
            )}
          </div>
          <div>
            <label className={lbl}>Duration (days) *</label>
            <input type="number" min={1} value={days} onChange={e => onDays(Math.max(1, Number(e.target.value) || 1))} className={inp} />
          </div>
        </div>
      )}
    </div>
  );
};
