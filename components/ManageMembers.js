import React, { useState, useRef, useEffect } from "react";
import { query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import dayjs from "dayjs";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Search,
  UserPlus,
  Trash2,
  Clock,
  Loader2,
  Moon,
  SunMedium,
  CircleUser,
  User,
  ListOrdered,
  BriefcaseBusiness,
  ClockArrowUp,
  ClockFading,
  CalendarClock,
  Hourglass,
  Timer,
  CalendarArrowUp,
} from "lucide-react";

import Toast from "./Toast";
import PopupSelect from "./PopupSelect";
import PopupAssignShift from "./PopupAssignShift";

export default function ManageMembers({
  user,
  selectedMonth,
  selectedYear,
  selectedDate,
  shiftSchedules = {},
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [showLimit, setShowLimit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [limitInput, setLimitInput] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [members, setMembers] = useState([]); // ✅ thêm dòng này

  const modalRef = useRef();

  const [form, setForm] = useState({
    realName: "",
    nickname: "",
    shift: "Ca ngày",
    shiftStart: "08:00", // ✅ hiển thị 08:00 ban đầu
    applyLimit: false,
  });
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "members"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        overtimeLimit: d.data().overtimeLimit || {},
      }));
      setMembers(data);
    });
    return () => unsub();
  }, [user?.uid]);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 3000);
  };

  const toggleAll = () => {
    if (selectedIds.length === members.length) setSelectedIds([]);
    else setSelectedIds(members.map((m) => m.id));
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

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

  const handleAddMember = async (e) => {
    e?.preventDefault();
    if (!form.realName.trim()) return showToast("Nhập tên thật.", "error");

    setAdding(true);
    try {
      const getDefaultLimit = () => {
        const refMember = members.find(
          (m) =>
            m.overtimeLimit &&
            typeof m.overtimeLimit.monthlyLimit === "number" &&
            m.overtimeLimit.monthlyLimit > 0
        );
        return refMember
          ? {
              monthlyLimit: refMember.overtimeLimit.monthlyLimit,
              workedHours: 0,
              remaining: refMember.overtimeLimit.monthlyLimit,
            }
          : { monthlyLimit: 0, workedHours: 0, remaining: 0 };
      };

      const payload = {
        realName: form.realName.trim(),
        nickname:
          form.nickname.trim() || form.realName.trim().charAt(0).toUpperCase(),
        shift: form.shift,
        shiftStart: form.shiftStart,
        userId: user.uid,
        createdAt: serverTimestamp(),
        overtimeLimit: form.applyLimit
          ? getDefaultLimit()
          : { monthlyLimit: 0, workedHours: 0, remaining: 0 },
      };

      const ref = await addDoc(collection(db, "members"), payload);
      setMembers([{ id: ref.id, ...payload }, ...members]);
      setForm({
        realName: "",
        nickname: "",
        shift: "Ca ngày",
        shiftStart: "07:00",
      });
      setShowAdd(false);
      showToast("Đã thêm nhân viên mới!", "success");
    } catch (err) {
      console.error("Lỗi thêm nhân viên:", err);
      showToast("Không thể thêm nhân viên.", "error");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteMembers = async () => {
    if (selectedIds.length === 0)
      return showToast("Chọn ít nhất 1 nhân viên.", "error");

    setLoading(true);
    try {
      for (const id of selectedIds) await deleteDoc(doc(db, "members", id));
      setMembers((prev) => prev.filter((m) => !selectedIds.includes(m.id)));
      setSelectedIds([]);
      showToast(`Đã xóa ${selectedIds.length} nhân viên.`, "success");
      setShowDelete(false);
    } catch (err) {
      console.error("Lỗi xóa:", err);
      showToast("Không thể xóa nhân viên.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => `${Number(n || 0).toLocaleString()}h`;

  return (
    <div className="space-y-4 text-gray-800 dark:text-gray-200">
      {/* --- Thanh công cụ --- */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm nhân viên..."
            className="border px-2 py-1 rounded-lg text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLimit(true)}
            className="flex items-center gap-1 bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm dark:bg-indigo-600 dark:hover:bg-indigo-700"
          >
            <Clock className="w-4 h-4" /> Giới hạn tăng ca
          </button>

          <button
            onClick={() => setShowAssign(true)}
            className="flex items-center gap-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg text-sm dark:bg-purple-600 dark:hover:bg-purple-700"
          >
            <CalendarArrowUp className="w-4 h-4" /> Phân ca theo ngày
          </button>

          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm dark:bg-green-600 dark:hover:bg-green-700"
          >
            <UserPlus className="w-4 h-4" /> Thêm nhân viên
          </button>

          <button
            onClick={() => setShowDelete(true)}
            className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm dark:bg-red-600 dark:hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4" /> Xóa nhân viên
          </button>
        </div>
      </div>

      {/* --- Bảng nhân viên --- */}
      <div className="overflow-x-auto border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm">
        <table className="w-full text-sm border border-gray-300 dark:border-gray-700 border-collapse rounded-xl overflow-hidden mx-auto [&_th]:border [&_td]:border [&_th]:border-gray-300 dark:[&_th]:border-gray-700 [&_td]:border-gray-300 dark:[&_td]:border-gray-700">
          <thead className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold">
            <tr>
              <th className="p-2 text-center w-12">
                <div className="flex items-center justify-center gap-1">
                  <ListOrdered className="w-4 h-4 text-blue-500" />
                  <span>STT</span>
                </div>
              </th>
              <th className="p-2 text-center w-36">
                <div className="flex items-center justify-center gap-1">
                  <CircleUser className="w-4 h-4 text-blue-500" />
                  <span>Tên Chính</span>
                </div>
              </th>
              <th className="p-2 text-center w-40">
                <div className="flex items-center justify-center gap-1">
                  <User className="w-4 h-4 text-blue-500" />
                  <span>Tên Phụ</span>
                </div>
              </th>
              <th className="p-2 text-center w-24">
                <div className="flex items-center justify-center gap-1">
                  <BriefcaseBusiness className="w-4 h-4 text-blue-500" />
                  <span>Ca</span>
                </div>
              </th>
              <th className="p-2 text-center w-20">
                <div className="flex items-center justify-center gap-1">
                  <ClockArrowUp className="w-4 h-4 text-blue-500" />
                  <span>Lên ca</span>
                </div>
              </th>
              <th className="p-2 text-center w-20">
                <div className="flex items-center justify-center gap-1">
                  <Hourglass className="w-4 h-4 text-green-500" />
                  <span>Giới hạn</span>
                </div>
              </th>
              <th className="p-2 text-center w-20">
                <div className="flex items-center justify-center gap-1">
                  <ClockFading className="w-4 h-4 text-yellow-500" />
                  <span>Đã tăng</span>
                </div>
              </th>
              <th className="p-2 text-center w-20">
                <div className="flex items-center justify-center gap-1">
                  <CalendarClock className="w-4 h-4 text-indigo-500" />
                  <span>Tổng</span>
                </div>
              </th>
              <th className="p-2 text-center w-24">
                <div className="flex items-center justify-center gap-1">
                  <Timer className="w-4 h-4 text-purple-500" />
                  <span>Lên ca sớm</span>
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="text-center">
            {members.length === 0 ? (
              <tr>
                <td
                  colSpan="9"
                  className="text-center py-4 text-gray-400 dark:text-gray-500"
                >
                  Không có nhân viên.
                </td>
              </tr>
            ) : (
              members.map((m, index) => {
                const limit = m.overtimeLimit?.monthlyLimit || 0;
                const worked = m.overtimeLimit?.workedHours || 0;
                const total = limit + worked;
                const dateStr = selectedDate
                  ? dayjs(selectedDate).format("YYYY-MM-DD")
                  : null;
                const shiftData = dateStr
                  ? shiftSchedules?.[dateStr]?.[m.realName]
                  : null;
                const shiftName = shiftData?.shift || m.shift;
                const shiftStart = shiftData?.shiftStart || m.shiftStart;

                return (
                  <tr
                    key={m.id}
                    className="hover:bg-purple-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="p-2 font-medium">{index + 1}</td>
                    <td className="p-2">{m.realName}</td>
                    <td className="p-2">{m.nickname}</td>
                    <td className="p-2">
                      {shiftName?.toLowerCase().includes("đêm") ? (
                        <div className="flex items-center justify-center gap-1">
                          <Moon className="w-4 h-4 text-blue-500" />
                          <span>Đêm</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <SunMedium className="w-4 h-4 text-yellow-500" />
                          <span>Ngày</span>
                        </div>
                      )}
                    </td>
                    <td className="p-2">{shiftStart}</td>
                    <td className="p-2 text-green-600 dark:text-green-400 font-semibold">
                      {fmt(limit)}
                    </td>
                    <td className="p-2 text-yellow-600 dark:text-yellow-400 font-semibold">
                      {fmt(worked)}
                    </td>
                    <td className="p-2 text-indigo-700 dark:text-indigo-400 font-semibold">
                      {fmt(total)}
                    </td>
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={m.earlyShift || false}
                        onChange={async (e) => {
                          const checked = e.target.checked;

                          try {
                            // 🔹 Xác định ca làm
                            const isNight = (m.shift || "")
                              .toLowerCase()
                              .includes("đêm");
                            const newShiftStart = checked
                              ? isNight
                                ? "19:00"
                                : "07:00"
                              : isNight
                              ? "20:00"
                              : "08:00";

                            // 🔹 Cập nhật UI ngay lập tức
                            setMembers((prev) =>
                              prev.map((mem) =>
                                mem.id === m.id
                                  ? {
                                      ...mem,
                                      earlyShift: checked,
                                      shiftStart: newShiftStart,
                                    }
                                  : mem
                              )
                            );

                            // 🔹 Cập nhật Firestore
                            const memberRef = doc(db, "members", m.id);
                            await updateDoc(memberRef, {
                              earlyShift: checked,
                              shiftStart: newShiftStart,
                            });

                            // 🔹 Đồng bộ shiftSchedules nếu có ngày đang chọn
                            if (selectedDate) {
                              const dateStr =
                                dayjs(selectedDate).format("YYYY-MM-DD");
                              const safeName = m.realName.replace(
                                /[\/\\.#$[\]]/g,
                                "_"
                              );
                              const docId = `${user.uid}_${safeName}_${dateStr}`;
                              const shiftDoc = doc(db, "shiftSchedules", docId);
                              await setDoc(shiftDoc, {
                                userId: user.uid,
                                realName: m.realName,
                                shift: m.shift,
                                shiftStart: newShiftStart,
                                date: dateStr,
                                updatedAt: serverTimestamp(),
                              });
                            }

                            console.log(
                              `✅ Đã cập nhật ${m.realName} → ${newShiftStart}`
                            );
                          } catch (err) {
                            console.error("❌ Lỗi cập nhật Firestore:", err);
                            alert(
                              "Không thể cập nhật Firestore. Kiểm tra console để biết chi tiết."
                            );
                          }
                        }}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* --- Popup thêm nhân viên --- */}
      {showAdd && (
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
            className="relative bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 w-11/12 max-w-md p-6 rounded-xl shadow-2xl z-10"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Thêm nhân viên</h3>
              <button
                onClick={() => setShowAdd(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3">
              {/* --- Tên chính --- */}
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Tên Chính
                </label>
                <input
                  value={form.realName}
                  onChange={(e) =>
                    setForm({ ...form, realName: e.target.value })
                  }
                  placeholder="Nhập tên chính..."
                  className="w-full border p-2 rounded mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
                  required
                />
              </div>

              {/* --- Tên phụ --- */}
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Tên Phụ
                </label>
                <input
                  value={form.nickname}
                  onChange={(e) =>
                    setForm({ ...form, nickname: e.target.value })
                  }
                  placeholder="Nhập tên phụ (tuỳ chọn)..."
                  className="w-full border p-2 rounded mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              {/* --- Chọn Ca làm việc --- */}
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Ca làm việc
                </label>
                <select
                  value={form.shift}
                  onChange={(e) => {
                    const newShift = e.target.value;
                    const newStart = newShift === "Ca đêm" ? "20:00" : "08:00"; // ✅ hiển thị 8h hoặc 20h
                    setForm({ ...form, shift: newShift, shiftStart: newStart });
                  }}
                  className="w-full border p-2 rounded mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                >
                  <option value="Ca ngày">Ca ngày</option>
                  <option value="Ca đêm">Ca đêm</option>
                </select>
              </div>

              {/* --- Giờ bắt đầu --- */}
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Giờ bắt đầu
                </label>
                <input
                  type="time"
                  value={form.shiftStart}
                  onChange={(e) =>
                    setForm({ ...form, shiftStart: e.target.value })
                  }
                  step="900" // 15 phút
                  className="w-full border p-2 rounded mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                />
              </div>

              {/* --- Checkbox giới hạn tăng ca --- */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="applyLimit"
                  checked={form.applyLimit || false}
                  onChange={(e) =>
                    setForm({ ...form, applyLimit: e.target.checked })
                  }
                  className="w-4 h-4 accent-indigo-600"
                />
                <label
                  htmlFor="applyLimit"
                  className="text-sm text-gray-700 dark:text-gray-300 select-none"
                >
                  Áp dụng giới hạn tăng ca hiện tại của nhân viên khác
                </label>
              </div>

              {/* --- Nút Lưu / Hủy --- */}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded hover:brightness-110 flex justify-center items-center gap-2 dark:bg-indigo-700 dark:hover:bg-indigo-800"
                >
                  {adding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Lưu</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLimit && (
        <PopupSelect
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

      {/* --- Popup phân ca theo ngày --- */}
      {showAssign && (
        <PopupAssignShift
          user={user}
          members={members}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onCancel={() => setShowAssign(false)}
          onSuccess={() => {
            setShowAssign(false);
            showToast("✅ Đã phân ca theo ngày!", "success");
          }}
        />
      )}

      {/* --- Popup xóa nhân viên --- */}
      {showDelete && (
        <PopupSelect
          title="Xóa nhân viên"
          confirmText="Xóa đã chọn"
          onConfirm={handleDeleteMembers}
          onCancel={() => setShowDelete(false)}
          members={members}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          toggleAll={toggleAll}
          loading={loading}
          color="red"
        />
      )}

      {/* --- Toast --- */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "" })}
        />
      )}
    </div>
  );
}
