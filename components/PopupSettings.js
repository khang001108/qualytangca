// components/PopupSettings.js
import { useState } from "react";
import { ICONS } from "../utils/iconUtils";
import { db } from "../lib/firebase";

export default function PopupSettings({
  member,
  members,
  setMembers,
  onClose,
}) {
  if (!member) return null;

  // 🧩 Tạo state form cục bộ
  const [form, setForm] = useState({
    nickname: member.nickname || "",
    avatar: member.avatar || "",
    shiftStart: member.shiftStart || "07:00",
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // 💾 Hàm lưu vào Firestore
  const handleSave = async () => {
    try {
      const { doc, updateDoc } = await import("firebase/firestore");
      const ref = doc(db, "members", member.id);
      await updateDoc(ref, {
        nickname: form.nickname,
        avatar: form.avatar,
        shiftStart: form.shiftStart,
      });

      // Cập nhật state local
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, ...form } : m))
      );

      onClose();
    } catch (err) {
      console.error("Lỗi lưu cài đặt:", err);
      alert("❌ Không thể lưu cài đặt!");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-80 sm:w-96 shadow-2xl animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-700 mb-3 text-center">
          ⚙️ Cài đặt - {member.nickname || member.realName}
        </h2>

        <div className="space-y-3">
          {/* Biệt danh */}
          <div>
            <label className="text-sm text-gray-600">Biệt danh</label>
            <input
              type="text"
              value={form.nickname}
              onChange={(e) => handleChange("nickname", e.target.value)}
              className="w-full border rounded-lg px-2 py-1 mt-1"
            />
          </div>

          {/* Giờ bắt đầu ca */}
          <div>
            <label className="text-sm text-gray-600">Giờ bắt đầu ca</label>
            <select
              value={form.shiftStart}
              onChange={(e) => handleChange("shiftStart", e.target.value)}
              className="w-full border rounded-lg px-2 py-1 mt-1"
            >
              <option value="07:00">07:00 - Sáng sớm</option>
              <option value="08:00">08:00 - Sáng muộn</option>
              <option value="19:00">19:00 - Tối sớm</option>
              <option value="20:00">20:00 - Tối muộn</option>
            </select>
          </div>

          {/* Chọn icon */}
          <div>
            <label className="text-sm text-gray-600">Chọn biểu tượng</label>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {ICONS.map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  onClick={() => handleChange("avatar", name)}
                  className={`p-2 rounded-lg border transition ${
                    form.avatar === name
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-indigo-300"
                  }`}
                  type="button"
                >
                  <Icon
                    className={`w-5 h-5 ${
                      form.avatar === name ? "text-indigo-600" : "text-gray-500"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Nút lưu */}
        <button
          onClick={handleSave}
          className="mt-5 w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-xl transition"
        >
          💾 Lưu & Đóng
        </button>
      </div>
    </div>
  );
}
