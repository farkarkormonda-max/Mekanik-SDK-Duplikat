import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { QrCode, Copy, Check, Download, X, ExternalLink, Smartphone } from "lucide-react";
import QRCode from "qrcode";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  description?: string;
}

export default function QRCodeModal({
  isOpen,
  onClose,
  url,
  title,
  description
}: QRCodeModalProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && url) {
      setGenerating(true);
      QRCode.toDataURL(
        url,
        {
          width: 320,
          margin: 2,
          color: {
            dark: "#0f172a", // Slate-900 for high-contrast scannability
            light: "#ffffff", // Pure white background
          },
          errorCorrectionLevel: "H",
        },
        (err, generatedUrl) => {
          setGenerating(false);
          if (err) {
            console.error("Gagal membuat QR Code:", err);
          } else {
            setQrCodeDataUrl(generatedUrl);
          }
        }
      );
    }
  }, [isOpen, url]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Gagal menyalin tautan:", err);
    }
  };

  const handleDownload = () => {
    if (!qrCodeDataUrl) return;
    const link = document.createElement("a");
    link.href = qrCodeDataUrl;
    link.download = `QR_Akses_${title.replace(/\s+/g, "_")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 overflow-y-auto no-print">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            id="qr-modal-backdrop"
          />

          {/* Modal Container */}
          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
              className="relative transform overflow-hidden rounded-3xl bg-white p-6 text-left shadow-2xl transition-all w-full max-w-md border border-slate-100"
              id="qr-modal-content"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                aria-label="Tutup"
                id="qr-modal-close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3 pr-8 border-b border-slate-100 pb-4">
                <div className="p-2.5 bg-sky-50 text-sky-600 rounded-2xl">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-850 leading-tight">
                    QR Akses Laporan Cepat
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Pindai & Sinkronisasi Tampilan Lapangan
                  </p>
                </div>
              </div>

              {/* Modal Body */}
              <div className="mt-5 space-y-5 flex flex-col items-center">
                {/* QR Code Container */}
                <div className="relative p-4 bg-slate-50 border border-slate-200/80 rounded-3xl flex items-center justify-center shadow-inner group/qr min-w-[240px] min-h-[240px]">
                  {generating ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-[10px] font-bold text-slate-400">Menyiapkan QR Code...</p>
                    </div>
                  ) : qrCodeDataUrl ? (
                    <div className="relative">
                      <img
                        src={qrCodeDataUrl}
                        alt="QR Code Link Laporan"
                        className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-2xl transition-transform duration-300 group-hover/qr:scale-102"
                        referrerPolicy="no-referrer"
                      />
                      {/* Subtle branding or visual accent */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex items-center justify-center">
                        <Smartphone className="w-4 h-4 text-sky-500" />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-rose-500">Gagal memuat QR Code.</p>
                  )}
                </div>

                {/* Info Box */}
                <div className="w-full bg-sky-50/60 border border-sky-100 p-4 rounded-2xl text-left space-y-1">
                  <span className="text-[10px] font-black uppercase text-sky-800 tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-sky-600" />
                    Kunjungan Lapangan / Site Visit
                  </span>
                  <p className="text-[11px] text-sky-950 font-semibold leading-relaxed">
                    Laporan: <span className="font-extrabold text-sky-900">{title}</span>
                  </p>
                  {description && (
                    <p className="text-[10px] text-sky-850 font-medium leading-normal">
                      {description}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">
                    Pindai kode QR ini untuk membuka laporan interaktif secara instan di ponsel Anda saat melakukan verifikasi lapangan.
                  </p>
                </div>

                {/* Link Sharing Field */}
                <div className="w-full space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                    Tautan / Link Dashboard
                  </label>
                  <div className="flex gap-2 w-full">
                    <input
                      type="text"
                      readOnly
                      value={url}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-[10px] font-bold font-mono text-slate-600 focus:outline-none overflow-x-auto whitespace-nowrap"
                    />
                    <button
                      onClick={handleCopy}
                      className={`px-3.5 py-2 rounded-2xl border flex items-center gap-1.5 text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                        copied
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                      title="Salin Tautan"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>Disalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-slate-500" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={handleDownload}
                  disabled={!qrCodeDataUrl}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-2xl shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Unduh Gambar QR
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-600 text-xs font-extrabold rounded-2xl transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
