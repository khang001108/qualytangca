import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";
import dayjs from "dayjs";

export default function OvertimeChartByMember({
  members = [],
  overtimes = [],
  shiftSchedules = {},   // ⭐ THÊM SHIFT SCHEDULES
  selectedMonth,
  selectedYear,
}) {

  // 🔥 Tính tổng OT theo đúng logic OverMember.js
  const data = useMemo(() => {
    return members.map((m) => {
      let totalOT = 0;

      // 📌 1. duyệt từng ngày trong tháng
      const daysInMonth = dayjs(`${selectedYear}-${selectedMonth}-01`).daysInMonth();

      for (let d = 1; d <= daysInMonth; d++) {
        const key = dayjs(`${selectedYear}-${selectedMonth}-${d}`).format("YYYY-MM-DD");

        // ----------- Ưu tiên 1: bảng overtimes -----------
        const ot = overtimes.find((o) => {
          const dateKey =
            o.date?.slice(0, 10) ||
            (typeof o.currentDate === "string" ? o.currentDate.slice(0, 10) : null);

          if (!dateKey) return false;

          return (
            dateKey === key &&
            (
              (o.memberId && String(o.memberId) === String(m.id)) ||
              (o.realName && o.realName === m.realName)
            )
          );
        });

        if (ot) {
          totalOT += Number(ot.tangCaHomNay || 0) + Number(ot.thuong || 0);
          continue;
        }

        // ----------- Ưu tiên 2: shiftSchedules -----------
        if (shiftSchedules[key]) {
          const rec = shiftSchedules[key][m.realName] ||
            Object.values(shiftSchedules[key]).find((s) => s.memberId === m.id);

          if (rec) {
            totalOT += Number(rec.tangCaHomNay || 0) + Number(rec.thuong || 0);
          }
        }
      }

      return {
        name: m.nickname || m.realName,
        OT: totalOT,
        Limit: m.overtimeLimit?.monthlyLimit || 0,
      };
    });
  }, [members, overtimes, shiftSchedules, selectedMonth, selectedYear]);


  return (
    <div className="w-full bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-semibold text-gray-800 text-center mb-4">
        📊 Tổng giờ tăng ca tháng {selectedMonth}/{selectedYear}
      </h2>

      <div className="h-[430px]">
        <ResponsiveContainer>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />

            <Tooltip formatter={(v) => `${v} giờ`} />

            <Legend />

            {/* Cột OT */}
            <Bar dataKey="OT" fill="url(#otGrad)" barSize={40} radius={[8,8,0,0]} />

            {/* Đường giới hạn */}
            <Line type="monotone" dataKey="Limit" stroke="#ef4444" strokeWidth={3} dot={false} />

            <defs>
              <linearGradient id="otGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#16a34a" stopOpacity={0.4} />
              </linearGradient>
            </defs>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
