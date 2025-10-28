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
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAccount, setShowAccount] = useState(false);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [showRemaining, setShowRemaining] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [toast, setToast] = useState(null);

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
    import("firebase/firestore").then(({ collection, query, where, onSnapshot }) => {
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
    });
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
      await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, "overtimes", d.id))));

      setOvertimeItems([]);
      setToast({
        type: "success",
        msg: `Đã xóa toàn bộ tăng ca tháng ${selectedMonth + 1}/${selectedYear}.`,
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
            <h1 className="text-xl font-bold text-gray-800">🕒 Quản Lý Tăng Ca</h1>
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
                {showRemaining ? `${totalOvertimeYear.toLocaleString()} giờ` : "••••••"}
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
            onClick={() => chartRef.current?.scrollIntoView({ behavior: "smooth" })}
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

        {/* 🧩 Popup đăng xuất */}
        {showLogoutPopup && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            onClick={() => setShowLogoutPopup(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl p-6 w-80 text-center animate-fadeIn"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Bạn có chắc muốn đăng xuất?
              </h2>
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={async () => {
                    await handleLogout();
                    setShowLogoutPopup(false);
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
                >
                  Đăng xuất
                </button>
                <button
                  onClick={() => setShowLogoutPopup(false)}
                  className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🧹 Popup xác nhận xóa dữ liệu */}
        {showDeletePopup && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            onClick={() => setShowDeletePopup(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl p-6 w-80 text-center animate-fadeIn"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold text-red-600 mb-3">
                Xóa toàn bộ dữ liệu
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Xóa toàn bộ dữ liệu tăng ca tháng{" "}
                <b>
                  {selectedMonth + 1}/{selectedYear}
                </b>
                ?
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={async () => {
                    setShowDeletePopup(false);
                    await handleDeleteAll();
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
                >
                  Xóa
                </button>
                <button
                  onClick={() => setShowDeletePopup(false)}
                  className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 👤 Popup tài khoản */}
        {showAccount && <AccountPopup user={user} onClose={handleCloseAccountPopup} />}

        {/* 📊 Quản lý Tăng Ca */}
        <OverMember
          user={user}
          overtimes={overtimeItems}
          limit={overtimeLimit}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />

        <OvertimeSummary
          user={user}
          overtimes={overtimeItems}
          overtimeLimit={overtimeLimit}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />

        <div className="flex flex-col items-center gap-3">
          <div className="flex justify-between w-full">
            <OvertimeMonth
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
            />
            <OvertimeLimit
              user={user}
              overtimeLimit={overtimeLimit}
              setOvertimeLimit={setOvertimeLimit}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          </div>

          <OvertimeForm
            user={user}
            setItems={setOvertimeItems}
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

          <div ref={chartRef} className="w-full">
            <OvertimeChart overtimes={overtimeItems} selectedYear={selectedYear} />
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
