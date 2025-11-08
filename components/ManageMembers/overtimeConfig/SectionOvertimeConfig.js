import React, { useEffect, useState } from "react";
import { db } from "../../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { ChevronRight, ChevronDown, Users, Clock } from "lucide-react";

export default function SectionOvertimeLimit({
  shiftConfig = { shiftEnd: "17:00" },
  defaultDailyCap = 6,
}) {
  const [members, setMembers] = useState([]);
  const [tree, setTree] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState({});
  const [openGroups, setOpenGroups] = useState({});
  const [checkOut, setCheckOut] = useState("19:00");
  const [dailyCap, setDailyCap] = useState(defaultDailyCap);
  const [useLimitMode, setUseLimitMode] = useState(
    localStorage.getItem("useLimitMode") === "true"
  );

  const handleToggleMode = (checked) => {
    setUseLimitMode(checked);
    localStorage.setItem("useLimitMode", checked);
  };

  // ====== TIME UTILS ======
  const parseTimeToMinutes = (t) => {
    if (typeof t === "number") return Math.round(t * 60);
    const m = t?.match?.(/^(\d{1,2}):(\d{2})$/);
    if (!m) return 0;
    return Number(m[1]) * 60 + Number(m[2]);
  };

  const normalizeTimeText = (text) => {
    const clean = String(text).replace(/\D/g, "");
    if (!clean) return "00:00";
    if (clean.length <= 2) return `${clean.padStart(2, "0")}:00`;
    if (clean.length === 3) return `${clean[0]}:${clean.slice(1)}`;
    return `${clean.slice(0, 2)}:${clean.slice(2, 4)}`;
  };

  const computeOvertimeToday = (shiftEndText, checkOutText) => {
    const endMin = parseTimeToMinutes(shiftEndText);
    const outMin = parseTimeToMinutes(checkOutText);
    let diff = outMin - endMin;
    if (diff <= 0) diff = outMin + 24 * 60 - endMin;
    return diff > 0 ? Math.floor(diff / 60) : 0;
  };

  // ====== FIRESTORE ======
  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "members"));
        setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Fetch members error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  // ====== GROUP MEMBERS ======
  useEffect(() => {
    const grouped = {};
    members.forEach((m) => {
      const limit = m.overtimeLimit?.monthlyLimit || 0;
      const key = String(limit);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    });
    Object.keys(grouped).forEach((k) => {
      grouped[k].sort((a, b) =>
        (a.nickname || a.realName || "").localeCompare(
          b.nickname || b.realName || ""
        )
      );
    });
    setTree(grouped);
  }, [members]);

  const sortedLimits = Object.keys(tree)
    .map(Number)
    .sort((a, b) => b - a)
    .map(String);

  const toggleGroup = (key) => setOpenGroups((p) => ({ ...p, [key]: !p[key] }));

  // ====== VIEW: NO LIMIT ======
  const renderNoLimitView = () => {
    // Các giờ tan ca mẫu — sau này bạn có thể lấy từ shiftConfig
    const dayShifts = [
      { label: "Tan ca sớm", time: "16:15" },
      { label: "Tan ca muộn", time: "17:00" },
    ];
    const nightShifts = [
      { label: "Tan ca sớm", time: "04:15" },
      { label: "Tan ca muộn", time: "05:00" },
    ];

    const shiftEnd = shiftConfig.shiftEnd || "17:00";
    const overtimeToday = computeOvertimeToday(shiftEnd, checkOut);

    return (
      <div className="border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 p-4 space-y-5 shadow-sm transition-colors">
        {/* === Ca ngày === */}
        <div>
          <div className="text-amber-500 font-semibold mb-2">Ca ngày</div>
          <div className="flex flex-wrap gap-2">
            {dayShifts.map((s, i) => (
              <button
                key={i}
                className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 
                           bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 
                           text-gray-800 dark:text-gray-200 transition-colors w-full sm:w-auto"
              >
                <span className="text-sm">{s.label}</span>
                <span className="ml-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                  {s.time}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* === Ca đêm === */}
        <div>
          <div className="text-amber-500 font-semibold mb-2">Ca đêm</div>
          <div className="flex flex-wrap gap-2">
            {nightShifts.map((s, i) => (
              <button
                key={i}
                className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 
                           bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 
                           text-gray-800 dark:text-gray-200 transition-colors w-full sm:w-auto"
              >
                <span className="text-sm">{s.label}</span>
                <span className="ml-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                  {s.time}
                </span>
              </button>
            ))}
          </div>
        </div>
        {/* === Kế hoạch tăng ca tháng === */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Kế hoạch tăng ca tháng này
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
            <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Giới hạn/ngày
              </div>
              <div className="text-lg font-semibold text-indigo-500 dark:text-indigo-400">
                ≤ 6 h
              </div>
            </div>

            <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Số ngày trong tháng
              </div>
              <div className="text-lg font-semibold text-gray-700 dark:text-gray-100">
                {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()} ngày
              </div>
            </div>

            <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800 col-span-2 sm:col-span-1">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Tổng giờ tối đa
              </div>
              <div className="text-lg font-semibold text-amber-500">
                {new Date().getDate() * 6} h
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
            Công thức: (số ngày × 6 giờ) → tổng giới hạn tháng.
            <br />
            Mỗi ngày không vượt quá 6 giờ tăng ca.
          </div>
        </div>
      </div>
    );
  };

  // ====== VIEW: LIMIT MODE ======
  const renderLimitTreeView = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const getMonthSplitOptions = (monthlyLimit) => {
      const options = [];
      for (let h = 6; h >= 1; h--) {
        const d = monthlyLimit / h;
        if (Number.isInteger(d) && d <= daysInMonth)
          options.push({ perDay: h, days: d });
      }
      if (!options.length) {
        for (let h = 6; h >= 1; h--) {
          const d = Math.ceil(monthlyLimit / h);
          if (d <= daysInMonth) options.push({ perDay: h, days: d });
        }
      }
      return options.sort((a, b) => b.days - a.days);
    };

    return (
      <div className="border rounded-lg bg-white dark:bg-gray-900 p-3 space-y-3">
        {/* === Header cố định === */}
        <div className="flex justify-between items-center border-b border-gray-700 pb-2">
          <div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Số giờ tăng ca / ngày (hệ thống)
            </div>
            <div className="text-sm text-gray-500">
              Quy tắc: 1h sau tan ca = 1h tăng ca
            </div>
          </div>
          <div className="text-xs text-gray-400">
            Tháng {month + 1}/{year} có {daysInMonth} ngày
          </div>
        </div>

        {/* === Nội dung cuộn trong vùng này === */}
        <div
          className="space-y-2 overflow-y-auto pr-1 mt-2"
          style={{
            maxHeight: "180px", // hiển thị vừa khoảng 2 card
            scrollbarWidth: "thin",
          }}
        >
          {loading ? (
            <p className="text-gray-400 text-sm italic">
              Đang tải danh sách nhân viên...
            </p>
          ) : sortedLimits.length === 0 ? (
            <div className="text-sm text-gray-500">Không có nhân viên.</div>
          ) : (
            sortedLimits.map((limitKey) => {
              const membersInGroup = tree[limitKey] || [];
              const limitNum = Number(limitKey);
              const options = getMonthSplitOptions(limitNum);
              const chosen = selectedOption[limitKey] || options[0];
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
                        → {chosen.days} ngày × {chosen.perDay}h/ngày
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Users className="w-4 h-4" /> {membersInGroup.length}
                    </div>
                  </button>

                  {/* Chọn phương án */}
                  <div className="px-4 py-2 border-t border-gray-700 bg-gray-900/40">
                    <div className="flex flex-wrap gap-2">
                      {options.map((opt, i) => {
                        const active =
                          chosen.perDay === opt.perDay &&
                          chosen.days === opt.days;
                        return (
                          <button
                            key={i}
                            onClick={() =>
                              setSelectedOption((prev) => ({
                                ...prev,
                                [limitKey]: opt,
                              }))
                            }
                            className={`px-2 py-1 rounded-lg text-xs border ${
                              active
                                ? "bg-amber-500 text-white border-amber-600"
                                : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
                            } transition-colors`}
                          >
                            {opt.days} ngày × {opt.perDay}h/ngày
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Chi tiết nhân viên */}
                  {isOpen && (
                    <ul className="px-4 py-2 border-t border-gray-700 text-sm space-y-1">
                      {membersInGroup.map((m) => {
                        const name = m.nickname || m.realName || "Không tên";
                        const worked = m.overtimeLimit?.workedHours || 0;
                        const remaining = Math.max(limitNum - worked, 0);
                        const remainDays = Math.ceil(remaining / chosen.perDay);
                        return (
                          <li
                            key={m.id}
                            className="flex justify-between border-b border-gray-700/50 pb-1"
                          >
                            <div>
                              <div className="text-green-400">{name}</div>
                              <div className="text-xs text-gray-400">
                                Đã làm: {worked}h · Còn: {remaining}h
                              </div>
                            </div>
                            <div className="text-right text-xs text-gray-400">
                              {remainDays} ngày ({remaining}h)
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/50 space-y-4 shadow-sm">
      <h3 className="font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-100">
        ⏱️ Giờ tăng ca
      </h3>

      <div className="flex justify-between bg-gray-100 dark:bg-gray-900 border rounded-lg p-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-500" />
          <div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Chế độ
            </div>
            <div className="font-medium text-gray-800 dark:text-gray-100">
              {useLimitMode ? "Giới hạn (monthlyLimit)" : "Không giới hạn"}
            </div>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={useLimitMode}
            onChange={(e) => handleToggleMode(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-indigo-600 transition-all relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:h-5 after:w-5 after:rounded-full after:transition-all peer-checked:after:translate-x-full"></div>
        </label>
      </div>

      {useLimitMode ? renderLimitTreeView() : renderNoLimitView()}
    </div>
  );
}
