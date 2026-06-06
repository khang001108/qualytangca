import { useState, useRef } from "react";
import { CirclePlus, LogIn, LogOut } from "lucide-react";
import Toast from "../Toast";
import useOvertimeParser from "../../hooks/useOvertimeParser/index";
import ShiftPreviewModal from "./ShiftPreviewModal";
import OvertimePreviewModal from "./OvertimePreviewModal";
import {
  LEAVE_CODES,
  LEAVE_MAP,
} from "../../hooks/useOvertimeParser/parseHelpers";
import { doc, writeBatch } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { getShiftOfMember } from "../../hooks/useOvertimeParser/shiftHelpers";
import ManualAttendanceAdjust from "./ManualAttendanceAdjust";

const sessionToText = (s) => {
  if (s === "morning") return "sáng";
  if (s === "afternoon") return "chiều";
  if (s === "full") return "cả ngày";
  return "";
};

export default function OvertimeForm({
  user,
  members = [],
  setMembers,
  setItems,
  selectedMonth,
  selectedYear,
  selectedDate,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [mode, setMode] = useState("checkin");
  const modalRef = useRef();
  const [toasts, setToasts] = useState([]);
  const [pendingShiftUpdates, setPendingShiftUpdates] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loadingApprove, setLoadingApprove] = useState(false);
  const [otPreview, setOtPreview] = useState([]);
  const [otPreviewOpen, setOtPreviewOpen] = useState(false);
  // popup xử lý thủ công
  const [manualItem, setManualItem] = useState(null);
  const [manualPopupOpen, setManualPopupOpen] = useState(false);
  const [editedTimes, setEditedTimes] = useState({});

  const showToast = (type, message) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, type, message }]);
  };

  const removeToast = (id) => {
    setToasts((p) => p.filter((t) => t.id !== id));
  };

  const { parseText } = useOvertimeParser({
    user,
    members,
    setMembers,
    setItems,
    selectedMonth,
    selectedYear,
    selectedDate,
  });

  const handleConfirmOT = async (editedTimes) => {
    try {
      await parseText(textInput, mode, editedTimes);
      showToast("success", "Đã xử lý tăng ca!");
      setOtPreviewOpen(false);
      setFormOpen(false);
      setTextInput("");
      setEditedTimes({});
    } catch (e) {
      showToast("error", "Lỗi khi xử lý tăng ca!");
    }
  };

  const handleParse = async () => {
    if (!textInput.trim()) {
      showToast("error", "⚠️ Vui lòng nhập dữ liệu chấm công trước.");
      return;
    }

    let tmpOT = []; // thay otPreview.length = 0
    let pending = []; // pending ca

    let lines = textInput
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const RAW_TRASH_PATTERNS = [
      /^(\d{1,2}\/\d{1,2})?上下班打卡记录[:：]?$/i,
      /^上下班打卡[:：]?$/i,
      /^上下班$/i,
      /^打卡记录[:：]?$/i,
      /^考勤记录[:：]?$/i,
      /^上班[:：]?$/i,
      /^下班[:：]?$/i,
      /^日期[:：]?$/i,
      /^时间[:：]?$/i,
      /^考勤[:：]?$/i,
      /^(\d{1,2})月(\d{1,2})日[:：]?$/i,
      /^(\d{1,2}\/\d{1,2})[:：]?$/i,
    ];

    lines = lines.filter((l) => !RAW_TRASH_PATTERNS.some((p) => p.test(l)));

    for (let line of lines) {
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
      let [hh, mm] = timeString.split(":").map(Number);
      let minutesOfDay = hh * 60 + mm;

      // tìm nhân viên
      const exact = members.filter(
        (m) =>
          (m.realName || "").trim() === namePart ||
          (m.nickname || "").trim() === namePart
      );

      let member = null;
      if (exact.length === 1) member = exact[0];
      else {
        const start = members.filter(
          (m) =>
            (m.realName || "").trim().startsWith(namePart) ||
            (m.nickname || "").trim().startsWith(namePart)
        );
        if (start.length === 1) member = start[0];
        else {
          const include = members.filter(
            (m) =>
              (m.realName || "").trim().includes(namePart) ||
              (m.nickname || "").trim().includes(namePart)
          );
          if (include.length === 1) member = include[0];
          else {
            showToast("error", `❌ Không tìm thấy nhân viên: ${namePart}`);
            return;
          }
        }
      }

      const shiftRec = await getShiftOfMember(member.id, selectedDate);
      if (!shiftRec || !shiftRec.shift) {
        showToast(
          "error",
          `❌ Ngày ${selectedDate} chưa phân ca cho ${namePart}`
        );
        return;
      }

      if (mode === "checkout" && !shiftRec.lenCa) {
        showToast("error", `❌ ${namePart} chưa có check-in.`);
        return;
      }

      const label = shiftRec.shift;
      const isNight = String(label).toLowerCase().includes("đêm");

      const toMin = (s) => {
        if (!s) return null;
        let [h, m] = s.split(":").map(Number);
        return h * 60 + m;
      };

      const somInStart = toMin(shiftRec.lenCaSomBatDau);
      const somInEnd = toMin(shiftRec.lenCaSomKetThuc);
      const muonInStart = toMin(shiftRec.lenCaMuonBatDau);
      const muonInEnd = toMin(shiftRec.lenCaMuonKetThuc);

      const somOutStart = toMin(shiftRec.tanCaSomBatDau);
      const muonOutStart = toMin(shiftRec.tanCaMuonBatDau);

      let chosenVariant = null;

      // ============================ CHECK IN =============================
      if (mode === "checkin") {
        if (minutesOfDay >= somInStart && minutesOfDay <= somInEnd) {
          chosenVariant = "sớm";
          minutesOfDay = somInEnd;
        } else if (minutesOfDay >= muonInStart && minutesOfDay <= muonInEnd) {
          chosenVariant = "muộn";
          minutesOfDay = muonInEnd;
        } else {
          showToast(
            "error",
            `${namePart} — ${timeString} không nằm trong khung giờ lên ca.`
          );
          return;
        }
      }

      // ============================ CHECK OUT – CA NGÀY =============================
      if (mode === "checkout" && !isNight) {
        const checkoutMin = minutesOfDay;
        let otStart = null;
        let variant = null;

        if (somOutStart != null && checkoutMin >= somOutStart) {
          otStart = somOutStart;
          variant = "sớm";
        }
        if (
          muonOutStart != null &&
          checkoutMin >= muonOutStart &&
          (otStart == null ||
            Math.abs(checkoutMin - muonOutStart) <
              Math.abs(checkoutMin - otStart))
        ) {
          otStart = muonOutStart;
          variant = "muộn";
        }

        // if (otStart == null) {
        //   showToast("error", `${namePart} — chưa tới giờ tăng ca.`);
        //   return;
        // }

        // if (otMinutes < 1) {
        //   showToast("error", `${namePart} — không có tăng ca.`);
        //   return;
        // }

        const otMinutes = checkoutMin - otStart;
        if (otStart == null) {
          // không có tăng ca nhưng vẫn được đưa vào preview
          tmpOT.push({
            memberId: member.id,
            name: namePart,
            nickname: member.nickname || "",
            checkout: timeString,
            checkoutMinutes: minutesOfDay,
            otMinutes: 0,
            shiftEnd: null,
            ca: null,
            error: "notYet",
          });
          continue;
        }

        if (otMinutes < 1) {
          tmpOT.push({
            memberId: member.id,
            name: namePart,
            nickname: member.nickname || "",
            checkout: timeString,
            checkoutMinutes: minutesOfDay,
            otMinutes: 0,
            shiftEnd: otStart,
            ca: variant,
            error: "noOT",
          });
          continue;
        }

        tmpOT.push({
          memberId: member.id,
          name: namePart,
          nickname: member.nickname || "",
          checkout: timeString,
          checkoutMinutes: minutesOfDay,
          otMinutes,
          shiftEnd: otStart,
          ca: variant,
        });
      }

      // ============================ CHECK OUT – CA ĐÊM =============================
      if (mode === "checkout" && isNight) {
        const checkoutMin = minutesOfDay;

        const nightSomStart = toMin(shiftRec.tanCaSomBatDau);
        const nightMuonStart = toMin(shiftRec.tanCaMuonBatDau);

        let otStart = null;
        let variant = null;

        if (checkoutMin >= nightSomStart) {
          otStart = nightSomStart;
          variant = "sớm";
        }

        if (
          checkoutMin >= nightMuonStart &&
          (otStart == null ||
            Math.abs(checkoutMin - nightMuonStart) <
              Math.abs(checkoutMin - otStart))
        ) {
          otStart = nightMuonStart;
          variant = "muộn";
        }

        // if (otStart == null) {
        //   showToast("error", `${namePart} — chưa tới giờ tăng ca.`);
        //   return;
        // }

        // if (otMinutes < 1) {
        //   showToast("error", `${namePart} — không có tăng ca.`);
        //   return;
        // }

        const otMinutes = checkoutMin - otStart;
        if (otStart == null) {
          // không có tăng ca nhưng vẫn được đưa vào preview
          tmpOT.push({
            memberId: member.id,
            name: namePart,
            nickname: member.nickname || "",
            checkout: timeString,
            checkoutMinutes: minutesOfDay,
            otMinutes: 0,
            shiftEnd: null,
            ca: null,
            error: "notYet",
          });
          continue;
        }

        if (otMinutes < 1) {
          tmpOT.push({
            memberId: member.id,
            name: namePart,
            nickname: member.nickname || "",
            checkout: timeString,
            checkoutMinutes: minutesOfDay,
            otMinutes: 0,
            shiftEnd: otStart,
            ca: variant,
            error: "noOT",
          });
          continue;
        }

        tmpOT.push({
          memberId: member.id,
          name: namePart,
          nickname: member.nickname || "",
          checkout: timeString,
          checkoutMinutes: minutesOfDay,
          otMinutes,
          shiftEnd: otStart,
          ca: variant,
        });
      }

      // ============================ GỢI Ý PHÂN CA =============================
      const prefix = isNight ? "lên_ca_đêm_" : "lên_ca_ngày_";
      const expectedShiftStart =
        prefix + (chosenVariant === "sớm" ? "sớm" : "muộn");

      if (mode === "checkin" && shiftRec.shiftStart !== expectedShiftStart) {
        pending.push({
          memberId: member.id,
          name: namePart,
          oldShiftStart: shiftRec.shiftStart,
          newShiftStart: expectedShiftStart,
        });
      }
    }

    // ============================ MỞ POPUP OT =============================
    if (mode === "checkout" && tmpOT.length > 0) {
      setOtPreview(tmpOT);
      setOtPreviewOpen(true);
      return;
    }

    // ============================ MỞ POPUP UPDATE CA =============================
    if (pending.length > 0) {
      const dedup = Object.values(
        pending.reduce((acc, p) => {
          acc[p.memberId] = p;
          return acc;
        }, {})
      );

      setPendingShiftUpdates(dedup);
      setPreviewOpen(true);
      setEditedTimes({});
      return;
    }

    try {
      await parseText(textInput, mode, editedTimes);
      setEditedTimes({});
      showToast("success", "✔ Xử lý chấm công thành công!");
      setTextInput("");
      setFormOpen(false);
    } catch (e) {
      showToast("error", "❌ Lỗi xử lý chấm công!");
    }
  };
  const handleSkipUpdates = async () => {
    setPreviewOpen(false);
    try {
      await parseText(textInput, mode, editedTimes);
      setEditedTimes({});
      showToast("success", "✅ Đã xử lý chấm công (không cập nhật phân ca).");
      setTextInput("");
      setFormOpen(false);
      setPendingShiftUpdates([]);
      setEditedTimes({});
    } catch (err) {
      showToast("error", "❌ Lỗi khi xử lý chấm công!");
    }
  };

  const handleApproveUpdates = async () => {
    if (!pendingShiftUpdates.length) {
      setPreviewOpen(false);
      return;
    }

    setLoadingApprove(true);
    const batch = writeBatch(db);

    for (let u of pendingShiftUpdates) {
      const dateStr = new Date(selectedDate).toISOString().slice(0, 10);
      const docId = `${dateStr}__${u.memberId}`;
      const ref = doc(db, "shiftSchedules", docId);
      batch.set(ref, { shiftStart: u.newShiftStart }, { merge: true });
    }

    try {
      await batch.commit();
    } catch (e) {
      showToast("error", "❌ Lỗi commit phân ca.");
    }

    setPreviewOpen(false);

    try {
      await parseText(textInput, mode, editedTimes);
      setEditedTimes({});
      showToast("success", "✅ Đã cập nhật phân ca & xử lý chấm công!");
      setTextInput("");
      setFormOpen(false);
      setPendingShiftUpdates([]);
      setEditedTimes({});
    } catch (e) {
      showToast("error", "❌ Lỗi final parse!");
    } finally {
      setLoadingApprove(false);
    }
  };

  // ============================ JSX RENDER =============================
  return (
    <>
      <Toast toasts={toasts} onClose={removeToast} />

      {/* ── Card nhập liệu ── */}
      <div className="card animate-fade-in-up space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white text-base">✏️ Nhập liệu tăng ca</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Ngày:{" "}
              <span className="font-semibold text-orange-500">
                {selectedDate
                  ? new Date(selectedDate).toLocaleDateString("vi-VN")
                  : "Chưa chọn"}
              </span>
            </p>
          </div>
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition text-sm font-medium"
          >
            <CirclePlus className="w-4 h-4" /> Thêm tăng ca
          </button>
        </div>

        {/* Gợi ý nhanh */}
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 border border-orange-100 dark:border-orange-800/50">
          <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2">💡 Cú pháp nhập nhanh</p>
          <div className="space-y-1.5 text-[11px] text-gray-600 dark:text-gray-300">
            <div className="flex gap-2">
              <span className="font-mono bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded text-orange-600 dark:text-orange-400 shrink-0">In 7:30</span>
              <span>→ Check-in lúc 7:30</span>
            </div>
            <div className="flex gap-2">
              <span className="font-mono bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded text-orange-600 dark:text-orange-400 shrink-0">Out 20:00</span>
              <span>→ Check-out lúc 20:00</span>
            </div>
            <div className="flex gap-2">
              <span className="font-mono bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded text-orange-600 dark:text-orange-400 shrink-0">NV1 In 8:00</span>
              <span>→ Nhập theo tên nhân viên</span>
            </div>
          </div>
        </div>

        {/* Danh sách thành viên hôm nay */}
        {members.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              👥 Nhân viên ({members.length})
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/60 rounded-lg px-2.5 py-1.5 border border-gray-100 dark:border-gray-700/50"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-[10px] shrink-0">
                    {(m.nickname || m.realName)?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                    {m.nickname || m.realName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onMouseDown={(e) =>
            modalRef.current &&
            !modalRef.current.contains(e.target) &&
            setFormOpen(false)
          }
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <div
            ref={modalRef}
            className="relative bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 w-[calc(100vw-1rem)] sm:w-11/12 max-w-xl p-4 sm:p-6 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-10 transition-colors max-h-[90vh] overflow-y-auto"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <div className="text-center mb-4 text-sm text-gray-600 dark:text-gray-400">
                Ngày chấm công:
                <span className="font-semibold text-orange-600 dark:text-orange-400 ml-1">
                  {selectedDate
                    ? new Date(selectedDate).toLocaleDateString("vi-VN")
                    : "Chưa chọn"}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                Thêm tăng ca
              </h3>

              <button
                onClick={() => setFormOpen(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
              >
                ✕
              </button>
            </div>

            {/* SWITCH MODE */}
            <div className="flex justify-center mb-5">
              <div
                className="relative flex items-center w-44 h-10 bg-gray-200 dark:bg-gray-800 rounded-full cursor-pointer transition"
                onClick={() =>
                  setMode((prev) =>
                    prev === "checkin" ? "checkout" : "checkin"
                  )
                }
              >
                <div
                  className={`absolute top-0 left-0 h-10 w-1/2 rounded-full bg-gradient-to-r ${
                    mode === "checkin"
                      ? "from-yellow-500 to-yellow-600"
                      : "from-green-500 to-green-600"
                  } shadow-md transform transition-all duration-300 ${
                    mode === "checkout" ? "translate-x-full" : "translate-x-0"
                  }`}
                />

                <div className="flex justify-between items-center w-full px-4 z-10 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <div
                    className={`flex items-center gap-1 ${
                      mode === "checkin" ? "text-white" : ""
                    }`}
                  >
                    <LogIn className="w-4 h-4" /> In
                  </div>

                  <div
                    className={`flex items-center gap-1 ${
                      mode === "checkout" ? "text-white" : ""
                    }`}
                  >
                    <LogOut className="w-4 h-4" /> Out
                  </div>
                </div>
              </div>
            </div>

            <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
              Dán dữ liệu chấm công (
              {mode === "checkin" ? "Lên ca" : "Xuống ca"})
            </label>

            <textarea
              rows={6}
              className={`
                w-full max-w-full border rounded-xl mb-4 p-3 outline-none transition resize-none
                bg-white dark:bg-gray-800
                text-gray-800 dark:text-gray-200
                ${
                  mode === "checkin"
                    ? "border-orange-400 focus:ring-2 focus:ring-orange-500"
                    : "border-green-400 focus:ring-2 focus:ring-green-500"
                }
              `}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={
                mode === "checkin"
                  ? "Dán dữ liệu chấm công (Check-in, ví dụ: 1.陈明壯/18:52)"
                  : "Dán dữ liệu chấm công (Check-out, ví dụ: 1.陈明壯/06:01)"
              }
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setFormOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 transition"
              >
                Quay lại
              </button>

              <button
                onClick={handleParse}
                className={`px-5 py-2 rounded-lg text-white shadow-md transition ${
                  mode === "checkin"
                    ? "bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-800"
                    : "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                }`}
              >
                {mode === "checkin" ? "Xử lý Check-in" : "Xử lý Check-out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP đổi ca */}
      <ShiftPreviewModal
        visible={previewOpen}
        pending={pendingShiftUpdates}
        onClose={() => setPreviewOpen(false)}
        onApprove={handleApproveUpdates}
        onSkip={handleSkipUpdates}
        loading={loadingApprove}
      />

      {/* POPUP xem trước OT */}
      <OvertimePreviewModal
        visible={otPreviewOpen}
        items={otPreview}
        onClose={() => setOtPreviewOpen(false)}
        onConfirm={() => handleConfirmOT(editedTimes)}
        onManualAdjust={(item) => {
          // bật popup xử lý thủ công
          setManualItem(item);
          setManualPopupOpen(true);
        }}
      />

      {/* POPUP xử lý thủ công */}
      <ManualAttendanceAdjust
        visible={manualPopupOpen}
        item={manualItem}
        leaveMap={LEAVE_MAP}
        onClose={() => {
          setManualPopupOpen(false);
          setManualItem(null); // <--- FIX
        }}
        onSave={(data) => {
          // 1. update preview UI
          setOtPreview((prev) =>
            prev.map((it) =>
              it.memberId === data.memberId
                ? {
                    ...it,
                    error: "fixed",
                    leaveType: data.leaveType,
                    leaveLabel: LEAVE_MAP[data.leaveType] || null,
                    session: data.session,
                    otMinutes: data.withOT ? data.otHours * 60 : 0,
                  }
                : it
            )
          );

          // 2. QUAN TRỌNG: lưu chỉnh sửa vào editedTimes
          setEditedTimes((prev) => ({
            ...prev,
            [data.memberId]: data,
          }));

          setManualPopupOpen(false);
        }}
      />
    </>
  );
}
