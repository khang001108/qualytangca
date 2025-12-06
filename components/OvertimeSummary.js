// components/OvertimeSummary.js
import { useMemo, useState } from "react";
import {
  Trophy,
  ArrowDownCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  Users,
} from "lucide-react";
import dayjs from "dayjs";

const formatHours = (num) => `${Number(num || 0).toLocaleString()} giờ`;

export default function OvertimeSummary({
  members = [],
  overtimes = [],
  shiftSchedules = {},
  selectedMonth,
  selectedYear,
  selectedDate,
}) {
  const [showValues, setShowValues] = useState(true);

  // ============================================================
  // 🔥 TÍNH OT
  // ============================================================
  const data = useMemo(() => {
    return members.map((m) => {
      let totalOT = 0;

      const daysInMonth = dayjs(
        `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`
      ).daysInMonth();

      for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = dayjs(
          `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(
            d
          ).padStart(2, "0")}`
        ).format("YYYY-MM-DD");

        const ot = overtimes.find((o) => {
          const dk =
            o.date?.slice(0, 10) ||
            (typeof o.currentDate === "string"
              ? o.currentDate.slice(0, 10)
              : null);

          if (!dk || dk !== dateKey) return false;
          return (
            String(o.memberId) === String(m.id) || o.realName === m.realName
          );
        });

        if (ot) {
          totalOT += Number(ot.tangCaHomNay || 0) + Number(ot.thuong || 0);
          continue;
        }

        let rec = null;

        if (shiftSchedules[dateKey]) {
          rec =
            shiftSchedules[dateKey][m.realName] ||
            Object.values(shiftSchedules[dateKey]).find(
              (s) =>
                String(s.memberId) === String(m.id) || s.realName === m.realName
            );
        }

        if (rec) {
          totalOT += Number(rec.tangCaHomNay || 0) + Number(rec.thuong || 0);
        }
      }

      return {
        name: m.realName,
        total: totalOT,
        limit: Number(m.overtimeLimit?.monthlyLimit || 0),
      };
    });
  }, [members, overtimes, shiftSchedules, selectedMonth, selectedYear]);

  // ============================================================
  // TRÍCH THÔNG TIN
  // ============================================================
  const maxData = data.reduce((a, b) => (b.total > a.total ? b : a), {
    total: -1,
  });

  const minData = data.reduce((a, b) => (b.total < a.total ? b : a), {
    total: Infinity,
  });

  const currentKey = dayjs(selectedDate || new Date()).format("YYYY-MM-DD");

  const presentCount = members.filter((m) => {
    const rec =
      shiftSchedules[currentKey]?.[m.realName] ||
      Object.values(shiftSchedules[currentKey] || {}).find(
        (v) =>
          v.realName === m.realName ||
          String(v.memberId) === String(m.id)
      );
  
    if (!rec) return false;
    if (rec.type === "leave") return false;
    return rec.type === "work";
  }).length;
  

  const totalMembers = members.length;
  const monthLimit = Math.max(...data.map((d) => d.limit || 0), 0);

  // ============================================================
  // COMPONENT ITEM
  // ============================================================
  const SummaryItem = ({ label, value, color, icon: Icon, highlight }) => (
    <div
      className={`
        p-4 rounded-xl shadow border transition-all duration-200
        ${
          highlight
            ? `
            bg-orange-50 dark:bg-orange-900/30 
            border-orange-300 dark:border-orange-700
          `
            : `
            bg-white dark:bg-gray-800
            border-gray-200 dark:border-gray-700
          `
        }
      `}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-7 h-7 ${color}`} />
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
            {label}
          </p>
          <p className={`text-lg font-semibold ${color}`}>
            {showValues ? value : "••••"}
          </p>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div
      className="
        bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-700
        p-6 rounded-2xl shadow-md
      "
    >
      <div className="flex items-center justify-center mb-5 relative">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
          🗓 Trạng thái — {dayjs(selectedDate || new Date()).format("DD/MM/YYYY")}
        </h2>

        <button
          onClick={() => setShowValues((v) => !v)}
          className="
            absolute right-0 
            text-gray-600 hover:text-black 
            dark:text-gray-300 dark:hover:text-white
            transition
          "
        >
          {showValues ? (
            <EyeOff className="w-6 h-6" />
          ) : (
            <Eye className="w-6 h-6" />
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SummaryItem
          label="Tăng ca nhiều nhất"
          value={
            maxData.total >= 0
              ? `${maxData.name} – ${formatHours(maxData.total)}`
              : "Không có dữ liệu"
          }
          color="text-yellow-600 dark:text-yellow-400"
          icon={Trophy}
          highlight
        />

        <SummaryItem
          label="Tăng ca ít nhất"
          value={
            minData.total !== Infinity
              ? `${minData.name} – ${formatHours(minData.total)}`
              : "Không có dữ liệu"
          }
          color="text-green-600 dark:text-green-400"
          icon={ArrowDownCircle}
        />

        <SummaryItem
          label="Giới hạn tháng"
          value={formatHours(monthLimit)}
          color="text-blue-600 dark:text-blue-400"
          icon={ShieldCheck}
        />

        <SummaryItem
          label="Sĩ số"
          value={`${presentCount}/${totalMembers} (nghỉ ${
            totalMembers - presentCount
          })`}
          color="text-cyan-600 dark:text-cyan-400"
          icon={Users}
        />
      </div>
    </div>
  );
}
