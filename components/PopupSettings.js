// components/PopupSettings.js
import { useState } from "react";
import { db } from "../lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { Save } from "lucide-react";
import { ICONS } from "../utils/iconUtils";

// Thêm ở đầu file
const COLORS = [
  "#3B82F6", // xanh dương
  "#10B981", // xanh lục
  "#F59E0B", // vàng cam
  "#cb2727ff", // đỏ
  "#8B5CF6", // tím
  "#EC4899", // hồng
  "#6B7280", // xám
  "#14B8A6", // teal ngọc
  "#84CC16", // xanh non sáng
  "#f11338ff", // hồng đậm
  "#0EA5E9", // cyan sáng
  "#A16207", // nâu vàng đất
];

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
    avatar: member.avatar || "User",
    color: member.color || "#3B82F6",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const ref = doc(db, "members", member.id);
      await updateDoc(ref, {
        nickname: form.nickname,
        avatar: form.avatar,
        color: form.color,
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
                    className={`py-2 rounded-lg border ${form.shiftStart === t
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

          <div className="mt-4">
            <label className="text-sm text-gray-600">Chọn biểu tượng</label>

            {/* Preview */}
            <div className="flex justify-center my-3">
              {(() => {
                const Icon =
                  ICONS.find((i) => i.name === form.avatar)?.icon || ICONS[0].icon;
                return (
                  <div
                    className="w-16 h-16 flex items-center justify-center rounded-xl shadow-inner"
                    style={{ backgroundColor: form.color + "20" }}
                  >
                    <Icon className="w-8 h-8" style={{ color: form.color }} />
                  </div>
                );
              })()}
            </div>

            {/* Danh sách icon */}
            <div className="grid grid-cols-6 gap-2 mt-2 justify-items-center">
              {ICONS.map(({ name, icon: Icon }) => {
                const isActive = form.avatar === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setForm({ ...form, avatar: name })}
                    className={`p-2 rounded-lg border transition-transform ${isActive ? "scale-110 shadow-md" : "hover:bg-gray-50"
                      }`}
                    style={{
                      borderColor: isActive ? form.color : "#e5e7eb",
                      backgroundColor: isActive ? form.color + "20" : "transparent",
                    }}
                  >
                    <Icon
                      className="w-5 h-5 transition"
                      style={{ color: isActive ? form.color : "#6b7280" }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Chọn màu */}
            <div className="mt-4">
              <label className="text-sm text-gray-600">Màu biểu tượng</label>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    className={`w-7 h-7 rounded-full border-2 transition ${form.color === c
                      ? "border-black scale-110"
                      : "border-gray-200 hover:scale-105"
                      }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
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
