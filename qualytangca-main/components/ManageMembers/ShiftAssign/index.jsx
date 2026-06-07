// components/ManageMembers/ShiftAssign/index.jsx
import React, { useRef, useState, useEffect } from "react";
import {
  collection,
  doc,
  getDocs,
  deleteDoc,
  query,
  where,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { deleteField } from "firebase/firestore";

import ShiftAssignHeader from "./ShiftAssignHeader";
import ShiftAssignShiftSelector from "./ShiftAssignShiftSelector";
import ShiftAssignCalendar from "./ShiftAssignCalendar";
import ShiftAssignFooter from "./ShiftAssignFooter";
import { loadShiftConfigs } from "../../../hooks/useOvertimeParser/shiftHelpers";

export default function ShiftAssign(props) {
  const {
    user,
    members = [],
    onCancel,
    onSuccess,
    onStatusChange,
    selectedMonth,
    selectedYear,
  } = props;

  const ref = useRef();
  const [loading, setLoading] = useState(false);
  const [shiftType, setShiftType] = useState("day");
  const [assignMap, setAssignMap] = useState({}); // day -> "day"|"night"
  const [hasLoaded, setHasLoaded] = useState(false);
  const [popupMsg, setPopupMsg] = useState(null);
  const [popupType, setPopupType] = useState("success");
  const [savingProgress, setSavingProgress] = useState(null);

  // selectedMembersMap: { [memberId]: { include: boolean, earlyShift: boolean } }
  const [selectedMembersMap, setSelectedMembersMap] = useState({});

  const assignMapRef = useRef(assignMap);
  useEffect(() => {
    assignMapRef.current = assignMap;
  }, [assignMap]);

  const dragState = useRef({
    isSelecting: false,
    selectingShift: null,
    dragged: false,
    pressDay: null,
    startX: 0,
    startY: 0,
  });

  // RESET khi đổi tháng hoặc user thay đổi — fix: reset selectedMembersMap luôn
  useEffect(() => {
    if (!user?.uid) return;
    setHasLoaded(false);
    setAssignMap({});
    setSelectedMembersMap({});
  }, [selectedMonth, selectedYear, user?.uid]);

  // LOAD existing shiftSchedules for month
  useEffect(() => {
    if (!user?.uid || hasLoaded) return;
    (async () => {
      try {
        const col = collection(db, "shiftSchedules");
        const realMonth = selectedMonth - 1;
        const lastDay = new Date(selectedYear, realMonth + 1, 0).getDate();

        const yyyy = selectedYear;
        const mm = String(selectedMonth).padStart(2, "0");

        const startDate = `${yyyy}-${mm}-01`;
        const endDate = `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;

        const qShift = query(
          col,
          where("userId", "==", user.uid),
          where("date", ">=", startDate),
          where("date", "<=", endDate)
        );

        const snap = await getDocs(qShift);
        const newMap = {};
        const memberStates = {};

        snap.docs.forEach((d) => {
          const data = d.data();
          const day = Number(data.date.split("-")[2]);

          // ca ngày / đêm
          newMap[day] = data.shift === "Ca đêm" ? "night" : "day";

          // load trạng thái sớm / muộn
          const isEarly =
            data.shiftStart?.includes("sớm") ||
            data.shiftStart?.includes("som"); // phòng unicode lỗi

          // ensure we set member default from DB (include true)
          memberStates[data.memberId] = {
            include: true,
            earlyShift: !!isEarly,
          };
        });

        setAssignMap(newMap);

        // merge into selectedMembersMap (do not clobber if user already has some selections)
        setSelectedMembersMap((prev) => {
          // If prev already has entries, keep them and only add missing from memberStates
          const merged = { ...prev };
          Object.entries(memberStates).forEach(([id, st]) => {
            merged[id] = { ...(merged[id] || {}), ...st };
          });
          return merged;
        });

        setHasLoaded(true);
      } catch (err) {
        console.error("❌ Lỗi khi load phân ca:", err);
      }
    })();
  }, [user?.uid, selectedMonth, selectedYear, hasLoaded]);

  // Ensure selectedMembersMap has defaults for members prop (only once when members change)
  useEffect(() => {
    if (!members || members.length === 0) return;

    setSelectedMembersMap((prev) => {
      // if already initialized for all members, skip
      const missing = members.filter((m) => !(m.id in prev));
      if (missing.length === 0) return prev;

      const add = {};
      for (const m of missing) {
        // If member object contains an earlyShift flag in DB, use it; otherwise default false (Lên muộn)
        add[m.id] = {
          include: true, // default: selected
          earlyShift: !!m.earlyShift,
        };
      }
      return { ...prev, ...add };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);

  // --- MOUSE INTERACTIONS: FIX ngày khởi đầu không toggle (always set to selectingShift) ---
  const handleMouseDown = (day, e) => {
    if (loading) return;
    e.preventDefault();
    e.stopPropagation();
    dragState.current.isSelecting = true;
    dragState.current.selectingShift = shiftType;
    dragState.current.dragged = false;
    dragState.current.pressDay = day;
    dragState.current.startX = e.clientX;
    dragState.current.startY = e.clientY;

    // FIX: set first day to selectingShift (không toggle)
    setAssignMap((prev) => ({ ...prev, [day]: shiftType }));

    const onMove = (ev) => {
      const dx = Math.abs(ev.clientX - dragState.current.startX);
      const dy = Math.abs(ev.clientY - dragState.current.startY);
      if (dx > 3 || dy > 3) dragState.current.dragged = true;
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      dragState.current.isSelecting = false;
      dragState.current.dragged = false;
      dragState.current.pressDay = null;
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const handleMouseEnter = (day) => {
    if (!dragState.current.isSelecting || loading) return;
    dragState.current.dragged = true;
    setAssignMap((prev) => ({
      ...prev,
      [day]: dragState.current.selectingShift,
    }));
  };

  // show popup helper
  const showPopup = (msg, type) => {
    setPopupMsg(msg);
    setPopupType(type);
    setTimeout(() => setPopupMsg(null), 2500);
  };

  // selected summary helper
  const selectedSummary = () => {
    const selected = Object.entries(selectedMembersMap)
      .filter(([id, v]) => v.include && v.earlyShift)
      .map(([id]) => {
        const mem = members.find((mm) => mm.id === id);
        return mem ? mem.realName : id;
      });

    if (selected.length === 0) return "(Không có ai lên ca sớm)";
    if (selected.length > 5)
      return selected.slice(0, 5).join(", ") + `, +${selected.length - 5}...`;

    return selected.join(", ");
  };

  // --- HANDLE APPLY: dùng merge để không overwrite các trường khác ---
  const handleApply = async () => {
    if (!user?.uid) return;

    const selectedDays = Object.keys(assignMap).filter((d) => assignMap[d]);
    if (selectedDays.length === 0)
      return showPopup("⚠️ Chưa chọn ngày nào để lưu!", "error");

    const membersToApply = Object.entries(selectedMembersMap)
      .filter(([id, v]) => v.include)
      .map(([id, v]) => ({ id, earlyShift: !!v.earlyShift }));

    setLoading(true);
    onStatusChange?.({ loading: true });

    try {
      const configs = await loadShiftConfigs();
      const dayCfg = configs?.day || null;
      const nightCfg = configs?.night || null;

      if (membersToApply.length === 0) {
        showPopup(
          "ℹ️ Không có nhân viên được chọn — không có gì để lưu.",
          "success"
        );
        onStatusChange?.({
          loading: false,
          success: true,
          month: selectedMonth,
        });
        setLoading(false);
        return;
      }

      for (let i = 0; i < selectedDays.length; i++) {
        const dayStr = selectedDays[i];

        onStatusChange?.({
          loading: true,
          saving: {
            index: i + 1,
            total: selectedDays.length,
            day: dayStr,
          },
        });

        // update progress
        setSavingProgress({
          index: i + 1,
          total: selectedDays.length,
          day: dayStr,
        });

        const type = assignMap[dayStr];
        const shift = type === "day" ? "Ca ngày" : "Ca đêm";
        const date = `${selectedYear}-${String(selectedMonth).padStart(
          2,
          "0"
        )}-${String(dayStr).padStart(2, "0")}`;

        for (const sel of membersToApply) {
          const member = members.find((mm) => mm.id === sel.id);
          if (!member) continue;

          const shiftStart =
            type === "day"
              ? sel.earlyShift
                ? "lên_ca_ngày_sớm"
                : "lên_ca_ngày_muộn"
              : sel.earlyShift
              ? "lên_ca_đêm_sớm"
              : "lên_ca_đêm_muộn";

          const cfg = type === "day" ? dayCfg : nightCfg;

          let fields = {};
          if (cfg) {
            if (shiftStart.includes("sớm")) {
              fields = {
                lenCaSomBatDau: cfg.lenCaSomBatDau,
                lenCaSomKetThuc: cfg.lenCaSomKetThuc,
                tanCaSomBatDau: cfg.tanCaSomBatDau,
                tanCaSomKetThuc: cfg.tanCaSomKetThuc,
              };
            } else {
              fields = {
                lenCaMuonBatDau: cfg.lenCaMuonBatDau,
                lenCaMuonKetThuc: cfg.lenCaMuonKetThuc,
                tanCaMuonBatDau: cfg.tanCaMuonBatDau,
                tanCaMuonKetThuc: cfg.tanCaMuonKetThuc,
              };
            }
          }

          const docId = `${date}__${member.id}`;

          await setDoc(
            doc(db, "shiftSchedules", docId),
            {
              userId: user.uid,
              date,
              memberId: member.id,
              realName: member.realName,
              nickname: member.nickname || "",
              shift,
              shiftStart,

              // XÓA
              lenCaSomBatDau: deleteField(),
              lenCaSomKetThuc: deleteField(),
              tanCaSomBatDau: deleteField(),
              tanCaSomKetThuc: deleteField(),
              lenCaMuonBatDau: deleteField(),
              lenCaMuonKetThuc: deleteField(),
              tanCaMuonBatDau: deleteField(),
              tanCaMuonKetThuc: deleteField(),

              // GHI
              ...fields,

              lenCa: null,
              xuongCa: null,
              updatedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );

          await updateDoc(doc(db, "members", member.id), {
            shift,
            shiftStart,
            updatedAt: serverTimestamp(),
          });
        }
      }

      showPopup("✅ Đã lưu phân ca và đồng bộ thành công!", "success");
      onStatusChange?.({ loading: false, success: true, month: selectedMonth });
      onSuccess?.();
    } catch (err) {
      console.error("🔥 Lỗi lưu phân ca:", err);
      showPopup("❌ Không thể lưu phân ca!", "error");
      onStatusChange?.({ loading: false, success: false });
    } finally {
      setSavingProgress(null);
      setLoading(false);
    }
  };

  // --- HANDLE DELETE ALL: prop name consistent later ---
  const handleDeleteAll = async () => {
    if (!window.confirm("⚠️ Xóa toàn bộ phân ca tháng này?")) return;
    setLoading(true);
    try {
      const col = collection(db, "shiftSchedules");
      const realMonth = selectedMonth - 1;
      const lastDay = new Date(selectedYear, realMonth + 1, 0).getDate();

      const yyyy = selectedYear;
      const mm = String(selectedMonth).padStart(2, "0");

      const startDate = `${yyyy}-${mm}-01`;
      const endDate = `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;

      const qShift = query(
        col,
        where("userId", "==", user.uid),
        where("date", ">=", startDate),
        where("date", "<=", endDate)
      );
      const snap = await getDocs(qShift);
      for (const d of snap.docs)
        await deleteDoc(doc(db, "shiftSchedules", d.id));

      // RESET member defaults: use existing member default if present; keep consistent schema
      for (const m of members) {
        const memberRef = doc(db, "members", m.id);
        await updateDoc(memberRef, {
          shift: "Ca ngày",
          shiftStart: "lên_ca_ngày_muộn",
          updatedAt: serverTimestamp(),
        });
      }

      setAssignMap({});
      setSelectedMembersMap({});
      showPopup("🗑️ Đã xóa toàn bộ phân ca và reset ca mặc định!", "success");
    } catch (err) {
      console.error("🔥 Lỗi khi xóa phân ca:", err);
      showPopup("❌ Không thể xóa phân ca!", "error");
    } finally {
      setSavingProgress(null);
      setLoading(false);
    }
  };

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const totalDayShift = Object.values(assignMap).filter(
    (v) => v === "day"
  ).length;
  const totalNightShift = Object.values(assignMap).filter(
    (v) => v === "night"
  ).length;

  // --- UI: thêm left sidebar hiển thị full danh sách nhân viên với checkbox (bên phải calendar) ---
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={(e) =>
        ref.current && !ref.current.contains(e.target) && onCancel()
      }
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        ref={ref}
        className="
    relative bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200
    w-11/12 max-w-5xl p-6 rounded-2xl shadow-2xl 
    border border-gray-200 dark:border-gray-700 z-10 select-none
  "
        onMouseDown={(e) => e.stopPropagation()}
      >
        <ShiftAssignHeader
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onClose={onCancel}
        />

        {popupMsg && (
          <div
            className={`mb-4 text-center text-sm px-4 py-2 rounded-lg ${
              popupType === "success"
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-red-100 text-red-700 border border-red-300"
            }`}
          >
            {popupMsg}
          </div>
        )}

        {/* HÀNG TRÊN CÙNG: đẩy full sang phải */}
        {/* Nhân viên đã chọn */}
        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          Nhân viên đã chọn: {selectedSummary()}
        </div>
        <div className="w-full flex flex-col items-end mb-3">
          {/* Ca ngày / Ca đêm */}
          <ShiftAssignShiftSelector
            shiftType={shiftType}
            setShiftType={setShiftType}
            loading={loading}
          />
        </div>

        <div className="flex gap-6">
          {/* LEFT: full list */}
          <div className="w-1/3 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700 max-h-[420px] overflow-auto">
            <div className="text-sm font-semibold mb-2">
              Danh sách nhân viên
            </div>
            {/* SELECT ALL */}
            <div className="flex items-center gap-2 mb-2 pb-2 border-b dark:border-gray-700 select-none">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={members.every(
                  (m) => selectedMembersMap[m.id]?.include
                )}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSelectedMembersMap((prev) => {
                    const updated = { ...prev };
                    for (const m of members) {
                      updated[m.id] = {
                        ...(updated[m.id] || { earlyShift: !!m.earlyShift }),
                        include: checked,
                      };
                    }
                    return updated;
                  });
                }}
              />
              <span className="text-sm font-semibold">Chọn tất cả</span>
            </div>

            {members.map((m) => {
              const state = selectedMembersMap[m.id] || {
                include: true,
                earlyShift: !!m.earlyShift,
              };

              return (
                <div
                  key={m.id}
                  className={`flex items-center justify-between py-2 border-b last:border-b-0 select-none 
                  ${state.include ? "" : "opacity-40"}`}
                >
                  {/* LEFT: checkbox + tên */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={state.include}
                      onChange={(e) =>
                        setSelectedMembersMap((prev) => ({
                          ...prev,
                          [m.id]: {
                            ...(prev[m.id] || state),
                            include: e.target.checked,
                          },
                        }))
                      }
                    />

                    <span
                      onClick={() =>
                        setSelectedMembersMap((prev) => ({
                          ...prev,
                          [m.id]: {
                            ...(prev[m.id] || state),
                            include: !state.include, // toggle checkbox
                          },
                        }))
                      }
                      className="text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer"
                    >
                      {m.realName} {m.nickname ? `(${m.nickname})` : ""}
                    </span>
                  </div>

                  {/* RIGHT: sớm / muộn */}
                  <span
                    onClick={() =>
                      setSelectedMembersMap((prev) => ({
                        ...prev,
                        [m.id]: {
                          ...(prev[m.id] || state),
                          include: true, // bật lại auto nếu họ click
                          earlyShift: !(prev[m.id] || state).earlyShift,
                        },
                      }))
                    }
                    className={`text-xs font-semibold cursor-pointer px-2 py-1 rounded ${
                      state.earlyShift ? "text-orange-500" : "text-gray-500"
                    }`}
                  >
                    {state.earlyShift ? "Lên sớm" : "Lên muộn"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* RIGHT: calendar + stats */}
          <div className="flex-1 flex justify-center">
            <div className="w-full max-w-[430px]">
              <div className="flex justify-center gap-6 mt-2 mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                <span className="flex items-center gap-1">
                  ☀️ <span className="font-semibold">{totalDayShift}</span> ngày
                </span>
                <span className="opacity-50">•</span>
                <span className="flex items-center gap-1">
                  🌙 <span className="font-semibold">{totalNightShift}</span>{" "}
                  ngày
                </span>
              </div>

              <ShiftAssignCalendar
                daysInMonth={daysInMonth}
                assignMap={assignMap}
                handleMouseDown={handleMouseDown}
                handleMouseEnter={handleMouseEnter}
                loading={loading}
              />

              <ShiftAssignFooter
                loading={loading}
                savingProgress={savingProgress}
                onCancel={onCancel}
                handleApply={handleApply}
                handleDeleteAll={handleDeleteAll}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
