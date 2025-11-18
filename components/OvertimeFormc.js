// components/OvertimeForm.js
import { useState, useRef } from "react";
import { CirclePlus, LogIn, LogOut } from "lucide-react";
import Toast from "./Toast";
import useOvertimeParser from "../hooks/useOvertimeParser/index";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

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
  const [mode, setMode] = useState("checkin"); // "checkin" | "checkout"
  const modalRef = useRef();
  const [toasts, setToasts] = useState([]);

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

  // ------------ helper time funcs ------------
  const timeToMinutes = (t) => {
    if (!t) return null;
    const s = String(t).trim();
    const parts = s.split(":").map((n) => Number(n || 0));
    if (parts.length < 2) return null;
    const [hh, mm] = parts;
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    return (hh % 24) * 60 + (mm % 60);
  };

  const minutesToHHMM = (min) => {
    if (min == null) return null;
    min = ((min % (24 * 60)) + 24 * 60) % (24 * 60);
    const hh = Math.floor(min / 60);
    const mm = min % 60;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };

  // inclusive range with wrap-around support
  const inRangeWrap = (min, max, val) => {
    if (min == null || max == null || val == null) return false;
    if (min <= max) return val >= min && val <= max;
    // wrap-around e.g., 22:00 -> 04:00
    return val >= min || val <= max;
  };

  // get shiftSchedule doc for given member & selectedDate (YYYY-MM-DD)
  const getShiftOfMember = async (memberId) => {
    if (!selectedDate) return null;
    const dateStr = new Date(selectedDate).toISOString().slice(0, 10);
    const docId = `${dateStr}__${memberId}`;
    try {
      const ref = doc(db, "shiftSchedules", docId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      return snap.data();
    } catch (e) {
      console.warn("getShiftOfMember error", e);
      return null;
    }
  };

  // load shiftConfig day/night
  const loadShiftConfigs = async () => {
    try {
      const dayRef = doc(db, "shiftConfig", "day");
      const nightRef = doc(db, "shiftConfig", "night");
      const [daySnap, nightSnap] = await Promise.all([getDoc(dayRef), getDoc(nightRef)]);
      const day = daySnap.exists() ? daySnap.data() : null;
      const night = nightSnap.exists() ? nightSnap.data() : null;
      return { day, night };
    } catch (e) {
      console.warn("loadShiftConfigs error", e);
      return { day: null, night: null };
    }
  };

  // resolve windows for both som and muon given shiftConfig
  // returns { som: {checkin:[min,max], checkout:[min,max]}, muon: {...} }
  const buildWindows = (shiftConfig) => {
    if (!shiftConfig) return null;

    const EXTRA = 6 * 60;  // 6 tiếng = 360 phút

    // Tính giờ gốc
    const somCheckin = [
      timeToMinutes(shiftConfig.lenCaSomBatDau),
      timeToMinutes(shiftConfig.lenCaSomKetThuc),
    ];
    const somCheckout = [
      timeToMinutes(shiftConfig.tanCaSomBatDau),
      timeToMinutes(shiftConfig.tanCaSomKetThuc) + EXTRA, // +6 tiếng
    ];

    const muonCheckin = [
      timeToMinutes(shiftConfig.lenCaMuonBatDau),
      timeToMinutes(shiftConfig.lenCaMuonKetThuc),
    ];
    const muonCheckout = [
      timeToMinutes(shiftConfig.tanCaMuonBatDau),
      timeToMinutes(shiftConfig.tanCaMuonKetThuc) + EXTRA, // +6 tiếng
    ];

    return {
      som: { checkin: somCheckin, checkout: somCheckout },
      muon: { checkin: muonCheckin, checkout: muonCheckout },
    };
  };


  // helper to check membership in windows
  const inWindow = (window, minutesOfDay) => {
    if (!window || window[0] == null || window[1] == null) return false;
    return inRangeWrap(window[0], window[1], minutesOfDay);
  };

  // Main validate + parse handler (AUTO-DETECT variant by time windows)
  const handleParse = async () => {
    if (!textInput.trim()) {
      showToast("error", "⚠️ Vui lòng nhập dữ liệu chấm công trước.");
      return;
    }

    // load shift configs
    const { day: shiftDay, night: shiftNight } = await loadShiftConfigs();

    // split lines
    const lines = textInput
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    for (let line of lines) {
      const parts = line.split("/");
      if (parts.length < 2) {
        showToast("error", `❌ Sai định dạng: ${line}`);
        return;
      }

      const namePart = parts[0].replace(/^\d+\.\s*/, "").trim();
      const timePart = parts[1].trim();

      // skip leave codes
      if (timePart === "休") continue;

      const timeRegex = /^\d{1,2}:\d{2}$/;
      if (!timeRegex.test(timePart)) {
        showToast("error", `❌ Sai giờ: ${timePart} (dòng: ${line})`);
        return;
      }

      const [hh, mm] = timePart.split(":").map(Number);
      const minutesOfDay = (hh % 24) * 60 + (mm % 60);

      // find member
      const member = members.find((m) => {
        const rn = (m.realName || "").trim();
        const nk = (m.nickname || "").trim();
        return rn === namePart || nk === namePart || rn.includes(namePart) || nk.includes(namePart);
      });

      if (!member) {
        showToast("error", `❌ Không tìm thấy nhân viên: ${namePart}`);
        return;
      }

      // get shiftSchedule for that day
      const shiftRec = await getShiftOfMember(member.id);

      // Must have shiftSchedule for that date
      if (!shiftRec || !shiftRec.shift) {
        showToast("error", `❌ Ngày ${selectedDate} chưa phân ca cho ${namePart}.`);
        return;
      }

      const shiftLabel = shiftRec.shift; // must be present
      const isNight = String(shiftLabel).toLowerCase().includes("đêm");
      const shiftCfg = isNight ? shiftNight : shiftDay;

      if (!shiftCfg) {
        showToast("error", `❌ Cấu hình ca (${shiftLabel}) chưa được thiết lập.`);
        return;
      }

      // build som/muon windows
      const windows = buildWindows(shiftCfg);
      if (!windows) {
        showToast("error", `❌ Không thể tạo khung giờ cho ca (${shiftLabel}).`);
        return;
      }

      // Decide variant by time windows (AUTO-DETECT)
      const inSom = mode === "checkin"
        ? inWindow(windows.som.checkin, minutesOfDay)
        : inWindow(windows.som.checkout, minutesOfDay);
      const inMuon = mode === "checkin"
        ? inWindow(windows.muon.checkin, minutesOfDay)
        : inWindow(windows.muon.checkout, minutesOfDay);

      let chosenVariant = null;
      if (inSom && !inMuon) chosenVariant = "som";
      else if (inMuon && !inSom) chosenVariant = "muon";
      else {
        // ambiguous or outside both windows -> error with helpful info
        const somCheck = windows.som[mode === "checkin" ? "checkin" : "checkout"].map(minutesToHHMM).join(" - ");
        const muonCheck = windows.muon[mode === "checkin" ? "checkin" : "checkout"].map(minutesToHHMM).join(" - ");
        const modeLabel = mode === "checkin" ? "check-in" : "check-out";
        showToast(
          "error",
          `❌ ${namePart} — ${timePart} không hợp lệ theo phân ca (${shiftLabel}).\n` +
          `${modeLabel} SỚM: ${somCheck}\n${modeLabel} MUỘN: ${muonCheck}\n→ Vui lòng kiểm tra phân ca hoặc dữ liệu.`
        );
        return;
      }

      // safety final check
      const chosenWindow = mode === "checkin"
        ? windows[chosenVariant].checkin
        : windows[chosenVariant].checkout;

      if (!inWindow(chosenWindow, minutesOfDay)) {
        showToast(
          "error",
          `❌ ${namePart} — ${timePart} không hợp lệ cho ${mode === "checkin" ? "check-in" : "check-out"} theo lựa chọn ${chosenVariant}.`
        );
        return;
      }

      // line validated => continue loop
    } // end each line

    // all validated -> parse
    try {
      await parseText(textInput, mode);
      showToast("success", "✅ Dữ liệu chấm công đã được xử lý thành công!");
      setTextInput("");
      setFormOpen(false);
    } catch (err) {
      console.error("Lỗi xử lý:", err);
      showToast("error", "❌ Đã xảy ra lỗi khi xử lý dữ liệu!");
    }
  };

  return (
    <>
      <Toast toasts={toasts} onClose={removeToast} />

      {/* Nút mở form */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition"
        >
          <CirclePlus className="w-5 h-5" /> Thêm tăng ca
        </button>
      </div>

      {/* Modal */}
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
              <button onClick={() => setFormOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition">✕</button>
            </div>

            <div className="flex justify-center mb-5">
              <div
                className="relative flex items-center w-44 h-10 bg-gray-200 dark:bg-gray-800 rounded-full cursor-pointer transition"
                onClick={() => setMode((prev) => (prev === "checkin" ? "checkout" : "checkin"))}
              >
                <div
                  className={`absolute top-0 left-0 h-10 w-1/2 rounded-full bg-gradient-to-r ${mode === "checkin" ? "from-yellow-500 to-yellow-600" : "from-green-500 to-green-600"} shadow-md transform transition-all duration-300 ${mode === "checkout" ? "translate-x-full" : "translate-x-0"}`}
                />
                <div className="flex justify-between items-center w-full px-4 z-10 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <div className={`flex items-center gap-1 transition ${mode === "checkin" ? "text-white" : ""}`}><LogIn className="w-4 h-4" /> In</div>
                  <div className={`flex items-center gap-1 transition ${mode === "checkout" ? "text-white" : ""}`}><LogOut className="w-4 h-4" /> Out</div>
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
              placeholder={mode === "checkin" ? "Dán dữ liệu chấm công ca lên (ví dụ: 1.陈明壯/18:52)" : "Dán dữ liệu chấm công ca xuống (ví dụ: 1.陈明壯/06:01)"}
            />

            <div className="flex justify-end gap-2">
              <button onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 transition">Quay lại</button>
              <button onClick={handleParse} className={`px-5 py-2 rounded-lg text-white shadow-md transition ${mode === "checkin" ? "bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-800" : "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"}`}>
                {mode === "checkin" ? "Xử lý Check-in" : "Xử lý Check-out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
