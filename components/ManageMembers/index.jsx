// components/ManageMembers/index.jsx
// Quản lý nhân viên: thêm, xóa, phân ca, giới hạn tăng ca

    
import React, { useState, useEffect } from "react";
import AddMemberForm from "./AddMemberForm";
import LimitSelector from "./LimitSelector";
import DeleteConfirm from "./DeleteConfirm";
import ShiftAssign from "./ShiftAssign";
import OvertimeConfigPopup from "./overtimeConfig/OvertimeConfigPopup";
import MembersTable from "./MembersTable";
import useMembersData from "./hooks/useMembersData";
import dayjs from "dayjs";
import Toast from "../Toast";

import { Clock, UserPlus, Trash2, CalendarArrowUp } from "lucide-react";
import {
  doc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function ManageMembers({
  user,
  selectedMonth,
  selectedYear,
  selectedDate,
  setToast,
}) {
  const { members, setMembers, toast, showToast } = useMembersData(user);

  const [showAdd, setShowAdd] = useState(false);
  const [showLimit, setShowLimit] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showFormula, setShowFormula] = useState(false);

  const [limitInput, setLimitInput] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shiftSchedules, setShiftSchedules] = useState({});

  // === Load shiftSchedules realtime
  useEffect(() => {
    if (!user?.uid) return;

    const safeDate = selectedDate ? dayjs(selectedDate) : dayjs();
    const start = safeDate.startOf("month").format("YYYY-MM-DD");
    const end = safeDate.endOf("month").format("YYYY-MM-DD");

    const q = query(
      collection(db, "shiftSchedules"),
      where("userId", "==", user.uid),
      where("date", ">=", start),
      where("date", "<=", end)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = {};
      snap.docs.forEach((d) => {
        const item = d.data();
        if (!data[item.date]) data[item.date] = {};
        data[item.date][item.realName] = {
          shift: item.shift,
          shiftStart: item.shiftStart,
          memberId: item.memberId || null,
        };
      });
      setShiftSchedules(data);
    });

    return () => unsub();
  }, [user?.uid, selectedDate]);

  // --- chọn / bỏ chọn nhân viên ---
  const toggleAll = () => {
    if (selectedIds.length === members.length) setSelectedIds([]);
    else setSelectedIds(members.map((m) => m.id));
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // --- cập nhật giới hạn tăng ca ---
  const handleSetLimit = async () => {
    const val = Number(limitInput);
    if (!val || val <= 0) return showToast("Nhập số giờ hợp lệ.", "error");
    if (selectedIds.length === 0)
      return showToast("Chọn ít nhất 1 nhân viên.", "error");

    setLoading(true);
    try {
      for (const id of selectedIds) {
        const ref = doc(db, "members", id);
        const m = members.find((mm) => mm.id === id);
        const newLimit = {
          monthlyLimit: val,
          workedHours: 0,
          remaining: val,
        };
        await updateDoc(ref, { overtimeLimit: newLimit });
        if (m) m.overtimeLimit = newLimit;
      }
      setMembers([...members]);
      setSelectedIds([]);
      setLimitInput("");
      showToast(
        `Đặt giới hạn ${val}h cho ${selectedIds.length} nhân viên.`,
        "success"
      );
      setShowLimit(false);
    } catch (err) {
      console.error("Lỗi Giới hạn tăng ca:", err);
      showToast("Không thể Giới hạn tăng ca.", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- xóa nhân viên + toàn bộ phân ca ---
  const handleDeleteMembers = async () => {
    if (selectedIds.length === 0)
      return showToast("Chọn ít nhất 1 nhân viên.", "error");

    setLoading(true);
    try {
      for (const id of selectedIds) {
        const member = members.find((m) => m.id === id);
        if (!member) continue;

        await deleteDoc(doc(db, "members", id));

        const qShift = query(
          collection(db, "shiftSchedules"),
          where("userId", "==", user.uid),
          where("memberId", "==", id)
        );
        const snap = await getDocs(qShift);
        for (const d of snap.docs)
          await deleteDoc(doc(db, "shiftSchedules", d.id));

        console.log(
          `🗑️ Đã xóa nhân viên ${member.realName} và các ca liên quan.`
        );
      }

      setMembers((prev) => prev.filter((m) => !selectedIds.includes(m.id)));
      setSelectedIds([]);
      showToast(
        `Đã xóa ${selectedIds.length} nhân viên và toàn bộ ca liên quan.`,
        "caution"
      );
      setShowDelete(false);
    } catch (err) {
      console.error("Lỗi xóa nhân viên:", err);
      showToast("Không thể xóa nhân viên.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-gray-800 dark:text-gray-200">
      {/* Toolbar */}
      <div className="flex items-center gap-2 justify-between">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowLimit(true)}
            className="flex items-center gap-1 bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm"
          >
            <Clock className="w-4 h-4" /> Giới hạn tăng ca
          </button>

          <button
            onClick={() => setShowAssign(true)}
            className="flex items-center gap-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg text-sm"
          >
            <CalendarArrowUp className="w-4 h-4" /> Phân ca theo ngày
          </button>

          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm"
          >
            <UserPlus className="w-4 h-4" /> Thêm nhân viên
          </button>

          <button
            onClick={() => setShowFormula(true)}
            className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm"
          >
            <Clock className="w-4 h-4" /> Cấu hình tăng ca
          </button>

          <button
            onClick={() => setShowDelete(true)}
            className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm"
          >
            <Trash2 className="w-4 h-4" /> Xóa nhân viên
          </button>
        </div>
      </div>

      {/* 🔹 Bảng nhân viên — chỉ cuộn trong bảng */}
      <div className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-800/30">
        <MembersTable
          members={members}
          setMembers={setMembers}
          user={user}
          selectedDate={selectedDate}
          shiftSchedules={shiftSchedules}
        />
      </div>

      {/* Popups */}
      {showAdd && (
        <AddMemberForm
          user={user}
          setShowAdd={setShowAdd}
          members={members}
          setMembers={setMembers}
          showToast={showToast}
        />
      )}

      {showLimit && (
        <LimitSelector
          title="Giới hạn tăng ca"
          confirmText="Lưu thay đổi"
          onConfirm={handleSetLimit}
          onCancel={() => setShowLimit(false)}
          members={members}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          toggleAll={toggleAll}
          inputValue={limitInput}
          setInputValue={setLimitInput}
          loading={loading}
          color="indigo"
        />
      )}

      {showAssign && (
        <ShiftAssign
          user={user}
          members={members}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onCancel={() => setShowAssign(false)}
          onStatusChange={({ loading, success, month }) => {
            if (loading) {
              setToast({
                msg: "Đang lưu phân ca... ",
                type: "loading",
              });
            } else if (success) {
              setToast({
                msg: `✅ Phân ca tháng ${month} hoàn tất.`,
                type: "success",
              });
              setShowAssign(false);
            } else {
              setToast({
                type: "error",
                msg: "❌ Lỗi khi lưu phân ca!",
              });
            }
          }}
        />
      )}

      {showFormula && (
        <OvertimeConfigPopup
          user={user}
          onClose={() => setShowFormula(false)}
          showToast={showToast}
        />
      )}

      {showDelete && (
        <DeleteConfirm
          members={members}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          toggleAll={toggleAll}
          loading={loading}
          onConfirm={handleDeleteMembers}
          onCancel={() => setShowDelete(false)}
        />
      )}

      <Toast
        toasts={
          toast.message
            ? [{ id: Date.now(), message: toast.message, type: toast.type }]
            : []
        }
        onClose={() => {}}
      />

    </div>
  );
}
