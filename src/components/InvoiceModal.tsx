import React, { useEffect, useRef, useState } from 'react';
import { Download, Printer, X } from 'lucide-react';
import { BrandLogo, useBranding } from './BrandLogo';

const BRAND = 'ZYNEX';
const BRAND_TAGLINE = 'UPGRADE YOUR DIGITAL WORLD';

/** Fixed export width — WhatsApp-friendly (readable in chat without opening). */
const INVOICE_W = 360;

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
/** Soft gold text */
const GOLD = '#D4AF37';
const GOLD_SOFT = '#C9A84A';
/** Thin light borders — not bold. */
const GOLD_LINE = 'rgba(212, 175, 55, 0.38)';
const GOLD_LINE_SOFT = 'rgba(212, 175, 55, 0.28)';
const GREEN = '#22c55e';
const AMBER = '#b45309';
const CARD_RADIUS = 12;
const CARD_BORDER = `1px solid ${GOLD_LINE}`;
const OUTER_BORDER = `1px solid ${GOLD_LINE}`;

/** Plain text glyphs — Lucide SVGs mis-align under html2canvas JPG export. */
const ICONS = {
  user: '👤',
  invoice: '📋',
  store: '🏪',
  phone: '📞',
  tool: '📄',
  calendar: '📅',
  pay: '💳',
  check: '✓',
} as const;

export const InvoiceModal: React.FC<{
  order: InvoiceOrder;
  onClose: () => void;
  autoAction?: 'pdf' | 'print' | null;
}> = ({ order, onClose, autoAction }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const branding = useBranding();

  const capture = async () => {
    await ensureLibs();
    return (window as any).html2canvas(ref.current!, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: PAGE_BG,
      width: INVOICE_W,
      windowWidth: INVOICE_W,
      logging: false,
      // Keep layout stable; foreignObject often breaks icon/text alignment.
      foreignObjectRendering: false,
    });
  };

  const downloadPDF = async () => {
    setDownloading('pdf');
    try {
      const canvas = await capture();
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = (window as any).jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 14;
      const maxW = pageW - margin * 2;
      const imgH = (canvas.height * maxW) / canvas.width;
      const y = imgH < pageH - margin * 2 ? (pageH - imgH) / 2 : margin;
      pdf.addImage(imgData, 'PNG', margin, y, maxW, Math.min(imgH, pageH - margin * 2));
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
      const canvas = await capture();
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
        0.92,
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

  const topLogoH = Math.min(36, Number(branding.invoiceLogoHeight) || 36);
  const footLogoH = Math.min(28, Number(branding.invoiceFooterLogoHeight) || 28);

  const iconBox = (glyph: string) => (
    <td
      style={{
        width: 30,
        height: 30,
        verticalAlign: 'middle',
        textAlign: 'center',
        padding: 0,
        paddingRight: 8,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: `1px solid ${GOLD_LINE_SOFT}`,
          background: '#1a0f10',
          lineHeight: '26px',
          fontSize: 12,
          textAlign: 'center',
          color: GOLD,
        }}
      >
        {glyph}
      </div>
    </td>
  );

  /** Fixed-size pill so Active/Paid stay level and export cleanly. */
  const StatusPill: React.FC<{ ok: boolean; label: string; mark: string }> = ({
    ok,
    label,
    mark,
  }) => (
    <td style={{ padding: '0 3px', verticalAlign: 'middle' }}>
      <div
        style={{
          background: ok ? GREEN : AMBER,
          color: '#fff',
          borderRadius: 999,
          width: 64,
          height: 22,
          lineHeight: '22px',
          fontSize: 10,
          fontWeight: 700,
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        {mark} {label}
      </div>
    </td>
  );

  const FieldRow: React.FC<{
    icon: string;
    label: string;
    value: string;
    highlight?: boolean;
  }> = ({ icon, label, value, highlight }) => (
    <div
      style={{
        width: '100%',
        background: highlight
          ? 'linear-gradient(135deg, #2a1214 0%, #141010 55%, #1a1210 100%)'
          : CARD_BG,
        border: highlight ? `1px solid ${GOLD}` : CARD_BORDER,
        borderRadius: CARD_RADIUS,
        marginBottom: 6,
        boxSizing: 'border-box',
      }}
    >
      <table cellPadding={0} cellSpacing={0} style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ padding: highlight ? '10px 10px' : '7px 9px' }}>
              <table cellPadding={0} cellSpacing={0} style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    {iconBox(icon)}
                    <td style={{ verticalAlign: 'middle', minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 9,
                          color: GOLD,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          lineHeight: 1.2,
                          marginBottom: 2,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: highlight ? 20 : 12,
                          fontWeight: 800,
                          color: '#ffffff',
                          lineHeight: 1.2,
                          wordBreak: 'break-word',
                        }}
                      >
                        {value}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const HalfCell: React.FC<{ icon: string; label: string; value: string }> = ({
    icon,
    label,
    value,
  }) => (
    <td style={{ width: '50%', verticalAlign: 'top', padding: 0 }}>
      <div
        style={{
          background: CARD_BG,
          border: CARD_BORDER,
          borderRadius: CARD_RADIUS,
          padding: '7px 8px',
          boxSizing: 'border-box',
        }}
      >
        <table cellPadding={0} cellSpacing={0} style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              {iconBox(icon)}
              <td style={{ verticalAlign: 'middle', minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 8,
                    color: GOLD,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    lineHeight: 1.15,
                    marginBottom: 2,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: '#fff',
                    lineHeight: 1.2,
                    wordBreak: 'break-word',
                  }}
                >
                  {value || '—'}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </td>
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
            left: 50% !important;
            top: 12px !important;
            transform: translateX(-50%) !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      <div className="flex flex-col gap-3 max-h-[95vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between invoice-modal-actions" style={{ width: INVOICE_W }}>
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
              borderRadius: 14,
              padding: '14px 12px 12px',
              fontFamily: 'Arial, Helvetica, sans-serif',
              width: INVOICE_W,
              boxSizing: 'border-box',
              color: '#fff',
              border: OUTER_BORDER,
            }}
          >
            {/* Compact header: logo + brand side by side */}
            <table
              cellPadding={0}
              cellSpacing={0}
              style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}
            >
              <tbody>
                <tr>
                  <td style={{ width: 44, verticalAlign: 'middle', padding: 0 }}>
                    <BrandLogo
                      variant="invoice"
                      crossOrigin="anonymous"
                      style={{
                        width: topLogoH,
                        height: topLogoH,
                        borderRadius: 8,
                        background: '#000',
                        objectFit: 'contain',
                        display: 'block',
                      }}
                    />
                  </td>
                  <td style={{ verticalAlign: 'middle', paddingLeft: 8 }}>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 900,
                        color: GOLD,
                        letterSpacing: '0.1em',
                        lineHeight: 1,
                      }}
                    >
                      {BRAND}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: GOLD,
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        marginTop: 3,
                      }}
                    >
                      Client Receipt
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div
              style={{
                height: 1,
                background: `linear-gradient(90deg, transparent, ${GOLD_SOFT}, transparent)`,
                marginBottom: 8,
              }}
            />

            {/* Customer: name row + Active/Paid centered under name */}
            <div
              style={{
                background: CARD_BG,
                border: CARD_BORDER,
                borderRadius: CARD_RADIUS,
                marginBottom: 6,
                boxSizing: 'border-box',
                padding: '10px 10px 9px',
              }}
            >
              <table cellPadding={0} cellSpacing={0} style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    {iconBox(ICONS.user)}
                    <td style={{ verticalAlign: 'middle' }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 900,
                          color: '#fff',
                          lineHeight: '22px',
                          wordBreak: 'break-word',
                        }}
                      >
                        {order.customerName || '—'}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ paddingTop: 8, textAlign: 'center' }}>
                      <table
                        cellPadding={0}
                        cellSpacing={0}
                        style={{ borderCollapse: 'collapse', margin: '0 auto' }}
                      >
                        <tbody>
                          <tr>
                            <StatusPill
                              ok={isActive}
                              label={isActive ? 'Active' : order.subStatus || 'Pending'}
                              mark="●"
                            />
                            <StatusPill
                              ok={isPaid}
                              label={isPaid ? 'Paid' : 'Pending'}
                              mark={isPaid ? ICONS.check : '○'}
                            />
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <FieldRow
              icon={ICONS.invoice}
              label="Invoice Number"
              value={order.invoiceNo || order.id}
            />

            {/* Two-column dense rows for WhatsApp height */}
            <table cellPadding={0} cellSpacing={0} style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
              <tbody>
                <tr>
                  <HalfCell icon={ICONS.store} label="Issued By" value={order.issuer || 'Zynex Tools'} />
                  <td style={{ width: 6 }} />
                  <HalfCell icon={ICONS.phone} label="Phone" value={order.customerPhone || '—'} />
                </tr>
              </tbody>
            </table>

            <FieldRow icon={ICONS.tool} label="Tool Name" value={toolLabel} />

            <table cellPadding={0} cellSpacing={0} style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6 }}>
              <tbody>
                <tr>
                  <HalfCell icon={ICONS.calendar} label="Purchase Date" value={order.orderDate || '—'} />
                  <td style={{ width: 6 }} />
                  <HalfCell icon={ICONS.calendar} label="Expiry Date" value={order.expiryDate || '—'} />
                </tr>
              </tbody>
            </table>

            <FieldRow
              icon={ICONS.pay}
              label="Paid Amount"
              value={`PKR ${total.toLocaleString()}`}
              highlight
            />

            {/* Compact footer */}
            <table
              cellPadding={0}
              cellSpacing={0}
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginTop: 8,
                borderTop: `1px solid ${GOLD}40`,
              }}
            >
              <tbody>
                <tr>
                  <td style={{ paddingTop: 8, textAlign: 'center' }}>
                    <BrandLogo
                      variant="invoiceFooter"
                      crossOrigin="anonymous"
                      style={{
                        width: footLogoH,
                        height: footLogoH,
                        borderRadius: 6,
                        objectFit: 'contain',
                        display: 'inline-block',
                        verticalAlign: 'middle',
                        marginRight: 6,
                      }}
                    />
                    <span
                      style={{
                        display: 'inline-block',
                        verticalAlign: 'middle',
                        fontSize: 11,
                        fontWeight: 800,
                        color: GOLD,
                        letterSpacing: '0.1em',
                      }}
                    >
                      {BRAND}
                    </span>
                    <div
                      style={{
                        fontSize: 8,
                        color: GOLD,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        marginTop: 4,
                      }}
                    >
                      {BRAND_TAGLINE}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
