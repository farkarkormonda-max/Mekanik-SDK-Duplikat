import React, { useState, useEffect, useRef, useMemo } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { DateRangePicker } from "./DateRangePicker";
import { Pemeriksaan, MasterSatwas, Temuan, Dokumen } from "../types";
import { 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  Download,
  AlertCircle,
  Calendar,
  X,
  Clock,
  Bell,
  AlertTriangle,
  FileText,
  Eye,
  ExternalLink
} from "lucide-react";

interface PemeriksaanListProps {
  records: Pemeriksaan[];
  satwasList: MasterSatwas[];
  userRole: string;
  temuanList?: Temuan[];
  documentList?: Dokumen[];
  onAddClick: () => void;
  onEditClick: (record: Pemeriksaan) => void;
  onDeleteClick: (id: string, name: string) => void;
  onUploadDocClick: (record: Pemeriksaan) => void;
  onCreateTemuanClick: (record: Pemeriksaan) => void;
  onDeleteDoc?: (id: string) => Promise<void>;
}

export const PemeriksaanList: React.FC<PemeriksaanListProps> = ({
  records,
  satwasList,
  userRole,
  temuanList = [],
  documentList = [],
  onAddClick,
  onEditClick,
  onDeleteClick,
  onUploadDocClick,
  onCreateTemuanClick,
  onDeleteDoc,
}) => {
  const [search, setSearch] = useState("");
  const [filterSatwas, setFilterSatwas] = useState("");
  const [filterKetaatan, setFilterKetaatan] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterUrgentOnly, setFilterUrgentOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedRecordForModal, setSelectedRecordForModal] = useState<Pemeriksaan | null>(null);

  // Lazy Loading & Virtual Scroll state
  const [visibleCount, setVisibleCount] = useState(15);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  // Helper to calculate document and finding follow-up deadlines and urgency status
  const getUrgencyStatus = (r: Pemeriksaan) => {
    const inspectDate = new Date(r.tanggal);
    const currentDate = new Date();
    
    inspectDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);
    
    const diffTime = currentDate.getTime() - inspectDate.getTime();
    const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const isDocIncomplete = r.nilai_total < 100;
    
    // Check associated findings
    const findingsForRecord = temuanList.filter((t) => t.pemeriksaan_id === r.id);
    const hasActiveFindings = findingsForRecord.some((t) => t.status_tindak_lanjut !== "Selesai");
    
    // Check checklist documents not verified for over 7 days
    const unverifiedDocs = documentList.filter(d => d.pemeriksaan_id === r.id && d.status === "Belum Verifikasi");
    const hasUnverifiedDocsOver7Days = unverifiedDocs.length > 0 && daysElapsed > 7;
    
    let docUrgency: "none" | "warning" | "danger" = "none";
    let findUrgency: "none" | "warning" | "danger" = "none";
    let docMessage = "";
    let findMessage = "";
    
    // 1. Doc Completion Deadline: 14 days
    if (isDocIncomplete) {
      if (daysElapsed >= 14) {
        docUrgency = "danger";
        docMessage = `Melewati Batas Waktu Dokumen: Giat ${daysElapsed} hari lalu dan dokumen checklist belum lengkap (100%).`;
      } else if (daysElapsed >= 10) {
        const remaining = 14 - daysElapsed;
        docUrgency = "warning";
        docMessage = `Mendekati Batas Waktu Dokumen: Tersisa ${remaining} hari lagi untuk melengkapi berkas checklist.`;
      }
    }
    
    // 2. Finding Follow-up Deadline: 30 days
    if (hasActiveFindings) {
      if (daysElapsed >= 30) {
        findUrgency = "danger";
        findMessage = `Melewati Batas Tindak Lanjut Temuan: Sudah ${daysElapsed} hari sejak giat dan masih ada temuan yang belum diselesaikan.`;
      } else if (daysElapsed >= 25) {
        const remaining = 30 - daysElapsed;
        findUrgency = "warning";
        findMessage = `Mendekati Batas Tindak Lanjut Temuan: Tersisa ${remaining} hari lagi untuk menindaklanjuti temuan.`;
      }
    }

    if (hasUnverifiedDocsOver7Days) {
      docMessage = docMessage || `Terdapat ${unverifiedDocs.length} dokumen checklist belum terverifikasi selama lebih dari 7 hari (Giat: ${daysElapsed} hari lalu).`;
    }
    
    return {
      daysElapsed,
      isDocIncomplete,
      hasActiveFindings,
      docUrgency,
      findUrgency,
      docMessage,
      findMessage,
      hasUnverifiedDocsOver7Days,
      unverifiedDocsCount: unverifiedDocs.length,
      hasOverdueTindakLanjut: hasActiveFindings && daysElapsed >= 30,
      isUrgent: docUrgency !== "none" || findUrgency !== "none" || hasUnverifiedDocsOver7Days,
    };
  };

  // Toggle expanded card row
  const toggleRow = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Filter records with useMemo for optimal performance
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const pelakuUsaha = r.pelaku_usaha || "";
      const perusahaan = r.perusahaan || "";
      const nomorSpt = r.nomor_spt || "";
      const jenisUsaha = r.jenis_usaha || "";

      const matchSearch =
        pelakuUsaha.toLowerCase().includes(search.toLowerCase()) ||
        perusahaan.toLowerCase().includes(search.toLowerCase()) ||
        nomorSpt.toLowerCase().includes(search.toLowerCase()) ||
        jenisUsaha.toLowerCase().includes(search.toLowerCase());

      const matchSatwas = filterSatwas ? r.satwas === filterSatwas : true;
      const matchKetaatan = filterKetaatan ? r.status_ketaatan === filterKetaatan : true;
      const matchStartDate = startDate ? r.tanggal >= startDate : true;
      const matchEndDate = endDate ? r.tanggal <= endDate : true;

      let matchBulan = true;
      if (filterBulan) {
        const recordDate = new Date(r.tanggal);
        const recordMonth = recordDate.getMonth() + 1; // 1-12
        matchBulan = recordMonth === parseInt(filterBulan, 10);
      }

      const urgency = getUrgencyStatus(r);
      const matchUrgent = filterUrgentOnly ? urgency.isUrgent : true;

      return matchSearch && matchSatwas && matchKetaatan && matchStartDate && matchEndDate && matchBulan && matchUrgent;
    });
  }, [records, search, filterSatwas, filterKetaatan, startDate, endDate, filterBulan, filterUrgentOnly, temuanList, documentList]);

  // Reset lazy loading limit when any filter changes
  useEffect(() => {
    setVisibleCount(15);
  }, [search, filterSatwas, filterKetaatan, startDate, endDate, filterBulan, filterUrgentOnly]);

  // Setup dynamic infinite scrolling IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 15, filteredRecords.length));
        }
      },
      { threshold: 0.1 }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [filteredRecords.length]);

  // Role permissions checks
  const canCreate = userRole === "Administrator" || userRole === "Satwas";
  const canEdit = userRole === "Administrator" || userRole === "Satwas" || userRole === "Verifikator";
  const canDelete = userRole === "Administrator";

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Matrik Pemeriksaan");

      // Set column properties
      worksheet.columns = [
        { key: "no", width: 6 },
        { key: "tanggal", width: 14 },
        { key: "pelaku_usaha", width: 28 },
        { key: "perusahaan", width: 28 },
        { key: "jenis_usaha", width: 18 },
        { key: "satwas", width: 20 },
        { key: "nomor_spt", width: 25 },
        { key: "nilai_persiapan", width: 12 },
        { key: "nilai_pelaksanaan", width: 12 },
        { key: "nilai_pelaporan", width: 12 },
        { key: "nilai_total", width: 12 },
        { key: "predikat", width: 18 },
        { key: "ketaatan", width: 16 },
        { key: "temuan", width: 35 },
        { key: "rekomendasi", width: 35 }
      ];

      // Merge header rows for Kop Surat
      worksheet.addRow([]);

      // Row 2: Ministry
      worksheet.mergeCells("A2:O2");
      const r2Cell = worksheet.getCell("A2");
      r2Cell.value = "KEMENTERIAN KELAUTAN DAN PERIKANAN";
      r2Cell.font = { name: "Arial", size: 12, bold: true, color: { argb: "FF0F172A" } };
      r2Cell.alignment = { horizontal: "center", vertical: "middle" };

      // Row 3: Directorate
      worksheet.mergeCells("A3:O3");
      const r3Cell = worksheet.getCell("A3");
      r3Cell.value = "DIREKTORAT JENDERAL PENGAWASAN SUMBER DAYA KELAUTAN DAN PERIKANAN";
      r3Cell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FF334155" } };
      r3Cell.alignment = { horizontal: "center", vertical: "middle" };

      // Row 4: Biak Station
      worksheet.mergeCells("A4:O4");
      const r4Cell = worksheet.getCell("A4");
      r4Cell.value = "STASIUN PENGAWASAN SUMBER DAYA KELAUTAN DAN PERIKANAN BIAK";
      r4Cell.font = { name: "Arial", size: 10.5, bold: true, color: { argb: "FF0369A1" } };
      r4Cell.alignment = { horizontal: "center", vertical: "middle" };

      // Row 5: Address
      worksheet.mergeCells("A5:O5");
      const r5Cell = worksheet.getCell("A5");
      r5Cell.value = "Sorido, Distrik Biak Kota, Kabupaten Biak Numfor, Papua • Email: stasiun.biak@kkp.go.id";
      r5Cell.font = { name: "Arial", size: 8, italic: true, color: { argb: "FF64748B" } };
      r5Cell.alignment = { horizontal: "center", vertical: "middle" };

      // Double line style border using cell properties
      worksheet.getRow(5).border = {
        bottom: { style: "double", color: { argb: "FF0369A1" } }
      };

      worksheet.addRow([]); // Blank row

      // Title Row
      worksheet.mergeCells("A7:O7");
      const titleCell = worksheet.getCell("A7");
      titleCell.value = "LAPORAN HASIL MONITORING, PENGAWASAN DAN PEMERIKSAAN KETAATAN";
      titleCell.font = { name: "Arial", size: 11.5, bold: true, color: { argb: "FF0F172A" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };

      worksheet.mergeCells("A8:O8");
      const subtitleCell = worksheet.getCell("A8");
      subtitleCell.value = "TIM KERJA SUMBER DAYA KELAUTAN (TIMJA SDK) • TAHUN 2026";
      subtitleCell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FF475569" } };
      subtitleCell.alignment = { horizontal: "center", vertical: "middle" };

      worksheet.addRow([]); // Blank row

      // Metadata block - Filter & Date
      worksheet.getCell("A10").value = "Rentang Filter:";
      worksheet.getCell("A10").font = { name: "Arial", size: 8.5, bold: true, color: { argb: "FF475569" } };
      
      const filterSatwasStr = filterSatwas || "Semua Satwas";
      const filterKetaatanStr = filterKetaatan || "Semua Status";
      const filterBulanStr = filterBulan ? ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][parseInt(filterBulan, 10) - 1] : "Semua Bulan";
      const filterRangeStr = startDate || endDate ? `${startDate || "-"} s/d ${endDate || "-"}` : "Semua Waktu";

      worksheet.getCell("B10").value = `Satwas: ${filterSatwasStr}  |  Status: ${filterKetaatanStr}  |  Bulan: ${filterBulanStr}  |  Rentang: ${filterRangeStr}`;
      worksheet.getCell("B10").font = { name: "Arial", size: 8.5, color: { argb: "FF0F172A" } };
      worksheet.mergeCells("B10:I10");

      worksheet.getCell("L10").value = "Tanggal Cetak:";
      worksheet.getCell("L10").font = { name: "Arial", size: 8.5, bold: true, color: { argb: "FF475569" } };
      worksheet.getCell("L10").alignment = { horizontal: "right" };

      const opt: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
      const printDateStr = new Intl.DateTimeFormat("id-ID", opt).format(new Date());
      worksheet.getCell("M10").value = printDateStr;
      worksheet.getCell("M10").font = { name: "Arial", size: 8.5, bold: true, color: { argb: "FF0F172A" } };
      worksheet.mergeCells("M10:O10");

      worksheet.addRow([]); // Blank row

      // Summary KPI Row
      worksheet.mergeCells("A12:C12");
      const sumTotalLabel = worksheet.getCell("A12");
      sumTotalLabel.value = `TOTAL PEMERIKSAAN: ${filteredRecords.length} GIAT`;
      sumTotalLabel.font = { name: "Arial", size: 8.5, bold: true, color: { argb: "FF0369A1" } };
      sumTotalLabel.alignment = { horizontal: "center", vertical: "middle" };
      sumTotalLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F9FF" } };

      const taatCount = filteredRecords.filter(r => r.status_ketaatan === "TAAT").length;
      worksheet.mergeCells("E12:G12");
      const sumTaatLabel = worksheet.getCell("E12");
      sumTaatLabel.value = `TAAT: ${taatCount} (${filteredRecords.length > 0 ? Math.round((taatCount/filteredRecords.length)*100) : 0}%)`;
      sumTaatLabel.font = { name: "Arial", size: 8.5, bold: true, color: { argb: "FF059669" } };
      sumTaatLabel.alignment = { horizontal: "center", vertical: "middle" };
      sumTaatLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };

      const tidakTaatCount = filteredRecords.filter(r => r.status_ketaatan === "TIDAK TAAT").length;
      worksheet.mergeCells("I12:K12");
      const sumTidakTaatLabel = worksheet.getCell("I12");
      sumTidakTaatLabel.value = `MELANGGAR: ${tidakTaatCount} (${filteredRecords.length > 0 ? Math.round((tidakTaatCount/filteredRecords.length)*100) : 0}%)`;
      sumTidakTaatLabel.font = { name: "Arial", size: 8.5, bold: true, color: { argb: "FFDC2626" } };
      sumTidakTaatLabel.alignment = { horizontal: "center", vertical: "middle" };
      sumTidakTaatLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF2F2" } };

      const avgScore = filteredRecords.length > 0 ? Math.round(filteredRecords.reduce((acc, r) => acc + r.nilai_total, 0) / filteredRecords.length) : 0;
      worksheet.mergeCells("M12:O12");
      const sumAvgLabel = worksheet.getCell("M12");
      sumAvgLabel.value = `RATA-RATA NILAI: ${avgScore}%`;
      sumAvgLabel.font = { name: "Arial", size: 8.5, bold: true, color: { argb: "FF4F46E5" } };
      sumAvgLabel.alignment = { horizontal: "center", vertical: "middle" };
      sumAvgLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };

      // Set border for KPI row
      ["A12", "E12", "I12", "M12"].forEach(cellName => {
        const c = worksheet.getCell(cellName);
        c.border = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } }
        };
      });

      worksheet.addRow([]); // Blank row

      // Add Headers Row at 14
      const headers = [
        "No",
        "Tanggal",
        "Pelaku Usaha / Kapal",
        "Perusahaan",
        "Jenis Usaha",
        "Satwas Wilayah",
        "Nomor SPT",
        "Skor Persiapan",
        "Skor Pelaksanaan",
        "Skor Pelaporan",
        "Skor Total",
        "Predikat",
        "Status Ketaatan",
        "Temuan / Catatan",
        "Rekomendasi Tindak Lanjut"
      ];

      const headerRow = worksheet.addRow(headers);
      headerRow.height = 28;

      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF0F172A" } // Dark Slate for premium contrast
        };
        cell.font = {
          name: "Arial",
          bold: true,
          color: { argb: "FFFFFFFF" },
          size: 9.5
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FF0F172A" } },
          bottom: { style: "medium", color: { argb: "FF0369A1" } },
          left: { style: "thin", color: { argb: "FF334155" } },
          right: { style: "thin", color: { argb: "FF334155" } }
        };
      });

      // Add Data Rows
      filteredRecords.forEach((r, idx) => {
        const rowData = [
          idx + 1,
          r.tanggal,
          r.pelaku_usaha,
          r.perusahaan || "-",
          r.jenis_usaha,
          r.satwas,
          r.nomor_spt,
          r.nilai_persiapan,
          r.nilai_pelaksanaan,
          r.nilai_pelaporan,
          r.nilai_total,
          r.predikat,
          r.status_ketaatan,
          r.temuan || "-",
          r.rekomendasi || "-"
        ];

        const row = worksheet.addRow(rowData);
        row.height = 22;

        const isEven = idx % 2 === 1;
        row.eachCell((cell, colNum) => {
          cell.font = {
            name: "Arial",
            size: 9,
            color: { argb: "FF334155" }
          };

          if ([1, 2, 8, 9, 10, 11, 12, 13].includes(colNum)) {
            cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
          } else {
            cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
          }

          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: isEven ? "FFF8FAFC" : "FFFFFFFF" }
          };

          cell.border = {
            top: { style: "thin", color: { argb: "FFECEFF1" } },
            bottom: { style: "thin", color: { argb: "FFECEFF1" } },
            left: { style: "thin", color: { argb: "FFECEFF1" } },
            right: { style: "thin", color: { argb: "FFECEFF1" } }
          };

          if (colNum === 1) {
            cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF64748B" } };
          }

          if (colNum === 2) {
            cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF475569" } };
          }

          if (colNum === 11) {
            cell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FF0F172A" } };
          }

          if (colNum === 12) {
            if (cell.value === "Sangat Baik") {
              cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF047857" } };
            } else if (cell.value === "Baik") {
              cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF0369A1" } };
            } else if (cell.value === "Cukup") {
              cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFB45309" } };
            } else {
              cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFB91C1C" } };
            }
          }

          if (colNum === 13) {
            const val = cell.value as string;
            if (val === "TAAT") {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFD1FAE5" }
              };
              cell.font = {
                name: "Arial",
                size: 9,
                bold: true,
                color: { argb: "FF065F46" }
              };
            } else if (val === "TIDAK TAAT") {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFEE2E2" }
              };
              cell.font = {
                name: "Arial",
                size: 9,
                bold: true,
                color: { argb: "FF991B1B" }
              };
            }
          }
        });
      });

      // Add signatures block
      const signatureStartRow = worksheet.lastRow ? worksheet.lastRow.number + 3 : 20;

      worksheet.getCell(`C${signatureStartRow}`).value = "Petugas Verifikator / Pengawas Perikanan,";
      worksheet.getCell(`C${signatureStartRow}`).font = { name: "Arial", size: 9.5, italic: true, color: { argb: "FF334155" } };

      worksheet.getCell(`C${signatureStartRow + 4}`).value = "Nama: ________________________";
      worksheet.getCell(`C${signatureStartRow + 4}`).font = { name: "Arial", size: 9.5, color: { argb: "FF475569" } };
      worksheet.getCell(`C${signatureStartRow + 5}`).value = "NIP: _________________________";
      worksheet.getCell(`C${signatureStartRow + 5}`).font = { name: "Arial", size: 9.5, color: { argb: "FF475569" } };

      worksheet.getCell(`M${signatureStartRow}`).value = `Ditetapkan di Biak, ${printDateStr}`;
      worksheet.getCell(`M${signatureStartRow}`).font = { name: "Arial", size: 9.5, color: { argb: "FF334155" } };
      worksheet.mergeCells(`M${signatureStartRow}:O${signatureStartRow}`);

      worksheet.getCell(`M${signatureStartRow + 1}`).value = "Mengetahui, Kepala Stasiun PSDKP Biak";
      worksheet.getCell(`M${signatureStartRow + 1}`).font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FF0F172A" } };
      worksheet.mergeCells(`M${signatureStartRow + 1}:O${signatureStartRow + 1}`);

      worksheet.getCell(`M${signatureStartRow + 5}`).value = "Nama: ________________________";
      worksheet.getCell(`M${signatureStartRow + 5}`).font = { name: "Arial", size: 9.5, color: { argb: "FF475569" } };
      worksheet.mergeCells(`M${signatureStartRow + 5}:O${signatureStartRow + 5}`);
      worksheet.getCell(`M${signatureStartRow + 6}`).value = "NIP: _________________________";
      worksheet.getCell(`M${signatureStartRow + 6}`).font = { name: "Arial", size: 9.5, color: { argb: "FF475569" } };
      worksheet.mergeCells(`M${signatureStartRow + 6}:O${signatureStartRow + 6}`);

      // Generate buffer and trigger download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Matrik_Ledger_Pemeriksaan_PSDKP_Biak_${new Date().toISOString().slice(0, 10)}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Gagal membuat Excel:", e);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    const primaryColor: [number, number, number] = [3, 105, 161]; 
    const secondaryColor: [number, number, number] = [71, 85, 105]; 
    const pageWidth = doc.internal.pageSize.getWidth(); 
    const pageHeight = doc.internal.pageSize.getHeight(); 
    
    // Kop Surat
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("KEMENTERIAN KELAUTAN DAN PERIKANAN", pageWidth / 2, 14, { align: "center" });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("DIREKTORAT JENDERAL PENGAWASAN SUMBER DAYA KELAUTAN DAN PERIKANAN", pageWidth / 2, 20, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Laporan Pemantauan, Pemeriksaan & Kepatuhan Pelaku Usaha (Matrik Ledger)", pageWidth / 2, 25, { align: "center" });
    
    doc.setDrawColor(203, 213, 225); 
    doc.setLineWidth(0.8);
    doc.line(15, 28, pageWidth - 15, 28);
    
    doc.setDrawColor(3, 105, 161); 
    doc.setLineWidth(0.2);
    doc.line(15, 29.5, pageWidth - 15, 29.5);

    // Metadata
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); 
    doc.text("LAPORAN HASIL PENGAWASAN DAN PEMERIKSAAN", 15, 38);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); 
    
    const filterInfo = [
      `Satwas: ${filterSatwas || "Semua Satwas"}`,
      `Status: ${filterKetaatan || "Semua Status"}`,
      `Bulan: ${filterBulan ? ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][parseInt(filterBulan, 10) - 1] : "Semua Bulan"}`,
      `Rentang Tanggal: ${startDate || endDate ? `${startDate || "-"} s/d ${endDate || "-"}` : "Semua Rentang Waktu"}`
    ].join("  |  ");
    
    doc.text(filterInfo, 15, 43);
    
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    const dateStr = new Intl.DateTimeFormat("id-ID", options).format(new Date());
    doc.text(`Dicetak pada: ${dateStr}`, pageWidth - 15, 38, { align: "right" });

    // Mini Summary Box
    const totalCount = filteredRecords.length;
    const taatCount = filteredRecords.filter(r => r.status_ketaatan === "TAAT").length;
    const tidakTaatCount = filteredRecords.filter(r => r.status_ketaatan === "TIDAK TAAT").length;
    const avgScore = totalCount > 0 ? Math.round(filteredRecords.reduce((acc, r) => acc + r.nilai_total, 0) / totalCount) : 0;
    
    doc.setFillColor(248, 250, 252); 
    doc.setDrawColor(226, 232, 240); 
    doc.roundedRect(15, 47, pageWidth - 30, 12, 1, 1, "FD");
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    
    doc.text("TOTAL PEMERIKSAAN", 20, 51);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(3, 105, 161);
    doc.text(`${totalCount} Giat`, 20, 56);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("PELAKU USAHA TAAT", 80, 51);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(16, 185, 129); 
    doc.text(`${taatCount} (${totalCount > 0 ? Math.round((taatCount/totalCount)*100) : 0}%)`, 80, 56);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("TIDAK TAAT", 140, 51);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(239, 68, 68); 
    doc.text(`${tidakTaatCount} (${totalCount > 0 ? Math.round((tidakTaatCount/totalCount)*100) : 0}%)`, 140, 56);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("RATA-RATA EVALUASI", 200, 51);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229); 
    doc.text(`${avgScore}%`, 200, 56);

    const tableColumns = [
      "No",
      "Tanggal",
      "Pelaku Usaha / Kapal",
      "Satwas Wilayah",
      "Nomor SPT",
      "Skor",
      "Predikat",
      "Ketaatan"
    ];

    const tableRows = filteredRecords.map((r, index) => [
      index + 1,
      formatDisplayDate(r.tanggal),
      `${r.pelaku_usaha}\n(${r.jenis_usaha})`,
      r.satwas,
      r.nomor_spt,
      `${r.nilai_total}/100`,
      r.predikat,
      r.status_ketaatan
    ]);

    function formatDisplayDate(dateStr: string): string {
      if (!dateStr) return "-";
      const parts = dateStr.split("-");
      if (parts.length !== 3) return dateStr;
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = [
        "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
        "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
      ];
      return `${day} ${months[monthIdx]} ${year}`;
    }

    autoTable(doc, {
      head: [tableColumns],
      body: tableRows,
      startY: 63,
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        valign: "middle",
        font: "helvetica"
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "left"
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] 
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" }, 
        1: { cellWidth: 25 }, 
        2: { cellWidth: 70, fontStyle: "bold" }, 
        3: { cellWidth: 45 }, 
        4: { cellWidth: 55 }, 
        5: { cellWidth: 15, halign: "center" }, 
        6: { cellWidth: 25 }, 
        7: { cellWidth: 22, fontStyle: "bold", halign: "center" } 
      },
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index === 7) {
          const val = data.cell.raw;
          if (val === "TAAT") {
            data.cell.styles.textColor = [5, 150, 105]; 
          } else if (val === "TIDAK TAAT") {
            data.cell.styles.textColor = [220, 38, 38]; 
          }
        }
        if (data.section === "body" && data.column.index === 6) {
          const pred = data.cell.raw;
          if (pred === "Sangat Baik") {
            data.cell.styles.textColor = [5, 150, 105];
          } else if (pred === "Baik") {
            data.cell.styles.textColor = [6, 182, 212]; 
          } else if (pred === "Cukup") {
            data.cell.styles.textColor = [217, 119, 6]; 
          } else if (pred === "Perlu Perbaikan") {
            data.cell.styles.textColor = [220, 38, 38];
          }
        }
      },
      margin: { top: 15, right: 15, bottom: 25, left: 15 },
      didDrawPage: (data: any) => {
        const str = "Halaman " + doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); 
        doc.text(str, pageWidth - 15, pageHeight - 10, { align: "right" });
        doc.text("Laporan Resmi - Direktorat Jenderal PSDKP", 15, pageHeight - 10);
      }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 12;
    
    if (finalY > pageHeight - 40) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85); 

    const ttdDateStr = new Intl.DateTimeFormat("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    
    doc.text("Petugas Verifikator / Pengawas Perikanan,", 35, finalY);
    doc.text("Nama: ________________________", 35, finalY + 22);
    doc.text("NIP: _________________________", 35, finalY + 26);

    doc.text(`Ditetapkan di Jakarta, ${ttdDateStr}`, pageWidth - 100, finalY);
    doc.text("Mengetahui, Kepala Stasiun / Pimpinan Wilayah", pageWidth - 100, finalY + 4);
    doc.text("Nama: ________________________", pageWidth - 100, finalY + 22);
    doc.text("NIP: _________________________", pageWidth - 100, finalY + 26);

    const filename = `Laporan_Matrik_Pemeriksaan_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="space-y-6">
      {/* Header with Search and filters */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        {/* Filters and search in one bar */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kapal (vessel), pelaku usaha atau perusahaan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-xs font-semibold placeholder-slate-400"
            />
          </div>

          {/* Satwas Filter dropdown */}
          <div className="relative">
            <select
              value={filterSatwas}
              onChange={(e) => setFilterSatwas(e.target.value)}
              className="px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="">Semua Satwas</option>
              {satwasList.map((s) => (
                <option key={s.id} value={s.nama_satwas}>
                  {s.nama_satwas}
                </option>
              ))}
            </select>
          </div>

          {/* Compliance Filter dropdown */}
          <div className="relative">
            <select
              id="filter-ketaatan-select"
              value={filterKetaatan}
              onChange={(e) => setFilterKetaatan(e.target.value)}
              className="px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer hover:border-slate-400 transition-colors"
            >
              <option value="">Status Ketaatan (Semua)</option>
              <option value="TAAT">🟢 TAAT</option>
              <option value="TIDAK TAAT">🔴 TIDAK TAAT</option>
            </select>
          </div>

          {/* Month Filter dropdown */}
          <div className="relative">
            <select
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              className="px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="">Semua Bulan</option>
              <option value="1">Januari</option>
              <option value="2">Februari</option>
              <option value="3">Maret</option>
              <option value="4">April</option>
              <option value="5">Mei</option>
              <option value="6">Juni</option>
              <option value="7">Juli</option>
              <option value="8">Agustus</option>
              <option value="9">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Desember</option>
            </select>
          </div>

          {/* Date range filters */}
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onRangeChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
          />
        </div>

        {/* Action buttons (Export & Create) */}
        <div className="flex items-center gap-2 self-start flex-wrap">
          <button
            onClick={handleExportPDF}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer whitespace-nowrap transition-colors"
            title="Ekspor seluruh data matrik terfilter ke berkas PDF resmi"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Ekspor Laporan PDF
          </button>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer whitespace-nowrap transition-colors"
            title="Ekspor seluruh data matrik terfilter ke berkas Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Ekspor Laporan Excel
          </button>
          
          {canCreate && (
            <button
              onClick={onAddClick}
              className="px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Buat Pemeriksaan Baru
            </button>
          )}
        </div>
      </div>

      {/* Urgent Deadline Notification Banner */}
      {(() => {
        const urgentCount = records.filter(r => getUrgencyStatus(r).isUrgent).length;
        if (urgentCount === 0) return null;
        return (
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-700 mt-0.5 sm:mt-0">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-950">Notifikasi Batas Waktu & Tindak Lanjut</h4>
                <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
                  Terdapat <strong className="text-amber-950">{urgentCount} giat pemeriksaan</strong> yang mendekati atau telah melewati batas waktu penyelesaian berkas (14 hari) atau tindak lanjut temuan (30 hari).
                </p>
              </div>
            </div>
            <button
              onClick={() => setFilterUrgentOnly(!filterUrgentOnly)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide cursor-pointer border transition-all shrink-0 ${
                filterUrgentOnly 
                  ? "bg-amber-600 text-white border-amber-600 hover:bg-amber-700" 
                  : "bg-amber-50 text-amber-900 border-amber-250 hover:bg-amber-100"
              }`}
            >
              {filterUrgentOnly ? "Tampilkan Semua" : "Filter Sisa Tenggat"}
            </button>
          </div>
        );
      })()}

      {/* Primary Data List */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white border rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <AlertCircle className="w-10 h-10 text-slate-350" />
          <h4 className="font-bold text-slate-700 text-sm">Tidak Ada Giat Pemeriksaan</h4>
          <p className="text-xs text-slate-400 max-w-sm">No matches found. Clear filters or add some new records.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] font-extrabold uppercase tracking-widest border-b border-slate-100">
                  <th className="w-10 px-4"></th>
                  <th className="px-5 py-4">Tanggal / Giat</th>
                  <th className="px-5 py-4">Nama Pelaku Usaha</th>
                  <th className="px-5 py-4 hidden md:table-cell">Satwas SDKP</th>
                  <th className="px-5 py-4 hidden sm:table-cell">Ketaatan</th>
                  <th className="px-5 py-4 text-center hidden sm:table-cell">Skor Total</th>
                  <th className="px-5 py-4 hidden md:table-cell">Predikat</th>
                  <th className="px-5 py-4 text-right pr-6">Peralatan</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100 font-medium text-slate-700">
                {filteredRecords.slice(0, visibleCount).map((r) => {
                  const isExpanded = expandedId === r.id;
                  const dateFormatted = new Date(r.tanggal).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  });

                  const urgency = getUrgencyStatus(r);
                  let rowBgClass = "hover:bg-slate-50/40";
                  if (isExpanded) {
                    rowBgClass = "bg-slate-50/50";
                  } else if (urgency.isUrgent) {
                    if (urgency.docUrgency === "danger" || urgency.findUrgency === "danger" || urgency.hasOverdueTindakLanjut) {
                      rowBgClass = "bg-rose-50/15 hover:bg-rose-50/25";
                    } else {
                      rowBgClass = "bg-amber-50/15 hover:bg-amber-50/25";
                    }
                  }

                  const borderClass = urgency.isUrgent
                    ? (urgency.docUrgency === "danger" || urgency.findUrgency === "danger" || urgency.hasOverdueTindakLanjut
                      ? "border-l-4 border-rose-500" 
                      : "border-l-4 border-amber-500")
                    : "";

                  return (
                    <React.Fragment key={r.id}>
                      <tr className={`${rowBgClass} transition-colors cursor-pointer`} onClick={() => toggleRow(r.id)}>
                        <td className={`px-4 text-center ${borderClass}`} onClick={(e) => { e.stopPropagation(); toggleRow(r.id); }}>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </td>
                        <td className="px-5 py-4">
                          <span className="block font-bold text-slate-900">{dateFormatted}</span>
                          <span className="block text-[10px] text-slate-400 font-mono mt-0.5 max-w-[200px] truncate" title={r.nomor_spt}>
                            {r.nomor_spt}
                          </span>
                          
                          {/* Urgency Badges */}
                          {urgency.isUrgent && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {urgency.hasOverdueTindakLanjut && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[9px] font-black tracking-wide uppercase">
                                  <AlertTriangle className="w-2.5 h-2.5 shrink-0 text-rose-600 animate-bounce" /> Overdue Tindak Lanjut
                                </span>
                              )}
                              {urgency.hasUnverifiedDocsOver7Days && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-black tracking-wide uppercase">
                                  <FileText className="w-2.5 h-2.5 shrink-0 text-amber-600" /> Belum Verifikasi &gt;7 Hari
                                </span>
                              )}
                              {urgency.docUrgency === "danger" && !urgency.hasUnverifiedDocsOver7Days && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[9px] font-black tracking-wide uppercase">
                                  <Clock className="w-2.5 h-2.5 shrink-0" /> Overdue Dokumen
                                </span>
                              )}
                              {urgency.docUrgency === "warning" && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-black tracking-wide uppercase animate-pulse">
                                  <Clock className="w-2.5 h-2.5 shrink-0" /> Limit Dokumen
                                </span>
                              )}
                              {urgency.findUrgency === "danger" && !urgency.hasOverdueTindakLanjut && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[9px] font-black tracking-wide uppercase">
                                  <AlertCircle className="w-2.5 h-2.5 shrink-0" /> Overdue Temuan
                                </span>
                              )}
                              {urgency.findUrgency === "warning" && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-black tracking-wide uppercase animate-pulse">
                                  <AlertCircle className="w-2.5 h-2.5 shrink-0" /> Limit Temuan
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="block font-bold text-slate-950 truncate max-w-[180px]" title={r.pelaku_usaha}>{r.pelaku_usaha}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5 truncate max-w-[140px]" title={r.jenis_usaha}>{r.jenis_usaha}</span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 font-semibold hidden md:table-cell">{r.satwas}</td>
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide ${
                            r.status_ketaatan === "TAAT"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700 animate-pulse"
                          }`}>
                            {r.status_ketaatan}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center font-extrabold font-mono text-sm text-slate-800 hidden sm:table-cell">
                          {r.nilai_total} <span className="text-[10px] text-slate-350 font-normal">/100</span>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            r.predikat === "Sangat Baik"
                              ? "bg-emerald-500 text-white"
                              : r.predikat === "Baik"
                              ? "bg-cyan-500 text-white"
                              : r.predikat === "Cukup"
                              ? "bg-amber-500 text-white"
                              : "bg-rose-500 text-white"
                          }`}>
                            {r.predikat}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              onClick={() => setSelectedRecordForModal(r)}
                              title="Detail Pemeriksaan"
                              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-extrabold rounded cursor-pointer flex items-center gap-1 transition-all"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Detail</span>
                            </button>
                            {/* Upload Drive Link button */}
                            {canCreate && (
                              <button
                                onClick={() => onUploadDocClick(r)}
                                title="Attach Drive Link"
                                className="px-2 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 text-[10px] font-extrabold rounded cursor-pointer border border-sky-100"
                              >
                                Berkas
                              </button>
                            )}

                            {/* Attach issue (Temuan) button */}
                            {userRole !== "Kepala Stasiun" && (
                              <button
                                onClick={() => onCreateTemuanClick(r)}
                                title="Tambah Temuan Baru"
                                className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 text-[10px] font-extrabold rounded cursor-pointer border border-amber-100"
                              >
                                Temuan
                              </button>
                            )}

                            {canEdit && (
                              <button
                                onClick={() => onEditClick(r)}
                                title="Ubah Pemeriksaan"
                                className="p-1 px-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canDelete && (
                              <button
                                onClick={() => onDeleteClick(r.id, r.pelaku_usaha)}
                                title="Hapus Pemeriksaan"
                                className="p-1 px-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable sub-view detail card */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={8} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-slate-700 border-l-2 border-sky-600 pl-4">
                              
                              {/* Urgency Alert inside Expanded Row */}
                              {urgency.isUrgent && (
                                <div className="col-span-full bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
                                  <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                                  <div className="text-xs">
                                    <h5 className="font-extrabold text-amber-950">Atensi Tindak Lanjut & Kelengkapan Giat</h5>
                                    <div className="mt-1.5 space-y-1.5 text-amber-900 font-semibold leading-relaxed">
                                      {urgency.docMessage && <p className="flex items-center gap-1.5">• {urgency.docMessage}</p>}
                                      {urgency.findMessage && <p className="flex items-center gap-1.5">• {urgency.findMessage}</p>}
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Audit Checklist Status */}
                              <div className="bg-white rounded-xl p-4 border border-slate-150">
                                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3 block">Matrik Checklists</h4>
                                <ul className="space-y-2 text-xs font-semibold">
                                  <li className="flex items-center justify-between">
                                    <span className="text-slate-500">Surat Pemberitahuan</span>
                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-extrabold ${r.persiapan_spt ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                                      {r.persiapan_spt ? "+ 20 Pts" : "0 Pts"}
                                    </span>
                                  </li>
                                  <li className="flex items-center justify-between">
                                    <span className="text-slate-500">Surat Tugas Kegiatan</span>
                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-extrabold ${r.persiapan_st ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                                      {r.persiapan_st ? "+ 20 Pts" : "0 Pts"}
                                    </span>
                                  </li>
                                  <li className="flex items-center justify-between">
                                    <span className="text-slate-500">Berkas Lap. Hasil Pengawasan</span>
                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-extrabold ${r.pelaksanaan_dhp ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                                      {r.pelaksanaan_dhp ? "+ 20 Pts" : "0 Pts"}
                                    </span>
                                  </li>
                                  <li className="flex items-center justify-between">
                                    <span className="text-slate-500 font-sans">Tanpa revisi Verifikator</span>
                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-extrabold ${r.pelaksanaan_no_revisi ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                                      {r.pelaksanaan_no_revisi ? "+ 20 Pts" : "0 Pts"}
                                    </span>
                                  </li>
                                  <li className="flex items-center justify-between">
                                    <span className="text-slate-500">Kelengkapan Dokumentasi</span>
                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-extrabold ${r.pelaporan_lengkap ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                                      {r.pelaporan_lengkap ? "+ 20 Pts" : "0 Pts"}
                                    </span>
                                  </li>
                                </ul>
                              </div>

                              {/* Details Content */}
                              <div className="bg-white rounded-xl p-4 border border-slate-150">
                                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 block">Daftar Temuan Kegiatan</h4>
                                <p className="text-xs text-slate-800 leading-relaxed font-semibold bg-slate-50 p-2.5 rounded-lg border border-slate-100 h-28 overflow-y-auto">
                                  {r.temuan || "Tidak ada temuan lapangan khusus."}
                                </p>
                              </div>

                              {/* Action Log / Recommendations */}
                              <div className="bg-white rounded-xl p-4 border border-slate-150">
                                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 block">Hasil Rekomendasi Pengawasan</h4>
                                <p className="text-xs text-slate-800 leading-relaxed font-semibold bg-slate-50 p-2.5 rounded-lg border border-slate-100 h-28 overflow-y-auto">
                                  {r.rekomendasi || "Tidak ada rilis tindakan rekomendasi."}
                                </p>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Sentinel for infinite scroll auto loading */}
          {visibleCount < filteredRecords.length && (
            <div ref={loaderRef} className="h-10 flex items-center justify-center bg-slate-50/20 py-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-4 h-4 rounded-full border-2 border-sky-600/25 border-t-sky-600 animate-spin" />
                <span className="text-[10px] font-bold text-slate-500 font-sans tracking-wide">Memuat data pemeriksaan lainnya...</span>
              </div>
            </div>
          )}

          {/* Lazy Loading & Progress Footer */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <div className="flex items-center justify-between sm:justify-start gap-2.5">
                <span className="text-xs font-semibold text-slate-500">
                  Menampilkan <strong className="text-slate-800 font-bold">{Math.min(visibleCount, filteredRecords.length)}</strong> dari <strong className="text-slate-900 font-extrabold">{filteredRecords.length}</strong> pemeriksaan
                </span>
                {visibleCount < filteredRecords.length && (
                  <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[9px] font-black tracking-wide uppercase border border-sky-100">
                    Lazy Loading Aktif
                  </span>
                )}
              </div>
              
              {/* Sleek progress indicator */}
              <div className="w-full sm:w-56 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-sky-600 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, (Math.min(visibleCount, filteredRecords.length) / filteredRecords.length) * 100)}%` }}
                />
              </div>
            </div>

            {visibleCount < filteredRecords.length && (
              <div className="w-full sm:w-auto flex justify-end">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => Math.min(prev + 15, filteredRecords.length))}
                  className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-3xs"
                >
                  Tampilkan Lebih Banyak
                </button>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Detail Modal */}
      {selectedRecordForModal && (() => {
        const r = selectedRecordForModal;
        const urgency = getUrgencyStatus(r);
        const dateFormatted = new Date(r.tanggal).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });
        
        // Find related documents
        const relatedDocs = documentList.filter(d => d.pemeriksaan_id === r.id);

        return (
          <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto">
              
              {/* Modal Header */}
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-sky-700">Detail Pemeriksaan</span>
                  <h3 className="text-sm font-extrabold text-slate-900 mt-0.5">{r.pelaku_usaha}</h3>
                </div>
                <button 
                  onClick={() => setSelectedRecordForModal(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-6 overflow-y-auto space-y-6 text-slate-700">
                
                {/* Status and Summary Header Card */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-200/60 flex flex-wrap gap-4 items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">TANGGAL GIAT</span>
                    <span className="text-xs font-extrabold text-slate-800">{dateFormatted}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">STATUS KETAATAN</span>
                    <span className={`inline-block px-2 py-0.5 mt-0.5 rounded-full text-[9px] font-black tracking-wide ${
                      r.status_ketaatan === "TAAT"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                    }`}>
                      {r.status_ketaatan}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">SKOR & PREDIKAT</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-black font-mono text-slate-800">{r.nilai_total}/100</span>
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
                        r.predikat === "Sangat Baik"
                          ? "bg-emerald-500 text-white"
                          : r.predikat === "Baik"
                          ? "bg-cyan-500 text-white"
                          : r.predikat === "Cukup"
                          ? "bg-amber-500 text-white"
                          : "bg-rose-500 text-white"
                      }`}>
                        {r.predikat}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Urgency status if any */}
                {urgency.isUrgent && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                    <div className="text-xs">
                      <h5 className="font-extrabold text-amber-950">Peringatan / Atensi Jatuh Tempo</h5>
                      <div className="mt-1 space-y-1 text-amber-900 font-semibold">
                        {urgency.docMessage && <p>• {urgency.docMessage}</p>}
                        {urgency.findMessage && <p>• {urgency.findMessage}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Core Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Nomor SPT</span>
                    <span className="font-bold text-slate-800 block mt-0.5 font-mono">{r.nomor_spt || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Satwas SDKP</span>
                    <span className="font-bold text-slate-800 block mt-0.5">{r.satwas || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Jenis Usaha</span>
                    <span className="font-bold text-slate-800 block mt-0.5">{r.jenis_usaha || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Lokasi / Wilayah</span>
                    <span className="font-bold text-slate-800 block mt-0.5">{r.lokasi_wilayah || "-"}</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 my-4" />

                {/* Checklist Matriks and Temuan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Checklist Matriks */}
                  <div className="bg-slate-50 border border-slate-150 rounded-xl p-4">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-3 bg-sky-500 rounded-xs" />
                      Matrik Kelengkapan Berkas
                    </h4>
                    <ul className="space-y-2 text-xs font-semibold">
                      <li className="flex items-center justify-between">
                        <span className="text-slate-500">Surat Pemberitahuan (SPT)</span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold ${r.persiapan_spt ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                          {r.persiapan_spt ? "+ 20 Pts" : "0 Pts"}
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-slate-500">Surat Tugas Kegiatan (ST)</span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold ${r.persiapan_st ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                          {r.persiapan_st ? "+ 20 Pts" : "0 Pts"}
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-slate-500">Daftar Hasil Pengawasan (DHP)</span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold ${r.pelaksanaan_dhp ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                          {r.pelaksanaan_dhp ? "+ 20 Pts" : "0 Pts"}
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-slate-500">Tanpa Revisi Verifikator</span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold ${r.pelaksanaan_no_revisi ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                          {r.pelaksanaan_no_revisi ? "+ 20 Pts" : "0 Pts"}
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-slate-500">Laporan Dokumentasi Lengkap</span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-extrabold ${r.pelaporan_lengkap ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                          {r.pelaporan_lengkap ? "+ 20 Pts" : "0 Pts"}
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Temuan & Rekomendasi */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-3 bg-amber-500 rounded-xs" />
                        Daftar Temuan Lapangan
                      </h4>
                      <div className="text-xs text-slate-800 leading-relaxed font-semibold bg-slate-50 border border-slate-100 p-3 rounded-xl max-h-24 overflow-y-auto">
                        {r.temuan || "Tidak ada temuan khusus."}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-3 bg-purple-500 rounded-xs" />
                        Rekomendasi Tindakan
                      </h4>
                      <div className="text-xs text-slate-800 leading-relaxed font-semibold bg-slate-50 border border-slate-100 p-3 rounded-xl max-h-24 overflow-y-auto">
                        {r.rekomendasi || "Tidak ada rekomendasi tindakan khusus."}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Uploaded Documents List */}
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-3 bg-emerald-500 rounded-xs" />
                    Tautan Berkas & Dokumen Checklist ({relatedDocs.length})
                  </h4>
                  {relatedDocs.length === 0 ? (
                    <p className="text-xs text-slate-400 italic font-semibold">Belum ada tautan berkas drive yang diunggah.</p>
                  ) : (
                    <div className="space-y-2 max-h-36 overflow-y-auto">
                      {relatedDocs.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-150 bg-white shadow-3xs text-xs">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-sky-600 shrink-0" />
                            <div>
                              <span className="font-extrabold text-slate-800 block">{doc.jenis_dokumen}</span>
                              <span className={`inline-block px-1.5 py-0.2 rounded text-[8.5px] font-bold mt-0.5 ${
                                doc.status === "Terverifikasi" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                              }`}>
                                {doc.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {doc.link_file && (
                              <a 
                                href={doc.link_file}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-[10px] font-black text-sky-700 hover:text-sky-800 hover:underline px-2.5 py-1 bg-sky-50 rounded"
                              >
                                <span>Buka Link</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            {(userRole === "Administrator" || userRole === "Satwas") && onDeleteDoc && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (confirm(`Apakah Anda yakin ingin menghapus berkas ${doc.jenis_dokumen}?`)) {
                                    try {
                                      await onDeleteDoc(doc.id);
                                    } catch (err: any) {
                                      alert("Gagal menghapus berkas: " + err.message);
                                    }
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-650 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Hapus Berkas"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex gap-2">
                  {canEdit && (
                    <button
                      onClick={() => {
                        setSelectedRecordForModal(null);
                        onEditClick(r);
                      }}
                      className="px-3.5 py-2 bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-extrabold rounded-lg border border-sky-100 cursor-pointer transition flex items-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Ubah
                    </button>
                  )}
                  
                  {userRole !== "Kepala Stasiun" && (
                    <button
                      onClick={() => {
                        setSelectedRecordForModal(null);
                        onCreateTemuanClick(r);
                      }}
                      className="px-3.5 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-extrabold rounded-lg border border-amber-100 cursor-pointer transition flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Temuan
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setSelectedRecordForModal(null)}
                  className="px-4 py-2 bg-slate-250 hover:bg-slate-300 text-slate-800 text-xs font-extrabold rounded-lg cursor-pointer transition"
                >
                  Tutup
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};
