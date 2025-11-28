// pages/index.js
// Trang chính của ứng dụng quản lý tăng ca

import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import OverMember from "../components/OverMember";
import OvertimeMonthGrid from "../components/OvertimeMonthGrid/OvertimeMonthGrid";
import OvertimeSummary from "../components/OvertimeSummary";
import OvertimeChart from "../components/OvertimeChart";
import OvertimeMonth from "../components/OvertimeMonth";
import OvertimeForm from "../components/OvertimeForm/OvertimeForm";
import PopupManager from "../components/PopupManager";
import { auth, db } from "../lib/firebase";
import { Loader2, CheckCircle2, XCircle, Hourglass } from "lucide-react";

import dayjs from "dayjs";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { LogOut, ArrowUp, Moon, Sun } from "lucide-react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

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
  const [dark, setDark] = useState(false);

  const [shiftSchedules, setShiftSchedules] = useState({});
  const chartRef = useRef(null);

  // 🔹 Khởi tạo theme
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const enabled = saved === "dark" || (!saved && prefersDark);
    setDark(enabled);
    if (enabled) document.documentElement.classList.add("dark");
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const startStr = `${selectedYear}-${String(selectedMonth).padStart(
      2,
      "0"
    )}-01`;
    const endStr = dayjs(startStr).endOf("month").format("YYYY-MM-DD");

    const q = query(
      collection(db, "overtimes"),
      where("userId", "==", user.uid),
      where("date", ">=", startStr),
      where("date", "<=", endStr)
    );

    const unsub = onSnapshot(q, (snap) => {
      setOvertimeItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [user?.uid, selectedMonth, selectedYear]);

  useEffect(() => {
    if (!user) return;
    const startStr = dayjs(
      `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`
    ).format("YYYY-MM-DD");
    const endStr = dayjs(
      `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`
    )
      .endOf("month")
      .format("YYYY-MM-DD");

    const q = query(
      collection(db, "shiftSchedules"),
      where("userId", "==", user.uid),
      where("date", ">=", startStr),
      where("date", "<=", endStr)
    );

    const unsub = onSnapshot(q, (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        if (!map[data.date]) map[data.date] = {};
        map[data.date][data.realName] = {
          shift: data.shift,
          shiftStart: data.shiftStart,
        };
      });
      setShiftSchedules(map);
    });
    return () => unsub();
  }, [user?.uid, selectedMonth, selectedYear]);

  // ⚙️ Toast auto-close (trừ khi loading)
  useEffect(() => {
    if (!toast) return;
    if (toast.type === "loading") return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // 🔹 Hiển thị nút Scroll top
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 🔹 Cập nhật ca làm theo ngày chọn
  useEffect(() => {
    const dateStr = selectedDate
      ? dayjs(selectedDate).format("YYYY-MM-DD")
      : "";
    if (!dateStr) return;
    if (!shiftSchedules[dateStr]) {
      setMembers((prev) =>
        prev.map((m) => ({
          ...m,
          currentShift: m.shift || "Chưa phân ca",
          currentShiftStart: m.shiftStart || "",
        }))
      );
      return;
    }
    setMembers((prev) =>
      prev.map((m) => {
        const shiftData = shiftSchedules[dateStr]?.[m.realName];
        return {
          ...m,
          currentShift: shiftData?.shift || m.shift || "Chưa phân ca",
          currentShiftStart: shiftData?.shiftStart || m.shiftStart || "",
        };
      })
    );
  }, [selectedDate, shiftSchedules]);

  const fetchMembersForDate = (dateStr) => setSelectedDate(new Date(dateStr));

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const [deletePopup, setDeletePopup] = useState({
    visible: false,
    state: "confirm", // confirm | loading | success
  });

  const handleDeleteAll = async (updateProgress) => {
    try {
      setDeletePopup({
        visible: true,
        state: "loading",
        current: "Chuẩn bị...",
      });

      const yyyy = selectedYear;
      const mm = String(selectedMonth).padStart(2, "0");
      const startDate = `${yyyy}-${mm}-01`;
      const endDate = dayjs(startDate).endOf("month").format("YYYY-MM-DD");

      // ========== XÓA OVERTIMES ==========
      const otQ = query(
        collection(db, "overtimes"),
        where("date", ">=", startDate),
        where("date", "<=", endDate),
        where("userId", "==", user.uid)
      );
      const otSnap = await getDocs(otQ);

      let i = 0;
      for (const d of otSnap.docs) {
        i++;
        updateProgress?.(`overtimes → ${d.id} (${i}/${otSnap.docs.length})`);
        await deleteDoc(doc(db, "overtimes", d.id));
        await new Promise((r) => setTimeout(r, 50)); // cho UI kịp render
      }

      // ========== XÓA SHIFT SCHEDULES ==========
      const ssQ = query(
        collection(db, "shiftSchedules"),
        where("date", ">=", startDate),
        where("date", "<=", endDate),
        where("userId", "==", user.uid)
      );
      const ssSnap = await getDocs(ssQ);

      let j = 0;
      for (const d of ssSnap.docs) {
        j++;
        updateProgress?.(
          `shiftSchedules → ${d.id} (${j}/${ssSnap.docs.length})`
        );
        await deleteDoc(doc(db, "shiftSchedules", d.id));
        await new Promise((r) => setTimeout(r, 30));
      }

      // ========== RESET OVERTIME LIMIT ==========
      const limitSnap = await getDocs(collection(db, "overtimeLimits"));
      let k = 0;
      for (const docLimit of limitSnap.docs) {
        k++;
        updateProgress?.(
          `overtimeLimits → ${docLimit.id} (${k}/${limitSnap.docs.length})`
        );

        const data = docLimit.data();
        const reset = (data.members || []).map((m) => ({
          ...m,
          gioDaLam: 0,
          gioConLai: data.limit || 0,
          gioThuongDaNhan: 0,
          gioThuongConLai: data.gioThuongConLai || 0,
          soNgayDaLam: 0,
          ngayConLai: data.days || 0,
        }));

        await updateDoc(doc(db, "overtimeLimits", docLimit.id), {
          members: reset,
        });
        await new Promise((r) => setTimeout(r, 30));
      }

      // ========== RESET MEMBERS ==========
      const membersSnap = await getDocs(collection(db, "members"));
      let z = 0;
      for (const m of membersSnap.docs) {
        z++;
        updateProgress?.(`members → ${m.id} (${z}/${membersSnap.docs.length})`);

        const data = m.data();
        const isNight = data.shift?.includes("đêm");
        const defaultStart = isNight ? "20:00" : "08:00";

        await updateDoc(doc(db, "members", m.id), {
          lastCheckInDate: "",
          lastCheckInTime: "",
          lastCheckOutTime: "",
          earlyShift: false,
          shiftStart: defaultStart,
          overtimeLimit: {
            ...data.overtimeLimit,
            workedHours: 0,
            remaining: data.overtimeLimit?.monthlyLimit ?? 0,
          },
        });

        await new Promise((r) => setTimeout(r, 20));
      }

      // Update UI
      setDeletePopup({ visible: true, state: "success", current: "" });
    } catch (err) {
      console.error("Delete error:", err);
      setDeletePopup({ visible: true, state: "error", current: "" });
    }
  };

  if (!user)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-200 via-blue-50 to-white dark:bg-gray-900 dark:from-gray-900 dark:via-gray-900">
        <a
          href="/login"
          className="bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:scale-105 transition"
        >
          Đăng nhập
        </a>
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-blue-200 via-blue-50 to-white dark:bg-gray-900 dark:from-gray-900 dark:via-gray-900">
      <div className="w-full p-6 space-y-5">
        {/* Header */}
        <div className="bg-white shadow p-4 rounded-2xl flex justify-between items-center border border-indigo-100 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            🕒 Quản Lý Tăng Ca
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Chuyển giao diện"
            >
              {dark ? (
                <Sun className="w-5 h-5 text-yellow-300" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setShowManager(true)}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm dark:bg-indigo-600 dark:hover:bg-indigo-700"
            >
              ⚙️ Quản lý
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-full"
              title="Thoát"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Components */}
        <OvertimeForm
          user={user}
          members={members}
          setMembers={setMembers}
          setItems={setOvertimeItems}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          selectedDate={selectedDate}
        />

        <OvertimeMonth
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          shiftSchedules={shiftSchedules}
          onDateSelect={(d) => fetchMembersForDate(d.format("YYYY-MM-DD"))}
        />

        <OverMember
          user={user}
          overtimes={overtimeItems}
          limit={overtimeLimit}
          members={members}
          setMembers={setMembers}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          selectedDate={selectedDate}
          shiftSchedules={shiftSchedules}
        />

        <OvertimeSummary
          user={user}
          overtimes={overtimeItems}
          overtimeLimit={overtimeLimit}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />

        <OvertimeMonthGrid
          members={members}
          shiftSchedules={shiftSchedules}
          overtimes={overtimeItems}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />


        <div ref={chartRef}>
          <OvertimeChart
            overtimes={overtimeItems}
            selectedYear={selectedYear}
          />
        </div>
      </div>

      {showManager && (
        <PopupManager
          onClose={() => setShowManager(false)}
          user={user}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          handleDeleteAll={handleDeleteAll}
          setToast={setToast} // ✅ truyền setToast để ShiftAssign có thể báo ra ngoài
        />
      )}

      {/* ✅ Toast duy nhất */}
      {toast && (
        <div
          className={`fixed bottom-6 left-6 px-4 py-2 rounded-xl shadow-lg text-white text-sm flex items-center gap-2 z-[100] ${toast.type === "error"
              ? "bg-red-500"
              : toast.type === "loading"
                ? "bg-blue-500"
                : "bg-green-500"
            }`}
        >
          {toast.type === "loading" && (
            <Hourglass className="w-4 h-4 animate-spin" />
          )}
          {toast.type === "success" && <CheckCircle2 className="w-4 h-4" />}
          {toast.type === "error" && <XCircle className="w-4 h-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {showScrollTop && (
        <motion.button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 w-12 h-12 bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-600 dark:bg-indigo-600"
        >
          <ArrowUp className="w-5 h-5" />
        </motion.button>
      )}
    </div>
  );
}
