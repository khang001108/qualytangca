// components/ManageMembers/overtimeConfig/SectionOvertimeConfig/LimitTreeView.jsx
// Hiển thị cây nhóm nhân viên theo giới hạn tăng ca và tùy chọn phân bổ ngày/hàng ngày

import React from "react";
import { ChevronRight, ChevronDown, Users, Save } from "lucide-react";
import { collection, doc, setDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";


export default function LimitTreeView({
  tree,
  loading,
  selectedOption,
  setSelectedOption,
  openGroups,
  setOpenGroups,
  shiftConfig,
}) {
  const toggleGroup = (key) => setOpenGroups((p) => ({ ...p, [key]: !p[key] }));

  const sortedLimits = Object.keys(tree)
    .map(Number)
    .sort((a, b) => b - a)
    .map(String);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // === Lưu báo cáo tăng ca vào Firestore ===
  const handleSaveToFirestore = async () => {
    try {
      const promises = Object.keys(tree).map(async (limitKey) => {
        const members = tree[limitKey] || [];
        const limitNum = Number(limitKey); // <-- THÊM DÒNG NÀY
        const chosen = selectedOption[limitKey];
        if (!chosen) return;

        const days = Math.floor(chosen.days);
        const perDay = Math.floor(chosen.perDay);
        const totalLimit = days * perDay;

        // === Tính toán lại remaining ===
        const membersWithRemaining = members.map((m) => {
          const worked = Math.floor(m.overtimeLimit?.workedHours || 0);
          const remainingHours = Math.max(totalLimit - worked, 0);
          const remainingDays = Math.floor(remainingHours / perDay);
          const remainderHours = remainingHours % perDay;

          return {
            id: m.id,
            name: m.nickname || m.realName || "Không tên",
            monthlyLimit: totalLimit,
            workedHours: worked,
            remainingDays,
            remainingHours: remainderHours,
          };
        });

        const data = {
          createdAt: serverTimestamp(),
          month: month + 1,
          year,
          limit: totalLimit,
          days,
          perDay,
          rule: "1h sau tan ca hành chính (ca sớm/muộn) = 1h tăng ca",
          shiftEndDayEarly: shiftConfig?.day?.tanCaSomBatDau || "--:--",
          shiftEndDayLate: shiftConfig?.day?.tanCaMuonBatDau || "--:--",
          shiftEndNightEarly: shiftConfig?.night?.tanCaSomBatDau || "--:--",
          shiftEndNightLate: shiftConfig?.night?.tanCaMuonBatDau || "--:--",
          memberCount: members.length,
          members: membersWithRemaining,
        };

        // === Lưu document theo định dạng: limit_40_day_20 ===
        const docId = `limit_${limitNum}_day_${days}`;
        await setDoc(doc(db, "overtimeLimits", docId), data, { merge: true });
      });

      await Promise.all(promises);
      alert(
        "✅ Đã tính lại ngày còn lại theo workedHours và lưu vào Firestore!"
      );
    } catch (err) {
      console.error("❌ Lỗi khi lưu:", err);
      alert("❌ Lưu thất bại, xem console.");
    }
  };

  const getMonthSplitOptions = (monthlyLimit) => {
    const opts = [];
    for (let h = 6; h >= 1; h--) {
      const d = monthlyLimit / h;
      if (Number.isInteger(d) && d <= daysInMonth)
        opts.push({ perDay: h, days: d });
    }
    if (!opts.length) {
      for (let h = 6; h >= 1; h--) {
        const d = Math.ceil(monthlyLimit / h);
        if (d <= daysInMonth) opts.push({ perDay: h, days: d });
      }
    }
    return opts.sort((a, b) => b.days - a.days);
  };

  return (
    <div className="border rounded-lg bg-white dark:bg-gray-900 p-3 space-y-3">
      {/* === Header === */}
      <div className="flex justify-between items-start border-b border-gray-700 pb-2">
        <div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Quy tắc tính giờ tăng ca
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Sau tan ca hành chính (sớm hoặc muộn): mỗi 1h = 1h tăng ca
          </div>

          <div className="mt-2 text-xs text-gray-400 space-y-1">
            <div>
              <span className="font-semibold text-indigo-400">Ngày:</span> Sớm{" "}
              <span className="text-indigo-400 font-semibold">
                {shiftConfig?.day?.tanCaSomBatDau || "--:--"}
              </span>{" "}
              · Muộn{" "}
              <span className="text-indigo-400 font-semibold">
                {shiftConfig?.day?.tanCaMuonBatDau || "--:--"}
              </span>
            </div>
            <div>
              <span className="font-semibold text-indigo-400">Đêm:</span> Sớm{" "}
              <span className="text-indigo-400 font-semibold">
                {shiftConfig?.night?.tanCaSomBatDau || "--:--"}
              </span>{" "}
              · Muộn{" "}
              <span className="text-indigo-400 font-semibold">
                {shiftConfig?.night?.tanCaMuonBatDau || "--:--"}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveToFirestore}
          className="flex items-center gap-2 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm shadow"
        >
          <Save size={16} /> Lưu
        </button>
      </div>

      {/* === Tree view === */}
      <div
        className="space-y-2 overflow-y-auto pr-1 mt-2"
        style={{ maxHeight: "180px", scrollbarWidth: "thin" }}
      >
        {loading ? (
          <p className="text-gray-400 text-sm italic">Đang tải danh sách...</p>
        ) : sortedLimits.length === 0 ? (
          <div className="text-sm text-gray-500">Không có nhân viên.</div>
        ) : (
          sortedLimits.map((limitKey) => {
            const members = tree[limitKey] || [];
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
                      Giới hạn {limitNum}h
                    </span>
                    <span className="text-sm text-gray-400 ml-2">
                      → {chosen.days} ngày × {chosen.perDay}h/ngày
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Users className="w-4 h-4" /> {members.length}
                  </div>
                </button>

                <div className="px-4 py-2 border-t border-gray-700 bg-gray-900/40">
                  <div className="flex flex-wrap gap-2">
                    {options.map((opt, i) => {
                      const current = selectedOption[limitKey];
                      const isActive =
                        current?.perDay === opt.perDay &&
                        current?.days === opt.days;

                      const handleClick = async () => {
                        if (isActive) {
                          // --- Nếu đang chọn (màu vàng) -> bỏ chọn và xóa Firestore ---
                          const copy = { ...selectedOption };
                          delete copy[limitKey];
                          setSelectedOption(copy);

                          const docId = `limit_${limitNum}_day_${opt.days}`;
                          try {
                            await deleteDoc(doc(db, "overtimeLimits", docId));
                            console.log(
                              `🗑️ Đã xóa cấu hình ${docId} khỏi Firestore.`
                            );
                          } catch (err) {
                            console.error("❌ Lỗi khi xóa document:", err);
                          }
                        } else {
                          // --- Nếu chưa chọn -> chọn và tô vàng ---
                          setSelectedOption((prev) => ({
                            ...prev,
                            [limitKey]: opt,
                          }));
                        }
                      };

                      return (
                        <button
                          key={i}
                          onClick={handleClick}
                          className={`px-2 py-1 rounded-lg text-xs border transition-all duration-200 ${
                            isActive
                              ? "bg-amber-500 text-white border-amber-600 shadow-sm scale-105"
                              : "bg-gray-900 text-gray-300 border-gray-700 hover:bg-gray-700"
                          }`}
                        >
                          {opt.days} ngày × {opt.perDay}h
                        </button>
                      );
                    })}
                  </div>
                </div>

                {isOpen && (
                  <ul className="px-4 py-2 border-t border-gray-700 text-sm space-y-1">
                    {members.map((m) => {
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
}
