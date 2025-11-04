<<<<<<< HEAD
import React, { useState, useRef } from "react";
import { db } from "../lib/firebase";
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

export default function ManageMembers({ user, members, setMembers }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  const modalRef = useRef();
  const popupRef = useRef();

  const [showAdd, setShowAdd] = useState(false);
  const [showLimit, setShowLimit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

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
=======
import React, { useState } from "react";
import { Trash2, Search } from "lucide-react";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";

export default function ManageMembers({
  user,
  members,
  setMembers,
  selectedMonth,
  selectedYear,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

>>>>>>> 00b5a7d4d8074ab515c5a0cfd8488287c1d29056
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

<<<<<<< HEAD
  // ✅ Giới hạn tăng ca
  const handleSetLimit = async () => {
    const val = Number(limitInput);
    if (!val || val <= 0) return showToast("Nhập số giờ hợp lệ.", "error");
    if (selectedIds.length === 0)
      return showToast("Chọn ít nhất 1 nhân viên.", "error");
=======
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      alert("Chưa chọn nhân viên nào để xóa.");
      return;
    }
    if (!confirm(`Xóa ${selectedIds.length} nhân viên và toàn bộ dữ liệu tăng ca của họ?`))
      return;
>>>>>>> 00b5a7d4d8074ab515c5a0cfd8488287c1d29056

    setLoading(true);
    try {
      for (const id of selectedIds) {
<<<<<<< HEAD
        const ref = doc(db, "members", id);
        const m = members.find((mm) => mm.id === id);
        const newLimit = {
          monthlyLimit: val,
          workedHours: 0,
          remaining: val,
        };
        await updateDoc(ref, { overtimeLimit: newLimit });
        m.overtimeLimit = newLimit;
      }
      setMembers([...members]);
      setSelectedIds([]); // ✅ bỏ tích tất cả
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
      setSelectedIds([]); // ✅ bỏ tích tất cả
      showToast(`Đã xóa ${selectedIds.length} nhân viên.`, "success");
      setShowDelete(false);
    } catch (err) {
      console.error("Lỗi xóa:", err);
      showToast("Không thể xóa nhân viên.", "error");
=======
        const member = members.find((m) => m.id === id);
        if (!member) continue;

        // 1️⃣ Xóa bản ghi nhân viên
        await deleteDoc(doc(db, "members", id));

        // 2️⃣ Xóa toàn bộ record overtime của nhân viên đó
        const q = query(
          collection(db, "overtimes"),
          where("userId", "==", user.uid),
          where("realName", "==", member.realName)
        );
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map((o) => deleteDoc(doc(db, "overtimes", o.id))));
      }

      setMembers((prev) => prev.filter((m) => !selectedIds.includes(m.id)));
      alert("✅ Đã xóa nhân viên và toàn bộ dữ liệu tăng ca liên quan.");
      setSelectedIds([]);
    } catch (err) {
      console.error("Lỗi xóa nhân viên:", err);
      alert("❌ Lỗi khi xóa nhân viên.");
>>>>>>> 00b5a7d4d8074ab515c5a0cfd8488287c1d29056
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
=======
  // 🔍 Lọc theo từ khóa
  const filteredMembers = members.filter((m) => {
    const keyword = searchTerm.toLowerCase();
    return (
      m.realName?.toLowerCase().includes(keyword) ||
      m.nickname?.toLowerCase().includes(keyword)
    );
  });

  // 🔹 Format giờ
>>>>>>> 00b5a7d4d8074ab515c5a0cfd8488287c1d29056
  const fmt = (n) => `${Number(n || 0).toLocaleString()}h`;

  return (
    <div className="space-y-4">
<<<<<<< HEAD
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
            onClick={() => setShowDelete(true)}
            className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm"
          >
            <Trash2 className="w-4 h-4" /> Xóa nhân viên
          </button>

          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm"
          >
            <UserPlus className="w-4 h-4" /> Thêm nhân viên
          </button>
        </div>
      </div>

      {/* --- Bảng nhân viên --- */}
=======
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-indigo-600">
          👥 Quản lý nhân viên
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm nhân viên..."
              className="pl-8 pr-3 py-1 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <span className="text-gray-500 text-sm">
            Tổng: {filteredMembers.length}
          </span>
        </div>
      </div>

      {/* Tháng hiển thị */}
      <div className="text-right text-sm text-gray-600 font-medium">
        📅 Tháng {selectedMonth}/{selectedYear}
      </div>

      {/* Bảng nhân viên */}
>>>>>>> 00b5a7d4d8074ab515c5a0cfd8488287c1d29056
      <div className="overflow-x-auto border rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
<<<<<<< HEAD
=======
              <th className="p-2 text-center">Chọn</th>
>>>>>>> 00b5a7d4d8074ab515c5a0cfd8488287c1d29056
              <th className="p-2 text-left">Tên thật</th>
              <th className="p-2 text-left">Biệt danh</th>
              <th className="p-2 text-center">Ca</th>
              <th className="p-2 text-center">Lên ca</th>
              <th className="p-2 text-center">Giới hạn</th>
              <th className="p-2 text-center">Đã tăng</th>
              <th className="p-2 text-center">Tổng</th>
            </tr>
          </thead>
          <tbody>
<<<<<<< HEAD
            {members.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-4 text-gray-400">
                  Không có nhân viên.
                </td>
              </tr>
            ) : (
              members.map((m) => {
                const limit = m.overtimeLimit?.monthlyLimit || 0;
                const worked = m.overtimeLimit?.workedHours || 0;
                const total = limit + worked;
                return (
                  <tr key={m.id} className="border-t hover:bg-gray-50">
                    <td className="p-2 font-medium">{m.realName}</td>
                    <td className="p-2">{m.nickname}</td>
=======
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-4 text-gray-400">
                  Không có nhân viên nào.
                </td>
              </tr>
            ) : (
              filteredMembers.map((m) => {
                const limit = m.overtimeLimit?.monthlyLimit || 0;
                const worked = m.overtimeLimit?.workedHours || 0;
                const total = limit + worked;

                return (
                  <tr
                    key={m.id}
                    className={`border-t hover:bg-gray-50 ${
                      selectedIds.includes(m.id) ? "bg-indigo-50" : ""
                    }`}
                  >
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(m.id)}
                        onChange={() => toggleSelect(m.id)}
                      />
                    </td>
                    <td className="p-2 font-medium">{m.realName}</td>
                    <td className="p-2">{m.nickname || "-"}</td>
>>>>>>> 00b5a7d4d8074ab515c5a0cfd8488287c1d29056
                    <td className="p-2 text-center">
                      {m.shift?.toLowerCase().includes("đêm")
                        ? "🌙 Đêm"
                        : "☀️ Ngày"}
                    </td>
                    <td className="p-2 text-center">{m.shiftStart}</td>
                    <td className="p-2 text-center text-blue-600 font-semibold">
                      {fmt(limit)}
                    </td>
                    <td className="p-2 text-center text-emerald-600 font-semibold">
                      {fmt(worked)}
                    </td>
                    <td className="p-2 text-center text-indigo-700 font-semibold">
                      {fmt(total)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

<<<<<<< HEAD
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

              <div>
                <label className="text-sm text-gray-600">Ca</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {["Ca ngày", "Ca đêm", "Full ngày", "Full đêm"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          shift: s,
                          shiftStart: s.includes("đêm") ? "19:00" : "07:00",
                        })
                      }
                      className={`py-2 rounded-lg border ${
                        form.shift === s
                          ? "bg-indigo-50 border-indigo-400"
                          : "border-gray-200"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600">Lên ca</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {["07:00", "08:00", "19:00", "20:00"].map((time) => {
                    const label = {
                      "07:00": "Sáng sớm",
                      "08:00": "Sáng muộn",
                      "19:00": "Tối sớm",
                      "20:00": "Tối muộn",
                    }[time];
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setForm({ ...form, shiftStart: time })}
                        className={`flex-1 py-2 rounded-lg border ${
                          form.shiftStart === time
                            ? "bg-yellow-50 border-yellow-400"
                            : "border-gray-200"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded hover:brightness-110 flex justify-center items-center gap-2"
                  l
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

/* --- Component popup tái sử dụng --- */
function PopupSelect({
  title,
  confirmText,
  onConfirm,
  onCancel,
  members,
  selectedIds,
  toggleSelect,
  toggleAll,
  inputValue,
  setInputValue,
  loading,
  color,
}) {
  const ref = useRef();

  // ✅ Khắc phục lỗi Tailwind dynamic color
  const colorClass =
    color === "red"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-indigo-600 hover:bg-indigo-700";
  const textColor = color === "red" ? "text-red-600" : "text-indigo-600";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={(e) =>
        ref.current && !ref.current.contains(e.target) && onCancel()
      }
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        ref={ref}
        className="relative bg-white w-11/12 max-w-lg p-6 rounded-xl shadow-2xl z-10"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className={`text-lg font-semibold ${textColor}`}>{title}</h3>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-800"
          >
            ✕
          </button>
        </div>

        {setInputValue && (
          <div className="mb-3">
            <label className="text-sm text-gray-600">
              Giới hạn (giờ/tháng)
            </label>
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Nhập số giờ hợp lệ"
              className="w-full border p-2 rounded mt-1"
            />
          </div>
        )}

        <div className="flex justify-between items-center mb-1">
          <label className="text-sm text-gray-600">Chọn nhân viên</label>
          <button
            type="button"
            onClick={toggleAll}
            className={`text-xs ${textColor} hover:underline`}
          >
            {selectedIds.length === members.length
              ? "Bỏ chọn tất cả"
              : "Chọn tất cả"}
          </button>
        </div>

        <div className="border rounded-lg max-h-60 overflow-y-auto p-2 space-y-1">
          {members.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">
              Không có nhân viên.
            </p>
          ) : (
            members.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(m.id)}
                  onChange={() => toggleSelect(m.id)}
                />
                <span className="font-medium">{m.realName}</span>
                <span className="text-gray-500">({m.nickname})</span>
              </label>
            ))
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 min-w-[120px] bg-gray-200 rounded hover:bg-gray-300 text-gray-700"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-6 py-2 min-w-[120px] rounded hover:brightness-110 flex justify-center items-center gap-2 ${colorClass} text-white`}
          >
            {loading ? (
              <>
                <span>Đang lưu...</span>
                <Loader2 className="w-5 h-5 mx-auto animate-spin" />
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
=======
      <div className="flex justify-between mt-4">
        <button
          onClick={handleDeleteSelected}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
        >
          <Trash2 className="w-4 h-4" />
          {loading ? "Đang xóa..." : "Xóa nhân viên đã chọn"}
        </button>
      </div>
    </div>
  );
}
>>>>>>> 00b5a7d4d8074ab515c5a0cfd8488287c1d29056
