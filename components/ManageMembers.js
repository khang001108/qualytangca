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

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      alert("Chưa chọn nhân viên nào để xóa.");
      return;
    }
    if (!confirm(`Xóa ${selectedIds.length} nhân viên và toàn bộ dữ liệu tăng ca của họ?`))
      return;

    setLoading(true);
    try {
      for (const id of selectedIds) {
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
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Lọc theo từ khóa
  const filteredMembers = members.filter((m) => {
    const keyword = searchTerm.toLowerCase();
    return (
      m.realName?.toLowerCase().includes(keyword) ||
      m.nickname?.toLowerCase().includes(keyword)
    );
  });

  // 🔹 Format giờ
  const fmt = (n) => `${Number(n || 0).toLocaleString()}h`;

  return (
    <div className="space-y-4">
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
      <div className="overflow-x-auto border rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-2 text-center">Chọn</th>
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