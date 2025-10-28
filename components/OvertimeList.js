import { useEffect, useState, useRef, useMemo } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { Trash2, CalendarDays } from "lucide-react";
import { db } from "../lib/firebase";
import DatePicker from "react-datepicker";
import { vi } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

export default function OvertimeList({ user, items, setItems, selectedMonth, selectedYear }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchDate, setSearchDate] = useState(null);
  const [openCalendar, setOpenCalendar] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔹 Lấy dữ liệu Firestore
  useEffect(() => {
    if (!user || selectedMonth == null || selectedYear == null) return setItems([]);

    const q = query(
      collection(db, "overtimes"),
      where("userId", "==", user.uid),
      where("month", "==", Number(selectedMonth)),
      where("year", "==", Number(selectedYear)),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) =>
      setItems(
        snap.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            date: x.date || "",
            hours: x.hours || 0,
            note: x.note || "",
            month: x.month ?? null,
            year: x.year ?? null,
            createdAt: x.createdAt ? x.createdAt.toDate() : new Date(x.date),
          };
        })
      )
    );

    return unsub;
  }, [user, selectedMonth, selectedYear, setItems]);

  // 🧭 Lọc theo ngày
  const filtered = useMemo(
    () =>
      searchDate
        ? items.filter((i) => i.date?.startsWith(searchDate.toLocaleDateString("en-CA")))
        : items,
    [items, searchDate]
  );

  const remove = async (id) => {
    await deleteDoc(doc(db, "overtimes", id));
    setConfirmDelete(null);
  };

  return (
    <>
      <div className="w-full bg-white p-6 md:p-10 rounded-2xl shadow-lg border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-5 gap-3">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            ⏱️ Tăng ca tháng {selectedMonth + 1}/{selectedYear}
          </h2>

          <button
            onClick={() => setOpenCalendar(true)}
            className="flex items-center gap-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-xl shadow hover:brightness-110 active:scale-95 text-sm"
          >
            <CalendarDays className="w-4 h-4" /> Ngày
          </button>
        </div>

        {loading ? (
          <p className="text-center py-10 text-gray-500 animate-pulse">Đang tải dữ liệu...</p>
        ) : !filtered.length ? (
          <p className="text-center py-10 text-gray-400">Không có ngày tăng ca nào.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto pr-2 space-y-3">
            {filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="relative flex justify-between items-center p-4 bg-gradient-to-r from-white to-blue-50 border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xl shadow-inner">
                    ⏱️
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-base">
                      {new Date(item.date).toLocaleDateString("vi-VN")}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{item.note || "Không có ghi chú"}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <p className="text-lg font-bold text-blue-600">{item.hours} giờ</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(item.id);
                    }}
                    className="p-1 rounded-lg bg-gray-500 text-white hover:bg-red-600 active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-5 text-center text-sm text-gray-600 font-medium">
          🧾 Tổng: {filtered.length} ngày tăng ca
        </p>
      </div>

      {openCalendar && (
        <Popup onClose={() => setOpenCalendar(false)}>
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Chọn ngày cần lọc</h3>
          <DatePicker
            selected={searchDate}
            onChange={(d) => setSearchDate(d)}
            inline
            locale={vi}
            dateFormat="dd/MM/yyyy"
          />
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setSearchDate(null)}
              className="border px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              Xóa lọc
            </button>
            <button
              onClick={() => setOpenCalendar(false)}
              className="bg-blue-500 text-white px-4 py-1.5 rounded-lg hover:brightness-110"
            >
              Đóng
            </button>
          </div>
        </Popup>
      )}

      {selectedItem && (
        <OvertimeDetailPopup item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}

      {confirmDelete && (
        <Popup onClose={() => setConfirmDelete(null)}>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Xóa ngày tăng ca?</h3>
          <p className="text-sm text-gray-500 mb-4">Thao tác này không thể hoàn tác.</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setConfirmDelete(null)}
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
            >
              Hủy
            </button>
            <button
              onClick={() => remove(confirmDelete)}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white"
            >
              Xóa
            </button>
          </div>
        </Popup>
      )}
    </>
  );
}

function Popup({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div className="bg-white p-6 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function OvertimeDetailPopup({ item, onClose }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-blue-100 w-11/12 max-w-md p-6 rounded-2xl shadow-2xl z-10">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Chi tiết tăng ca</h3>
        <div className="space-y-2 text-gray-700">
          <p><b>📅 Ngày:</b> {new Date(item.date).toLocaleDateString("vi-VN")}</p>
          <p><b>⏱️ Giờ tăng ca:</b> {item.hours} giờ</p>
          <p><b>🗓 Tháng/Năm:</b> {(item.month ?? 0) + 1} / {item.year ?? "?"}</p>
          <p><b>📝 Ghi chú:</b> {item.note || "Không có"}</p>
        </div>
        <div className="flex justify-end mt-5">
          <button
            onClick={onClose}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:brightness-110"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
