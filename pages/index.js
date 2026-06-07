// pages/index.js — Redesigned với Spendy style, giữ nguyên toàn bộ logic

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import OverMember from "../components/OverMember";
import OvertimeMonthGrid from "../components/OvertimeMonthGrid/OvertimeMonthGrid";
import OvertimeSummary from "../components/OvertimeSummary";
import OvertimeChart from "../components/OvertimeChart";
import OvertimeMonthInline from "../components/OvertimeMonthInline";
import OvertimeForm from "../components/OvertimeForm/OvertimeForm";
import ExportExcel from "../components/ExportExcel";
import PopupManager from "../components/PopupManager";
import AccountPopup from "../components/AccountPopup";
import { auth, db } from "../lib/firebase";
import { Loader2, CheckCircle2, XCircle, Hourglass, ArrowUp, LogOut, Sun, Moon, Settings, User, Menu, X, Bell } from "lucide-react";
import dayjs from "dayjs";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, deleteDoc, doc, updateDoc, query, where, onSnapshot, getDoc } from "firebase/firestore";

// Framer Motion variants
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.3 } }),
};

// NAV tabs cho mobile
const NAV_TABS = [
  { id: "summary",  label: "Tổng quan", icon: "📊" },
  { id: "form",     label: "Nhập liệu", icon: "✏️" },
  { id: "calendar", label: "Lịch",      icon: "📅" },
  { id: "members",  label: "Thành viên",icon: "👥" },
  { id: "chart",    label: "Biểu đồ",   icon: "📈" },
];

export default function Home() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [members, setMembers] = useState([]);
  const [overtimeItems, setOvertimeItems] = useState([]);
  const [overtimeLimit, setOvertimeLimit] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [toast, setToast] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [dark, setDark] = useState(false);
  const [mobileTab, setMobileTab] = useState("summary");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shiftSchedules, setShiftSchedules] = useState({});
  const chartRef = useRef(null);

  // ── Theme ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const enabled = saved === "dark" || (!saved && prefersDark);
    setDark(enabled);
    if (enabled) document.documentElement.classList.add("dark");
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  // ── Auth ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) setUserProfile(snap.data());
      }
    });
    return () => unsub();
  }, []);

  // ── Overtime data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const startStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
    const endStr = dayjs(startStr).endOf("month").format("YYYY-MM-DD");
    const q = query(collection(db, "overtimes"), where("userId", "==", user.uid), where("date", ">=", startStr), where("date", "<=", endStr));
    const unsub = onSnapshot(q, (snap) => setOvertimeItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [user?.uid, selectedMonth, selectedYear]);

  // ── Shift data ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const startStr = dayjs(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`).format("YYYY-MM-DD");
    const endStr = dayjs(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}`).endOf("month").format("YYYY-MM-DD");
    const q = query(collection(db, "shiftSchedules"), where("userId", "==", user.uid), where("date", ">=", startStr), where("date", "<=", endStr));
    const unsub = onSnapshot(q, (snap) => {
      const map = {};
      snap.docs.forEach(d => {
        const data = d.data();
        if (!map[data.date]) map[data.date] = {};
        map[data.date][data.realName] = data;
      });
      setShiftSchedules(map);
    });
    return () => unsub();
  }, [user?.uid, selectedMonth, selectedYear]);

  // ── Toast auto-close ───────────────────────────────────────────────────
  useEffect(() => {
    if (!toast || toast.type === "loading") return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Scroll top button ──────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Ca làm theo ngày chọn ──────────────────────────────────────────────
  useEffect(() => {
    const dateStr = selectedDate ? dayjs(selectedDate).format("YYYY-MM-DD") : "";
    if (!dateStr) return;
    if (!shiftSchedules[dateStr]) {
      setMembers(prev => prev.map(m => ({ ...m, currentShift: m.shift || "Chưa phân ca", currentShiftStart: m.shiftStart || "" })));
      return;
    }
    setMembers(prev => prev.map(m => {
      const shiftData = shiftSchedules[dateStr]?.[m.realName];
      return { ...m, currentShift: shiftData?.shift || m.shift || "Chưa phân ca", currentShiftStart: shiftData?.shiftStart || m.shiftStart || "" };
    }));
  }, [selectedDate, shiftSchedules]);

  const fetchMembersForDate = (dateStr) => setSelectedDate(new Date(dateStr));
  const handleLogout = async () => { await signOut(auth); setUser(null); };

  // ── Delete all (giữ nguyên logic) ─────────────────────────────────────
  const [deletePopup, setDeletePopup] = useState({ visible: false, state: "confirm" });
  const handleDeleteAll = async (updateProgress) => {
    try {
      setDeletePopup({ visible: true, state: "loading", current: "Chuẩn bị..." });
      const yyyy = selectedYear;
      const mm = String(selectedMonth).padStart(2, "0");
      const startDate = `${yyyy}-${mm}-01`;
      const endDate = dayjs(startDate).endOf("month").format("YYYY-MM-DD");
      const otQ = query(collection(db, "overtimes"), where("date", ">=", startDate), where("date", "<=", endDate), where("userId", "==", user.uid));
      const otSnap = await getDocs(otQ);
      let i = 0;
      for (const d of otSnap.docs) { i++; updateProgress?.(`overtimes → ${d.id} (${i}/${otSnap.docs.length})`); await deleteDoc(doc(db, "overtimes", d.id)); await new Promise(r => setTimeout(r, 50)); }
      const ssQ = query(collection(db, "shiftSchedules"), where("date", ">=", startDate), where("date", "<=", endDate), where("userId", "==", user.uid));
      const ssSnap = await getDocs(ssQ);
      let j = 0;
      for (const d of ssSnap.docs) { j++; updateProgress?.(`shiftSchedules → ${d.id} (${j}/${ssSnap.docs.length})`); await deleteDoc(doc(db, "shiftSchedules", d.id)); await new Promise(r => setTimeout(r, 30)); }
      const limitSnap = await getDocs(collection(db, "overtimeLimits"));
      let k = 0;
      for (const docLimit of limitSnap.docs) {
        k++; updateProgress?.(`overtimeLimits → ${docLimit.id} (${k}/${limitSnap.docs.length})`);
        const data = docLimit.data();
        const reset = (data.members || []).map(m => ({ ...m, gioDaLam: 0, gioConLai: data.limit || 0, gioThuongDaNhan: 0, gioThuongConLai: data.gioThuongConLai || 0, soNgayDaLam: 0, ngayConLai: data.days || 0 }));
        await updateDoc(doc(db, "overtimeLimits", docLimit.id), { members: reset });
        await new Promise(r => setTimeout(r, 30));
      }
      const membersSnap = await getDocs(collection(db, "members"));
      let z = 0;
      for (const m of membersSnap.docs) {
        z++; updateProgress?.(`members → ${m.id} (${z}/${membersSnap.docs.length})`);
        const data = m.data();
        const isNight = data.shift?.includes("đêm");
        await updateDoc(doc(db, "members", m.id), { lastCheckInDate: "", lastCheckInTime: "", lastCheckOutTime: "", earlyShift: false, shiftStart: isNight ? "20:00" : "08:00", overtimeLimit: { ...data.overtimeLimit, workedHours: 0, remaining: data.overtimeLimit?.monthlyLimit ?? 0 } });
        await new Promise(r => setTimeout(r, 20));
      }
      setDeletePopup({ visible: true, state: "success", current: "" });
    } catch (err) {
      console.error("Delete error:", err);
      setDeletePopup({ visible: true, state: "error", current: "" });
    }
  };

  // ── Loading / Not authed ───────────────────────────────────────────────
  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 animate-fade-in">
      <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
        <span className="text-3xl">🕒</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Quản Lý Tăng Ca</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">Đăng nhập để tiếp tục</p>
      <a href="/login" className="btn-indigo flex items-center gap-2">
        <LogOut size={16} /> Đăng nhập
      </a>
    </div>
  );

  // Shared props
  const commonProps = { user, members, setMembers, overtimes: overtimeItems, setItems: setOvertimeItems, selectedMonth, selectedYear, selectedDate, shiftSchedules };

  const sections = [
    { id: "summary",  el: <OvertimeSummary {...commonProps} overtimes={overtimeItems} limit={overtimeLimit} /> },
    { id: "form",     el: <OvertimeForm {...commonProps} /> },
    { id: "calendar", el: <OvertimeMonthInline selectedDate={selectedDate} setSelectedDate={setSelectedDate} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} selectedYear={selectedYear} setSelectedYear={setSelectedYear} shiftSchedules={shiftSchedules} onDateSelect={d => fetchMembersForDate(d.format("YYYY-MM-DD"))} /> },
    { id: "members",  el: <><OverMember {...commonProps} limit={overtimeLimit} /><OvertimeMonthGrid members={members} shiftSchedules={shiftSchedules} overtimes={overtimeItems} selectedMonth={selectedMonth} selectedYear={selectedYear} /></> },
    { id: "chart",    el: <div ref={chartRef}><div className="flex justify-end mb-3"><ExportExcel members={members} overtimes={overtimeItems} shiftSchedules={shiftSchedules} selectedMonth={selectedMonth} selectedYear={selectedYear} /></div><OvertimeChart members={members} overtimes={overtimeItems} shiftSchedules={shiftSchedules} selectedMonth={selectedMonth} selectedYear={selectedYear} /></div> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* ════ DESKTOP LAYOUT ════ */}
      <div className="hidden md:flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col fixed h-full z-20">
          {/* Logo */}
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-xl">🕒</span>
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white leading-tight">Quản Lý Tăng Ca</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{selectedMonth}/{selectedYear}</p>
            </div>
          </div>

          {/* Desktop nav — click scroll to section */}
          <nav className="flex-1 p-3 space-y-0.5">
            {NAV_TABS.map(({ id, label, icon }) => (
              <button key={id} onClick={() => document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                <span>{icon}</span> {label}
              </button>
            ))}
          </nav>

          {/* Bottom */}
          <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
            {/* Theme toggle */}
            <button onClick={toggleTheme}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors">
              {dark ? <Sun size={15} /> : <Moon size={15} />}
              <span>{dark ? "Chế độ sáng" : "Chế độ tối"}</span>
            </button>
            {/* Account */}
            <button onClick={() => setShowAccount(true)}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm shrink-0">
                {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.displayName || user?.email}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user?.email}</p>
              </div>
            </button>
            <button onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
              <LogOut size={16} /> Đăng xuất
            </button>
          </div>
        </aside>

        {/* Main desktop */}
        <main className="ml-64 flex-1 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="page-title">🕒 Quản Lý Tăng Ca</h1>
              <p className="page-subtitle">Tháng {selectedMonth}/{selectedYear}</p>
            </div>
            <button onClick={() => setShowManager(true)} className="btn-indigo flex items-center gap-2">
              <Settings size={16} /> Quản lý
            </button>
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {sections.map(({ id, el }, i) => (
              <motion.div key={id} id={`section-${id}`} custom={i} initial="hidden" animate="visible" variants={sectionVariants}>
                {el}
              </motion.div>
            ))}
          </div>
        </main>
      </div>

      {/* ════ MOBILE LAYOUT ════ */}
      <div className="md:hidden flex flex-col h-screen">
        {/* Mobile top bar */}
        <header className="shrink-0 flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center">
              <span className="text-base">🕒</span>
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">Tăng Ca</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">T{selectedMonth}/{selectedYear}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              {dark ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} className="text-gray-600 dark:text-gray-400" />}
            </button>
            <button onClick={() => setShowManager(true)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Settings size={18} className="text-gray-600 dark:text-gray-400" />
            </button>
            <button onClick={() => setShowAccount(true)} className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
              {user?.displayName?.[0]?.toUpperCase() || "U"}
            </button>
          </div>
        </header>

        {/* Mobile content — scroll độc lập */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={mobileTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="p-3 pb-4">
              {sections.find(s => s.id === mobileTab)?.el}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile bottom nav */}
        <nav className="shrink-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-stretch">
          {NAV_TABS.map(({ id, label, icon }) => (
            <button key={id} onClick={() => setMobileTab(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors relative ${mobileTab === id ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"}`}>
              <span className="text-base">{icon}</span>
              <span className={`text-[9px] font-medium leading-none ${mobileTab === id ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"}`}>
                {label}
              </span>
              {mobileTab === id && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-500 rounded-full" />}
            </button>
          ))}
        </nav>
      </div>

      {/* ════ MODALS ════ */}
      <AnimatePresence>
        {showManager && (
          <PopupManager onClose={() => setShowManager(false)} user={user}
            selectedMonth={selectedMonth} selectedYear={selectedYear}
            handleDeleteAll={handleDeleteAll} setToast={setToast} />
        )}
        {showAccount && (
          <AccountPopup user={{ ...user, ...userProfile }} onClose={() => setShowAccount(false)} />
        )}
      </AnimatePresence>

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className={`fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 md:left-6 md:translate-x-0
              px-4 py-2.5 rounded-xl shadow-lg text-white text-sm flex items-center gap-2 z-[100]
              ${toast.type === "error" ? "bg-red-500" : toast.type === "loading" ? "bg-blue-500" : "bg-green-500"}`}
          >
            {toast.type === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
            {toast.type === "success" && <CheckCircle2 className="w-4 h-4" />}
            {toast.type === "error" && <XCircle className="w-4 h-4" />}
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Scroll to top ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-24 md:bottom-6 right-4 md:right-6 w-10 h-10 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg z-40"
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
