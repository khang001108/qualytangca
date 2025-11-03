import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import OverMember from "../components/OverMember";
import OvertimeList from "../components/OvertimeList";
import OvertimeSummary from "../components/OvertimeSummary";
import OvertimeChart from "../components/OvertimeChart";
import OvertimeMonth from "../components/OvertimeMonth";
import PopupManager from "../components/PopupManager"; // ✅ import mới
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { LogOut, ArrowUp } from "lucide-react";

export default function Home() {
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [overtimeItems, setOvertimeItems] = useState([]);
  const [overtimeLimit, setOvertimeLimit] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [toast, setToast] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showManager, setShowManager] = useState(false);

  const chartRef = useRef(null);

  // 🔐 Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  // 🔁 Fetch dữ liệu tăng ca
  useEffect(() => {
    if (!user) return;
    import("firebase/firestore").then(({ collection, query, where, onSnapshot }) => {
      const q = query(
        collection(db, "overtimes"),
        where("userId", "==", user.uid),
        where("year", "==", selectedYear)
      );
      const unsub = onSnapshot(q, (snap) => {
        setOvertimeItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    });
  }, [user?.uid, selectedYear]);

  // ⏳ Toast timeout
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ⬆️ Nút scroll lên đầu
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 🚪 Đăng xuất
  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  // 🗑️ Xóa toàn bộ dữ liệu trong tháng
  const handleDeleteAll = async () => {
    try {
      const { collection, query, where, getDocs, deleteDoc, doc } =
        await import("firebase/firestore");

      const q = query(
        collection(db, "overtimes"),
        where("userId", "==", user.uid),
        where("year", "==", selectedYear),
        where("month", "==", selectedMonth)
      );

      const snap = await getDocs(q);
      if (snap.empty) {
        setToast({
          type: "error",
          msg: `⚠️ Không có dữ liệu tăng ca trong tháng ${selectedMonth}/${selectedYear}.`,
        });
        return;
      }

      await Promise.all(
        snap.docs.map((d) => deleteDoc(doc(db, "overtimes", d.id)))
      );

      setOvertimeItems((prev) =>
        prev.filter((i) => i.year !== selectedYear || i.month !== selectedMonth)
      );

      setToast({
        type: "success",
        msg: `✅ Đã xóa toàn bộ dữ liệu tăng ca tháng ${selectedMonth}/${selectedYear}.`,
      });
    } catch (err) {
      console.error(err);
      setToast({ type: "error", msg: "❌ Lỗi khi xóa dữ liệu." });
    }
  };

  // 🔐 Nếu chưa đăng nhập
  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 via-blue-50 to-white">
        <a
          href="/login"
          className="bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:scale-105 transition"
        >
          Đăng nhập
        </a>
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-blue-200 via-blue-50 to-white">
      <div className="w-full max-w-6xl p-4 space-y-5">
        {/* Header */}
        <div className="bg-white shadow p-4 rounded-2xl flex justify-between items-center border border-indigo-100">
          <h1 className="text-xl font-bold text-gray-800">🕒 Quản Lý Tăng Ca</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowManager(true)}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm"
            >
              ⚙️ Quản lý
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
              title="Thoát"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nội dung chính */}
        <OverMember
          user={user}
          overtimes={overtimeItems}
          limit={overtimeLimit}
          members={members}
          setMembers={setMembers}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          selectedDate={selectedDate}
        />
        <OvertimeMonth
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          overtimeData={overtimeItems}
          onDateSelect={(d) => setSelectedDate(d.toDate())}
        />
        <OvertimeSummary
          user={user}
          overtimes={overtimeItems}
          overtimeLimit={overtimeLimit}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
        <OvertimeList
          user={user}
          items={overtimeItems}
          setItems={setOvertimeItems}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
        <div ref={chartRef}>
          <OvertimeChart overtimes={overtimeItems} selectedYear={selectedYear} />
        </div>
      </div>

      {/* ✅ PopupManager liên kết đúng */}
      {showManager && (
        <PopupManager
          onClose={() => setShowManager(false)}
          user={user}
          members={members}
          setMembers={setMembers}
          overtimeLimit={overtimeLimit}
          setOvertimeLimit={setOvertimeLimit}
          overtimeItems={overtimeItems}
          setOvertimeItems={setOvertimeItems}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          selectedDate={selectedDate}
          handleDeleteAll={handleDeleteAll}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 px-4 py-2 rounded-xl shadow-lg text-white text-sm z-[100]
            ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}
        >
          {toast.msg}
        </div>
      )}

      {/* Nút cuộn lên */}
      {showScrollTop && (
        <motion.button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 w-12 h-12 bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-600"
        >
          <ArrowUp className="w-5 h-5" />
        </motion.button>
      )}
    </div>
  );
}
