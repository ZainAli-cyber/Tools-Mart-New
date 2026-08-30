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
/** Thin light outline — box-shadow (border + radius becomes thick/double in html2canvas JPG). */
const GOLD_LINE = 'rgba(212, 175, 55, 0.30)';
const CARD_RADIUS = 12;
const CARD_OUTLINE = `0 0 0 1px ${GOLD_LINE}`;
const OUTER_OUTLINE = `0 0 0 1px ${GOLD_LINE}`;
const STATUS_BADGES_SRC = '/invoiceicons.png';
const ICON_PX = 28;

/**
 * Full circle+glyph as one SVG image.
 * Nested absolute icons drift under html2canvas — a single bitmap does not.
 */
function circleIcon(paths: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
  <circle cx="28" cy="28" r="26" fill="#1a0f10" stroke="rgba(212,175,55,0.32)" stroke-width="1.5"/>
  <g transform="translate(16 16)" fill="none" stroke="${GOLD}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</g>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const ICONS = {
  user: circleIcon(
    '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  ),
  invoice: circleIcon(
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h6"/>',
  ),
  store: circleIcon(
    '<path d="M3 9l1-5h16l1 5"/><path d="M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9"/><path d="M10 21V12h4v9"/>',
  ),
  phone: circleIcon(
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.7 2.35a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.75.34 1.54.57 2.35.7A2 2 0 0 1 22 16.92z"/>',
  ),
  tool: circleIcon(
    '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  ),
  calendar: circleIcon(
    '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  ),
  pay: circleIcon(
    '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  ),
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
    const root = ref.current!;
    // Wait for logos + status PNG so JPG export includes them centered.
    await Promise.all(
      Array.from(root.querySelectorAll('img')).map(
        img =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>(resolve => {
                img.addEventListener('load', () => resolve(), { once: true });
                img.addEventListener('error', () => resolve(), { once: true });
              }),
      ),
    );
    return (window as any).html2canvas(root, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: PAGE_BG,
      width: INVOICE_W,
      windowWidth: INVOICE_W,
      logging: false,
      // Nested absolute/flex icons drift; we bake circle icons as single images instead.
      foreignObjectRendering: false,
      imageTimeout: 15000,
      onclone: (_doc: Document, cloned: HTMLElement) => {
        // Lock fonts so JPG doesn't fake-bold white values.
        cloned.style.webkitFontSmoothing = 'antialiased';
        cloned.style.textRendering = 'geometricPrecision';
        cloned.querySelectorAll('[data-inv-value]').forEach(el => {
          (el as HTMLElement).style.fontWeight = '500';
        });
        cloned.querySelectorAll('[data-inv-name]').forEach(el => {
          (el as HTMLElement).style.fontWeight = '500';
        });
      },
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
  const toolLabel =
    (order.tool || 'Subscription') + (order.duration ? ` · ${order.duration} Month(s)` : '');

  const topLogoH = Math.min(36, Number(branding.invoiceLogoHeight) || 36);
  const footLogoH = Math.min(28, Number(branding.invoiceFooterLogoHeight) || 28);

  /** Single pre-baked circle image — no nested layout for html2canvas to shift. */
  const iconBox = (src: string) => (
    <td
      style={{
        width: ICON_PX + 8,
        verticalAlign: 'middle',
        textAlign: 'left',
        padding: 0,
        paddingRight: 8,
        lineHeight: 0,
      }}
    >
      <img
        src={src}
        alt=""
        width={ICON_PX}
        height={ICON_PX}
        style={{
          width: ICON_PX,
          height: ICON_PX,
          display: 'block',
          border: 0,
          borderRadius: '50%',
        }}
      />
    </td>
  );

  const cardShell = (
    highlight: boolean | undefined,
    children: React.ReactNode,
    opts?: { pad?: string; marginBottom?: number },
  ) => (
    <div
      style={{
        width: '100%',
        background: highlight
          ? 'linear-gradient(135deg, #2a1214 0%, #141010 55%, #1a1210 100%)'
          : CARD_BG,
        border: 'none',
        boxShadow: CARD_OUTLINE,
        borderRadius: CARD_RADIUS,
        marginBottom: opts?.marginBottom ?? 6,
        boxSizing: 'border-box',
        padding: opts?.pad || (highlight ? '10px 10px' : '7px 9px'),
      }}
    >
      {children}
    </div>
  );

  const FieldRow: React.FC<{
    icon: string;
    label: string;
    value: string;
    highlight?: boolean;
  }> = ({ icon, label, value, highlight }) =>
    cardShell(
      highlight,
      <table cellPadding={0} cellSpacing={0} style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            {iconBox(icon)}
            <td style={{ verticalAlign: 'middle', minWidth: 0 }}>
              <div
                style={{
                  fontSize: 9,
                  color: GOLD,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  lineHeight: 1.2,
                  marginBottom: 2,
                }}
              >
                {label}
              </div>
              <div
                data-inv-value
                style={{
                  fontSize: highlight ? 18 : 12,
                  fontWeight: 500,
                  color: '#ffffff',
                  lineHeight: 1.25,
                  wordBreak: 'break-word',
                }}
              >
                {value}
              </div>
            </td>
          </tr>
        </tbody>
      </table>,
    );

  const HalfCell: React.FC<{ icon: string; label: string; value: string }> = ({
    icon,
    label,
    value,
  }) => (
    <td style={{ width: '50%', verticalAlign: 'top', padding: 0 }}>
      {cardShell(
        false,
        <table cellPadding={0} cellSpacing={0} style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              {iconBox(icon)}
              <td style={{ verticalAlign: 'middle', minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 8,
                    color: GOLD,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    lineHeight: 1.15,
                    marginBottom: 2,
                  }}
                >
                  {label}
                </div>
                <div
                  data-inv-value
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: '#fff',
                    lineHeight: 1.25,
                    wordBreak: 'break-word',
                  }}
                >
                  {value || '—'}
                </div>
              </td>
            </tr>
          </tbody>
        </table>,
        { pad: '7px 8px', marginBottom: 0 },
      )}
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
              border: 'none',
              boxShadow: OUTER_OUTLINE,
              WebkitFontSmoothing: 'antialiased',
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
                  <td
                    style={{
                      width: topLogoH,
                      height: topLogoH,
                      verticalAlign: 'middle',
                      padding: 0,
                      lineHeight: 0,
                    }}
                  >
                    <BrandLogo
                      variant="invoice"
                      height={topLogoH}
                      crossOrigin="anonymous"
                      className=""
                      style={{
                        width: topLogoH,
                        height: topLogoH,
                        maxWidth: topLogoH,
                        borderRadius: 8,
                        objectFit: 'contain',
                        display: 'block',
                        verticalAlign: 'middle',
                      }}
                    />
                  </td>
                  <td style={{ verticalAlign: 'middle', paddingLeft: 10 }}>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: GOLD,
                        letterSpacing: '0.1em',
                        lineHeight: '22px',
                        height: 22,
                      }}
                    >
                      {BRAND}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: GOLD,
                        fontWeight: 600,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        lineHeight: '14px',
                        height: 14,
                        marginTop: 2,
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

            {/* Customer: name + Active/Paid PNG left under name */}
            <div
              style={{
                background: CARD_BG,
                border: 'none',
                boxShadow: CARD_OUTLINE,
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
                        data-inv-name
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
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
                    <td style={{ width: ICON_PX + 8, padding: 0, lineHeight: 0 }} />
                    <td style={{ paddingTop: 8, textAlign: 'left', verticalAlign: 'middle' }}>
                      <img
                        src={STATUS_BADGES_SRC}
                        alt="Active Paid"
                        crossOrigin="anonymous"
                        style={{
                          display: 'block',
                          margin: 0,
                          height: 42,
                          width: 'auto',
                          maxWidth: '100%',
                          objectFit: 'contain',
                          objectPosition: 'left center',
                        }}
                      />
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
                borderTop: 'none',
                boxShadow: `inset 0 1px 0 ${GOLD}40`,
              }}
            >
              <tbody>
                <tr>
                  <td style={{ paddingTop: 8, textAlign: 'center' }}>
                    <BrandLogo
                      variant="invoiceFooter"
                      height={footLogoH}
                      crossOrigin="anonymous"
                      className=""
                      style={{
                        width: footLogoH,
                        height: footLogoH,
                        maxWidth: footLogoH,
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
                        fontWeight: 700,
                        color: GOLD,
                        letterSpacing: '0.1em',
                        lineHeight: `${footLogoH}px`,
                        height: footLogoH,
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
