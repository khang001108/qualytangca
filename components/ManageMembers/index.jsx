import React, { useState, useEffect, useMemo } from "react";
import AddMemberForm from "./AddMemberForm";
import LimitSelector from "./LimitSelector";
import DeleteConfirm from "./DeleteConfirm";
import ShiftAssign from "./ShiftAssign";
import OvertimeConfigPopup from "./overtimeConfig/OvertimeConfigPopup";
import MembersTable from "./MembersTable";
import useMembersData from "./hooks/useMembersData";
import { useOvertimeConfig } from "../../hooks/useOvertimeConfig";

import { updateOvertimeLimits } from "./overtimeConfig/SectionOvertimeConfig";
import dayjs from "dayjs";
import Toast from "../Toast";
import {
  Clock,
  UserPlus,
  Trash2,
  CalendarArrowUp,
  Search,
  Settings,
} from "lucide-react";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

//==============================================================================
//                       ManageMembers Component
//==============================================================================
export default function ManageMembers({
  user,
  selectedMonth,
  selectedYear,
  selectedDate,
  setToast,
}) {
  const { members, setMembers, toast, showToast } = useMembersData(user);
  const { defaultDailyCap } = useOvertimeConfig();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState("lowLimit");

  const [showAdd, setShowAdd] = useState(false);
  const [showLimit, setShowLimit] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showFormula, setShowFormula] = useState(false); // cấu hình tăng ca
  const [overtimeLimitDocs, setOvertimeLimitDocs] = useState({});

  const [limitInput, setLimitInput] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shiftSchedules, setShiftSchedules] = useState({});
  const [shiftConfig, setShiftConfig] = useState({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "overtimeLimits"), (snap) => {
      const obj = {};
      snap.forEach((d) => {
        obj[d.id] = d.data(); // ví dụ d.id = limit_40
      });
      setOvertimeLimitDocs(obj);
    });
    return unsub;
  }, []);

  // === Load shiftConfig once ===
  useEffect(() => {
    const unsubDay = onSnapshot(doc(db, "shiftConfig", "day"), (snap) => {
      setShiftConfig((prev) => ({
        ...prev,
        day: snap.exists() ? snap.data() : {}
      }));
    });
  
    const unsubNight = onSnapshot(doc(db, "shiftConfig", "night"), (snap) => {
      setShiftConfig((prev) => ({
        ...prev,
        night: snap.exists() ? snap.data() : {}
      }));
    });
  
    return () => {
      unsubDay();
      unsubNight();
    };
  }, []);
    

  // === Load shiftSchedules realtime ===
  useEffect(() => {
    if (!user?.uid) return;
    const safeDate = selectedDate ? dayjs(selectedDate) : dayjs();
    const start = safeDate.startOf("month").format("YYYY-MM-DD");
    const end = safeDate.endOf("month").format("YYYY-MM-DD");

    const q = query(
      collection(db, "shiftSchedules"),
      where("userId", "==", user.uid),
      where("date", ">=", start),
      where("date", "<=", end)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = {};
      snap.docs.forEach((d) => {
        const item = d.data();
        if (!data[item.date]) data[item.date] = {};
        data[item.date][item.memberId] = {
          shift: item.shift,
          shiftStart: item.shiftStart,
          realName: item.realName,
        };
      });
      setShiftSchedules(data);
    });
    return () => unsub();
  }, [user?.uid, selectedDate]);

  // === Toggle chọn nhân viên ===
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // === Lọc + tìm kiếm + sắp xếp ===
  const processedMembers = useMemo(() => {
    const term = (searchTerm || "").trim().toLowerCase();

    let list = members.filter((m) => {
      if (!term) return true;

      const nick = (m.nickname || "").toLowerCase();
      const real = (m.realName || "").toLowerCase();

      return nick.includes(term) || real.includes(term);
    });

    switch (sortMode) {
      case "lowLimit":
        list.sort(
          (a, b) =>
            (a.overtimeLimit?.monthlyLimit || 0) -
            (b.overtimeLimit?.monthlyLimit || 0)
        );
        break;

      case "highLimit":
        list.sort(
          (a, b) =>
            (b.overtimeLimit?.monthlyLimit || 0) -
            (a.overtimeLimit?.monthlyLimit || 0)
        );
        break;

      case "workedHigh":
        list.sort(
          (a, b) =>
            (b.overtimeLimit?.workedHours || 0) -
            (a.overtimeLimit?.workedHours || 0)
        );
        break;

      case "workedLow":
        list.sort(
          (a, b) =>
            (a.overtimeLimit?.workedHours || 0) -
            (b.overtimeLimit?.workedHours || 0)
        );
        break;

      case "earlyShift":
        list.sort((a, b) => {
          const aFlag = a.earlyShift ? 0 : 1;
          const bFlag = b.earlyShift ? 0 : 1;
          if (aFlag !== bFlag) return aFlag - bFlag;
          return (a.shiftStart || "").localeCompare(b.shiftStart || "");
        });
        break;

      case "lateShift":
        list.sort((a, b) => {
          const aFlag = a.earlyShift ? 1 : 0;
          const bFlag = b.earlyShift ? 1 : 0;
          if (aFlag !== bFlag) return aFlag - bFlag;
          return (b.shiftStart || "").localeCompare(a.shiftStart || "");
        });
        break;

      default:
        break;
    }

    list = list.map((m) => {
      const limit = m.overtimeLimit?.monthlyLimit || 0;
      const limitInfo = overtimeLimitDocs[`limit_${limit}`] || null;

      return {
        ...m,
        limitInfo,
      };
    });

    return list;
  }, [members, searchTerm, sortMode, overtimeLimitDocs]);

  // === Lưu giới hạn tăng ca (bao gồm cả xóa giới hạn) ===
  const handleSetLimit = async (updatedMembers) => {
    setLoading(true);
    try {
      for (const m of updatedMembers) {
        const ref = doc(db, "members", m.id);

        const worked = m.overtimeLimit?.workedHours || 0;
        const limit = m.overtimeLimit?.monthlyLimit ?? 0;

        const newLimit = {
          ...m.overtimeLimit,
          monthlyLimit: limit,
          remaining: Math.max(limit - worked, 0),
        };

        await updateDoc(ref, { overtimeLimit: newLimit });
      }

      setMembers(updatedMembers);
      showToast("Đã lưu thay đổi giới hạn.", "success");
      // setShowLimit(true);
    } catch (err) {
      console.error("❌ Lỗi khi lưu giới hạn tăng ca:", err);
      showToast("Không thể lưu thay đổi.", "error");
    } finally {
      setLoading(false);
    }
  };

  // === Xóa nhân viên ===
  const handleDeleteMembers = async () => {
    if (selectedIds.length === 0)
      return showToast("Chọn ít nhất 1 nhân viên.", "error");
    setLoading(true);
    try {
      for (const id of selectedIds) {
        await deleteDoc(doc(db, "members", id));
      }
      setMembers((prev) => prev.filter((m) => !selectedIds.includes(m.id)));
      setSelectedIds([]);
      showToast(`Đã xóa ${selectedIds.length} nhân viên.`, "caution");
      setShowDelete(false);
    } catch (err) {
      console.error("Lỗi xóa nhân viên:", err);
      showToast("Không thể xóa nhân viên.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-gray-800 dark:text-gray-200">
      {/* Toolbar */}
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2 flex-nowrap">
          <button
            onClick={() => setShowAssign(true)}
            className="flex items-center gap-1 bg-purple-500 text-white px-3 py-1 rounded-lg text-sm"
          >
            <CalendarArrowUp className="w-4 h-4" /> Phân ca
          </button>

          <button
            onClick={() => setShowLimit(true)}
            className="flex items-center gap-1 bg-indigo-500 text-white px-3 py-1 rounded-lg text-sm"
          >
            <Clock className="w-4 h-4" /> Giới hạn tăng ca
          </button>

          <button
            onClick={() => setShowFormula(true)}
            className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded-lg text-sm"
          >
            <Settings className="w-4 h-4" /> Cấu hình tăng ca
          </button>

          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-lg text-sm"
          >
            <UserPlus className="w-4 h-4" /> Thêm nhân viên
          </button>

          <button
            onClick={() => setShowDelete(true)}
            className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-lg text-sm"
          >
            <Trash2 className="w-4 h-4" /> Xóa nhân viên
          </button>
        </div>

        {/* Tìm kiếm + sắp xếp */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tên (nickname hoặc realName)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 border rounded-md bg-white/70 dark:bg-gray-700/40 text-sm"
            />
          </div>

          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
            className="px-2 py-1 border rounded-md bg-white/70 dark:bg-gray-700 text-sm"
          >
            <option value="lowLimit">Giới hạn giờ thấp nhất</option>
            <option value="highLimit">Giới hạn giờ cao nhất</option>
            <option value="workedHigh">Đã tăng ca nhiều nhất</option>
            <option value="workedLow">Đã tăng ca ít nhất</option>
            <option value="earlyShift">Nhân viên lên ca sớm</option>
            <option value="lateShift">Nhân viên lên ca muộn</option>
          </select>
        </div>
      </div>

      {/* Bảng nhân viên */}
      <div className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-800/30">
        {processedMembers.length === 0 ? (
          <p className="p-4 text-center text-gray-500 text-sm">
            Không có nhân viên phù hợp.
          </p>
        ) : (
          <MembersTable
            members={processedMembers}
            setMembers={setMembers}
            user={user}
            selectedDate={selectedDate}
            shiftSchedules={shiftSchedules}
            shiftConfig={shiftConfig}
          />
        )}
      </div>

      {/* Popups */}
      {showAdd && (
        <AddMemberForm
          user={user}
          setShowAdd={setShowAdd}
          members={members}
          setMembers={setMembers}
          showToast={showToast}
        />
      )}
      {showLimit && (
        <LimitSelector
          title="Giới hạn tăng ca"
          confirmText="Lưu thay đổi"
          onCancel={() => setShowLimit(false)}
          members={members}
          loading={loading}
          color="indigo"
          showToast={showToast}
          onConfirm={async (updatedMembers) => {
            try {
              // 1️⃣ Cập nhật lại giới hạn của từng nhân viên
              await handleSetLimit(updatedMembers);

              // 2️⃣ Sau khi xong, gọi đồng bộ Firestore overtimeLimits
              // 2️⃣ Build lại toàn bộ limit collection từ updatedMembers
              const daysInMonth = dayjs().daysInMonth();
              const fullLimit = daysInMonth * defaultDailyCap;

              // Gom nhóm theo limit
              const limitGroups = {};
              for (const m of updatedMembers) {
                const limit = m.overtimeLimit?.monthlyLimit;
                const worked = m.overtimeLimit?.workedHours || 0;

                // Chỉ tạo limit khi monthlyLimit < fullLimit
                if (limit < fullLimit) {
                  if (!limitGroups[limit]) limitGroups[limit] = [];

                  limitGroups[limit].push({
                    id: m.id,
                    name: m.realName,
                    workedHours: worked,
                    remaining: Math.max(limit - worked, 0),
                  });
                }
              }

              // 3️⃣ Lấy danh sách limit_xx hiện có trong Firestore để xóa cái không còn ai
              const snap = await getDocs(collection(db, "overtimeLimits"));
              const existedLimits = snap.docs.map((doc) => doc.id); // ví dụ ["limit_40", "limit_99"]

              // 4️⃣ Ghi lại tài liệu có nhân viên
              for (const limitVal of Object.keys(limitGroups)) {
                const list = limitGroups[limitVal];
                const ref = doc(db, "overtimeLimits", `limit_${limitVal}`);

                await setDoc(
                  ref,
                  {
                    limit: Number(limitVal),
                    memberCount: list.length,
                    members: list,
                    updatedAt: new Date(),
                    month: Number(dayjs().month() + 1),
                    year: Number(dayjs().year()),
                  },
                  { merge: true }
                );
              }

              // 5️⃣ Xóa limit không còn nhân viên nào
              for (const id of existedLimits) {
                const limitNumber = Number(id.replace("limit_", ""));

                if (!limitGroups[limitNumber]) {
                  await deleteDoc(doc(db, "overtimeLimits", id));
                }
              }
              showToast("Đã lưu và đồng bộ lại overtimeLimits.", "success");
            } catch (err) {
              console.error("❌ Lỗi đồng bộ overtimeLimits:", err);
              showToast("Không thể đồng bộ overtimeLimits.", "error");
            }
          }}
        />
      )}

      {showAssign && (
        <ShiftAssign
          user={user}
          members={members}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onCancel={() => setShowAssign(false)}
          onStatusChange={({ loading, success, month }) => {
            if (loading)
              setToast({ msg: "Đang lưu phân ca...", type: "loading" });
            else if (success)
              setToast({
                msg: `✅ Phân ca tháng ${month} hoàn tất.`,
                type: "success",
              });
            else setToast({ type: "error", msg: "❌ Lỗi khi lưu phân ca!" });
          }}
        />
      )}
      {showFormula && (
        <OvertimeConfigPopup
          user={user}
          onClose={() => setShowFormula(false)}
          showToast={showToast}
        />
      )}
      {showDelete && (
        <DeleteConfirm
          members={members}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          loading={loading}
          onConfirm={handleDeleteMembers}
          onCancel={() => setShowDelete(false)}
        />
      )}

      <Toast
        toasts={
          toast.message
            ? [{ id: Date.now(), message: toast.message, type: toast.type }]
            : []
        }
        onClose={() => {}}
      />
    </div>
  );
}
