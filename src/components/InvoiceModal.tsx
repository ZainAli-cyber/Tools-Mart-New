import React, { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  ClipboardList,
  CreditCard,
  Download,
  FileText,
  Phone,
  Printer,
  Store,
  User,
  X,
} from 'lucide-react';
import { BrandLogo, useBranding } from './BrandLogo';

const BRAND = 'ZynexTools';
const BRAND_SUBTITLE = 'Client Receipt Management Software';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = () => resolve(); s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function ensureLibs() {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
}

export type InvoiceOrder = {
  id: string;
  invoiceNo?: string;
  customerName?: string;
  customerPhone?: string;
  tool?: string;
  duration?: number;
  orderDate?: string;
  expiryDate?: string;
  amount?: number;
  finalAmount?: number;
  paymentStatus?: string;
  subStatus?: string;
  issuer?: string;
};

const CARD_BG = '#1c1c1e';
const PAGE_BG = '#0a0a0a';
const RED = '#e11d2e';
const GREEN = '#16a34a';
const LABEL = '#9ca3af';

export const InvoiceModal: React.FC<{
  order: InvoiceOrder;
  onClose: () => void;
  autoAction?: 'pdf' | 'print' | null;
}> = ({ order, onClose, autoAction }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const branding = useBranding();

  const downloadPDF = async () => {
    setDownloading('pdf');
    try {
      await ensureLibs();
      const canvas = await (window as any).html2canvas(ref.current!, {
        scale: 2, useCORS: true, allowTaint: true, backgroundColor: PAGE_BG,
      });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = (window as any).jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, (imgH < pageH ? (pageH - imgH) / 2 : 0), pageW, Math.min(imgH, pageH));
      pdf.save(`${order.invoiceNo || order.id}.pdf`);
    } catch (e) {
      console.error('PDF error:', e);
      alert('PDF generation failed. Try Print instead.');
    }
    setDownloading(null);
  };

  const downloadJPG = async () => {
    setDownloading('jpg');
    try {
      await ensureLibs();
      const canvas = await (window as any).html2canvas(ref.current!, {
        scale: 2, useCORS: true, allowTaint: true, backgroundColor: PAGE_BG,
      });
      canvas.toBlob((blob: Blob | null) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${order.invoiceNo || order.id}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/jpeg', 0.95);
    } catch (e) {
      console.error('JPG error:', e);
      alert('JPG generation failed. Try Print instead.');
    }
    setDownloading(null);
  };

  useEffect(() => {
    if (!autoAction) return;
    const t = window.setTimeout(() => {
      if (autoAction === 'pdf') void downloadPDF();
      if (autoAction === 'print') window.print();
    }, 350);
    return () => window.clearTimeout(t);
  }, [autoAction, order.id]);

  const total = order.finalAmount || order.amount || 0;
  const isPaid = order.paymentStatus === 'paid';
  const isActive = order.subStatus === 'active';
  const planLabel =
    (order.tool || 'Subscription') + (order.duration ? ` · ${order.duration} Month(s)` : '');

  const FieldCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    highlight?: boolean;
    iconColor?: string;
  }> = ({ icon, label, value, highlight, iconColor = RED }) => (
    <div style={{
      background: highlight ? '#2a1214' : CARD_BG,
      borderRadius: '14px',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      marginBottom: '10px',
    }}>
      <span style={{ color: iconColor, flexShrink: 0, display: 'flex' }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '11px', color: LABEL, marginBottom: '3px', fontWeight: 500 }}>{label}</div>
        <div style={{
          fontSize: highlight ? '20px' : '15px',
          fontWeight: 700,
          color: '#ffffff',
          wordBreak: 'break-word',
        }}>{value}</div>
      </div>
    </div>
  );

  const DateCard: React.FC<{
    label: string;
    value: string;
    iconColor: string;
  }> = ({ label, value, iconColor }) => (
    <div style={{
      background: CARD_BG,
      borderRadius: '14px',
      padding: '14px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      flex: 1,
      minWidth: 0,
    }}>
      <span style={{ color: iconColor, flexShrink: 0, display: 'flex' }}>
        <Calendar size={20} strokeWidth={2} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '11px', color: LABEL, marginBottom: '3px', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{value || '—'}</div>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm invoice-modal-chrome"
      onClick={onClose}
    >
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .invoice-print-root, .invoice-print-root * { visibility: visible !important; }
          .invoice-modal-chrome { position: static !important; background: transparent !important; backdrop-filter: none !important; padding: 0 !important; }
          .invoice-modal-chrome > div { max-width: none !important; max-height: none !important; }
          .invoice-modal-actions { display: none !important; }
          .invoice-print-root {
            position: absolute !important;
            left: 0; top: 0; width: 100%;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="w-full max-w-sm flex flex-col gap-3 max-h-[95vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between invoice-modal-actions">
          <div className="flex gap-2">
            <button
              onClick={downloadPDF}
              disabled={!!downloading}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" /> {downloading === 'pdf' ? 'Generating…' : 'PDF'}
            </button>
            <button
              onClick={downloadJPG}
              disabled={!!downloading}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" /> {downloading === 'jpg' ? 'Generating…' : 'JPG'}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1a1210] border border-[#3a2a26] text-slate-300 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1a1210] rounded-xl text-slate-400 hover:text-white cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto">
          <div
            ref={ref}
            className="invoice-print-root"
            style={{
              background: PAGE_BG,
              borderRadius: '20px',
              padding: '28px 22px',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              width: '100%',
              color: '#fff',
            }}
          >
            {/* Brand header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
              <BrandLogo
                variant="invoice"
                crossOrigin="anonymous"
                style={{
                  width: 'auto',
                  height: branding.invoiceLogoHeight,
                  borderRadius: '12px',
                  background: '#000',
                  objectFit: 'contain',
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: RED, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                  {BRAND}
                </div>
                <div style={{ fontSize: '11px', color: LABEL, marginTop: '4px', fontWeight: 500 }}>
                  {BRAND_SUBTITLE}
                </div>
              </div>
            </div>

            {/* Client Receipt title */}
            <div style={{
              borderBottom: '1px solid #2a2a2c',
              paddingBottom: '14px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <ClipboardList size={22} color={RED} strokeWidth={2.25} />
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>Client Receipt</span>
            </div>

            {/* Client + status */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '18px',
              flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <User size={22} color={RED} strokeWidth={2.25} />
                <span style={{
                  fontSize: '20px',
                  fontWeight: 900,
                  color: '#ffffff',
                  lineHeight: 1.2,
                  wordBreak: 'break-word',
                }}>
                  {order.customerName || '—'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <span style={{
                  background: isActive ? GREEN : '#b45309',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isActive ? '#4ade80' : '#fbbf24',
                    display: 'inline-block',
                  }} />
                  {isActive ? 'Active' : (order.subStatus || 'Pending')}
                </span>
                <span style={{
                  background: isPaid ? GREEN : '#b45309',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}>
                  {isPaid ? <Check size={13} strokeWidth={3} /> : null}
                  {isPaid ? 'Paid' : 'Pending'}
                </span>
              </div>
            </div>

            <FieldCard
              icon={<ClipboardList size={20} strokeWidth={2} />}
              label="Invoice Number"
              value={order.invoiceNo || order.id}
            />
            {order.issuer ? (
              <FieldCard
                icon={<Store size={20} strokeWidth={2} />}
                label="Issued by"
                value={order.issuer}
              />
            ) : null}
            {order.customerPhone ? (
              <FieldCard
                icon={<Phone size={20} strokeWidth={2} />}
                label="Phone Number"
                value={order.customerPhone}
              />
            ) : null}
            <FieldCard
              icon={<FileText size={20} strokeWidth={2} />}
              label="Plan Type"
              value={planLabel}
            />

            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <DateCard label="Purchase Date" value={order.orderDate || '—'} iconColor={GREEN} />
              <DateCard label="Expiry Date" value={order.expiryDate || '—'} iconColor={RED} />
            </div>

            <FieldCard
              icon={<CreditCard size={20} strokeWidth={2} />}
              label="Paid Amount"
              value={`PKR ${total.toLocaleString()}`}
              highlight
            />

            <div style={{
              borderTop: '1px solid #2a2a2c',
              marginTop: '18px',
              paddingTop: '16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: RED }}>{BRAND}</div>
              <div style={{ fontSize: '12px', color: LABEL, marginTop: '4px' }}>
                Thank you for your business!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
