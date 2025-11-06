// components/PopupSettings.js
import { useState } from "react";
import { db } from "../lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { Save, User, Pen, X } from "lucide-react";
import { ICONS } from "../utils/iconUtils";

const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#cb2727ff",
  "#8B5CF6",
  "#EC4899",
  "#6B7280",
  "#14B8A6",
  "#84CC16",
  "#f11338ff",
  "#0EA5E9",
  "#A16207",
];

export default function PopupSettings({ member, setMembers, onClose }) {
  const [saving, setSaving] = useState(false);
  const [showName, setShowName] = useState(false);
  const [showIcon, setShowIcon] = useState(false);

  const [form, setForm] = useState({
    nickname: member.nickname || "",
    avatar: member.avatar || "User",
    color: member.color || "#3B82F6",
  });

  // 🔹 Lưu thay đổi nickname / avatar / màu
  const handleSave = async () => {
    try {
      setSaving(true);
      const ref = doc(db, "members", member.id);
      await updateDoc(ref, {
        nickname: form.nickname,
        avatar: form.avatar,
        color: form.color,
      });
      const snap = await getDoc(ref);
      const updated = { id: member.id, ...snap.data() };
      setMembers((prev) => prev.map((m) => (m.id === member.id ? updated : m)));
      onClose();
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      alert("❌ Không thể lưu thay đổi!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-2xl p-6 w-80 shadow-2xl border border-gray-200 dark:border-gray-700 relative animate-fadeIn transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 text-center mb-3">
          ⚙️ Thông tin nhân viên
        </h2>

        {/* Tóm tắt */}
        <div className="flex flex-col items-center gap-2 mb-4">
          {(() => {
            const Icon =
              ICONS.find((i) => i.name === form.avatar)?.icon || User;
            return (
              <div
                className="w-12 h-12 flex items-center justify-center rounded-xl shadow-inner"
                style={{ backgroundColor: form.color + "30" }}
              >
                <Icon className="w-6 h-6" style={{ color: form.color }} />
              </div>
            );
          })()}
          <div className="font-medium text-gray-800 dark:text-gray-100">
            {form.nickname || member.realName}
          </div>
        </div>

        {/* Các nút chức năng */}
        <div className="grid grid-cols-2 gap-3">
          <ActionButton
            icon={Pen}
            label="Đổi tên"
            onClick={() => setShowName(true)}
          />
          <ActionButton
            icon={User}
            label="Biểu tượng"
            onClick={() => setShowIcon(true)}
          />
        </div>

        {/* Nút Lưu & Quay lại */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-5 w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition"
        >
          <Save className="w-4 h-4" />
          {saving ? "Đang lưu..." : "Lưu & Đóng"}
        </button>

        <button
          onClick={onClose}
          className="mt-2 w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 py-2 rounded-lg text-gray-700 dark:text-gray-200 text-sm transition"
        >
          Quay lại
        </button>

        {/* Popup con - Đổi tên */}
        {showName && (
          <SmallPopup title="Đổi tên phụ" onClose={() => setShowName(false)}>
            <input
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 outline-none transition"
              placeholder="Nhập biệt danh mới..."
            />
            <button
              onClick={() => setShowName(false)}
              className="mt-3 w-full bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white py-1.5 rounded-lg text-sm transition"
            >
              Xong
            </button>
          </SmallPopup>
        )}

        {/* Popup con - Biểu tượng */}
        {showIcon && (
          <SmallPopup title="Chọn biểu tượng" onClose={() => setShowIcon(false)}>
            <div className="flex justify-center mb-3">
              {(() => {
                const Icon =
                  ICONS.find((i) => i.name === form.avatar)?.icon || User;
                return (
                  <div
                    className="w-14 h-14 flex items-center justify-center rounded-xl shadow-inner"
                    style={{ backgroundColor: form.color + "30" }}
                  >
                    <Icon className="w-7 h-7" style={{ color: form.color }} />
                  </div>
                );
              })()}
            </div>

            {/* Icon list */}
            <div className="grid grid-cols-6 gap-2 justify-items-center mb-3">
              {ICONS.map(({ name, icon: Icon }) => {
                const active = form.avatar === name;
                return (
                  <button
                    key={name}
                    onClick={() => setForm({ ...form, avatar: name })}
                    className={`p-2 rounded-lg border transition ${
                      active
                        ? "border-indigo-500 bg-indigo-100 dark:bg-indigo-900/40 scale-110"
                        : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{ color: active ? form.color : "#9ca3af" }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Color list */}
            <div className="flex flex-wrap gap-2 justify-center">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full border-2 transition ${
                    form.color === c
                      ? "border-black dark:border-white scale-110"
                      : "border-gray-300 dark:border-gray-600 hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </SmallPopup>
        )}
      </div>
    </div>
  );
}

// ==== Nút hành động chính ====
function ActionButton({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 transition"
    >
      <Icon className="w-5 h-5" />
      <span className="text-[11px]">{label}</span>
    </button>
  );
}

// ==== Popup nhỏ ====
function SmallPopup({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl p-4 w-72 shadow-xl relative animate-fadeIn transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 transition"
        >
          <X className="w-4 h-4" />
        </button>
        <h3 className="text-base font-semibold mb-3 text-center">
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}
