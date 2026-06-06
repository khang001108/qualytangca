// components/ExportExcel.jsx
// Xuất báo cáo tăng ca ra file Excel (client-side, dùng SheetJS qua CDN)
import { useState } from "react";
import { FileSpreadsheet, Download, Loader2 } from "lucide-react";
import dayjs from "dayjs";

// Tải SheetJS động khi cần (không cần cài npm)
async function loadXLSX() {
  if (window.XLSX) return window.XLSX;
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => resolve(window.XLSX);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function ExportExcel({
  members = [],
  overtimes = [],
  shiftSchedules = {},
  selectedMonth,
  selectedYear,
}) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const XLSX = await loadXLSX();

      // ── 1. Tính dữ liệu từng nhân viên theo tháng ──
      const daysInMonth = dayjs(`${selectedYear}-${String(selectedMonth).padStart(2,"0")}-01`).daysInMonth();

      const memberData = members.map((m) => {
        let tongGioThuc = 0;  // tangCaHomNay tổng tháng
        let tongGioNhay = 0;  // thuong tổng tháng

        // Chi tiết từng ngày cho sheet 2
        const dailyRows = [];

        for (let d = 1; d <= daysInMonth; d++) {
          const dateKey = dayjs(`${selectedYear}-${String(selectedMonth).padStart(2,"0")}-${String(d).padStart(2,"0")}`).format("YYYY-MM-DD");
          const dateLabel = dayjs(dateKey).format("DD/MM/YYYY");

          // Tìm trong overtimes trước
          const ot = overtimes.find((o) => {
            const dk = o.date?.slice(0,10) || (typeof o.currentDate === "string" ? o.currentDate.slice(0,10) : null);
            if (!dk || dk !== dateKey) return false;
            return String(o.memberId) === String(m.id) || o.realName === m.realName;
          });

          let gioThuc = 0, gioNhay = 0, checkIn = "", checkOut = "", note = "", shift = "";

          if (ot) {
            gioThuc = Number(ot.tangCaHomNay || ot.addedHours || 0);
            gioNhay = Number(ot.thuong || ot.bonusGiven || 0);
            checkIn = ot.lenCa || ot.checkIn || "";
            checkOut = ot.xuongCa || ot.checkOut || "";
            note = ot.note || "";
            shift = ot.shift || "";
          } else if (shiftSchedules[dateKey]) {
            const rec = shiftSchedules[dateKey][m.realName] ||
              Object.values(shiftSchedules[dateKey]).find(s => String(s.memberId) === String(m.id) || s.realName === m.realName);
            if (rec) {
              gioThuc = Number(rec.tangCaHomNay || 0);
              gioNhay = Number(rec.thuong || 0);
              checkIn = rec.lenCa || "";
              checkOut = rec.xuongCa || "";
              note = rec.note || "";
              shift = rec.shift || "";
            }
          }

          tongGioThuc += gioThuc;
          tongGioNhay += gioNhay;

          if (gioThuc > 0 || gioNhay > 0 || checkIn || note) {
            dailyRows.push({
              date: dateKey,
              dateLabel,
              shift,
              checkIn,
              checkOut,
              gioThuc,
              gioNhay,
              note,
            });
          }
        }

        const limit = Number(m.overtimeLimit?.monthlyLimit || 0);
        const worked = Number(m.overtimeLimit?.workedHours || tongGioThuc);
        const conLai = Math.max(limit - worked, 0);

        return {
          id: m.id,
          realName: m.realName,
          nickname: m.nickname || "",
          shift: m.shift || "",
          limit,
          daTangCa: worked,
          conLai,
          tongGioThuc,
          tongGioNhay,
          tongOT: tongGioThuc + tongGioNhay,
          dailyRows,
        };
      });

      // ── 2. Tạo workbook ──
      const wb = XLSX.utils.book_new();

      // ════════════════════════════════════════════════
      // SHEET 1: Tổng hợp tháng
      // ════════════════════════════════════════════════
      const title = `BÁO CÁO TĂNG CA — THÁNG ${selectedMonth}/${selectedYear}`;

      const summaryRows = [
        [title],
        [`Xuất lúc: ${dayjs().format("HH:mm DD/MM/YYYY")}`],
        [],
        [
          "STT", "Tên chính", "Tên phụ", "Ca",
          "Giới hạn (h)", "Đã tăng ca (h)", "Còn tăng ca (h)",
          "Giờ thực (h)", "Giờ nhảy (h)", "Tổng OT (h)",
        ],
        ...memberData.map((m, i) => [
          i + 1, m.realName, m.nickname, m.shift,
          m.limit, m.daTangCa, m.conLai,
          m.tongGioThuc, m.tongGioNhay, m.tongOT,
        ]),
        [],
        [
          "", "TỔNG", "", "",
          memberData.reduce((s,m)=>s+m.limit,0),
          memberData.reduce((s,m)=>s+m.daTangCa,0),
          memberData.reduce((s,m)=>s+m.conLai,0),
          memberData.reduce((s,m)=>s+m.tongGioThuc,0),
          memberData.reduce((s,m)=>s+m.tongGioNhay,0),
          memberData.reduce((s,m)=>s+m.tongOT,0),
        ],
      ];

      const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);

      // Style cột
      ws1["!cols"] = [
        { wch: 5 }, { wch: 18 }, { wch: 18 }, { wch: 10 },
        { wch: 12 }, { wch: 14 }, { wch: 14 },
        { wch: 12 }, { wch: 12 }, { wch: 12 },
      ];

      // Merge tiêu đề
      ws1["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
      ];

      XLSX.utils.book_append_sheet(wb, ws1, "Tổng hợp");

      // ════════════════════════════════════════════════
      // SHEET 2: Chi tiết theo ngày (từng NV)
      // ════════════════════════════════════════════════
      const detailRows = [
        [`CHI TIẾT CHẤM CÔNG — THÁNG ${selectedMonth}/${selectedYear}`],
        [],
        [
          "Nhân viên", "Tên phụ", "Ngày", "Ca làm",
          "Giờ vào", "Giờ ra", "Giờ thực (h)", "Giờ nhảy (h)", "Ghi chú",
        ],
      ];

      memberData.forEach((m) => {
        if (m.dailyRows.length === 0) {
          detailRows.push([m.realName, m.nickname, "(không có dữ liệu)", "", "", "", 0, 0, ""]);
        } else {
          m.dailyRows.forEach((r, i) => {
            detailRows.push([
              i === 0 ? m.realName : "",
              i === 0 ? m.nickname : "",
              r.dateLabel, r.shift,
              r.checkIn, r.checkOut,
              r.gioThuc, r.gioNhay, r.note,
            ]);
          });
          // Sub-total dòng NV
          detailRows.push([
            "", `↳ Tổng ${m.realName}`, "", "",
            "", "",
            m.tongGioThuc, m.tongGioNhay, "",
          ]);
        }
        detailRows.push([]); // dòng trắng giữa các NV
      });

      const ws2 = XLSX.utils.aoa_to_sheet(detailRows);
      ws2["!cols"] = [
        { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 10 },
        { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
      ];
      ws2["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];
      XLSX.utils.book_append_sheet(wb, ws2, "Chi tiết");

      // ════════════════════════════════════════════════
      // SHEET 3: Bảng % sử dụng giờ
      // ════════════════════════════════════════════════
      const pctRows = [
        [`% SỬ DỤNG GIỜ TĂNG CA — THÁNG ${selectedMonth}/${selectedYear}`],
        [],
        ["Nhân viên", "Giới hạn (h)", "Đã dùng (h)", "Còn lại (h)", "% Đã dùng", "Trạng thái"],
        ...memberData.map(m => {
          const pct = m.limit > 0 ? (m.daTangCa / m.limit * 100).toFixed(1) : 0;
          const status = pct >= 100 ? "⛔ Đã đầy" : pct >= 80 ? "⚠️ Gần đầy" : "✅ Còn dư";
          return [m.realName, m.limit, m.daTangCa, m.conLai, `${pct}%`, status];
        }),
      ];

      const ws3 = XLSX.utils.aoa_to_sheet(pctRows);
      ws3["!cols"] = [{ wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
      ws3["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
      XLSX.utils.book_append_sheet(wb, ws3, "% Sử dụng");

      // ── 3. Xuất file ──
      const fileName = `TangCa_T${selectedMonth}_${selectedYear}_${dayjs().format("HHmm")}.xlsx`;
      XLSX.writeFile(wb, fileName);

    } catch (err) {
      console.error("Export error:", err);
      alert("Xuất Excel thất bại: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white px-3 py-1.5 rounded-xl text-sm font-medium shadow-sm transition whitespace-nowrap"
      title="Xuất báo cáo tăng ca ra Excel"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileSpreadsheet className="w-4 h-4" />
      )}
      {loading ? "Đang xuất..." : "Xuất Excel"}
    </button>
  );
}
