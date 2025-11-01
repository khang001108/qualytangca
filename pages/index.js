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
import {
  LogOut,
  Trash2,
  Eye,
  EyeOff,
  Settings2,
  ChartLine,
  ArrowUp,
} from "lucide-react";
import { ICONS } from "../utils/iconUtils";

export default function Home() {
  // ⚙️ State chính
  const [user, setUser] = useState(null);
  const [overtimeItems, setOvertimeItems] = useState([]);
  const [overtimeLimit, setOvertimeLimit] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAccount, setShowAccount] = useState(false);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [showRemaining, setShowRemaining] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [members, setMembers] = useState([]); // ✅ danh sách nhân viên

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

  // 🔁 Lắng nghe dữ liệu tăng ca theo năm
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

  // ⬆️ Hiện nút cuộn lên
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ⏱️ Ẩn toast sau 3s
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

  // 🧹 Xóa toàn bộ dữ liệu tháng tăng ca
  const handleDeleteAll = async () => {
    try {
      const { collection, query, where, getDocs, deleteDoc, doc } =
        await import("firebase/firestore");

      const q = query(
        collection(db, "overtimes"),
        where("userId", "==", user.uid),
        where("month", "==", selectedMonth),
        where("year", "==", selectedYear)
      );
      const snap = await getDocs(q);
      await Promise.all(
        snap.docs.map((d) => deleteDoc(doc(db, "overtimes", d.id)))
      );

      setOvertimeItems([]);
      setToast({
        type: "success",
        msg: `Đã xóa toàn bộ tăng ca tháng ${
          selectedMonth + 1
        }/${selectedYear}.`,
      });
    } catch (err) {
      console.error(err);
      setToast({ type: "error", msg: "❌ Xóa thất bại, vui lòng thử lại." });
    }
  };

  // 🧩 Cập nhật thông tin user sau khi đóng popup Account
  const handleCloseAccountPopup = (updated) => {
    setShowAccount(false);
    if (!updated) return;
    setUser((prev) => ({
      ...prev,
      displayName: updated.displayName ?? prev.displayName,
      avatar: updated.avatar ?? prev.avatar,
      avatarColor: updated.avatarColor ?? prev.avatarColor,
    }));
  };

  // 🔢 Tổng hợp dữ liệu ngày tăng ca để hiển thị trên OvertimeMonth
  const overtimeData = overtimeItems.reduce((acc, it) => {
    let dateKey = null;

    if (it.date) {
      if (typeof it.date === "string") dateKey = it.date;
      else if (typeof it.date.toDate === "function")
        dateKey = it.date.toDate().toISOString().slice(0, 10);
      else if (it.date instanceof Date)
        dateKey = it.date.toISOString().slice(0, 10);
    }

    if (
      !dateKey &&
      typeof it.year !== "undefined" &&
      typeof it.month !== "undefined" &&
      typeof it.day !== "undefined"
    ) {
      const monNum = Number(it.month);
      const monthStr =
        monNum > 11
          ? String(monNum).padStart(2, "0")
          : String(monNum + 1).padStart(2, "0");
      const dayStr = String(Number(it.day)).padStart(2, "0");
      dateKey = `${it.year}-${monthStr}-${dayStr}`;
    }

    if (!dateKey && it.createdAt && typeof it.createdAt.toDate === "function") {
      dateKey = it.createdAt.toDate().toISOString().slice(0, 10);
    }

    if (!dateKey) return acc;

    acc[dateKey] = (acc[dateKey] || 0) + Number(it.hours || 0);
    return acc;
  }, {});

  // =======================
  // 🖥️ Giao diện Login
  // =======================
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 via-blue-50 to-white">
        <div className="bg-white p-10 rounded-3xl shadow-2xl text-center w-80 sm:w-96 border border-gray-100">
          <h2 className="text-3xl font-extrabold mb-4 text-gray-800">
            Một ngày mới⭐,
          </h2>
          <h2 className="text-3xl font-extrabold mb-5 text-gray-800">
            một cơ hội mới🌈!
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

  // =======================
  // 🏠 Giao diện chính
  // =======================
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 via-blue-50 to-white">
      <div className="w-full max-w-6xl mx-auto p-4 space-y-5">
        {/* 🔹 Header */}
        <div className="bg-white shadow-[0_6px_30px_rgba(99,102,241,0.25)] p-4 rounded-2xl sticky top-0 z-30 backdrop-blur-md border border-indigo-100">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-800">
              🕒 Quản Lý Tăng Ca
            </h1>
            <button
              onClick={() => setShowLogoutPopup(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
              title="Thoát"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Thông tin user */}
          <div className="mt-2 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              {(() => {
                const match = ICONS.find((i) => i.name === user.avatar);
                if (!match) return null;
                const Icon = match.icon;
                return (
                  <Icon
                    className="w-6 h-6"
                    style={{ color: user.avatarColor || "#4f46e5" }}
                  />
                );
              })()}
              <span className="font-medium text-gray-700">
                {user.displayName || "Người dùng ẩn danh"}
              </span>
              <button
                onClick={() => setShowAccount(true)}
                className="p-1 text-gray-600 hover:text-gray-800"
                title="Tài khoản"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="font-medium text-gray-700">
                💹 Tổng giờ tăng ca {selectedYear}:
              </span>
              <span className="font-semibold text-indigo-600">
                {showRemaining
                  ? `${totalOvertimeYear.toLocaleString()} giờ`
                  : "••••••"}
              </span>
              <button
                onClick={() => setShowRemaining((p) => !p)}
                className="text-gray-500 hover:text-gray-700"
                title={showRemaining ? "Ẩn tổng giờ" : "Hiện tổng giờ"}
              >
                {showRemaining ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 🔸 Nút thao tác */}
        <div className="flex justify-between items-center">
          <button
            onClick={() =>
              chartRef.current?.scrollIntoView({ behavior: "smooth" })
            }
            className="flex items-center gap-1 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 text-sm"
          >
            <ChartLine className="w-4 h-4" /> Biểu đồ
          </button>
          <button
            onClick={() => setShowDeletePopup(true)}
            className="flex items-center gap-1 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 text-sm"
          >
            <Trash2 className="w-4 h-4" /> Xóa
          </button>
        </div>

        {/* 🔹 Form thêm tăng ca */}
        <OvertimeForm
          user={user}
          members={members}
          setMembers={setMembers}
          setItems={setOvertimeItems}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          selectedDate={selectedDate} // ✅ thêm
        />
        {/* 👤 Quản lý nhân viên */}
        <OverMember
          user={user}
          overtimes={overtimeItems}
          limit={overtimeLimit}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          members={members}
          setMembers={setMembers}
        />
        {/* 🔸 Chọn tháng năm */  }
        <OvertimeMonth
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          overtimeData={overtimeData}
          onDateSelect={(date) => setSelectedDate(date.toDate())} // ⬅️ thêm dòng này
        />
        
        {/* 🔸 Tóm tắt tăng ca */}
        <OvertimeSummary
          user={user}
          overtimes={overtimeItems}
          overtimeLimit={overtimeLimit}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />

        <div className="flex flex-col items-center gap-3">
          <div className="flex justify-between w-full">
            <OvertimeLimit
              user={user}
              overtimeLimit={overtimeLimit}
              setOvertimeLimit={setOvertimeLimit}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          </div>

          <OvertimeList
            user={user}
            items={overtimeItems}
            setItems={setOvertimeItems}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />

          <div ref={chartRef} className="w-full">
            <OvertimeChart
              overtimes={overtimeItems}
              selectedYear={selectedYear}
            />
          </div>
        </div>

        {/* ⬆️ Nút cuộn lên đầu */}
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

      {/* 🔔 Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-white text-sm animate-fadeIn z-[100]
          ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}
        >
          {toast.type === "error" ? "⚠️" : "✅"} <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
