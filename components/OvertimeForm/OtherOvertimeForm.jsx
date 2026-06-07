// components/OvertimeForm/OtherOvertimeForm.jsx
// Form nhập tăng ca khác: ngày lễ, bù, thủ công
import { useState } from "react";
import { Save, Clock, User, Calendar } from "lucide-react";
import { doc, collection, setDoc, serverTimestamp, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import dayjs from "dayjs";

const OT_TYPES = [
  { id: "holiday",  label: "🗓️ Tăng ca ngày lễ",    color: "red",    desc: "Nghỉ lễ, Tết, ngày quốc khánh…" },
  { id: "weekend",  label: "🌅 Tăng ca cuối tuần",   color: "orange", desc: "T7, CN, ngày nghỉ thường kỳ"    },
  { id: "makeup",   label: "🔄 Tăng ca bù",          color: "blue",   desc: "Bù giờ nghỉ lúc trước"          },
  { id: "manual",   label: "✏️ Nhập thủ công",       color: "gray",   desc: "Tự điền số giờ OT bất kỳ"       },
];

const colorMap = {
  red:    { border: "border-red-300 dark:border-red-700",    bg: "bg-red-50 dark:bg-red-900/20",    ring: "ring-red-400"    },
  orange: { border: "border-orange-300 dark:border-orange-700", bg: "bg-orange-50 dark:bg-orange-900/20", ring: "ring-orange-400" },
  blue:   { border: "border-blue-300 dark:border-blue-700",   bg: "bg-blue-50 dark:bg-blue-900/20",   ring: "ring-blue-400"   },
  gray:   { border: "border-gray-300 dark:border-gray-700",   bg: "bg-gray-50 dark:bg-gray-900/20",   ring: "ring-gray-400"   },
};

export default function OtherOvertimeForm({ user, members, selectedDate, selectedMonth, selectedYear, showToast, onDone }) {
  const [otType, setOtType]     = useState("holiday");
  const [selectedMem, setSelectedMem] = useState("");
  const [hours, setHours]       = useState(2);
  const [note, setNote]         = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSave = async () => {
    if (!selectedMem) { showToast("error", "⚠️ Chọn nhân viên trước."); return; }
    if (!hours || Number(hours) <= 0) { showToast("error", "⚠️ Số giờ phải > 0."); return; }

    setLoading(true);
    try {
      const member  = members.find((m) => m.id === selectedMem);
      if (!member) throw new Error("Không tìm thấy nhân viên");

      const addHours = Number(hours);
      const dateStr  = dayjs(selectedDate).format("YYYY-MM-DD");

      // Update member worked hours
      const memRef  = doc(db, "members", member.id);
      const memSnap = await getDoc(memRef);
      if (memSnap.exists()) {
        const m = memSnap.data();
        const oldWorked    = Number(m.overtimeLimit?.workedHours || 0);
        const monthlyLimit = Number(m.overtimeLimit?.monthlyLimit || 0);
        const newWorked    = oldWorked + addHours;
        await updateDoc(memRef, {
          "overtimeLimit.workedHours": newWorked,
          "overtimeLimit.remaining":   Math.max(monthlyLimit - newWorked, 0),
          updatedAt: serverTimestamp(),
        });
      }

      // Write OT record
      await setDoc(doc(collection(db, "overtimes")), {
        userId:       user.uid,
        memberId:     member.id,
        realName:     member.realName,
        nickname:     member.nickname || "",
        date:         dateStr,
        checkIn:      null,
        checkOut:     null,
        tangCaHomNay: addHours,
        thuong:       0,
        addedHours:   addHours,
        bonusGiven:   0,
        shift:        member.shift || "",
        otType,
        note:         note.trim(),
        manualEdit:   true,
        createdAt:    serverTimestamp(),
      });

      showToast("success", `✅ Đã lưu ${addHours}h tăng ca cho ${member.realName}`);
      setSelectedMem(""); setHours(2); setNote("");
      onDone?.();
    } catch (e) {
      console.error(e);
      showToast("error", "❌ Lỗi khi lưu. Thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const currentType = OT_TYPES.find((t) => t.id === otType);
  const col         = colorMap[currentType?.color || "gray"];

  return (
    <div className="space-y-4">
      {/* OT type selector */}
      <div className="grid grid-cols-2 gap-2">
        {OT_TYPES.map((t) => {
          const c = colorMap[t.color];
          return (
            <button
              key={t.id}
              onClick={() => setOtType(t.id)}
              className={`p-2.5 rounded-xl border-2 text-left transition
                ${otType === t.id ? `${c.border} ${c.bg} ring-2 ${c.ring}` : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}`}
            >
              <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">{t.label}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{t.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Member select */}
      <div>
        <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
          <User className="w-3.5 h-3.5" /> Nhân viên
        </label>
        <select
          value={selectedMem}
          onChange={(e) => setSelectedMem(e.target.value)}
          className={`w-full border-2 rounded-xl p-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 outline-none transition ${col.border}`}
        >
          <option value="">-- Chọn nhân viên --</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.realName}{m.nickname ? ` (${m.nickname})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Hours */}
      <div>
        <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
          <Clock className="w-3.5 h-3.5" /> Số giờ tăng ca
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setHours((h) => Math.max(0.5, Number(h) - 0.5))}
            className="w-10 h-10 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-lg font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >−</button>
          <input
            type="number" min="0.5" max="24" step="0.5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className={`flex-1 border-2 rounded-xl p-2.5 text-center text-lg font-bold bg-white dark:bg-gray-800 dark:text-gray-100 outline-none ${col.border}`}
          />
          <button
            onClick={() => setHours((h) => Math.min(24, Number(h) + 0.5))}
            className="w-10 h-10 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-lg font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >+</button>
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Ghi chú (tuỳ chọn)</label>
        <input
          type="text" value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="VD: Tăng ca đợt kết thúc dự án"
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-purple-400"
        />
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition"
      >
        {loading ? <span className="animate-spin">⏳</span> : <Save className="w-4 h-4" />}
        {loading ? "Đang lưu…" : "Lưu tăng ca"}
      </button>
    </div>
  );
}
