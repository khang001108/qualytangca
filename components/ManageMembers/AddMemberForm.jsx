import React, { useState, useRef } from "react";
import { addDoc, collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Loader2, UserPlus, Undo2 } from "lucide-react";
import dayjs from "dayjs";

export default function AddMemberForm({ user, setShowAdd, members, setMembers, showToast }) {
  const modalRef = useRef();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    realName: "",
    nickname: "",
    shift: "Ca ngày",
    shiftStart: "08:00",
    applyLimit: false,
  });

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!form.realName.trim()) return showToast("Nhập tên chính.", "error");
    setAdding(true);

    try {
      const getDefaultLimit = () => {
        const refMember = members.find((m) => m.overtimeLimit?.monthlyLimit > 0);
        return refMember
          ? {
              monthlyLimit: refMember.overtimeLimit.monthlyLimit,
              workedHours: 0,
              remaining: refMember.overtimeLimit.monthlyLimit,
            }
          : { monthlyLimit: 0, workedHours: 0, remaining: 0 };
      };

      const today = dayjs().format("YYYY-MM-DD");

      const payload = {
        realName: form.realName.trim(),
        nickname:
          form.nickname.trim() || form.realName.trim().charAt(0).toUpperCase(),
        shift: form.shift,
        shiftStart: form.shiftStart,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedDate: today,
        overtimeLimit: form.applyLimit
          ? getDefaultLimit()
          : { monthlyLimit: 0, workedHours: 0, remaining: 0 },
      };

      // ✅ Tạo nhân viên trong "members"
      const ref = await addDoc(collection(db, "members"), payload);
      const newMember = { id: ref.id, ...payload };
      setMembers([newMember, ...members]);

      // ✅ Tự động tạo bản ghi shiftSchedules cho hôm nay
      const safeName = form.realName.replace(/[\/\\.#$[\]]/g, "_");
      const docId = `${user.uid}_${safeName}_${today}`;
      await setDoc(doc(db, "shiftSchedules", docId), {
        userId: user.uid,
        realName: form.realName.trim(),
        memberId: ref.id,
        shift: form.shift,
        shiftStart: form.shiftStart,
        date: today,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setShowAdd(false);
      showToast("✅ Đã thêm nhân viên mới và ghi ca hôm nay!", "success");
    } catch (err) {
      console.error("❌ Lỗi khi thêm nhân viên:", err);
      showToast("Không thể thêm nhân viên mới.", "error");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={(e) =>
        modalRef.current &&
        !modalRef.current.contains(e.target) &&
        setShowAdd(false)
      }
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        ref={modalRef}
        className="relative bg-white dark:bg-gray-800 w-11/12 max-w-md p-6 rounded-xl shadow-2xl text-gray-800 dark:text-gray-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-3">Thêm nhân viên</h3>
        <form onSubmit={handleAddMember} className="space-y-3">
          <div>
            <label>Tên chính</label>
            <input
              value={form.realName}
              onChange={(e) => setForm({ ...form, realName: e.target.value })}
              className="w-full border p-2 rounded mt-1 bg-gray-100 dark:bg-gray-700"
              required
            />
          </div>

          <div>
            <label>Tên phụ</label>
            <input
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              className="w-full border p-2 rounded mt-1 bg-gray-100 dark:bg-gray-700"
            />
          </div>

          <div>
            <label>Ca làm việc</label>
            <select
              value={form.shift}
              onChange={(e) => {
                const val = e.target.value;
                const start = val === "Ca đêm" ? "20:00" : "08:00";
                setForm({ ...form, shift: val, shiftStart: start });
              }}
              className="w-full border p-2 rounded mt-1 bg-gray-100 dark:bg-gray-700"
            >
              <option value="Ca ngày">Ca ngày</option>
              <option value="Ca đêm">Ca đêm</option>
            </select>
          </div>

          <div>
            <label>Giờ bắt đầu</label>
            <input
              type="text"
              value={form.shiftStart}
              onChange={(e) => setForm({ ...form, shiftStart: e.target.value })}
              placeholder="08:00 hoặc 20:00"
              className="w-full border p-2 rounded mt-1 bg-gray-100 dark:bg-gray-700"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.applyLimit}
              onChange={(e) => setForm({ ...form, applyLimit: e.target.checked })}
            />
            <span>Áp dụng giới hạn tăng ca của nhân viên khác</span>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              type="submit"
              disabled={adding}
              className="flex-1 bg-indigo-600 text-white py-2 rounded flex justify-center items-center gap-2"
            >
              {adding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {adding ? "Đang lưu..." : "Lưu"}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="flex-1 bg-gray-300 dark:bg-gray-700 py-2 rounded"
            >
              <Undo2 className="w-4 h-4 inline-block mr-1" />
              Quay lại
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
