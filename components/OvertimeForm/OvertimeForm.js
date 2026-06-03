// components/OvertimeForm/OvertimeForm.js
// Form chấm công: Check-in / Check-out / Tăng ca khác

import { useState, useRef, useCallback } from "react";
import { CirclePlus, LogIn, LogOut, Clock, X, ChevronDown } from "lucide-react";
import useOvertimeParser from "../../hooks/useOvertimeParser/index";
import ShiftPreviewModal   from "./ShiftPreviewModal";
import OvertimePreviewModal from "./OvertimePreviewModal";
import ManualAttendanceAdjust from "./ManualAttendanceAdjust";
import OtherOvertimeForm    from "./OtherOvertimeForm";
import { LEAVE_CODES, LEAVE_MAP } from "../../hooks/useOvertimeParser/parseHelpers";
import { doc, writeBatch } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { getShiftOfMember } from "../../hooks/useOvertimeParser/shiftHelpers";
import dayjs from "dayjs";

const RAW_TRASH = [
  /^(\d{1,2}\/\d{1,2})?上下班打卡记录[:：]?$/i,
  /^上下班打卡[:：]?$/i, /^上下班$/i, /^打卡记录[:：]?$/i,
  /^考勤记录[:：]?$/i,   /^上班[:：]?$/i,   /^下班[:：]?$/i,
  /^日期[:：]?$/i,       /^时间[:：]?$/i,   /^考勤[:：]?$/i,
  /^(\d{1,2})月(\d{1,2})日[:：]?$/i,
  /^(\d{1,2}\/\d{1,2})[:：]?$/i,
];

// Mode tabs
const MODES = [
  { id: "checkin",  label: "Check-in",     short: "In",   color: "yellow" },
  { id: "checkout", label: "Check-out",    short: "Out",  color: "green"  },
  { id: "other",    label: "Tăng ca khác", short: "Khác", color: "purple" },
];

const modeColors = {
  checkin:  { border: "border-yellow-400", ring: "focus:ring-yellow-500", btn: "bg-yellow-600 hover:bg-yellow-700" },
  checkout: { border: "border-green-400",  ring: "focus:ring-green-500",  btn: "bg-green-600 hover:bg-green-700"  },
  other:    { border: "border-purple-400", ring: "focus:ring-purple-500", btn: "bg-purple-600 hover:bg-purple-700" },
};

export default function OvertimeForm({
  user,
  members = [],
  setMembers,
  setItems,
  selectedMonth,
  selectedYear,
  selectedDate,
  showToast = () => {},
}) {
  const [open, setOpen]         = useState(false);
  const [text, setText]         = useState("");
  const [mode, setMode]         = useState("checkin");
  const modalRef                = useRef();

  // Shift preview popup
  const [pendingShifts, setPendingShifts] = useState([]);
  const [shiftOpen, setShiftOpen]         = useState(false);
  const [loadingApprove, setLoadingApprove] = useState(false);
  const [editedTimes, setEditedTimes]     = useState({});

  // OT preview popup
  const [otPreview, setOtPreview]   = useState([]);
  const [otOpen, setOtOpen]         = useState(false);

  // Manual adjust popup
  const [manualItem, setManualItem]   = useState(null);
  const [manualOpen, setManualOpen]   = useState(false);

  const { parseText } = useOvertimeParser({
    user, members, setMembers, setItems, selectedMonth, selectedYear, selectedDate,
  });

  const resetForm = () => {
    setText("");
    setEditedTimes({});
    setOtPreview([]);
    setPendingShifts([]);
  };

  const closeModal = () => { setOpen(false); resetForm(); };

  // ─── Handle Parse ──────────────────────────────────────────
  const handleParse = async () => {
    if (!text.trim()) {
      showToast("error", "⚠️ Vui lòng nhập dữ liệu chấm công.");
      return;
    }

    let lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    lines = lines.filter((l) => !RAW_TRASH.some((p) => p.test(l)));

    const tmpOT   = [];
    const pending = [];

    for (const line of lines) {
      const parts = line.split("/");
      if (parts.length < 2) {
        showToast("error", `❌ Sai định dạng: ${line}`);
        return;
      }
      const namePart = parts[0].replace(/^\d+\.\s*/, "").trim();
      const timePart = parts[1].trim();

      const timeMatch = timePart.match(/\b\d{1,2}:\d{2}\b/);
      if (!timeMatch) {
        if (LEAVE_CODES.some((c) => timePart.includes(c))) continue;
        showToast("error", `❌ Sai giờ: ${timePart}`);
        return;
      }

      const timeString = timeMatch[0];
      let [hh, mm]     = timeString.split(":").map(Number);
      let minutesOfDay = hh * 60 + mm;

      // Find member
      const member = findMember(members, namePart);
      if (!member) {
        showToast("error", `❌ Không tìm thấy nhân viên: ${namePart}`);
        return;
      }

      const shiftRec = await getShiftOfMember(member.id, selectedDate);
      if (!shiftRec?.shift) {
        showToast("error", `❌ Chưa phân ca cho ${namePart} ngày ${dayjs(selectedDate).format("DD/MM/YYYY")}`);
        return;
      }
      if (mode === "checkout" && !shiftRec.lenCa) {
        showToast("error", `❌ ${namePart} chưa check-in.`);
        return;
      }

      const isNight = String(shiftRec.shift).toLowerCase().includes("đêm");
      const toMin   = (s) => { if (!s) return null; const [h,m] = s.split(":").map(Number); return h*60+m; };

      // ── CHECK-IN ──────────────────────────────────────────
      if (mode === "checkin") {
        const somStart = toMin(shiftRec.lenCaSomBatDau),  somEnd = toMin(shiftRec.lenCaSomKetThuc);
        const muonStart= toMin(shiftRec.lenCaMuonBatDau), muonEnd= toMin(shiftRec.lenCaMuonKetThuc);
        let chosenVariant = null;

        if (minutesOfDay >= somStart && minutesOfDay <= somEnd) {
          chosenVariant = "sớm"; minutesOfDay = somEnd;
        } else if (minutesOfDay >= muonStart && minutesOfDay <= muonEnd) {
          chosenVariant = "muộn"; minutesOfDay = muonEnd;
        } else {
          showToast("error", `${namePart} — ${timeString} không trong khung giờ lên ca.`);
          return;
        }

        const prefix            = isNight ? "lên_ca_đêm_" : "lên_ca_ngày_";
        const expectedShiftStart = prefix + (chosenVariant === "sớm" ? "sớm" : "muộn");
        if (shiftRec.shiftStart !== expectedShiftStart) {
          pending.push({ memberId: member.id, name: namePart, oldShiftStart: shiftRec.shiftStart, newShiftStart: expectedShiftStart });
        }
      }

      // ── CHECK-OUT ─────────────────────────────────────────
      if (mode === "checkout") {
        const somOutStart  = toMin(shiftRec.tanCaSomBatDau);
        const muonOutStart = toMin(shiftRec.tanCaMuonBatDau);
        let otStart = null, variant = null;

        if (somOutStart != null && minutesOfDay >= somOutStart)  { otStart = somOutStart;  variant = "sớm";  }
        if (muonOutStart != null && minutesOfDay >= muonOutStart &&
            (otStart == null || Math.abs(minutesOfDay - muonOutStart) < Math.abs(minutesOfDay - otStart)))
          { otStart = muonOutStart; variant = "muộn"; }

        if (otStart == null) {
          tmpOT.push({ memberId: member.id, name: namePart, nickname: member.nickname||"", checkout: timeString, checkoutMinutes: minutesOfDay, otMinutes: 0, shiftEnd: null, ca: null, error: "notYet" });
          continue;
        }
        const otMinutes = minutesOfDay - otStart;
        if (otMinutes < 1) {
          tmpOT.push({ memberId: member.id, name: namePart, nickname: member.nickname||"", checkout: timeString, checkoutMinutes: minutesOfDay, otMinutes: 0, shiftEnd: otStart, ca: variant, error: "noOT" });
          continue;
        }
        tmpOT.push({ memberId: member.id, name: namePart, nickname: member.nickname||"", checkout: timeString, checkoutMinutes: minutesOfDay, otMinutes, shiftEnd: otStart, ca: variant });
      }
    }

    // Open appropriate popup
    if (mode === "checkout" && tmpOT.length > 0) {
      setOtPreview(tmpOT); setOtOpen(true); return;
    }
    if (pending.length > 0) {
      const dedup = Object.values(pending.reduce((acc, p) => { acc[p.memberId] = p; return acc; }, {}));
      setPendingShifts(dedup); setShiftOpen(true); setEditedTimes({}); return;
    }

    try {
      await parseText(text, mode, editedTimes);
      resetForm();
      showToast("success", "✔ Xử lý chấm công thành công!");
      setOpen(false);
    } catch {
      showToast("error", "❌ Lỗi xử lý chấm công!");
    }
  };

  const handleSkipUpdates = async () => {
    setShiftOpen(false);
    try {
      await parseText(text, mode, editedTimes);
      resetForm(); showToast("success", "✅ Xử lý xong (không cập nhật ca)."); setOpen(false);
    } catch { showToast("error", "❌ Lỗi!"); }
  };

  const handleApproveUpdates = async () => {
    if (!pendingShifts.length) { setShiftOpen(false); return; }
    setLoadingApprove(true);
    const batch = writeBatch(db);
    for (const u of pendingShifts) {
      const dateStr = dayjs(selectedDate).format("YYYY-MM-DD");
      const ref = doc(db, "shiftSchedules", `${dateStr}__${u.memberId}`);
      batch.set(ref, { shiftStart: u.newShiftStart }, { merge: true });
    }
    try { await batch.commit(); } catch { showToast("error", "❌ Lỗi commit ca."); }
    setShiftOpen(false);
    try {
      await parseText(text, mode, editedTimes);
      resetForm(); showToast("success", "✅ Cập nhật ca & xử lý xong!"); setOpen(false);
    } catch { showToast("error", "❌ Lỗi!"); }
    finally { setLoadingApprove(false); }
  };

  const handleConfirmOT = async (skipList) => {
    try {
      await parseText(text, mode, editedTimes, skipList);
      showToast("success", "✅ Đã lưu tăng ca!");
      setOtOpen(false); resetForm(); setOpen(false);
    } catch { showToast("error", "❌ Lỗi lưu tăng ca!"); }
  };

  const col = modeColors[mode];

  // ── RENDER ──────────────────────────────────────────────────
  return (
    <>
      {/* Trigger button */}
      <div className="flex justify-end">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-95 text-white px-5 py-2.5 rounded-xl shadow-md transition select-none"
        >
          <CirclePlus className="w-5 h-5" />
          <span>Thêm tăng ca</span>
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="absolute inset-0 glass-overlay" />
          <div
            ref={modalRef}
            className="relative w-full sm:w-11/12 sm:max-w-xl bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-10 animate-fadeSlideUp"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                📅 Ngày:{" "}
                <span className="font-semibold text-orange-500">
                  {selectedDate ? dayjs(selectedDate).format("DD/MM/YYYY") : "Chưa chọn"}
                </span>
              </div>
              <h3 className="text-base font-semibold text-orange-600 dark:text-orange-400">Chấm công</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Mode tabs */}
              <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`flex-1 py-2 text-sm font-medium transition
                      ${mode === m.id
                        ? m.id === "checkin"  ? "bg-yellow-500 text-white"
                        : m.id === "checkout" ? "bg-green-600 text-white"
                        : "bg-purple-600 text-white"
                        : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                  >
                    <span className="sm:hidden">{m.short}</span>
                    <span className="hidden sm:inline">{m.label}</span>
                  </button>
                ))}
              </div>

              {/* Other OT form */}
              {mode === "other" ? (
                <OtherOvertimeForm
                  user={user}
                  members={members}
                  selectedDate={selectedDate}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  showToast={showToast}
                  onDone={() => { resetForm(); setOpen(false); }}
                />
              ) : (
                <>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                      Dán dữ liệu ({mode === "checkin" ? "Lên ca" : "Xuống ca"}) — VD: 1.陈明壯/07:54
                    </label>
                    <textarea
                      rows={5}
                      className={`w-full border-2 rounded-xl p-3 text-sm outline-none transition resize-none bg-white dark:bg-gray-800 dark:text-gray-100 ${col.border} ${col.ring} focus:ring-2`}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={mode === "checkin"
                        ? "1.陈明壯/18:52\n2.Nguyen Van A/07:30"
                        : "1.陈明壯/06:01\n2.Nguyen Van A/17:45"}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={closeModal}
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleParse}
                      className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium shadow transition ${col.btn}`}
                    >
                      {mode === "checkin" ? "Xử lý Check-in" : "Xử lý Check-out"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shift preview */}
      <ShiftPreviewModal
        visible={shiftOpen}
        pending={pendingShifts}
        onClose={() => setShiftOpen(false)}
        onApprove={handleApproveUpdates}
        onSkip={handleSkipUpdates}
        loading={loadingApprove}
      />

      {/* OT preview */}
      <OvertimePreviewModal
        visible={otOpen}
        items={otPreview}
        onClose={() => setOtOpen(false)}
        onConfirm={handleConfirmOT}
        onManualAdjust={(item) => { setManualItem(item); setManualOpen(true); }}
      />

      {/* Manual adjust */}
      <ManualAttendanceAdjust
        visible={manualOpen}
        item={manualItem}
        leaveMap={LEAVE_MAP}
        onClose={() => { setManualOpen(false); setManualItem(null); }}
        onSave={(data) => {
          setOtPreview((prev) =>
            prev.map((it) => it.memberId === data.memberId
              ? { ...it, error: "fixed", leaveType: data.leaveType, leaveLabel: LEAVE_MAP[data.leaveType]||null, session: data.session, otMinutes: data.withOT ? data.otHours * 60 : 0 }
              : it)
          );
          setEditedTimes((prev) => ({ ...prev, [data.memberId]: data }));
          setManualOpen(false);
        }}
      />
    </>
  );
}

// ── Find member helper ─────────────────────────────────────────
function findMember(members, name) {
  const exact   = members.filter((m) => (m.realName||"").trim() === name || (m.nickname||"").trim() === name);
  if (exact.length === 1)   return exact[0];
  const starts  = members.filter((m) => (m.realName||"").trim().startsWith(name) || (m.nickname||"").trim().startsWith(name));
  if (starts.length === 1)  return starts[0];
  const includes = members.filter((m) => (m.realName||"").trim().includes(name) || (m.nickname||"").trim().includes(name));
  if (includes.length === 1) return includes[0];
  return null;
}
