import { useState, useRef } from "react";
import { CirclePlus, LogIn, LogOut } from "lucide-react";
import Toast from "../Toast";
import useOvertimeParser from "../../hooks/useOvertimeParser/index";
import ShiftPreviewModal from "./ShiftPreviewModal";
import OvertimePreviewModal from "./OvertimePreviewModal";
import { LEAVE_CODES } from "../../hooks/useOvertimeParser/parseHelpers";
import { doc, writeBatch } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { getShiftOfMember } from "../../hooks/useOvertimeParser/shiftHelpers";

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

  const showToast = (type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
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
    } catch (e) {
      showToast("error", "Lỗi khi xử lý tăng ca!");
    }
  };

  const handleParse = async () => {
    if (!textInput.trim()) {
      showToast("error", "⚠️ Vui lòng nhập dữ liệu chấm công trước.");
      return;
    }

    otPreview.length = 0; // reset mảng xem trước OT
    let lines = textInput
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const pending = [];
    // ----- LỌC RÁC / BỎ DÒNG HEADER -----
    const RAW_TRASH_PATTERNS = [
      /^(\d{1,2}\/\d{1,2})?上下班打卡记录[:：]?$/i, // 11/04上下班打卡记录:
      /^上下班打卡[:：]?$/i,
      /^上下班$/i,
      /^打卡记录[:：]?$/i,
      /^考勤记录[:：]?$/i,
      /^上班[:：]?$/i,
      /^下班[:：]?$/i,
      /^日期[:：]?$/i,
      /^时间[:：]?$/i,
      /^考勤[:：]?$/i,
      /^(\d{1,2})月(\d{1,2})日[:：]?$/i, // 11月04日
      /^(\d{1,2}\/\d{1,2})[:：]?$/i, // 11/04
    ];
    // xóa các dòng khớp mẫu rác
    lines = lines.filter((l) => {
      return !RAW_TRASH_PATTERNS.some((p) => p.test(l));
    });

    // ---- XỬ LÝ TỪNG DÒNG ----
    for (let line of lines) {
      const parts = line.split("/");
      if (parts.length < 2) {
        showToast("error", `❌ Sai định dạng: ${line}`);
        return;
      }

      const namePart = parts[0].replace(/^\d+\.\s*/, "").trim();
      const timePart = parts[1].trim();

      let extractedTime = null;
      const timeMatch = timePart.match(/\b\d{1,2}:\d{2}\b/);

      if (timeMatch) {
        extractedTime = timeMatch[0];
      } else {
        if (LEAVE_CODES.some((code) => timePart.includes(code))) continue;
        showToast("error", `❌ Sai giờ: ${timePart} (dòng: ${line})`);
        return;
      }

      const timeString = extractedTime;

      const [hh, mm] = timeString.split(":").map(Number);
      let minutesOfDay = hh * 60 + mm;

      // ---- TÌM NHÂN VIÊN ----
      const candidates = members.filter((m) => {
        return (
          (m.realName || "").trim() === namePart ||
          (m.nickname || "").trim() === namePart
        );
      });

      let member = null;

      if (candidates.length === 1) member = candidates[0];
      else {
        const c2 = members.filter((m) => {
          return (
            (m.realName || "").trim().startsWith(namePart) ||
            (m.nickname || "").trim().startsWith(namePart)
          );
        });
        if (c2.length === 1) member = c2[0];
        else {
          const c3 = members.filter((m) => {
            return (
              (m.realName || "").trim().includes(namePart) ||
              (m.nickname || "").trim().includes(namePart)
            );
          });
          if (c3.length === 1) member = c3[0];
          else {
            showToast(
              "error",
              `❌ Không tìm thấy nhân viên duy nhất: ${namePart}`
            );
            return;
          }
        }
      }

      const shiftRec = await getShiftOfMember(member.id, selectedDate);
      if (!shiftRec || !shiftRec.shift) {
        showToast(
          "error",
          `❌ Ngày ${selectedDate} chưa phân ca cho ${namePart}.`
        );
        return;
      }

      if (mode === "checkout" && !shiftRec.lenCa) {
        showToast(
          "error",
          `❌ ${namePart} chưa có check-in nên không thể checkout.`
        );
        return;
      }

      const shiftLabel = shiftRec.shift;
      const isNight = String(shiftLabel).toLowerCase().includes("đêm");

      // ---- CHUYỂN KHUNG GIỜ TỪ DB → phút ----
      const toMin = (s) => {
        if (!s) return null;
        const [h, m] = s.split(":").map(Number);
        return h * 60 + m;
      };

      const somStart = toMin(shiftRec.lenCaSomBatDau);
      const somEnd = toMin(shiftRec.lenCaSomKetThuc);
      const muonStart = toMin(shiftRec.lenCaMuonBatDau);
      const muonEnd = toMin(shiftRec.lenCaMuonKetThuc);

      const somOutStart = toMin(shiftRec.tanCaSomBatDau);
      const somOutEnd = toMin(shiftRec.tanCaSomKetThuc);
      const muonOutStart = toMin(shiftRec.tanCaMuonBatDau);
      const muonOutEnd = toMin(shiftRec.tanCaMuonKetThuc);

      // ===== CHUẨN HÓA GIỜ CHECKOUT CHO CA ĐÊM =====
      // Ca đêm luôn tính từ 00:00 trở đi
      if (isNight && mode === "checkout") {
        // giữ nguyên phút trong ngày
      }

      let chosenVariant = null;

      // ---- CHECK-IN ----
      if (mode === "checkin") {
        if (
          somStart != null &&
          somEnd != null &&
          minutesOfDay >= somStart &&
          minutesOfDay <= somEnd
        ) {
          // Nằm trong khung lên ca SỚM → chuẩn hóa về giờ kết thúc khung
          chosenVariant = "sớm";
          minutesOfDay = somEnd;
        } else if (
          muonStart != null &&
          muonEnd != null &&
          minutesOfDay >= muonStart &&
          minutesOfDay <= muonEnd
        ) {
          // Nằm trong khung lên ca MUỘN → chuẩn hóa về giờ kết thúc khung
          chosenVariant = "muộn";
          minutesOfDay = muonEnd;
        } else {
          // Nếu chưa cấu hình khung giờ hoặc giờ ngoài khung → cảnh báo nhưng vẫn cho qua
          const hasConfig = somStart != null && somEnd != null && muonStart != null && muonEnd != null;
          if (hasConfig) {
            showToast(
              "warning",
              `⚠️ ${namePart} — ${timeString} ngoài khung giờ, đã lưu thực tế.`
            );
          }
          chosenVariant = "other";
          // Giữ nguyên minutesOfDay
        }
      }

      // ---- CHECK-OUT ----
      // ====================== TÍNH OT CA NGÀY ======================
      if (mode === "checkout" && !isNight) {
        const checkoutMin = minutesOfDay;

        let otStart = null;
        let variant = null;

        // Ca ngày có thể có khung tăng ca sớm
        if (somOutStart != null && checkoutMin >= somOutStart) {
          otStart = somOutStart;
          variant = "sớm";
        }

        // Ca ngày có thể có khung tăng ca muộn
        if (muonOutStart != null && checkoutMin >= muonOutStart) {
          if (
            otStart == null ||
            Math.abs(checkoutMin - muonOutStart) <
              Math.abs(checkoutMin - otStart)
          ) {
            otStart = muonOutStart;
            variant = "muộn";
          }
        }

        // Không rơi vào khung tăng ca nào
        if (otStart == null) {
          showToast(
            "error",
            `${namePart} — ${timeString} chưa tới giờ tăng ca.`
          );
          return;
        }

        const otMinutes = checkoutMin - otStart;

        if (otMinutes < 1) {
          showToast("error", `${namePart} — ${timeString} không có tăng ca.`);
          return;
        }

        otPreview.push({
          memberId: member.id,
          name: namePart,
          nickname: member.nickname || "",
          checkout: timeString,
          otMinutes,
          shiftEnd: otStart,
          ca: variant,
        });
      }

      // ===== TÍNH OT CA ĐÊM (CHUẨN THEO DB) =====
      if (mode === "checkout" && isNight) {
        const somStart = toMin(shiftRec.tanCaSomBatDau); // 04:00
        const muonStart = toMin(shiftRec.tanCaMuonBatDau); // 05:00

        const somShiftEnd = toMin(shiftRec.lenCaSomKetThuc); // 19:00
        const muonShiftEnd = toMin(shiftRec.lenCaMuonKetThuc); // 20:00

        const nghi = (shiftRec.nghiGiuaCa || 0) * 60; // nghỉ giữa ca -> phút

        // Chuẩn hóa checkout: 6:01 → 361 phút, KHÔNG +1440 nữa
        const checkoutMin = minutesOfDay;

        let otStart = null;
        let chosenVariant = null;

        // ------------ CA SỚM ------------
        // ca sớm: hành chính kết thúc 19:00, OT bắt đầu 04:00
        if (checkoutMin >= somStart) {
          otStart = somStart;
          chosenVariant = "sớm";
        }

        // ------------ CA MUỘN ------------
        // ca muộn: hành chính kết thúc 20:00, OT bắt đầu 05:00
        if (checkoutMin >= muonStart) {
          // chọn ca gần nhất với giờ checkout
          if (
            otStart == null ||
            Math.abs(checkoutMin - muonStart) < Math.abs(checkoutMin - otStart)
          ) {
            otStart = muonStart;
            chosenVariant = "muộn";
          }
        }

        if (otStart == null) {
          showToast(
            "error",
            `${namePart} — ${timeString} chưa tới giờ tăng ca.`
          );
          return;
        }

        const otMinutes = checkoutMin - otStart;

        if (otMinutes < 1) {
          showToast("error", `${namePart} — ${timeString} không có tăng ca.`);
          return;
        }

        otPreview.push({
          memberId: member.id,
          name: namePart,
          nickname: member.nickname || "",
          checkout: timeString,
          otMinutes,
          shiftEnd: otStart,
          ca: chosenVariant,
        });
      }

      // ---- Sinh shiftStart mong muốn ----
      const prefix = isNight ? "lên_ca_đêm_" : "lên_ca_ngày_";
      const expectedShiftStart =
        prefix + (chosenVariant === "sớm" ? "sớm" : "muộn");

      const currentShiftStart = shiftRec.shiftStart || null;

      if (mode === "checkin" && currentShiftStart !== expectedShiftStart) {
        pending.push({
          memberId: member.id,
          name: namePart,
          oldShiftStart: currentShiftStart,
          newShiftStart: expectedShiftStart,
        });
      }
    }

    // ---- Có tăng ca → mở popup xem trước ----
    if (mode === "checkout" && otPreview.length > 0) {
      setOtPreview([...otPreview]);
      setOtPreviewOpen(true);
      return;
    }

    // ---- CÓ THAY ĐỔI CA → MỞ POPUP ----
    if (pending.length > 0) {
      const deduped = Object.values(
        pending.reduce((acc, p) => {
          acc[p.memberId] = p;
          return acc;
        }, {})
      );

      setPendingShiftUpdates(deduped);
      setPreviewOpen(true);
      return;
    }

    // ---- KHÔNG THAY ĐỔI CA → LƯU TRỰC TIẾP ----
    try {
      await parseText(textInput, mode);
      showToast("success", "✅ Xử lý chấm công thành công!");
      setTextInput("");
      setFormOpen(false);
    } catch (err) {
      showToast("error", "❌ Lỗi xử lý chấm công!");
    }
  };

  const handleSkipUpdates = async () => {
    setPreviewOpen(false);
    try {
      await parseText(textInput, mode);
      showToast("success", "✅ Đã xử lý chấm công (không cập nhật phân ca).");
      setTextInput("");
      setFormOpen(false);
      setPendingShiftUpdates([]);
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
      await parseText(textInput, mode);
      showToast("success", "✅ Đã cập nhật phân ca & xử lý chấm công!");
      setTextInput("");
      setFormOpen(false);
      setPendingShiftUpdates([]);
    } catch (e) {
      showToast("error", "❌ Lỗi final parse!");
    } finally {
      setLoadingApprove(false);
    }
  };

  return (
    <>
      <Toast toasts={toasts} onClose={removeToast} />

      <div className="flex justify-end mb-2">
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition"
        >
          <CirclePlus className="w-5 h-5" /> Thêm tăng ca
        </button>
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
            className="relative bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 w-11/12 max-w-xl p-6 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-10 transition-colors"
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
                    className={`flex items-center gap-1 transition ${
                      mode === "checkin" ? "text-white" : ""
                    }`}
                  >
                    <LogIn className="w-4 h-4" /> In
                  </div>
                  <div
                    className={`flex items-center gap-1 transition ${
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
    w-full border rounded-lg mb-4 p-3 outline-none transition
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

      <ShiftPreviewModal
        visible={previewOpen}
        pending={pendingShiftUpdates}
        onClose={() => setPreviewOpen(false)}
        onApprove={handleApproveUpdates}
        onSkip={handleSkipUpdates}
        loading={loadingApprove}
      />

      <OvertimePreviewModal
        visible={otPreviewOpen}
        items={otPreview}
        onClose={() => setOtPreviewOpen(false)}
        onConfirm={handleConfirmOT}
      />
    </>
  );
}
