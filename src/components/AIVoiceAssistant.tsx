import React, { useState, useRef, useEffect } from "react";
import { 
  Volume2, 
  Sparkles, 
  Play, 
  Square, 
  Loader2, 
  HelpCircle, 
  BookOpen, 
  ChevronRight, 
  Mic, 
  Undo2, 
  FileAudio,
  Activity,
  Settings,
  Check,
  X
} from "lucide-react";
import { User } from "../types";
import { api } from "../lib/api";
import { useToast } from "./Toast";
import { motion, AnimatePresence } from "motion/react";

interface AIVoiceAssistantProps {
  user: User;
  activeTab: string;
  dashboardStats?: any;
  isFloatingOnly?: boolean;
}

export const AIVoiceAssistant: React.FC<AIVoiceAssistantProps> = ({ 
  user, 
  activeTab, 
  dashboardStats, 
  isFloatingOnly = false 
}) => {
  const { success, error, warning, info } = useToast();
  
  // Tab/Mode State
  const [activeMode, setActiveMode] = useState<"direct" | "ai" | "stt">("direct");
  
  // Floating Visibility State (Hidden/collapsed by default)
  const [isFloatingOpen, setIsFloatingOpen] = useState<boolean>(() => {
    return localStorage.getItem("ai_assistant_floating_open") === "true";
  });
  
  // TTS State
  const [textToRead, setTextToRead] = useState<string>("");
  const [selectedVoice, setSelectedVoice] = useState<string>("Kore");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);

  // Speech-to-Text (STT) state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcription, setTranscription] = useState<string>("");
  const [sttTarget, setSttTarget] = useState<string>("catatan");
  const recognitionRef = useRef<any>(null);

  const startSpeechToText = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      error("Browser Anda tidak mendukung Pengenalan Suara (Speech-to-Text) Web API.");
      return;
    }

    try {
      stopAudio(); // Stop any TTS playing
      
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "id-ID";

      rec.onstart = () => {
        setIsRecording(true);
        info("Mikrofon aktif. Silakan mulai berbicara...");
      };

      rec.onerror = (e: any) => {
        console.error("Kesalahan Speech Recognition:", e);
        if (e.error === "no-speech") {
          warning("Tidak ada suara yang terdeteksi. Silakan coba lagi.");
        } else if (e.error === "not-allowed") {
          error("Izin mikrofon ditolak. Aktifkan izin mikrofon di browser Anda.");
        } else {
          error(`Kesalahan perekaman: ${e.error}`);
        }
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      rec.onresult = (event: any) => {
        let resultText = "";
        for (let i = 0; i < event.results.length; i++) {
          resultText += event.results[i][0].transcript;
        }
        setTranscription(resultText);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      console.error("Gagal memulai perekaman:", err);
      error(`Gagal memulai perekaman: ${err.message}`);
      setIsRecording(false);
    }
  };

  const stopSpeechToText = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
      recognitionRef.current = null;
    }
    setIsRecording(false);
    success("Perekaman dihentikan.");
  };

  const clearTranscription = () => {
    setTranscription("");
    info("Teks dikte dibersihkan.");
  };

  const handleInjectText = () => {
    if (!transcription.trim()) {
      warning("Belum ada teks hasil dikte untuk dimasukkan!");
      return;
    }

    let elementId = "";
    let fieldLabel = "";

    switch (sttTarget) {
      case "catatan":
        elementId = "newNoteContent";
        fieldLabel = "Catatan / Instruksi Harian";
        break;
      case "temuan_lapangan":
        elementId = "uraianTemuan";
        fieldLabel = "Deskripsi Temuan (Form Temuan)";
        break;
      case "pemeriksaan_temuan":
        elementId = "pemeriksaanTemuan";
        fieldLabel = "Uraian Temuan BA (Form Pemeriksaan)";
        break;
      case "pemeriksaan_rekomendasi":
        elementId = "pemeriksaanRekomendasi";
        fieldLabel = "Rekomendasi Tindakan (Form Pemeriksaan)";
        break;
      default:
        break;
    }

    if (!elementId) return;

    const element = document.getElementById(elementId) as HTMLTextAreaElement | HTMLInputElement;
    if (element) {
      // Get the existing value
      const existingVal = element.value;
      const newVal = existingVal 
        ? `${existingVal} ${transcription.trim()}`
        : transcription.trim();

      // Set value and trigger React's synthetic events
      element.value = newVal;
      
      // Dispatch events to trigger React's onChange handlers
      const inputEvent = new Event("input", { bubbles: true });
      const changeEvent = new Event("change", { bubbles: true });
      element.dispatchEvent(inputEvent);
      element.dispatchEvent(changeEvent);

      success(`Berhasil memasukkan teks ke field "${fieldLabel}"!`);
    } else {
      warning(
        `Formulir target dengan field "${fieldLabel}" tidak ditemukan terbuka di layar. Pastikan Anda membuka formulir tersebut terlebih dahulu!`
      );
    }
  };

  const getStorageKey = () => `ai_voice_autoplay_${user?.id || user?.username || "default"}`;

  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(() => {
    return localStorage.getItem(`ai_voice_autoplay_${user?.id || user?.username || "default"}`) === "true";
  });

  const toggleAutoPlay = () => {
    const newVal = !isAutoPlay;
    setIsAutoPlay(newVal);
    localStorage.setItem(getStorageKey(), newVal.toString());
    success(`Membaca otomatis saat navigasi: ${newVal ? "Aktif" : "Nonaktif"}`);
  };
  
  // AI State
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [aiSystemInstruction, setAiSystemInstruction] = useState<string>(
    "Anda adalah asisten AI profesional untuk Tim Kerja Sumber Daya Kelautan (Timja SDK) Stasiun PSDKP Biak. Jawablah dalam Bahasa Indonesia yang formal, ringkas, santun, padat, dan informatif. Jangan membuat kalimat yang terlalu panjang agar mudah didengar saat dibacakan."
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Audio Context Ref
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Helper functions for Tab Auto-detection
  const getTabFriendlyName = (tab: string) => {
    switch (tab) {
      case "dashboard": return "Dashboard Kinerja";
      case "pemeriksaan": return "Pemeriksaan Kelayakan";
      case "temuan": return "Temuan Pelanggaran";
      case "dokumen": return "Dokumen Pelaporan";
      case "workspace": return "Integrasi Google Workspace";
      case "users": return "Manajemen Pengguna";
      case "config": return "Konfigurasi API & Sheets";
      case "logs": return "Log Aktivitas";
      default: return tab;
    }
  };

  const getTabSummaryText = (tab: string, stats?: any) => {
    switch (tab) {
      case "dashboard": {
        const total = stats?.totalPemeriksaan ?? 10;
        const taat = stats?.totalTaat ?? 8;
        const tidakTaat = stats?.totalTidakTaat ?? 2;
        const avg = stats?.rataRataNilai ?? 85;
        const penyerapan = stats?.persentasePenyerapan ?? 72;
        return `Halo, berikut ringkasan statistik Dashboard Kinerja saat ini. Tercatat total ${total} pemeriksaan pengawasan, dengan jumlah pelaku usaha taat sebanyak ${taat} kapal, ketaatan kurang sebanyak ${tidakTaat} kapal, serta tingkat kepatuhan regional berada pada angka ${avg} persen. Penyerapan anggaran operasional saat ini mencapai ${penyerapan} persen dari pagu anggaran.`;
      }
      case "pemeriksaan":
        return "Anda membuka halaman Pemeriksaan Kelayakan Kapal. Di halaman ini, tim kerja melakukan penginputan dan verifikasi hasil pengawasan kelayakan teknis, administrasi, kelaikan operasional kapal perikanan, serta penerbitan surat persetujuan berlayar.";
      case "temuan":
        return "Anda membuka halaman Temuan Pelanggaran. Menu ini merinci daftar ketidakpatuhan administrasi maupun fisik kapal perikanan, lengkap dengan jenis pelanggaran, sanksi administrasi, sanksi hukum, serta tindak lanjut lapangan yang harus diselesaikan.";
      case "dokumen":
        return "Anda membuka halaman Dokumen Pelaporan. Di sini Anda dapat mengunggah, mengarsipkan, dan memverifikasi sertifikat kelaikan, berita acara pemeriksaan, serta dokumen dinas operasional lainnya.";
      case "workspace":
        return "Anda membuka halaman Integrasi Google Workspace. Fitur ini menyinkronkan data pelaporan secara real-time ke Google Spreadsheet, mencatat agenda pengawasan ke Google Calendar, dan menyalin catatan penting ke Google Keep.";
      case "users":
        return "Anda membuka halaman Manajemen Pengguna. Menu administrator ini digunakan untuk mendaftarkan personil baru, mengedit profil, dan membatasi hak akses kontrol sesuai peranan kerja.";
      case "config":
        return "Anda membuka halaman Konfigurasi Integrasi. Di sini administrator dapat menghubungkan ID spreadsheet Google, memicu sinkronisasi manual, dan menyalin baris kode Google Apps Script untuk otomatisasi server.";
      case "logs":
        return "Anda membuka halaman Log Aktivitas Sistem. Bagian ini mendokumentasikan setiap aksi masuk sistem, pendaftaran kapal, verifikasi temuan, dan pembaruan integrasi demi transparansi audit.";
      default:
        return `Anda berpindah ke halaman ${getTabFriendlyName(tab)}. Gunakan asisten suara untuk membantu memandu navigasi Anda.`;
    }
  };

  // Track tab changes and handle automatic voice briefing
  const lastTabRef = useRef<string>(activeTab);

  useEffect(() => {
    if (activeTab !== lastTabRef.current) {
      lastTabRef.current = activeTab;
      
      // Stop current voice output
      stopAudio();

      const summaryText = getTabSummaryText(activeTab, dashboardStats);
      setTextToRead(summaryText);

      // Check if auto play is activated
      if (isAutoPlay) {
        // Automatically synthesize and speak out loud
        const timer = setTimeout(() => {
          handleSynthesizeAndPlayWithText(summaryText);
        }, 800);
        return () => clearTimeout(timer);
      } else {
        info(`Mendeteksi halaman baru: ${getTabFriendlyName(activeTab)}. Ketuk gelembung asisten untuk membacakan ringkasan.`);
      }
    }
  }, [activeTab, dashboardStats, isAutoPlay]);

  // Quick templates
  const templates = [
    {
      title: "Dashboard Kinerja",
      text: "Halaman Dashboard Utama menampilkan grafik capaian realisasi anggaran, persentase nilai kemanfaatan, indeks kinerja utama, serta grafik status verifikasi surat perintah tugas per wilayah.",
      category: "Dashboard"
    },
    {
      title: "Pemeriksaan Kapal",
      text: "Subbagian Pemeriksaan berisi formulir pengawasan kelayakan kapal perikanan, surat persetujuan berlayar, verifikasi sarana, serta riwayat log inspeksi terpadu.",
      category: "Pemeriksaan"
    },
    {
      title: "Temuan Pelanggaran",
      text: "Subbagian Temuan Pelanggaran mendokumentasikan pelanggaran administratif dan fisik kapal, lengkap dengan sanksi operasional, tindak lanjut hukum, dan dokumentasi lapangan.",
      category: "Temuan"
    },
    {
      title: "Google Workspace",
      text: "Bagian Google Workspace merupakan integrasi REST API aktif untuk mengelola dokumen laporan secara otomatis ke Google Sheets, jadwal dinas ke Kalender, dan memo ke Google Keep.",
      category: "Workspace"
    }
  ];

  // Voices detail list
  const voices = [
    { id: "Kore", label: "Kore (Profesional & Formal)", description: "Suara pria dewasa dengan intonasi formal, cocok untuk pengumuman dinas." },
    { id: "Zephyr", label: "Zephyr (Hangat & Berenergi)", description: "Suara ramah dengan artikulasi jelas, ideal untuk instruksi harian." },
    { id: "Puck", label: "Puck (Ceria & Ramah)", description: "Suara santun dengan nada ceria, memberikan impresi yang bersahabat." },
    { id: "Charon", label: "Charon (Mendalam & Informatif)", description: "Suara berat dan berwibawa, cocok untuk laporan evaluasi anggaran." },
    { id: "Fenrir", label: "Fenrir (Tegas & Solid)", description: "Suara mantap dan berkarakter kuat, sangat baik untuk instruksi kedisiplinan." }
  ];

  // Quick AI prompts
  const quickAiPrompts = [
    "Buat ringkasan semangat pagi singkat untuk anggota Timja SDK Biak agar semangat verifikasi dokumen hari ini.",
    "Tulis instruksi harian singkat tentang pentingnya akurasi penginputan SPT dan pengawasan lapangan.",
    "Buat pengumuman singkat mengenai evaluasi capaian realisasi anggaran triwulan ini yang perlu ditingkatkan."
  ];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  // Helper to convert base64 back to Float32 PCM
  const base64ToFloat32PCM = (base64: string): Float32Array => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }
    return float32Array;
  };

  // Play PCM Base64 Audio via AudioContext
  const playPCMAudio = async (base64Audio: string) => {
    try {
      stopAudio(); // Stop any currently playing audio first

      // Initialize audio context lazily
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      const audioCtx = audioContextRef.current;
      
      // If context is suspended (due to browser autoplay policies), resume it
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      const pcmData = base64ToFloat32PCM(base64Audio);
      const buffer = audioCtx.createBuffer(1, pcmData.length, 24000);
      buffer.getChannelData(0).set(pcmData);

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      
      source.onended = () => {
        setIsPlaying(false);
      };

      audioSourceRef.current = source;
      setIsPlaying(true);
      source.start(0);
      success("Suara berhasil disintesis dan diputar!");
    } catch (err: any) {
      console.error("Gagal memutar audio:", err);
      error(`Gagal memutar audio: ${err.message}`);
      setIsPlaying(false);
    }
  };

  const playLocalSpeech = (text: string) => {
    if (!('speechSynthesis' in window)) {
      error("Browser Anda tidak mendukung Sintesis Suara lokal (Web Speech API).");
      return;
    }
    
    stopAudio(); // Stop both PCM and speechSynthesis
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set pitch and rate for standard clear reading
    utterance.pitch = 1.0;
    utterance.rate = 1.05;
    
    // Try to find Indonesian voice
    const speechVoices = window.speechSynthesis.getVoices();
    const idVoice = speechVoices.find(v => v.lang.toLowerCase().includes("id"));
    if (idVoice) {
      utterance.voice = idVoice;
    } else {
      // Fallback to Indonesian language tag
      utterance.lang = "id-ID";
    }
    
    utterance.onend = () => {
      setIsPlaying(false);
    };
    
    utterance.onerror = (e) => {
      console.error("Kesalahan TTS Lokal:", e);
      setIsPlaying(false);
    };
    
    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
    success("Memutar ringkasan menggunakan Asisten Suara Lokal.");
  };

  const stopAudio = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {
        // Ignored if already stopped
      }
      audioSourceRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  const handleSynthesizeAndPlayWithText = async (text: string) => {
    if (!text.trim()) {
      warning("Silakan masukkan atau pilih teks terlebih dahulu!");
      return;
    }

    setIsSynthesizing(true);
    info("Sedang mensintesis suara...");
    try {
      const base64Audio = await api.aiTextToSpeech(text.trim(), selectedVoice);
      await playPCMAudio(base64Audio);
    } catch (err: any) {
      console.error("Kesalahan TTS:", err);
      const errStr = JSON.stringify(err).toLowerCase() + " " + String(err.message || "").toLowerCase();
      const isQuotaExceeded = errStr.includes("429") || errStr.includes("quota") || errStr.includes("rate-limits") || errStr.includes("limit") || errStr.includes("resource_exhausted");
      
      if (isQuotaExceeded) {
        info("Kuota harian Asisten Suara AI penuh. Mengaktifkan Asisten Suara Lokal (Web Speech) sebagai cadangan...");
      } else {
        info("Gagal menghubungi asisten suara AI. Mengaktifkan asisten suara lokal cadangan...");
      }
      
      try {
        playLocalSpeech(text.trim());
      } catch (localErr: any) {
        console.error("Gagal memutar TTS lokal:", localErr);
        error("Gagal memutar suara baik melalui AI maupun asisten lokal.");
      }
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleSynthesizeAndPlay = async () => {
    await handleSynthesizeAndPlayWithText(textToRead);
  };

  const handleGenerateTextFromAI = async () => {
    if (!aiPrompt.trim()) {
      warning("Silakan ketik petunjuk atau prompt asisten AI terlebih dahulu!");
      return;
    }

    setIsGenerating(true);
    info("Menghubungi AI Gemini untuk membuat draf...");
    try {
      const text = await api.aiGenerateText(aiPrompt.trim(), aiSystemInstruction);
      setTextToRead(text);
      setActiveMode("direct");
      success("AI berhasil membuat draf! Silakan klik 'Bacakan Sekarang' di bawah.");
    } catch (err: any) {
      console.error("Kesalahan Generate Text:", err);
      error(`Gagal menghasilkan teks AI: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isFloatingOnly) {
    return (
      <AnimatePresence mode="wait">
        {!isFloatingOpen ? (
          <motion.button
            key="collapsed-ai-assistant"
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={() => {
              setIsFloatingOpen(true);
              localStorage.setItem("ai_assistant_floating_open", "true");
              info("Asisten Suara AI diaktifkan. Anda dapat menyembunyikan kembali kapan saja.");
            }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900/95 hover:bg-slate-800 border border-slate-750 text-white font-black text-xs px-4.5 py-3 rounded-full shadow-2xl transition-all cursor-pointer hover:scale-105 active:scale-95 no-print"
            id="ai-assistant-show-button"
            title="Tampilkan Asisten AI Suara"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Asisten AI Suara</span>
          </motion.button>
        ) : (
          <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans no-print" key="expanded-ai-assistant">
            {/* SPEECH BUBBLE OVERLAY */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-3xl shadow-xl border border-slate-700/60 max-w-xs flex flex-col gap-2.5 relative"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 pr-6">
                <span className="text-[9px] font-black tracking-widest text-cyan-400 uppercase flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Asisten Suara Aktif
                </span>
                <span className="text-[9px] font-extrabold text-slate-400 bg-white/10 px-2 py-0.5 rounded-md">
                  {getTabFriendlyName(activeTab)}
                </span>
              </div>

              {/* CLOSE BUTTON */}
              <button
                onClick={() => {
                  setIsFloatingOpen(false);
                  localStorage.setItem("ai_assistant_floating_open", "false");
                  success("Asisten Suara AI disembunyikan.");
                }}
                className="absolute top-3 right-3 p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Sembunyikan Asisten"
                id="ai-assistant-hide-button"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              
              <p className="text-[10px] text-slate-300 font-semibold leading-relaxed">
                Halaman terdeteksi. Ingin asisten membacakan ringkasan data saat ini secara langsung?
              </p>

              {/* AUTOPITAL TOGGLE CONTROLLER */}
              <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5">
                <span className="text-[9.5px] text-slate-300 font-bold">Baca Otomatis saat ganti tab</span>
                <button
                  type="button"
                  onClick={toggleAutoPlay}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isAutoPlay ? "bg-emerald-500" : "bg-slate-600"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      isAutoPlay ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* ACTIONS */}
              <div className="flex gap-2 justify-end pt-1">
                {isPlaying && (
                  <button
                    onClick={stopAudio}
                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 rounded-lg text-white font-extrabold text-[9.5px] transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Square className="w-2.5 h-2.5 fill-white" />
                    Stop
                  </button>
                )}
                
                <button
                  disabled={isSynthesizing}
                  onClick={() => handleSynthesizeAndPlayWithText(textToRead || getTabSummaryText(activeTab, dashboardStats))}
                  className={`px-3 py-1.5 text-white font-extrabold text-[9.5px] rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                    isSynthesizing ? "bg-slate-700" : "bg-sky-600 hover:bg-sky-500"
                  }`}
                >
                  {isSynthesizing ? (
                    <>
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      Memproses...
                    </>
                  ) : isPlaying ? (
                    <>
                      <Volume2 className="w-2.5 h-2.5 animate-bounce" />
                      Membaca...
                    </>
                  ) : (
                    <>
                      <Play className="w-2.5 h-2.5 fill-white" />
                      Dengar Ringkasan
                    </>
                  )}
                </button>
              </div>

              {/* COMPACT STT RECORDER IN FLOATING CARD */}
              <div className="border-t border-slate-850 pt-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1 select-none">
                    <Mic className="w-2.5 h-2.5" />
                    Dikte Suara (STT)
                  </span>
                  
                  <select
                    value={sttTarget}
                    onChange={(e) => setSttTarget(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[8.5px] font-bold text-slate-300 focus:outline-none"
                  >
                    <option value="catatan">Catatan Harian</option>
                    <option value="temuan_lapangan">Deskripsi Temuan</option>
                    <option value="pemeriksaan_temuan">Temuan BA (Pems)</option>
                    <option value="pemeriksaan_rekomendasi">Rekomendasi (Pems)</option>
                  </select>
                </div>

                {transcription && (
                  <div className="bg-white/5 border border-white/10 p-2 rounded-xl text-[9.5px] text-slate-300 leading-relaxed font-semibold max-h-16 overflow-y-auto font-sans">
                    {transcription}
                  </div>
                )}

                <div className="flex gap-2 justify-between items-center">
                  {transcription && (
                    <button
                      type="button"
                      onClick={clearTranscription}
                      className="text-[8.5px] font-bold text-slate-400 hover:text-rose-400 cursor-pointer"
                    >
                      Bersihkan
                    </button>
                  )}
                  
                  <div className="flex gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={isRecording ? stopSpeechToText : startSpeechToText}
                      className={`px-2 py-1 rounded-lg text-[9px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                        isRecording 
                          ? "bg-rose-600 text-white animate-pulse" 
                          : "bg-emerald-650 hover:bg-emerald-600 text-white border border-emerald-600/20"
                      }`}
                    >
                      <Mic className="w-2.5 h-2.5" />
                      {isRecording ? "Stop" : "Mulai Dikte"}
                    </button>

                    {transcription && !isRecording && (
                      <button
                        type="button"
                        onClick={handleInjectText}
                        className="px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[9px] font-black flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-2.5 h-2.5" />
                        Kirim Ke Field
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* FLOATING TRIGGER AVATAR */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                handleSynthesizeAndPlayWithText(textToRead || getTabSummaryText(activeTab, dashboardStats));
              }}
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl relative cursor-pointer border transition-all ${
                isPlaying 
                  ? "bg-emerald-600 border-emerald-500 text-white animate-pulse" 
                  : "bg-sky-600 border-sky-500 text-white hover:bg-sky-500"
              }`}
            >
              <span className={`absolute -inset-1 rounded-full border border-sky-400/30 -z-10 animate-ping ${isPlaying ? "opacity-100" : "opacity-0"}`} />
              
              {isPlaying ? (
                <div className="flex items-end gap-0.5 h-3">
                  <span className="w-0.5 h-1.5 bg-white rounded-xs animate-bounce" />
                  <span className="w-0.5 h-3 bg-white rounded-xs animate-bounce" />
                  <span className="w-0.5 h-2.5 bg-white rounded-xs animate-bounce" />
                </div>
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER CARD */}
      <div className="bg-gradient-to-r from-sky-900 to-indigo-950 p-6 rounded-3xl shadow-sm text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-sky-800/40">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-extrabold text-[9px] uppercase tracking-widest border border-cyan-500/10">
            <Sparkles className="w-3 h-3" />
            Teknologi AI Terbaru
          </div>
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-yellow-400" />
            Asisten Suara AI (Text-to-Speech)
          </h2>
          <p className="text-xs text-sky-200 font-medium max-w-2xl leading-relaxed">
            Integrasi langsung dengan <strong className="text-yellow-300">Gemini 3.1 TTS Engine</strong>. Ubah teks instruksi atau laporan pengawasan menjadi suara alami dalam hitungan detik untuk langsung didengar oleh tim.
          </p>
        </div>
        
        {/* Playback Status Bar */}
        {isPlaying && (
          <div className="flex items-center gap-3 bg-white/10 px-4 py-2.5 rounded-2xl border border-white/15">
            <div className="flex items-end gap-1 h-4">
              <span className="w-1 h-2 bg-yellow-400 rounded-full animate-pulse inline-block" />
              <span className="w-1 h-3.5 bg-yellow-400 rounded-full animate-bounce inline-block" />
              <span className="w-1 h-3 bg-yellow-400 rounded-full animate-pulse inline-block" />
              <span className="w-1 h-4 bg-yellow-400 rounded-full animate-bounce inline-block" />
            </div>
            <span className="text-[10px] font-black tracking-wider uppercase text-yellow-300 animate-pulse">MEMUTAR SUARA...</span>
            <button 
              onClick={stopAudio}
              className="p-1.5 bg-rose-600 hover:bg-rose-500 rounded-lg text-white transition-all cursor-pointer"
              title="Stop"
            >
              <Square className="w-3 h-3 fill-white" />
            </button>
          </div>
        )}
      </div>

      {/* MAIN TWO COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: CONTROLS & INPUT (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* TAB BAR SELECTOR */}
          <div className="bg-white border border-slate-200 p-1.5 rounded-2xl flex gap-1.5 shadow-xs">
            <button
              onClick={() => {
                setActiveMode("direct");
                stopAudio();
              }}
              className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeMode === "direct"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <FileAudio className="w-4 h-4" />
              1. Bacakan Teks Langsung
            </button>
            <button
              onClick={() => {
                setActiveMode("ai");
                stopAudio();
              }}
              className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeMode === "ai"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              2. Buat Teks via AI & Bacakan
            </button>
            <button
              onClick={() => {
                setActiveMode("stt");
                stopAudio();
              }}
              className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeMode === "stt"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Mic className="w-4 h-4 text-emerald-500" />
              3. Dikte Suara (Voice-to-Text)
            </button>
          </div>

          {/* VIEW: DIRECT TTS */}
          {activeMode === "direct" && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs space-y-5"
            >
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  Ketik Teks Untuk Dibacakan
                </h3>
                <p className="text-[10px] text-slate-400 font-bold">
                  Masukkan instruksi, pengumuman, atau laporan kerja harian Anda dalam Bahasa Indonesia
                </p>
              </div>

              {/* QUICK TEMPLATE CHIPS */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Gunakan Template Cepat:</label>
                <div className="flex flex-wrap gap-2">
                  {templates.map((tpl, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setTextToRead(tpl.text);
                        success(`Berhasil menerapkan template: "${tpl.title}"`);
                        handleSynthesizeAndPlayWithText(tpl.text);
                      }}
                      className="px-3 py-1.5 text-[10px] font-bold text-slate-700 bg-slate-50 hover:bg-sky-50 hover:text-sky-700 border border-slate-200 hover:border-sky-300 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                    >
                      <BookOpen className="w-3 h-3 text-slate-400" />
                      <span className="text-[9px] text-sky-600 uppercase font-black shrink-0">[{tpl.category}]</span>
                      {tpl.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* MAIN TEXTAREA */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Isi Naskah / Teks Pembacaan</label>
                  <span className="text-[10px] text-slate-400 font-bold">{textToRead.length} karakter</span>
                </div>
                <textarea
                  rows={6}
                  value={textToRead}
                  onChange={(e) => setTextToRead(e.target.value)}
                  placeholder="Ketik teks di sini (misal: Sesi pengawasan satwas biak hari ini dinyatakan tuntas)..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-xs font-bold text-slate-800 leading-relaxed placeholder:text-slate-400"
                />
              </div>

              {/* CONFIG: SELECTED VOICE LIST */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Pilih Model Suara (Voice Avatar):</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {voices.map((voice) => {
                    const isSelected = selectedVoice === voice.id;
                    return (
                      <button
                        type="button"
                        key={voice.id}
                        onClick={() => setSelectedVoice(voice.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                          isSelected
                            ? "bg-sky-50 border-sky-500 shadow-sm"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className={`text-[11px] font-black ${isSelected ? "text-sky-700" : "text-slate-800"}`}>
                            {voice.label}
                          </span>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />}
                        </div>
                        <span className="text-[9.5px] text-slate-500 leading-relaxed font-semibold">
                          {voice.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TRIGGER BUTTONS */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pt-2 gap-3">
                <div className="text-[10.5px] text-slate-400 font-bold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-slate-300" />
                  Format Output: Raw 24 kHz Mono PCM Audio Stream
                </div>
                
                <div className="flex gap-2">
                  {textToRead.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setTextToRead("");
                        stopAudio();
                        info("Naskah dibersihkan.");
                      }}
                      className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isSynthesizing || isPlaying}
                    onClick={handleSynthesizeAndPlay}
                    className={`px-6 py-2.5 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isSynthesizing 
                        ? "bg-slate-400" 
                        : isPlaying 
                          ? "bg-amber-600 hover:bg-amber-500"
                          : "bg-emerald-600 hover:bg-emerald-500"
                    }`}
                  >
                    {isSynthesizing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Mensintesis...
                      </>
                    ) : isPlaying ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-white" />
                        Hentikan Putar
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white" />
                        Sintesis & Bacakan Sekarang
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* VIEW: GENERATE VIA GEMINI */}
          {activeMode === "ai" && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs space-y-5"
            >
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Buat Pengumuman & Laporan Instan Dengan AI Gemini
                </h3>
                <p className="text-[10px] text-slate-400 font-bold">
                  Asisten AI akan mendrafkan naskah pidato formal/instruksi yang dioptimasi khusus untuk pembacaan suara natural
                </p>
              </div>

              {/* QUICK PROMPTS */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Pilih Contoh Topik:</label>
                <div className="flex flex-col gap-2">
                  {quickAiPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setAiPrompt(p);
                        info("Topik terpilih. Silakan modifikasi atau langsung klik tombol buat.");
                      }}
                      className="px-3.5 py-2.5 text-[10px] text-left font-bold text-slate-600 bg-slate-50 hover:bg-amber-50/50 hover:text-amber-800 border border-slate-200 hover:border-amber-300 rounded-xl transition-all cursor-pointer flex items-center gap-2"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* PROMPT TEXTAREA */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Instruksi Spesifik Anda Ke AI:</label>
                <textarea
                  rows={4}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ketik topik spesifik, misal: 'Buat briefing apresiasi tim kerja atas realisasi anggaran 90% pada triwulan ini'..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-xs font-bold text-slate-800 leading-relaxed placeholder:text-slate-400"
                />
              </div>

              {/* SYSTEM CONFIG (HIDDEN BY DEFAULT) */}
              <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/50 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10.5px] font-black text-amber-900">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Aturan Penulisan Asisten AI (System Instruction)
                </div>
                <input
                  type="text"
                  value={aiSystemInstruction}
                  onChange={(e) => setAiSystemInstruction(e.target.value)}
                  className="w-full px-3 py-1.5 text-[9.5px] bg-white border border-slate-200 rounded-lg text-slate-600 font-semibold focus:outline-none"
                  title="System Instruction"
                />
              </div>

              {/* TRIGGER AI GENERATE */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={handleGenerateTextFromAI}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-400 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyusun Naskah via Gemini...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 fill-white text-yellow-300" />
                      Buat Draf Naskah Sekarang
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* VIEW: SPEECH-TO-TEXT DICTATION */}
          {activeMode === "stt" && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs space-y-5"
            >
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-emerald-500" />
                  Dikte Suara Langsung (Voice-to-Text)
                </h3>
                <p className="text-[10px] text-slate-400 font-bold">
                  Gunakan mikrofon Anda untuk mendikte catatan atau temuan lapangan secara langsung ke dalam form aktif
                </p>
              </div>

              {/* RECORDING INTERFACE */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-150 flex flex-col items-center justify-center gap-4 relative overflow-hidden">
                {isRecording && (
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 animate-pulse" />
                )}

                <div className="flex flex-col items-center gap-2">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={isRecording ? stopSpeechToText : startSpeechToText}
                    className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg cursor-pointer border transition-all ${
                      isRecording 
                        ? "bg-rose-600 border-rose-500 text-white animate-pulse" 
                        : "bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500"
                    }`}
                  >
                    {isRecording ? (
                      <div className="flex items-end gap-1 h-5">
                        <span className="w-1 h-3 bg-white rounded-full animate-bounce inline-block" />
                        <span className="w-1 h-5 bg-white rounded-full animate-bounce inline-block" />
                        <span className="w-1 h-4 bg-white rounded-full animate-bounce inline-block" />
                      </div>
                    ) : (
                      <Mic className="w-7 h-7" />
                    )}
                  </motion.button>
                  
                  <span className={`text-xs font-black uppercase tracking-wider ${isRecording ? "text-rose-600 animate-pulse" : "text-slate-600"}`}>
                    {isRecording ? "Mendengarkan Suara..." : "Ketuk untuk Mulai Dikte"}
                  </span>
                </div>

                {isRecording && (
                  <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-extrabold bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full animate-pulse">
                    <Activity className="w-3.5 h-3.5" />
                    Bicaralah sekarang (Bahasa Indonesia dioptimasi)
                  </div>
                )}
              </div>

              {/* TRANSCRIPTION RESULT */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Hasil Transkripsi Suara (Real-time)</label>
                  {transcription && (
                    <button 
                      type="button"
                      onClick={clearTranscription}
                      className="text-[10px] text-slate-400 hover:text-rose-600 font-bold cursor-pointer"
                    >
                      Bersihkan
                    </button>
                  )}
                </div>
                <textarea
                  rows={4}
                  value={transcription}
                  onChange={(e) => setTranscription(e.target.value)}
                  placeholder="Hasil ucapan Anda akan muncul di sini secara otomatis..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-xs font-bold text-slate-800 leading-relaxed placeholder:text-slate-400 font-sans"
                />
              </div>

              {/* TARGET FIELD SELECTOR */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Pilih Field Formulir Target:</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { id: "catatan", label: "Catatan / Instruksi Harian", desc: "Instruksi pimpinan di Dashboard Utama" },
                    { id: "temuan_lapangan", label: "Deskripsi Temuan (Temuan)", desc: "Uraian temuan di Form Uraian Temuan Baru" },
                    { id: "pemeriksaan_temuan", label: "Uraian Temuan BA (Pemeriksaan)", desc: "Temuan kelayakan di Form Pemeriksaan Baru" },
                    { id: "pemeriksaan_rekomendasi", label: "Rekomendasi Tindakan (Pemeriksaan)", desc: "Rekomendasi pengawasan di Form Pemeriksaan" }
                  ].map((target) => {
                    const isSelected = sttTarget === target.id;
                    return (
                      <button
                        type="button"
                        key={target.id}
                        onClick={() => setSttTarget(target.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                          isSelected
                            ? "bg-sky-50 border-sky-500 shadow-sm"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className={`text-[11px] font-black ${isSelected ? "text-sky-700" : "text-slate-800"}`}>
                            {target.label}
                          </span>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />}
                        </div>
                        <span className="text-[9.5px] text-slate-500 leading-relaxed font-semibold">
                          {target.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ACTION INJECT BUTTON */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pt-2.5 gap-3 border-t border-slate-100">
                <div className="text-[10.5px] text-slate-400 font-bold flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-slate-300" />
                  Gunakan Chrome / Edge untuk performa Web Speech terbaik
                </div>
                
                <button
                  type="button"
                  disabled={isRecording || !transcription.trim()}
                  onClick={handleInjectText}
                  className={`px-6 py-2.5 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    !transcription.trim() || isRecording
                      ? "bg-slate-350 text-slate-400 shadow-none cursor-not-allowed"
                      : "bg-sky-600 hover:bg-sky-500"
                  }`}
                >
                  <Check className="w-4 h-4" />
                  Masukkan ke Field Terbuka
                </button>
              </div>
            </motion.div>
          )}

        </div>

        {/* RIGHT COLUMN: METRIC & HOW TO USE (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* USER BIO CARD */}
          <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs space-y-3.5">
            <h4 className="text-xs font-black text-slate-800 tracking-wider uppercase border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-sky-500" />
              Otoritas Pengisi Suara
            </h4>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center shrink-0">
                <Volume2 className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <div className="text-[10px] font-black text-sky-600 uppercase tracking-widest leading-none mb-1">
                  {user.role}
                </div>
                <div className="text-xs font-extrabold text-slate-800 truncate max-w-[180px]">
                  {user.nama}
                </div>
              </div>
            </div>

            <p className="text-[10.5px] text-slate-500 leading-relaxed font-semibold bg-slate-50 p-3 rounded-xl border border-slate-100">
              Pengguna aktif dengan hak akses <strong>{user.role}</strong> diizinkan merancang draf arahan kerja dan mendengarkan suara instruksi harian secara langsung sebelum dibagikan.
            </p>
          </div>

          {/* USER PREFERENCES CARD */}
          <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs space-y-4">
            <h4 className="text-xs font-black text-slate-800 tracking-wider uppercase border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-emerald-500" />
              Pengaturan Preferensi Suara
            </h4>

            {/* AUTOPLAY TOGGLE CONTROLLER */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div className="space-y-0.5 max-w-[180px]">
                <span className="text-[11px] font-black text-slate-800 block">Baca Otomatis Navigasi</span>
                <span className="text-[9px] text-slate-400 font-semibold leading-relaxed block">
                  Otomatis membacakan draf ringkasan halaman ketika Anda berpindah antar tab menu.
                </span>
              </div>
              <button
                type="button"
                onClick={toggleAutoPlay}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isAutoPlay ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isAutoPlay ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* DOCUMENTATION PANEL */}
          <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs space-y-3">
            <h4 className="text-xs font-black text-slate-800 tracking-wider uppercase border-b border-slate-100 pb-2">
              Petunjuk Penggunaan
            </h4>
            
            <ul className="space-y-3 text-[10.5px] font-semibold text-slate-600">
              <li className="flex gap-2 items-start">
                <span className="w-4 h-4 rounded-full bg-slate-100 text-[10px] font-black text-slate-700 flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>Pilih mode pembacaan: <strong>Bacakan Teks Langsung</strong> atau drafkan naskah secara otomatis via <strong>Gemini AI</strong>.</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="w-4 h-4 rounded-full bg-slate-100 text-[10px] font-black text-slate-700 flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>Gunakan <strong>Template Cepat</strong> di atas naskah untuk menghemat waktu penulisan pengumuman operasional.</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="w-4 h-4 rounded-full bg-slate-100 text-[10px] font-black text-slate-700 flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span>Ganti model suara di bawah naskah jika ingin mendengarkan intonasi vokal pria (Kore/Charon) atau vokal dinamis (Zephyr/Puck/Fenrir).</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="w-4 h-4 rounded-full bg-slate-100 text-[10px] font-black text-slate-700 flex items-center justify-center shrink-0 mt-0.5">4</span>
                <span>Klik <strong>Sintesis & Bacakan Sekarang</strong>. Speaker Anda akan segera memutarkan suara yang telah disintesis.</span>
              </li>
            </ul>

            <div className="text-[9.5px] text-amber-600 font-extrabold bg-amber-50 p-2.5 rounded-lg border border-amber-200/50 leading-relaxed">
              *Catatan: Pastikan volume speaker perangkat Anda aktif dan browser mengizinkan pemutaran audio (autoplay).
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
