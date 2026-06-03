// pages/index.js — Quản Lý Tăng Ca (mobile-first, cleaned)
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, onSnapshot, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { LogOut, ArrowUp, CheckCircle2, XCircle, Loader2, Settings } from "lucide-react";
import { auth, db } from "../lib/firebase";

import OvertimeSummary    from "../components/OvertimeSummary";
import OvertimeForm       from "../components/OvertimeForm/OvertimeForm";
import OvertimeMonth      from "../components/OvertimeMonth";
import OverMember         from "../components/OverMember";
import OvertimeMonthGrid  from "../components/OvertimeMonthGrid/OvertimeMonthGrid";
import OvertimeChart      from "../components/OvertimeChart";
import PopupManager       from "../components/PopupManager";

// ─── Toast component ────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  const colors = { error: "bg-red-500", loading: "bg-blue-500", success: "bg-green-500" };
  return (
    <AnimatePresence>
      <motion.div
        key="toast"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={`fixed bottom-20 left-4 right-4 sm:left-6 sm:right-auto sm:w-72 
          px-4 py-3 rounded-xl shadow-lg text-white text-sm flex items-center gap-2 z-[200]
          ${colors[toast.type] || "bg-gray-700"}`}
      >
        {toast.type === "loading" && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {toast.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
        {toast.type === "error"   && <XCircle className="w-4 h-4 shrink-0" />}
        <span className="leading-snug">{toast.msg}</span>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main ───────────────────────────────────────────────────────
export default function Home() {
  const [user, setUser]                   = useState(null);
  const [authReady, setAuthReady]         = useState(false);
  const [members, setMembers]             = useState([]);
  const [overtimeItems, setOvertimeItems] = useState([]);
  const [shiftSchedules, setShiftSchedules] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate]   = useState(new Date());
  const [toast, setToast]                 = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showManager, setShowManager]     = useState(false);
  const [dark, setDark]                   = useState(false);
  const toastTimer = useRef(null);

  // ── Theme ────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const enabled = saved === "dark" || (!saved && prefersDark);
    setDark(enabled);
    document.documentElement.classList.toggle("dark", enabled);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  // ── Auth ─────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  // ── Toast auto-close ─────────────────────────────────────────
  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    clearTimeout(toastTimer.current);
    if (type !== "loading") {
      toastTimer.current = setTimeout(() => setToast(null), 3500);
    }
  }, []);

  // ── Overtime realtime ────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const startStr = `${selectedYear}-${String(selectedMonth).padStart(2,"0")}-01`;
    const endStr   = dayjs(startStr).endOf("month").format("YYYY-MM-DD");
    const q = query(
      collection(db, "overtimes"),
      where("userId", "==", user.uid),
      where("date", ">=", startStr),
      where("date", "<=", endStr)
    );
    const unsub = onSnapshot(q, (snap) =>
      setOvertimeItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [user?.uid, selectedMonth, selectedYear]);

  // ── ShiftSchedules realtime ──────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const startStr = dayjs(`${selectedYear}-${String(selectedMonth).padStart(2,"0")}-01`).format("YYYY-MM-DD");
    const endStr   = dayjs(`${selectedYear}-${String(selectedMonth).padStart(2,"0")}`).endOf("month").format("YYYY-MM-DD");
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
        map[data.date][data.realName] = data;
      });
      setShiftSchedules(map);
    });
    return unsub;
  }, [user?.uid, selectedMonth, selectedYear]);

  // ── Sync member shifts from shiftSchedules ───────────────────
  useEffect(() => {
    const dateStr = selectedDate ? dayjs(selectedDate).format("YYYY-MM-DD") : "";
    if (!dateStr) return;
    const dayMap = shiftSchedules[dateStr] || {};
    setMembers((prev) =>
      prev.map((m) => {
        const shiftData = dayMap[m.realName];
        return {
          ...m,
          currentShift:      shiftData?.shift      || m.shift      || "Chưa phân ca",
          currentShiftStart: shiftData?.shiftStart || m.shiftStart || "",
        };
      })
    );
  }, [selectedDate, shiftSchedules]);

  // ── Scroll-to-top button ─────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Delete all for month ─────────────────────────────────────
  const handleDeleteAll = async (updateProgress) => {
    const mm      = String(selectedMonth).padStart(2, "0");
    const startDate = `${selectedYear}-${mm}-01`;
    const endDate   = dayjs(startDate).endOf("month").format("YYYY-MM-DD");

    const deleteCollection = async (colName, label) => {
      const q    = query(collection(db, colName), where("date", ">=", startDate), where("date", "<=", endDate), where("userId", "==", user.uid));
      const snap = await getDocs(q);
      for (let i = 0; i < snap.docs.length; i++) {
        updateProgress?.(`${label} (${i + 1}/${snap.docs.length})`);
        await deleteDoc(doc(db, colName, snap.docs[i].id));
        await new Promise((r) => setTimeout(r, 40));
      }
    };

    await deleteCollection("overtimes",      "Xóa tăng ca");
    await deleteCollection("shiftSchedules", "Xóa ca làm");

    // Reset overtime limits
    const limSnap = await getDocs(collection(db, "overtimeLimits"));
    for (const d of limSnap.docs) {
      const data  = d.data();
      const reset = (data.members || []).map((m) => ({
        ...m, gioDaLam: 0, gioConLai: data.limit || 0,
        gioThuongDaNhan: 0, soNgayDaLam: 0, ngayConLai: data.days || 0,
      }));
      await updateDoc(doc(db, "overtimeLimits", d.id), { members: reset });
    }

    // Reset members
    const memSnap = await getDocs(collection(db, "members"));
    for (const m of memSnap.docs) {
      const data       = m.data();
      const isNight    = data.shift?.includes("đêm");
      const defaultStart = isNight ? "20:00" : "08:00";
      await updateDoc(doc(db, "members", m.id), {
        lastCheckInDate: "", lastCheckInTime: "", lastCheckOutTime: "",
        earlyShift: false, shiftStart: defaultStart,
        overtimeLimit: { ...data.overtimeLimit, workedHours: 0, remaining: data.overtimeLimit?.monthlyLimit ?? 0 },
      });
    }
  };

  // ── Not logged in ────────────────────────────────────────────
  if (!authReady) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-white dark:from-gray-950 dark:to-gray-900">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-indigo-100 via-blue-50 to-white dark:from-gray-950 dark:to-gray-900 px-4">
      <div className="text-4xl">🕒</div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Quản Lý Tăng Ca</h1>
      <a
        href="/login"
        className="bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg transition-all"
      >
        Đăng nhập
      </a>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-100 via-blue-50 to-white dark:bg-gray-950 dark:from-gray-950 dark:via-gray-950">
      
      {/* ── HEADER ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm border-b border-indigo-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            🕒 <span className="hidden sm:inline">Quản Lý</span> Tăng Ca
          </h1>
          <div className="flex items-center gap-1.5">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition"
              title={dark ? "Sáng" : "Tối"}
            >
              {dark ? "☀️" : "🌙"}
            </button>
            <button
              onClick={() => setShowManager(true)}
              className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white px-3 py-1.5 rounded-lg text-sm transition"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Quản lý</span>
            </button>
            <button
              onClick={() => signOut(auth)}
              className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-lg transition"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── CONTENT ───────────────────────────────────────── */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 space-y-4">

        <OvertimeSummary
          members={members}
          overtimes={overtimeItems}
          shiftSchedules={shiftSchedules}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          selectedDate={selectedDate}
        />

        <OvertimeForm
          user={user}
          members={members}
          setMembers={setMembers}
          setItems={setOvertimeItems}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          selectedDate={selectedDate}
          showToast={showToast}
        />

        <OvertimeMonth
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          shiftSchedules={shiftSchedules}
          onDateSelect={(d) => setSelectedDate(d.toDate())}
        />

        <OverMember
          user={user}
          overtimes={overtimeItems}
          members={members}
          setMembers={setMembers}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          selectedDate={selectedDate}
          shiftSchedules={shiftSchedules}
        />

        <OvertimeMonthGrid
          members={members}
          shiftSchedules={shiftSchedules}
          overtimes={overtimeItems}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />

        <OvertimeChart
          members={members}
          overtimes={overtimeItems}
          shiftSchedules={shiftSchedules}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />

      </main>

      {/* ── MANAGER POPUP ────────────────────────────────── */}
      {showManager && (
        <PopupManager
          onClose={() => setShowManager(false)}
          user={user}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          handleDeleteAll={handleDeleteAll}
          setToast={showToast}
        />
      )}

      {/* ── TOAST ─────────────────────────────────────────── */}
      <Toast toast={toast} />

      {/* ── SCROLL TOP ────────────────────────────────────── */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            key="scrolltop"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-4 w-11 h-11 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg z-50 transition"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
