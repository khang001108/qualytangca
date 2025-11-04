// components/PopupSettings.js
import { useState } from "react";
import { db } from "../lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { Save } from "lucide-react";
import { ICONS } from "../utils/iconUtils";

export default function PopupSettings({
  member,
  members,
  setMembers,
  onClose,
}) {
  const [form, setForm] = useState({
    nickname: member.nickname || "",
    shiftStart: member.shiftStart || "07:00",
    shift: member.shift || "Ca ngày",
    avatar: member.avatar || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const ref = doc(db, "members", member.id);
      await updateDoc(ref, {
        nickname: form.nickname,
        avatar: form.avatar,
        shiftStart: form.shiftStart,
        shift:
          form.shiftStart.startsWith("19") || form.shiftStart.startsWith("20")
            ? "Ca đêm"
            : "Ca ngày",
      });

      // 🔹 Lấy dữ liệu mới từ Firestore
      const snap = await getDoc(ref);
      const updatedData = { id: member.id, ...snap.data() };

      // 🔹 Cập nhật ngay vào danh sách local
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? updatedData : m))
      );

      onClose();
    } catch (err) {
      console.error("Lỗi khi lưu cài đặt:", err);
      alert("❌ Không thể lưu thay đổi!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-3 text-indigo-600 text-center">
          ⚙️ Cài đặt nhân viên
        </h2>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">Biệt danh</label>
            <input
              type="text"
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2 mt-1"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Giờ bắt đầu ca</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {["07:00", "08:00", "19:00", "20:00"].map((t) => {
                const label = {
                  "07:00": "Sáng sớm",
                  "08:00": "Sáng muộn",
                  "19:00": "Tối sớm",
                  "20:00": "Tối muộn",
                }[t];
                return (
                  <button
                    key={t}
                    onClick={() => setForm({ ...form, shiftStart: t })}
                    type="button"
                    className={`py-2 rounded-lg border ${
                      form.shiftStart === t
                        ? "border-indigo-400 bg-indigo-50"
                        : "border-gray-200"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600">Chọn biểu tượng</label>
            <div className="grid grid-cols-6 gap-2 mt-2">
              {ICONS.map((icon) => {
                const Icon = icon.icon;
                return (
                  <button
                    key={icon.name}
                    onClick={() => setForm({ ...form, avatar: icon.name })}
                    className={`border rounded-lg p-2 flex items-center justify-center ${
                      form.avatar === icon.name
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-indigo-300"
                    }`}
                  >
                    <Icon className="w-5 h-5 text-indigo-600" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Đang lưu..." : "Lưu & Đóng"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
