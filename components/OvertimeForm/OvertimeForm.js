import { useState, useRef } from "react";
import { CirclePlus, LogIn, LogOut } from "lucide-react";
import Toast from "../Toast";
import useOvertimeParser from "../../hooks/useOvertimeParser/index";
import ShiftPreviewModal from "./ShiftPreviewModal";
import { LEAVE_CODES } from "../../hooks/useOvertimeParser/parseHelpers";
import {
  timeToMinutes,
  minutesToHHMM,
  inRangeWrap,
  loadShiftConfigs,
  getShiftOfMember,
  updateShiftStart,
  buildWindows,
} from "../../hooks/useOvertimeParser/shiftHelpers";
import { doc, writeBatch, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

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

  const inWindow = (window, minutesOfDay) => {
    if (!window || window[0] == null || window[1] == null) return false;
    return inRangeWrap(window[0], window[1], minutesOfDay);
  };

  const handleParse = async () => {
    if (!textInput.trim()) {
      showToast("error", "⚠️ Vui lòng nhập dữ liệu chấm công trước.");
      return;
    }

    const { day: shiftDay, night: shiftNight } = await loadShiftConfigs();

    const RAW_TRASH_PATTERNS = [
      /上下班/,
      /打卡/,
      /记录/,
      /打卡记录/,
      /上班/,
      /下班/,
      /^\d{1,2}\/\d{1,2}/   // các dòng bắt đầu bằng 11/02 ... 
    ];

    let lines = textInput
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .filter((l) => {
        // Nếu chứa tạp rác → bỏ ngay
        return !RAW_TRASH_PATTERNS.some((p) => p.test(l));
      });


    const pending = [];

    for (let line of lines) {
      const parts = line.split("/");
      if (parts.length < 2) {
        showToast("error", `❌ Sai định dạng: ${line}`);
        return;
      }

      const namePart = parts[0].replace(/^\d+\.\s*/, "").trim();
      const timePart = parts[1].trim();

      // --- TÁCH GIỜ + TEXT NGHỈ ---
      let extractedTime = null;
      let remainingText = "";

      // Tìm giờ dạng HH:MM trong chuỗi (kể cả khi có "11:01 4h事假")
      const timeMatch = timePart.match(/\b\d{1,2}:\d{2}\b/);

      if (timeMatch) {
        extractedTime = timeMatch[0];                      // "11:01"
        remainingText = timePart.replace(extractedTime, "").trim();  // "4h事假"
      } else {
        // Không có giờ → có thể là nghỉ hoàn toàn như: /休 /年假
        if (LEAVE_CODES.some(code => timePart.includes(code))) {
          continue;
        }

        showToast("error", `❌ Sai giờ: ${timePart} (dòng: ${line})`);
        return;
      }

      // Nếu phần text sau giờ chứa nghỉ phép → bỏ qua
      if (remainingText && LEAVE_CODES.some(code => remainingText.includes(code))) {
        continue;
      }

      // Giờ hợp lệ → dùng extractedTime để xử lý tiếp
      const timeString = extractedTime;

      if (timePart === "休") continue;

      const timeRegex = /^\d{1,2}:\d{2}$/;
      if (!timeRegex.test(timePart)) {
        showToast("error", `❌ Sai giờ: ${timePart} (dòng: ${line})`);
        return;
      }

      const [hh, mm] = timePart.split(":").map(Number);
      let minutesOfDay = hh * 60 + mm;

      const candidates = members.filter(m => {
        const rn = (m.realName || "").trim();
        const nk = (m.nickname || "").trim();
        return rn === namePart || nk === namePart;
      });

      let member = null;
      if (candidates.length === 1) member = candidates[0];
      else if (candidates.length > 1) {
        showToast("error", `Tên ${namePart} không rõ ràng (có nhiều người trùng).`);
        return;
      } else {
        const c2 = members.filter(m => {
          const rn = (m.realName || "").trim();
          const nk = (m.nickname || "").trim();
          return rn.startsWith(namePart) || nk.startsWith(namePart);
        });
        if (c2.length === 1) member = c2[0];
        else {
          const c3 = members.filter(m => {
            const rn = (m.realName || "").trim();
            const nk = (m.nickname || "").trim();
            return rn.includes(namePart) || nk.includes(namePart);
          });
          if (c3.length === 1) member = c3[0];
          else {
            showToast("error", `❌ Không tìm thấy nhân viên duy nhất cho: ${namePart}`);
            return;
          }
        }
      }

      if (!member) {
        showToast("error", `❌ Không tìm thấy nhân viên: ${namePart}`);
        return;
      }

      const shiftRec = await getShiftOfMember(member.id, selectedDate);
      if (!shiftRec || !shiftRec.shift) {
        showToast("error", `❌ Ngày ${selectedDate} chưa phân ca cho ${namePart}.`);
        return;
      }

      if (mode === "checkout") {
        if (!shiftRec || !shiftRec.lenCa) {
          showToast("error", `❌ ${namePart} chưa có dữ liệu check-in nên không thể checkout.`);
          return;
        }
      }

      const shiftLabel = shiftRec.shift;
      const isNight = String(shiftLabel).toLowerCase().includes("đêm");

      if (isNight && mode === "checkout") {
        minutesOfDay += 1440;
      }

      const shiftCfg = isNight ? shiftNight : shiftDay;

      if (!shiftCfg) {
        showToast("error", `❌ Cấu hình ca (${shiftLabel}) chưa được thiết lập.`);
        return;
      }

      const windows = buildWindows(shiftCfg, isNight);
      if (!windows) {
        showToast("error", `❌ Không thể tạo khung giờ cho ca (${shiftLabel}).`);
        return;
      }

      const num = (x) => (x == null ? null : Number(x));
      const normWindow = (arr) => {
        if (!arr || !Array.isArray(arr) || arr.length < 2) return null;
        const a = num(arr[0]);
        const b = num(arr[1]);
        if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
        return [a, b];
      };

      const wSomCheckin = normWindow(windows?.som?.checkin);
      const wSomCheckout = normWindow(windows?.som?.checkout);
      const wMuonCheckin = normWindow(windows?.muon?.checkin);
      const wMuonCheckout = normWindow(windows?.muon?.checkout);

      const inWindowSafe = (win, v) => {
        if (!win) return false;
        return inRangeWrap(win[0], win[1], v);
      };

      const inSom =
        mode === "checkin" ? inWindowSafe(wSomCheckin, minutesOfDay) : inWindowSafe(wSomCheckout, minutesOfDay);

      const inMuon =
        mode === "checkin" ? inWindowSafe(wMuonCheckin, minutesOfDay) : inWindowSafe(wMuonCheckout, minutesOfDay);

      let chosenVariant = null;
      if (inSom && !inMuon) chosenVariant = "som";
      else if (inMuon && !inSom) chosenVariant = "muon";
      else if (inSom && inMuon) {
        const center = (arr) => (arr[0] + arr[1]) / 2;
        const dist = (v, arr) => Math.abs(v - center(arr));
        try {
          const dSom = dist(minutesOfDay, mode === "checkin" ? wSomCheckin : wSomCheckout);
          const dMuon = dist(minutesOfDay, mode === "checkin" ? wMuonCheckin : wMuonCheckout);
          chosenVariant = dSom <= dMuon ? "som" : "muon";
        } catch (e) {
          chosenVariant = "som";
        }
      } else {
        const EXTRA_THRESHOLD = 6 * 60;
        const distances = [];

        const pushDist = (win, label) => {
          if (!win) return;
          const a = win[0], b = win[1];
          let d = 0;
          if (minutesOfDay < a) d = a - minutesOfDay;
          else if (minutesOfDay > b) d = minutesOfDay - b;
          distances.push({ label, d, win });
        };

        if (mode === "checkin") {
          pushDist(wSomCheckin, "som");
          pushDist(wMuonCheckin, "muon");
        } else {
          pushDist(wSomCheckout, "som");
          pushDist(wMuonCheckout, "muon");
        }

        distances.sort((x, y) => x.d - y.d);

        if (distances.length > 0 && distances[0].d <= EXTRA_THRESHOLD) {
          chosenVariant = distances[0].label;
        } else {
          const somCheck = (mode === "checkin" ? wSomCheckin : wSomCheckout)
            ? wSomCheckin.map(minutesToHHMM).join(" - ")
            : "N/A";
          const muonCheck = (mode === "checkin" ? wMuonCheckin : wMuonCheckout)
            ? wMuonCheckin.map(minutesToHHMM).join(" - ")
            : "N/A";
          const modeLabel = mode === "checkin" ? "check-in" : "check-out";

          showToast(
            "error",
            `❌ ${namePart} — ${timePart} không hợp lệ theo phân ca (${shiftLabel}).\n` +
            `${modeLabel} SỚM: ${somCheck}\n${modeLabel} MUỘN: ${muonCheck}\n→ Vui lòng kiểm tra phân ca hoặc dữ liệu.`
          );
          return;
        }
      }

      const isNightPrefix = isNight ? "lên_ca_đêm_" : "lên_ca_ngày_";
      const expectedShiftStart = `${isNightPrefix}${chosenVariant === "som" ? "sớm" : "muộn"}`;

      const currentShiftStart = shiftRec.shiftStart || null;

      if (mode === "checkin") {
        if (currentShiftStart !== expectedShiftStart) {
          pending.push({
            memberId: member.id,
            name: namePart,
            oldShiftStart: currentShiftStart,
            newShiftStart: expectedShiftStart,
          });
        }
      }
    }

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

    try {
      await parseText(textInput, mode);
      showToast("success", "✅ Dữ liệu chấm công đã được xử lý thành công!");
      setTextInput("");
      setFormOpen(false);
    } catch (err) {
      showToast("error", "❌ Đã xảy ra lỗi khi xử lý dữ liệu!");
    }
  };
  const handleSkipUpdates = async () => {
    setPreviewOpen(false);
    try {
      await parseText(textInput, mode);
      showToast("success", "✅ Dữ liệu chấm công đã được xử lý (không cập nhật phân ca).");
      setTextInput("");
      setFormOpen(false);
      setPendingShiftUpdates([]);
    } catch (err) {
      showToast("error", "❌ Lỗi khi xử lý chấm công sau khi bỏ cập nhật.");
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

    let results = [];
    try {
      await batch.commit();
      results = pendingShiftUpdates.map(() => ({ ok: true }));
    } catch (e) {
      results = pendingShiftUpdates.map(() => ({ ok: false }));
      showToast("error", "❌ Lỗi khi cập nhật phân ca bằng batch.");
    }

    const failed = results.filter((r) => !r.ok);
    if (failed.length) {
      showToast("error", `❌ ${failed.length} cập nhật phân ca thất bại. Kiểm tra log.`);
    }

    setPreviewOpen(false);
    try {
      await parseText(textInput, mode);
      showToast("success", "✅ Đã cập nhật phân ca & xử lý chấm công!");
      setTextInput("");
      setFormOpen(false);
      setPendingShiftUpdates([]);
    } catch (err) {
      showToast("error", "❌ Lỗi khi xử lý chấm công sau cập nhật phân ca.");
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
                  {selectedDate ? new Date(selectedDate).toLocaleDateString("vi-VN") : "Chưa chọn"}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-orange-600 dark:text-orange-400">Thêm tăng ca</h3>
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
                onClick={() => setMode((prev) => (prev === "checkin" ? "checkout" : "checkin"))}
              >
                <div
                  className={`absolute top-0 left-0 h-10 w-1/2 rounded-full bg-gradient-to-r ${mode === "checkin"
                    ? "from-yellow-500 to-yellow-600"
                    : "from-green-500 to-green-600"
                    } shadow-md transform transition-all duration-300 ${mode === "checkout" ? "translate-x-full" : "translate-x-0"
                    }`}
                />
                <div className="flex justify-between items-center w-full px-4 z-10 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <div
                    className={`flex items-center gap-1 transition ${mode === "checkin" ? "text-white" : ""
                      }`}
                  >
                    <LogIn className="w-4 h-4" /> In
                  </div>
                  <div
                    className={`flex items-center gap-1 transition ${mode === "checkout" ? "text-white" : ""
                      }`}
                  >
                    <LogOut className="w-4 h-4" /> Out
                  </div>
                </div>
              </div>
            </div>

            <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
              Dán dữ liệu chấm công ({mode === "checkin" ? "Lên ca" : "Xuống ca"})
            </label>

            <textarea
              rows={6}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-3 rounded-lg mb-4 focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-500 outline-none transition"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={
                mode === "checkin"
                  ? "Dán dữ liệu chấm công ca lên (ví dụ: 1.陈明壯/18:52)"
                  : "Dán dữ liệu chấm công ca xuống (ví dụ: 1.陈明壯/06:01)"
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
                className={`px-5 py-2 rounded-lg text-white shadow-md transition ${mode === "checkin"
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
    </>
  );
}
