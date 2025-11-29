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
import * as Tooltip from "@radix-ui/react-tooltip";
import dayjs from "dayjs";

const formatHours = (num) => `${Number(num || 0).toLocaleString()} giờ`;

// helper: chuẩn hóa date -> "YYYY-MM-DD"
function getDateKeyFromRecord(o) {
  // o.date could be string, Firestore Timestamp, or undefined
  const tryIso = (val) => {
    try {
      if (!val) return null;
      // Firestore Timestamp has toDate()
      if (typeof val === "object" && typeof val.toDate === "function") {
        return val.toDate().toISOString().slice(0, 10);
      }
      // If it's an object with seconds (older SDK)
      if (typeof val === "object" && typeof val.seconds === "number") {
        return new Date(val.seconds * 1000).toISOString().slice(0, 10);
      }
      // string
      if (typeof val === "string") {
        // try parse with dayjs to be safe
        const d = dayjs(val);
        if (d.isValid()) return d.format("YYYY-MM-DD");
        // last resort slice
        if (val.length >= 10) return val.slice(0, 10);
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  return (
    tryIso(o.date) ||
    tryIso(o.currentDate) ||
    null
  );
}

export default function OvertimeSummary({
  members = [],
  overtimes = [],
  shiftSchedules = {},
  selectedMonth,
  selectedYear,
}) {
  const [showValues, setShowValues] = useState(true);

  // ============================================================
  // 🔥 TÍNH TỔNG OT TỪNG NHÂN VIÊN — robust
  // ============================================================
  const data = useMemo(() => {
    // build a map for faster lookup of shiftSchedules per date
    // shiftSchedules is expected: { "YYYY-MM-DD": { realName: {...}, ... }, ... }
    const ss = shiftSchedules || {};

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

        // 1) collect all overtime records that match this date and this member
        // use filter (not find) because there may be multiple records per day
        const matchingOvertimes = (overtimes || []).filter((o) => {
          const recDate = getDateKeyFromRecord(o);
          if (!recDate) return false;
          if (recDate !== dateKey) return false;

          // match by memberId or realName
          if (o.memberId && String(o.memberId) === String(m.id)) return true;
          if (o.realName && o.realName === m.realName) return true;

          return false;
        });

        if (matchingOvertimes.length > 0) {
          // sum all records found for this date
          const sumForDay = matchingOvertimes.reduce((s, rec) => {
            const tang = Number(rec.tangCaHomNay || 0);
            const thuong = Number(rec.thuong || 0);
            return s + tang + thuong;
          }, 0);
          totalOT += sumForDay;
          continue; // go next day
        }

        // 2) fallback -> shiftSchedules
        const rec =
          ss[dateKey]?.[m.realName] ||
          Object.values(ss[dateKey] || {}).find(
            (s) => String(s.memberId) === String(m.id)
          );

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
  // 🔍 TÌM MAX / MIN / SĨ SỐ
  // ============================================================
  const maxData =
    data.length > 0
      ? data.reduce((a, b) => (b.total > a.total ? b : a), data[0])
      : { total: -1, name: "" };

  const minData =
    data.length > 0
      ? data.reduce((a, b) => (b.total < a.total ? b : a), data[0])
      : { total: Infinity, name: "" };

  const presentCount = data.filter((d) => d.total > 0).length;
  const totalMembers = members.length;

  // Lấy giới hạn tháng từ nhân viên — nếu bạn muốn lấy từ collection overtimeLimits
  // thay đổi logic ở đây
  const monthLimit = data.length ? Math.max(...data.map((d) => d.limit || 0)) : 0;

  // ============================================================
  // UI COMPONENT
  // ============================================================
  const SummaryItem = ({ label, value, color, icon: Icon, highlight }) => {
    return (
      <div
        className={`p-4 rounded-2xl shadow-md border backdrop-blur-sm cursor-pointer
        ${
          highlight
            ? "bg-gradient-to-br from-orange-500/40 to-red-500/20 border-orange-400/50"
            : "bg-indigo-900/40 border-indigo-600/50"
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-7 h-7 ${color}`} />
          <div>
            <p className="text-sm text-indigo-200 font-medium">{label}</p>
            <p className={`text-lg font-semibold ${color}`}>
              {showValues ? value : "••••"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 p-6 rounded-2xl shadow-xl border border-indigo-700/60">
      <div className="flex items-center justify-center mb-5 relative">
        <h2 className="text-xl font-bold text-indigo-100">Tổng hợp</h2>

        <button
          onClick={() => setShowValues((v) => !v)}
          className="absolute right-0 text-indigo-300 hover:text-white transition"
        >
          {showValues ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
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
          color="text-yellow-300"
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
          color="text-green-300"
          icon={ArrowDownCircle}
        />

        <SummaryItem
          label="Giới hạn tháng"
          value={formatHours(monthLimit)}
          color="text-blue-300"
          icon={ShieldCheck}
        />

        <SummaryItem
          label="Sĩ số"
          value={`${presentCount}/${totalMembers} (nghỉ ${
            totalMembers - presentCount
          })`}
          color="text-cyan-300"
          icon={Users}
        />
      </div>
    </div>
  );
}
