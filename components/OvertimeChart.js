// components/OvertimeChart.js
// Biểu đồ tăng ca hàng tháng của nhân viên


import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useState, useMemo } from "react";
import { getZodiacForMonth } from "../utils/zodiacUtils";

const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];

export default function ExpenseChart({ items = [], salary = {}, selectedMonth, selectedYear }) {
  // state tháng đang hover (icon)
  const [hoveredMonth, setHoveredMonth] = useState(selectedMonth);

  // 🔹 Tính tổng chi tiêu theo tháng
  const monthlyExpense = useMemo(() => {
    const res = {};
    for (const { amount, month, year, date } of items) {
      const m = Number(month ?? new Date(date).getMonth());
      const y = Number(year ?? new Date(date).getFullYear());
      if (y === Number(selectedYear))
        res[m] = (res[m] || 0) + Number(amount || 0);
    }
    return res;
  }, [items, selectedYear]);

  // 🔹 Chuẩn bị dữ liệu biểu đồ
  const data = useMemo(() => {
    return MONTHS.map((month, i) => {
      const income = salary?.[selectedYear]?.[i] || 0;
      const expense = monthlyExpense[i] || 0;
      const remain = Math.max(income - expense, 0);
      return { month, Chi: expense, Lương: income, CònLại: remain };
    });
  }, [salary, monthlyExpense, selectedYear]);

  const colorMap = { Chi: "#dc2626", Lương: "#16a34a", CònLại: "#ca8a04" };

  return (
    <div className="w-full bg-white p-6 md:p-10 rounded-2xl shadow-lg border border-gray-100">
      {/* 🔹 Tiêu đề + icon nhún nhảy */}
      <h2 className="text-2xl font-semibold text-gray-800 text-center mb-4 flex justify-center items-center gap-2">
        📈 Biểu đồ tài chính năm {selectedYear}{" "}
        <span
          className={`text-2xl inline-block transition-transform duration-500 ${
            hoveredMonth === selectedMonth ? "animate-bounce-slow" : "animate-bounce"
          }`}
        >
          {getZodiacForMonth(hoveredMonth + 1, selectedYear)}
        </span>
      </h2>

      <div className="h-[400px]">
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            margin={{ top: 30, right: 30, bottom: 20 }}
            onMouseMove={(state) => {
              if (state && state.activeTooltipIndex != null) {
                setHoveredMonth(state.activeTooltipIndex); // cập nhật tháng hover
              }
            }}
            onMouseLeave={() => setHoveredMonth(selectedMonth)} // trở về tháng mặc định
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#4b5563" }} />
            <YAxis
              tickFormatter={(v) =>
                v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v
              }
              tick={{ fontSize: 12, fill: "#4b5563" }}
            />

            {/* Tooltip */}
            <Tooltip
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-200 text-sm">
                    <p className="font-semibold text-gray-800 mb-1">{label}</p>
                    {payload.map((e, i) => (
                      <p key={i} style={{ color: colorMap[e.name] }}>
                        <span className="font-medium">{e.name}:</span>{" "}
                        {Number(e.value).toLocaleString()}₫
                      </p>
                    ))}
                  </div>
                ) : null
              }
            />

            <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />

            {/* Gradient */}
            <defs>
              {[
                ["yellowGrad", "#facc15", "#fde047"],
                ["greenGrad", "#22c55e", "#16a34a"],
                ["redGrad", "#ef4444", "#b91c1c"],
              ].map(([id, c1, c2]) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c1} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={c2} stopOpacity={0.3} />
                </linearGradient>
              ))}
            </defs>

            {/* Biểu đồ */}
            <Bar dataKey="Chi" fill="url(#redGrad)" barSize={28} radius={[8, 8, 0, 0]} />
            <Area
              type="monotone"
              dataKey="CònLại"
              fill="url(#yellowGrad)"
              stroke="#eab308"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="Lương"
              stroke="url(#greenGrad)"
              strokeWidth={3}
              dot={{ r: 4, fill: "#16a34a" }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="text-sm text-gray-500 mt-3 text-center">
        💡 Di chuột hoặc chạm để xem chi tiết từng tháng.
      </p>
    </div>
  );
}
