// pages/index.js
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import OverMember from "../components/OverMember";
import OvertimeForm from "../components/OvertimeForm";
import OvertimeList from "../components/OvertimeList";
import OvertimeSummary from "../components/OvertimeSummary";
import OvertimeLimit from "../components/OvertimeLimit";
import OvertimeChart from "../components/OvertimeChart";
import OvertimeMonth from "../components/OvertimeMonth";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import AccountPopup from "../components/AccountPopup";
import PopupManager from "../components/PopupManager";
import PopupSettings from "../components/PopupSettings";
import { LogOut, Settings2, ArrowUp } from "lucide-react";
import { ICONS } from "../utils/iconUtils";

export default function Home() {
  // ⚙️ State chính
  const [user, setUser] = useState(null);
  const [overtimeItems, setOvertimeItems] = useState([]);
  const [overtimeLimit, setOvertimeLimit] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [members, setMembers] = useState([]);

  // Popup state
  const [showManager, setShowManager] = useState(false);
  const [showOvertimeForm, setShowOvertimeForm] = useState(false);
  const [showOvertimeLimit, setShowOvertimeLimit] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showMemberSettings, setShowMemberSettings] = useState(false);

  const [showAccount, setShowAccount] = useState(false);
  const [toast, setToast] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const chartRef = useRef(null);

  // 📊 Tổng giờ tăng ca trong năm
  const totalOvertimeYear = overtimeItems.reduce(
    (s, i) => s + Number(i.hours || 0),
    0
  );

  // 👤 Lắng nghe user đăng nhập
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  // 🔁 Lắng nghe dữ liệu tăng ca
  useEffect(() => {
    if (!user) return;
    import("firebase/firestore").then(
      ({ collection, query, where, onSnapshot }) => {
        const q = query(
          collection(db, "overtimes"),
          where("userId", "==", user.uid),
          where("year", "==", selectedYear)
        );
        const unsub = onSnapshot(q, (snap) => {
          const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setOvertimeItems(data);
        });
        return () => unsub();
      }
    );
  }, [user?.uid, selectedYear]);

  // 🧹 Ẩn toast sau 3s
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // 🚪 Đăng xuất
  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setOvertimeItems([]);
    setOvertimeLimit({});
  };

  // 🧹 Xóa toàn bộ dữ liệu ngày hiện tại
  const handleDeleteAll = async () => {
    try {
      const { collection, query, where, getDocs, deleteDoc, doc } =
        await import("firebase/firestore");

      const currentDate = selectedDate
        ? new Date(selectedDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      const q = query(
        collection(db, "overtimes"),
        where("userId", "==", user.uid),
        where("currentDate", "==", currentDate)
      );

      const snap = await getDocs(q);
      if (snap.empty) {
        setToast({
          type: "error",
          msg: `⚠️ Không có dữ liệu tăng ca cho ngày ${currentDate}.`,
        });
        return;
      }

      await Promise.all(
        snap.docs.map((d) => deleteDoc(doc(db, "overtimes", d.id)))
      );

      setOvertimeItems((prev) =>
        prev.filter((i) => i.currentDate !== currentDate)
      );

      setToast({
        type: "success",
        msg: `✅ Đã xóa toàn bộ dữ liệu ngày ${currentDate}.`,
      });
    } catch (err) {
      console.error(err);
      setToast({ type: "error", msg: "❌ Xóa thất bại, vui lòng thử lại." });
    }
  };

  // ======================= Giao diện chính =======================
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 via-blue-50 to-white">
        <div className="bg-white p-10 rounded-3xl shadow-2xl text-center w-80 sm:w-96 border border-gray-100">
          <h2 className="text-3xl font-extrabold mb-5 text-gray-800">
            Một ngày mới⭐, một cơ hội mới🌈!
          </h2>
          <a
            href="/login"
            className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg hover:scale-105 transition"
          >
            Bắt đầu nào
          </a>
          <div className="text-sm text-gray-400 mt-4">Sáng tạo bởi Khazg.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 via-blue-50 to-white">
      <div className="w-full max-w-6xl mx-auto p-4 space-y-5">
        {/* Header */}
        <div className="bg-white shadow p-4 rounded-2xl sticky top-0 z-30 border border-indigo-100 flex justify-between items-center">
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
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          members={members}
          setMembers={setMembers}
          selectedDate={selectedDate}
        />

        <OvertimeMonth
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          overtimeData={overtimeItems}
          onDateSelect={(date) => setSelectedDate(date.toDate())}
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

      {/* ⚙️ Popup Manager */}
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



      {/* 🕓 Popup Overtime Form */}
      {showOvertimeForm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowOvertimeForm(false)}
        >
          <div
            className="bg-white p-6 rounded-2xl shadow-2xl animate-fadeIn max-w-2xl w-[90%]"
            onClick={(e) => e.stopPropagation()}
          >
            <OvertimeForm
              user={user}
              members={members}
              setMembers={setMembers}
              setItems={setOvertimeItems}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              selectedDate={selectedDate}
            />
            <button
              onClick={() => setShowOvertimeForm(false)}
              className="mt-4 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* ⏳ Popup Giới hạn */}
      {showOvertimeLimit && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowOvertimeLimit(false)}
        >
          <div
            className="bg-white p-6 rounded-2xl shadow-2xl animate-fadeIn max-w-lg w-[90%]"
            onClick={(e) => e.stopPropagation()}
          >
            <OvertimeLimit
              user={user}
              overtimeLimit={overtimeLimit}
              setOvertimeLimit={setOvertimeLimit}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
            <button
              onClick={() => setShowOvertimeLimit(false)}
              className="mt-4 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* 👤 Popup Thêm nhân viên */}
      {showAddMember && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowAddMember(false)}
        >
          <div
            className="bg-white p-6 rounded-2xl shadow-2xl animate-fadeIn max-w-lg w-[90%]"
            onClick={(e) => e.stopPropagation()}
          >
            <OverMember
              user={user}
              overtimes={overtimeItems}
              limit={overtimeLimit}
              members={members}
              setMembers={setMembers}
              isPopupAdd
            />
            <button
              onClick={() => setShowAddMember(false)}
              className="mt-4 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* ⚙️ Popup Cài đặt */}
      {showMemberSettings && members.length > 0 && (
        <PopupSettings
          member={members[0]}
          members={members}
          setMembers={setMembers}
          onClose={() => setShowMemberSettings(false)}
        />
      )}

      {/* 🔔 Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-white text-sm z-[100]
            ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}
        >
          {toast.type === "error" ? "⚠️" : "✅"} {toast.msg}
        </div>
      )}

      {/* 🔝 Scroll to Top */}
      {showScrollTop && (
        <motion.button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 right-6 w-12 h-12 bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-600"
        >
          <ArrowUp className="w-5 h-5" />
        </motion.button>
      )}
    </div>
  );
}
