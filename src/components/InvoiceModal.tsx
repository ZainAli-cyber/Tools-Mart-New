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

const BRAND = 'ZYNEX';
const BRAND_TAGLINE = 'UPGRADE YOUR DIGITAL WORLD';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = reject;
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

const PAGE_BG = '#0a0706';
const CARD_BG = '#141010';
const GOLD = '#d4af37';
const GOLD_SOFT = '#c9a227';
const GREEN = '#16a34a';
const LABEL = GOLD;

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
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: PAGE_BG,
      });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = (window as any).jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, imgH < pageH ? (pageH - imgH) / 2 : 0, pageW, Math.min(imgH, pageH));
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
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: PAGE_BG,
      });
      canvas.toBlob(
        (blob: Blob | null) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${order.invoiceNo || order.id}.jpg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        },
        'image/jpeg',
        0.95,
      );
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
  const toolLabel =
    (order.tool || 'Subscription') + (order.duration ? ` · ${order.duration} Month(s)` : '');

  const iconCircle = (node: React.ReactNode) => (
    <span
      style={{
        width: 40,
        height: 40,
        borderRadius: '999px',
        border: `1px solid ${GOLD}55`,
        background: '#1a1210',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: GOLD,
        flexShrink: 0,
      }}
    >
      {node}
    </span>
  );

  const FieldCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    highlight?: boolean;
  }> = ({ icon, label, value, highlight }) => (
    <div
      style={{
        background: highlight
          ? 'linear-gradient(135deg, #2a1214 0%, #141010 55%, #1a1210 100%)'
          : CARD_BG,
        borderRadius: 16,
        border: `1px solid ${GOLD}40`,
        padding: highlight ? '18px 18px' : '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        marginBottom: 10,
      }}
    >
      {iconCircle(icon)}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            color: LABEL,
            marginBottom: 4,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: highlight ? 28 : 16,
            fontWeight: 800,
            color: '#ffffff',
            wordBreak: 'break-word',
            lineHeight: 1.15,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );

  const DateCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div
      style={{
        background: CARD_BG,
        borderRadius: 16,
        border: `1px solid ${GOLD}40`,
        padding: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        minWidth: 0,
      }}
    >
      {iconCircle(<Calendar size={18} strokeWidth={2} />)}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            color: LABEL,
            marginBottom: 3,
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{value || '—'}</div>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3"
      onClick={onClose}
    >
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .invoice-print-root, .invoice-print-root * { visibility: visible !important; }
          .invoice-modal-actions { display: none !important; }
          .invoice-print-root {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            border-radius: 0 !important;
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
              borderRadius: 20,
              padding: '28px 22px 24px',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              width: '100%',
              color: '#fff',
              border: `1px solid ${GOLD}22`,
            }}
          >
            {/* Brand header */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                marginBottom: 18,
                gap: 10,
              }}
            >
              <BrandLogo
                variant="invoice"
                crossOrigin="anonymous"
                style={{
                  width: 'auto',
                  height: branding.invoiceLogoHeight,
                  borderRadius: 12,
                  background: '#000',
                  objectFit: 'contain',
                }}
              />
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: GOLD,
                  letterSpacing: '0.08em',
                  lineHeight: 1,
                }}
              >
                {BRAND}
              </div>
            </div>

            {/* Client Receipt title */}
            <div
              style={{
                borderBottom: `1px solid ${GOLD}55`,
                paddingBottom: 12,
                marginBottom: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <ClipboardList size={18} color={GOLD} strokeWidth={2.25} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: GOLD,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                Client Receipt
              </span>
              <ClipboardList size={18} color={GOLD} strokeWidth={2.25} />
            </div>

            {/* Client + status */}
            <div
              style={{
                background: CARD_BG,
                border: `1px solid ${GOLD}40`,
                borderRadius: 16,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 10,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                {iconCircle(<User size={18} strokeWidth={2.25} />)}
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    color: '#ffffff',
                    lineHeight: 1.2,
                    wordBreak: 'break-word',
                  }}
                >
                  {order.customerName || '—'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <span
                  style={{
                    background: isActive ? GREEN : '#b45309',
                    color: '#fff',
                    borderRadius: 999,
                    padding: '5px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: isActive ? '#4ade80' : '#fbbf24',
                      display: 'inline-block',
                    }}
                  />
                  {isActive ? 'Active' : order.subStatus || 'Pending'}
                </span>
                <span
                  style={{
                    background: isPaid ? GREEN : '#b45309',
                    color: '#fff',
                    borderRadius: 999,
                    padding: '5px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  {isPaid ? <Check size={13} strokeWidth={3} /> : null}
                  {isPaid ? 'Paid' : 'Pending'}
                </span>
              </div>
            </div>

            <FieldCard
              icon={<ClipboardList size={18} strokeWidth={2} />}
              label="Invoice Number"
              value={order.invoiceNo || order.id}
            />
            {order.issuer ? (
              <FieldCard icon={<Store size={18} strokeWidth={2} />} label="Issued by" value={order.issuer} />
            ) : null}
            {order.customerPhone ? (
              <FieldCard
                icon={<Phone size={18} strokeWidth={2} />}
                label="Phone Number"
                value={order.customerPhone}
              />
            ) : null}
            <FieldCard icon={<FileText size={18} strokeWidth={2} />} label="Tool Name" value={toolLabel} />

            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <DateCard label="Purchase Date" value={order.orderDate || '—'} />
              <DateCard label="Expiry Date" value={order.expiryDate || '—'} />
            </div>

            <FieldCard
              icon={<CreditCard size={18} strokeWidth={2} />}
              label="Paid Amount"
              value={`PKR ${total.toLocaleString()}`}
              highlight
            />

            <div
              style={{
                borderTop: `1px solid ${GOLD}40`,
                marginTop: 18,
                paddingTop: 18,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <BrandLogo
                variant="invoiceFooter"
                crossOrigin="anonymous"
                style={{
                  width: 'auto',
                  height: branding.invoiceFooterLogoHeight,
                  borderRadius: 10,
                  objectFit: 'contain',
                }}
              />
              <div style={{ fontSize: 14, fontWeight: 800, color: GOLD, letterSpacing: '0.12em' }}>
                {BRAND}
              </div>
              <div
                style={{
                  width: '70%',
                  height: 1,
                  background: `linear-gradient(90deg, transparent, ${GOLD_SOFT}, transparent)`,
                }}
              />
              <div
                style={{
                  fontSize: 11,
                  color: GOLD,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                {BRAND_TAGLINE}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
