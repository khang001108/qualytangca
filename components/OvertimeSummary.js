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
}) {
  const [showValues, setShowValues] = useState(true);

  // ============================================================
  // 🔥 TÍNH TỔNG OT TỪNG NHÂN VIÊN — LOGIC ĐỒNG BỘ VỚI BIỂU ĐỒ CHART
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

        // =====================================================
        // 1) Ưu tiên lấy từ bảng OVERTIMES
        // =====================================================
        const ot = overtimes.find((o) => {
          const dk =
            o.date?.slice(0, 10) ||
            (typeof o.currentDate === "string"
              ? o.currentDate.slice(0, 10)
              : null);

          if (!dk || dk !== dateKey) return false;

          // Match theo memberId hoặc realName
          return (
            String(o.memberId) === String(m.id) ||
            o.realName === m.realName
          );
        });

        if (ot) {
          totalOT += Number(ot.tangCaHomNay || 0) + Number(ot.thuong || 0);
          continue;
        }

        // =====================================================
        // 2) Nếu không có → Fallback SHIFT SCHEDULES
        //    (match theo realName hoặc memberId)
        // =====================================================
        let rec = null;

        if (shiftSchedules[dateKey]) {
          rec =
            shiftSchedules[dateKey][m.realName] ||
            Object.values(shiftSchedules[dateKey]).find(
              (s) =>
                String(s.memberId) === String(m.id) ||
                s.realName === m.realName
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
  // 🔍 FIND MAX / MIN / SĨ SỐ
  // ============================================================
  const maxData = data.reduce(
    (a, b) => (b.total > a.total ? b : a),
    { total: -1 }
  );

  const minData = data.reduce(
    (a, b) => (b.total < a.total ? b : a),
    { total: Infinity }
  );

  const presentCount = data.filter((d) => d.total > 0).length;
  const totalMembers = members.length;

  const monthLimit = Math.max(...data.map((d) => d.limit || 0), 0);

  // ============================================================
  // UI TEMPLATE
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
