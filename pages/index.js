// src/pages/index.js
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import OverMember from "../components/OverMember";
import OvertimeList from "../components/OvertimeList";
import OvertimeSummary from "../components/OvertimeSummary";
import OvertimeChart from "../components/OvertimeChart";
import OvertimeMonth from "../components/OvertimeMonth";
import OvertimeForm from "../components/OvertimeForm";
import PopupManager from "../components/PopupManager";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { LogOut, ArrowUp } from "lucide-react";
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
  const [showOvertimeForm, setShowOvertimeForm] = useState(false);

  const [shiftSchedules, setShiftSchedules] = useState({});
  // structure: { "2025-11-03": { "裴泰南": { shift: "Ca đêm", shiftStart: "19:00" }, ... }, ... }

  const chartRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  // fetch members realtime
  useEffect(() => {
    if (!user) return;
    const col = collection(db, "members");
    const q = query(col, where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user?.uid]);

  // fetch overtimes realtime
  useEffect(() => {
    if (!user) return;
    const col = collection(db, "overtimes");
    const q = query(col, where("userId", "==", user.uid), where("year", "==", selectedYear));
    const unsub = onSnapshot(q, (snap) => {
      setOvertimeItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user?.uid, selectedYear]);

  // fetch shiftSchedules for month (realtime)
  useEffect(() => {
    if (!user) return;
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
    const lastDay = new Date(selectedYear, selectedMonth, 0);
    const startStr = firstDay.toISOString().split("T")[0];
    const endStr = lastDay.toISOString().split("T")[0];

    const col = collection(db, "shiftSchedules");
    const q = query(
      col,
      where("userId", "==", user.uid),
      where("date", ">=", startStr),
      where("date", "<=", endStr)
    );
    const unsub = onSnapshot(q, (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        const date = data.date;
        if (!map[date]) map[date] = {};
        map[date][data.realName] = { shift: data.shift, shiftStart: data.shiftStart };
      });
      setShiftSchedules(map);
    });
    return () => unsub();
  }, [user?.uid, selectedMonth, selectedYear]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 🔹 Hàm mới: đổi ngày + lọc members theo shiftSchedules
  const fetchMembersForDate = (dateStr) => {
    setSelectedDate(new Date(dateStr));

    // Nếu có ca làm trong shiftSchedules thì lọc theo ngày đó
    if (shiftSchedules[dateStr]) {
      const filtered = members.filter((m) => shiftSchedules[dateStr][m.realName]);
      setMembers(filtered);
    } else {
      // Nếu không có ca nào trong ngày đó thì giữ nguyên hoặc xóa danh sách hiển thị
      setMembers([]);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu tháng này không?")) return;
    try {
      const q = query(
        collection(db, "overtimes"),
        where("month", "==", selectedMonth),
        where("year", "==", selectedYear)
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(doc(db, "overtimes", d.id));
      }

      const membersRef = collection(db, "members");
      const membersSnap = await getDocs(membersRef);
      for (const m of membersSnap.docs) {
        await updateDoc(doc(db, "members", m.id), {
          lastCheckInDate: "",
          lastCheckInTime: "",
          lastCheckOutTime: "",
          "overtimeLimit.workedHours": 0,
          "overtimeLimit.remaining": m.data().overtimeLimit?.monthlyLimit ?? 0,
        });
      }

      setOvertimeItems([]);
      setMembers((prev) =>
        prev.map((m) => ({
          ...m,
          lastCheckInDate: "",
          lastCheckInTime: "",
          lastCheckOutTime: "",
          overtimeLimit: {
            ...m.overtimeLimit,
            workedHours: 0,
            remaining: m.overtimeLimit?.monthlyLimit || 0,
          },
        }))
      );

      alert("✅ Đã xóa toàn bộ dữ liệu tăng ca, giới hạn, và reset trạng thái chấm công.");
    } catch (err) {
      console.error("Lỗi khi xóa dữ liệu:", err);
      alert("❌ Lỗi khi xóa dữ liệu, kiểm tra console.");
    }
  };

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
          shiftSchedules={shiftSchedules} // ✅ thêm dòng này
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

      {showOvertimeForm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowOvertimeForm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-[90%] max-w-2xl shadow-2xl animate-fadeIn overflow-y-auto max-h-[90vh]"
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
              className="mt-5 w-full bg-gray-100 hover:bg-gray-200 py-2 rounded-lg text-gray-700 font-medium"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

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
          shiftSchedules={shiftSchedules}   // ✅ thêm dòng này
          handleDeleteAll={handleDeleteAll}
        />
      )}

      {toast && (
        <div
          className={`fixed top-6 right-6 px-4 py-2 rounded-xl shadow-lg text-white text-sm z-[100] ${toast.type === "error" ? "bg-red-500" : "bg-green-500"
            }`}
        >
          {toast.msg}
        </div>
      )}

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
