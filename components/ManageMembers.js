import React, { useState, useRef } from "react";
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
import { Search, UserPlus, Trash2, Clock, Loader2 } from "lucide-react";
import Toast from "./Toast";
import PopupSelect from "./PopupSelect";
import PopupAssignShift from "./PopupAssignShift";

export default function ManageMembers({
  user,
  members,
  setMembers,
  selectedMonth,
  selectedYear,
  selectedDate,
  shiftSchedules = {},
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  const modalRef = useRef();

  const [showAdd, setShowAdd] = useState(false);
  const [showLimit, setShowLimit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  const [form, setForm] = useState({
    realName: "",
    nickname: "",
    shift: "Ca ngày",
    shiftStart: "07:00",
  });

  const [limitInput, setLimitInput] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // ✅ Toast
  const [toast, setToast] = useState({ message: "", type: "" });
  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 3000);
  };

  // ✅ Toggle chọn tất cả
  const toggleAll = () => {
    if (selectedIds.length === members.length) setSelectedIds([]);
    else setSelectedIds(members.map((m) => m.id));
  };

  // ✅ Toggle chọn từng người
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ✅ Giới hạn tăng ca
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

  // ✅ Thêm nhân viên mới
  const handleAddMember = async (e) => {
    e?.preventDefault();
    if (!form.realName.trim()) return showToast("Nhập tên thật.", "error");

    setAdding(true);
    try {
      const payload = {
        realName: form.realName.trim(),
        nickname:
          form.nickname.trim() || form.realName.trim().charAt(0).toUpperCase(),
        shift: form.shift,
        shiftStart: form.shiftStart,
        userId: user.uid,
        createdAt: serverTimestamp(),
        overtimeLimit: { monthlyLimit: 0, workedHours: 0, remaining: 0 },
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

  // ✅ Xóa nhân viên
  const handleDeleteMembers = async () => {
    if (selectedIds.length === 0)
      return showToast("Chọn ít nhất 1 nhân viên.", "error");

    setLoading(true);
    try {
      for (const id of selectedIds) {
        await deleteDoc(doc(db, "members", id));
      }
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
    <div className="space-y-4">
      {/* --- Thanh công cụ --- */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm nhân viên..."
            className="border px-2 py-1 rounded-lg text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
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
            🗓️ Phân ca theo ngày
          </button>

          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm"
          >
            <UserPlus className="w-4 h-4" /> Thêm nhân viên
          </button>

          <button
            onClick={() => setShowDelete(true)}
            className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm"
          >
            <Trash2 className="w-4 h-4" /> Xóa nhân viên
          </button>
        </div>
      </div>

      {/* --- Bảng nhân viên --- */}
      <div className="overflow-x-auto border rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-2 text-center w-10">STT</th>
              <th className="p-2 text-left">Tên thật</th>
              <th className="p-2 text-left">Biệt danh</th>
              <th className="p-2 text-center">Ca</th>
              <th className="p-2 text-center">Lên ca</th>
              <th className="p-2 text-center">Giới hạn</th>
              <th className="p-2 text-center">Đã tăng</th>
              <th className="p-2 text-center">Tổng</th>
              <th className="p-2 text-center">Lên ca sớm</th>

            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-4 text-gray-400">
                  Không có nhân viên.
                </td>
              </tr>
            ) : (
              members
                .filter(
                  (m) =>
                    m.realName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    m.nickname.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((m, index) => {
                  const limit = m.overtimeLimit?.monthlyLimit || 0;
                  const worked = m.overtimeLimit?.workedHours || 0;
                  const total = limit + worked;

                  return (
                    <tr key={m.id} className="border-t hover:bg-gray-50">
                      {/* ✅ Cột số thứ tự */}
                      <td className="p-2 text-center font-medium">{index + 1}</td>

                      <td className="p-2 font-medium">{m.realName}</td>
                      <td className="p-2">{m.nickname}</td>

                      {(() => {
                        let dateStr = null;
                        if (selectedDate) {
                          dateStr = dayjs(selectedDate).format("YYYY-MM-DD");
                        }
                        const shiftData = dateStr ? shiftSchedules?.[dateStr]?.[m.realName] : null;
                        const shiftName = shiftData?.shift || m.shift;
                        const shiftStart = shiftData?.shiftStart || m.shiftStart;

                        return (
                          <>
                            <td className="p-2 text-center">
                              {shiftName?.toLowerCase().includes("đêm") ? "🌙 Đêm" : "☀️ Ngày"}
                            </td>
                            <td className="p-2 text-center">{shiftStart}</td>
                          </>
                        );
                      })()}

                      <td className="p-2 text-center text-blue-600 font-semibold">
                        {fmt(limit)}
                      </td>
                      <td className="p-2 text-center text-emerald-600 font-semibold">
                        {fmt(worked)}
                      </td>
                      <td className="p-2 text-center text-indigo-700 font-semibold">
                        {fmt(total)}
                      </td>

                      {/* ✅ Cột "Lên ca sớm" */}
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={m.earlyShift || false}
                          onChange={async (e) => {
                            const checked = e.target.checked;

                            // cập nhật tại chỗ trong state
                            const updated = members.map((mem) => {
                              if (mem.id !== m.id) return mem;

                              const isNight = mem.shift?.toLowerCase().includes("đêm");
                              const newShiftStart = checked
                                ? isNight
                                  ? "19:00"
                                  : "07:00"
                                : isNight
                                  ? "20:00"
                                  : "08:00";

                              return {
                                ...mem,
                                earlyShift: checked,
                                shiftStart: newShiftStart,
                              };
                            });

                            setMembers(updated);

                            // 🔥 cập nhật Firestore
                            const ref = doc(db, "members", m.id);
                            const isNight = m.shift?.toLowerCase().includes("đêm");
                            const newShiftStart = checked
                              ? isNight
                                ? "19:00"
                                : "07:00"
                              : isNight
                                ? "20:00"
                                : "08:00";

                            await updateDoc(ref, {
                              earlyShift: checked,
                              shiftStart: newShiftStart,
                            });
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
            className="relative bg-white w-11/12 max-w-md p-6 rounded-xl shadow-2xl z-10"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Thêm nhân viên</h3>
              <button
                onClick={() => setShowAdd(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Tên thật</label>
                <input
                  value={form.realName}
                  onChange={(e) =>
                    setForm({ ...form, realName: e.target.value })
                  }
                  className="w-full border p-2 rounded mt-1"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Biệt danh</label>
                <input
                  value={form.nickname}
                  onChange={(e) =>
                    setForm({ ...form, nickname: e.target.value })
                  }
                  className="w-full border p-2 rounded mt-1"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded hover:brightness-110 flex justify-center items-center gap-2"
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
                  className="flex-1 bg-gray-200 py-2 rounded hover:bg-gray-300"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Popup Giới hạn tăng ca --- */}
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
          user={user}                  // ✅ thêm truyền user
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
