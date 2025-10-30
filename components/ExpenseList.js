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
import { getZodiacForMonth } from "../utils/zodiacUtils";

// 💰 Định dạng số rút gọn
const formatNumberShort = (num) =>
  num >= 1_000_000
    ? `${(num / 1_000_000).toFixed(num % 1_000_000 ? 1 : 0)}M ₫`
    : num >= 1_000
      ? `${(num / 1_000).toFixed(num % 1_000 ? 1 : 0)}k ₫`
      : `${num}₫`;

export default function ExpenseList({ user, items, setItems, selectedMonth, selectedYear }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [sortType, setSortType] = useState("newest");
  const [searchDate, setSearchDate] = useState(null);
  const [openCalendar, setOpenCalendar] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔹 Lấy dữ liệu Firestore
  useEffect(() => {
    if (!user || selectedMonth == null || selectedYear == null) return setItems([]);

    const q = query(
      collection(db, "expenses"),
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
            name: x.name || "",
            amount: Number(String(x.amount).replace(/,/g, "")) || 0,
            date: x.date || "",
            month: x.month ?? null,
            year: x.year ?? null,
            createdAt: x.createdAt ? x.createdAt.toDate() : new Date(x.date),
          };
        })
      )
    );

    return unsub;
  }, [user, selectedMonth, selectedYear, setItems]);

  // 🧭 Lọc & sắp xếp
  const filtered = useMemo(
    () =>
      searchDate
        ? items.filter((i) => i.date?.startsWith(searchDate.toLocaleDateString("en-CA")))
        : items,
    [items, searchDate]
  );

  const sorted = useMemo(() => {
    const c = [...filtered];
    const compare = {
      high: (a, b) => b.amount - a.amount,
      low: (a, b) => a.amount - b.amount,
      oldest: (a, b) => a.createdAt - b.createdAt,
      newest: (a, b) => b.createdAt - a.createdAt,
    }[sortType];
    return c.sort(compare);
  }, [filtered, sortType]);

  const remove = async (id) => {
    await deleteDoc(doc(db, "expenses", id));
    setConfirmDelete(null);
  };

  return (
    <>
      <div className="w-full bg-white p-6 md:p-10 rounded-2xl shadow-lg border border-gray-100">
        {/* 🔸 Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-5 gap-3">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            📋 Chi tiêu tháng {selectedMonth + 1}/{selectedYear}
            <span className="text-2xl animate-bounce-slow inline-block">
              {getZodiacForMonth(selectedMonth, selectedYear)}
            </span>
          </h2>


          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpenCalendar(true)}
              className="flex items-center gap-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-xl shadow hover:brightness-110 active:scale-95 text-sm"
            >
              <CalendarDays className="w-4 h-4" /> Ngày
            </button>

            <select
              value={sortType}
              onChange={(e) => setSortType(e.target.value)}
              className="border rounded-xl text-sm px-3 py-2 focus:ring-2 focus:ring-orange-400"
            >
              <option value="newest">🕒 Mới nhất</option>
              <option value="oldest">🕓 Cũ nhất</option>
              <option value="high">💸 Tiêu nhiều</option>
              <option value="low">💰 Tiêu ít</option>
            </select>
          </div>
        </div>

        {/* 🔹 Danh sách */}
        {loading ? (
          <p className="text-center py-10 text-gray-500 animate-pulse">Đang tải dữ liệu...</p>
        ) : !sorted.length ? (
          <p className="text-center py-10 text-gray-400">Không có khoản chi nào.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto pr-2 space-y-3">
            {sorted.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="relative flex justify-between items-center p-4 bg-gradient-to-r from-white to-orange-50 border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-[2px] active:scale-[0.98] transition-all"
              >
                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-orange-400 to-orange-600 rounded-l-2xl" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-100 text-orange-600 text-xl shadow-inner">
                    <span className="text-2xl animate-bounce-slow inline-block">
                      💸
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-base">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      📅 {new Date(item.date).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <p className="text-lg font-bold text-red-500">
                    {formatNumberShort(item.amount)}
                  </p>
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
          🧾 Tổng: {sorted.length} khoản chi
        </p>
      </div>

      {/* 📅 Popup chọn ngày */}
      {openCalendar && (
        <Popup onClose={() => setOpenCalendar(false)}>
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Chọn ngày cần lọc</h3>
          <DatePicker
            selected={searchDate}
            onChange={(d) => setSearchDate(d)}
            inline
            locale={vi}
            dateFormat="dd/MM/yyyy"
            onMonthChange={() => { }} // cần để tránh cảnh báo
            openToDate={
              searchDate ||
              new Date(selectedYear, selectedMonth, 1) // 💡 mặc định mở đúng tháng/năm đang chọn
            }
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
              className="bg-orange-500 text-white px-4 py-1.5 rounded-lg hover:brightness-110"
            >
              Đóng
            </button>
          </div>
        </Popup>
      )}

      {/* 🔸 Popup chi tiết */}
      {selectedItem && <ExpenseDetailPopup item={selectedItem} onClose={() => setSelectedItem(null)} />}

      {/* 🔸 Popup xác nhận xóa */}
      {confirmDelete && (
        <Popup onClose={() => setConfirmDelete(null)}>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Xóa khoản chi này?</h3>
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

/* ==============================
   📦 Popup khung dùng chung
================================ */
function Popup({ children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}>
      <div
        className="bg-white p-6 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/* ==============================
   📋 Popup chi tiết khoản chi
================================ */
function ExpenseDetailPopup({ item, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
      onMouseDown={(e) => !ref.current.contains(e.target) && onClose()}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div ref={ref} className="relative bg-orange-100 w-11/12 max-w-md p-6 rounded-2xl shadow-2xl z-10">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Chi tiết khoản chi</h3>
        <div className="space-y-2 text-gray-700">
          <p><b>🏷 Tên:</b> {item.name}</p>
          <p><b>💰 Số tiền:</b> {item.amount.toLocaleString()}₫</p>
          <p><b>📅 Ngày chi:</b> {new Date(item.date).toLocaleDateString("vi-VN")}</p>
          <p><b>🗓 Tháng/Năm Tạo:</b> {(item.month ?? 0) + 1} / {item.year ?? "?"}</p>
        </div>
        <div className="flex justify-end mt-5">
          <button
            onClick={onClose}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:brightness-110"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
