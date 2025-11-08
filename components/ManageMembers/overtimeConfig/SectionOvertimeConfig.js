import React, { useEffect, useState } from "react";
import { db } from "../../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { ChevronRight, ChevronDown, Users, Plus, Clock } from "lucide-react";

/**
 * Props:
 *  - shiftConfig: object chứa cấu hình ca từ SectionShiftConfig (phải có shiftEnd)
 *    ví dụ: { shiftType, shiftStart, shiftEnd, shiftHalf, startMode..., endMode... }
 *  - defaultDailyCap: số giờ tối đa 1 ngày khi không có limit (mặc định 6)
 */
export default function SectionOvertimeLimit({
  shiftConfig = { shiftEnd: "17:00" },
  defaultDailyCap = 6,
}) {
  const [members, setMembers] = useState([]);
  const [tree, setTree] = useState({}); // grouped by monthlyLimit
  const [loading, setLoading] = useState(true);

  const [useLimitMode, setUseLimitMode] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const [showAddLimitPopup, setShowAddLimitPopup] = useState(false);

  // thời gian check out hiện tại (dùng để tính tăng ca hôm nay)
  const [checkOut, setCheckOut] = useState("19:00");

  // khi không dùng limit: giới hạn tăng ca 1 ngày
  const [dailyCap, setDailyCap] = useState(defaultDailyCap);

  // khi dùng limit: số giờ tăng ca / 1 ngày (do hệ thống quy định)
  const [overtimeHoursPerDay, setOvertimeHoursPerDay] = useState(2);

  // ----- time utils -----
  const parseTimeToMinutes = (t) => {
    if (typeof t === "number") return Math.round(t * 60);
    if (!t) return 0;
    const m = t.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return 0;
    const h = Number(m[1]);
    const mm = Number(m[2]);
    return h * 60 + mm;
  };

  const minutesToTime = (mins) => {
    mins = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const normalizeTimeText = (text) => {
    const clean = String(text).replace(/\D/g, "");
    if (!clean) return "00:00";
    if (clean.length <= 2) return `${clean.padStart(2, "0")}:00`;
    if (clean.length === 3) return `${clean[0]}:${clean.slice(1)}`;
    return `${clean.slice(0, 2)}:${clean.slice(2, 4)}`;
  };

  // tính giờ tăng ca (đơn vị: giờ, integer) theo quy tắc:
  // - mỗi 1 giờ sau shiftEnd = 1 giờ tăng ca
  // - phần dưới 1 giờ bỏ (không làm tròn lên)
  // - nếu muốn làm tròn nửa giờ bạn có thể thay đổi logic
  const computeOvertimeToday = (shiftEndText, checkOutText) => {
    const endMin = parseTimeToMinutes(shiftEndText);
    const outMin = parseTimeToMinutes(checkOutText);
    // nếu out trước end nhưng qua đêm? handle: nếu outMin < endMin => out is next day
    let diff = outMin - endMin;
    if (diff <= 0) {
      // check if out in next day (e.g., end 22:00, out 02:00)
      // assume overtime only if outMin != endMin and outMin + 24h > endMin
      if (outMin !== endMin) diff = outMin + 24 * 60 - endMin;
      else diff = 0;
    }
    if (diff <= 0) return 0;
    // mỗi 60 phút = 1 giờ overtime, phần lẻ bỏ
    return Math.floor(diff / 60);
  };

  // ----- Firestore fetch members -----
  useEffect(() => {
    let mounted = true;
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "members"));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (!mounted) return;
        setMembers(data);
      } catch (err) {
        console.error("Fetch members error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchMembers();
    return () => {
      mounted = false;
    };
  }, []);

  // rebuild tree grouped by monthlyLimit whenever members change
  useEffect(() => {
    const grouped = {};
    members.forEach((m) => {
      const limit = (m.overtimeLimit && m.overtimeLimit.monthlyLimit) || 0;
      const key = String(limit); // "0", "40", ...
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    });
    // sort members inside each group by name
    Object.keys(grouped).forEach((k) => {
      grouped[k].sort((a, b) => {
        const an = (a.nickname || a.realName || "").toLowerCase();
        const bn = (b.nickname || b.realName || "").toLowerCase();
        return an < bn ? -1 : an > bn ? 1 : 0;
      });
    });
    setTree(grouped);
  }, [members]);

  const sortedLimits = Object.keys(tree)
    .map((k) => Number(k))
    .sort((a, b) => b - a)
    .map(String);

  const toggleGroup = (limitKey) =>
    setOpenGroups((p) => ({ ...p, [limitKey]: !p[limitKey] }));

  // ----- render helpers -----
  const renderNoLimitView = () => {
    const shiftEnd = shiftConfig.shiftEnd || "17:00";
    const overtimeToday = computeOvertimeToday(shiftEnd, checkOut);
    const displayedOvertime = Math.min(overtimeToday, Number(dailyCap || 0));

    return (
      <div className="border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            <div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Giờ tan ca
              </div>
              <div className="font-semibold text-indigo-600 dark:text-indigo-400">
                {shiftEnd}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-500">Giới hạn/ngày</div>
            <div className="font-semibold text-gray-800 dark:text-gray-100">
              {dailyCap}h
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 items-center">
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">
              Giờ ra hôm nay
            </label>
            <input
              type="text"
              value={checkOut}
              onChange={(e) => setCheckOut(normalizeTimeText(e.target.value))}
              className="w-full border rounded-lg p-2 mt-1 dark:bg-gray-800 dark:text-gray-100"
            />
            <div className="text-sm text-gray-500 mt-1">
              Overtime tính theo: mỗi 1h sau giờ tan ca = 1h tăng ca
            </div>
          </div>

          <div className="text-center">
            <div className="text-sm text-gray-500">Giờ tăng ca hôm nay</div>
            <div className="text-2xl font-bold text-indigo-600">
              {displayedOvertime} <span className="text-base font-medium">h</span>
            </div>
            <div className="text-sm text-gray-400 mt-1">
              (tính từ {shiftEnd} → {checkOut})
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLimitTreeView = () => {
    // For each group key (monthlyLimit), compute daysNeeded = ceil(limit / overtimeHoursPerDay)
    return (
      <div className="border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Số giờ tăng ca / ngày (hệ thống)
            </div>
            <div className="text-sm text-gray-500">Quy tắc: 1h sau tan ca = 1h tăng ca</div>
          </div>

          <div className="w-40">
            <label className="text-sm text-gray-500">Giờ tăng ca/ngày</label>
            <input
              type="number"
              min="1"
              step="0.5"
              value={overtimeHoursPerDay}
              onChange={(e) => setOvertimeHoursPerDay(Number(e.target.value))}
              className="w-full border rounded-lg p-2 mt-1 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm italic">Đang tải danh sách nhân viên...</p>
        ) : (
          <div className="space-y-2">
            {sortedLimits.length === 0 ? (
              <div className="text-sm text-gray-500">Không có nhân viên.</div>
            ) : (
              sortedLimits.map((limitKey) => {
                const membersInGroup = tree[limitKey] || [];
                const limitNum = Number(limitKey);
                const daysNeeded =
                  overtimeHoursPerDay > 0
                    ? Math.ceil(limitNum / overtimeHoursPerDay)
                    : Infinity;
                const isOpen = openGroups[limitKey] ?? false;

                return (
                  <div
                    key={limitKey}
                    className="border border-gray-700/30 rounded-lg bg-gray-800/70 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleGroup(limitKey)}
                      className="flex justify-between items-center w-full px-3 py-2 text-left hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4 text-amber-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-amber-400" />
                        )}
                        <span className="font-medium text-amber-300">
                          Giới hạn {limitNum} giờ
                        </span>
                        <span className="text-sm text-gray-400 ml-2">
                          → {daysNeeded} ngày (với {overtimeHoursPerDay}h/ngày)
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Users className="w-4 h-4" />
                        {membersInGroup.length}
                      </div>
                    </button>

                    <div
                      className={`transition-all duration-300 ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                        } overflow-hidden border-t border-gray-700`}
                    >
                      <ul className="px-4 py-2 space-y-1 text-sm">
                        {membersInGroup.map((m) => {
                          const name = m.nickname || m.realName || "Không tên";
                          const worked = (m.overtimeLimit && m.overtimeLimit.workedHours) || 0;
                          const remaining = Math.max(limitNum - worked, 0);
                          const daysRemain =
                            overtimeHoursPerDay > 0
                              ? Math.ceil(remaining / overtimeHoursPerDay)
                              : Infinity;
                          return (
                            <li
                              key={m.id}
                              className="flex justify-between border-b border-gray-700/50 pb-1 py-1"
                            >
                              <div>
                                <div className="text-green-400">{name}</div>
                                <div className="text-xs text-gray-400">
                                  Đã làm: {worked}h · Còn: {remaining}h
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-gray-300 font-semibold">
                                  {daysRemain === Infinity ? "—" : `${daysRemain} ngày`}
                                </div>
                                <div className="text-xs text-gray-500">({remaining}h)</div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/50 space-y-4 shadow-sm">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
        ⏱️ Giờ tăng ca
      </h3>

      <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-900 border rounded-lg p-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-500" />
          <div>
            <div className="text-sm text-gray-700 dark:text-gray-300">Chế độ</div>
            <div className="font-medium text-gray-800 dark:text-gray-100">
              {useLimitMode ? "Dùng giới hạn (monthlyLimit)" : "Không dùng giới hạn"}
            </div>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={useLimitMode}
            onChange={(e) => setUseLimitMode(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      {useLimitMode ? renderLimitTreeView() : renderNoLimitView()}

      {/* Popup thêm giới hạn — hiện chỉ UI skeleton */}
      {showAddLimitPopup && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowAddLimitPopup(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-2xl w-80 space-y-4"
          >
            <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-center">
              ➕ Thêm giới hạn tăng ca
            </h4>
            {/* implement thêm nếu muốn */}
            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={() => setShowAddLimitPopup(false)}
                className="px-4 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              >
                Hủy
              </button>
              <button
                onClick={() => setShowAddLimitPopup(false)}
                className="px-4 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
