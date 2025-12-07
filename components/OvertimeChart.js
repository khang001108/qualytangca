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
  ReferenceLine,
} from "recharts";
import { useMemo, useState } from "react";
import dayjs from "dayjs";

import { User } from "lucide-react";
import { ICONS } from "../utils/iconUtils";

// ⭐ ICON NẰM TRÊN ĐẦU DOT CỦA LINE OT
const CustomDotAvatar = ({ cx, cy, payload, members }) => {
  const m = members.find(
    (mem) => (mem.nickname || mem.realName) === payload.name
  );

  if (!m) return null;

  const match = ICONS.find((i) => i.name === m.avatar);
  const Icon = match ? match.icon : User;
  const color = m.color || "#3B82F6";

  return (
    <g>
      <foreignObject x={cx - 17} y={cy - 55} width={35} height={35}>
        <div
          style={{
            width: 35,
            height: 35,
            borderRadius: "50%",
            backgroundColor: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid white",
            boxShadow: "0 0 6px rgba(0,0,0,.3)",
          }}
        >
          <Icon size={18} color="white" />
        </div>
      </foreignObject>
    </g>
  );
};

const LegendIcon = ({ color }) => (
  <svg width="26" height="10" viewBox="0 0 26 10">
    <line x1="1" y1="5" x2="25" y2="5" stroke={color} strokeWidth="2" />
    <circle cx="13" cy="5" r="4" fill={color} />
    <circle cx="13" cy="5" r="2" fill="white" />
  </svg>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  // mapping màu + icon + label tiếng Việt
  // const styles = {
  //   Limit: { color: "#ef4444", icon: "●", label: "Giới hạn" },
  //   OT: { color: "#16a34a", icon: "■", label: "OT tiếng thực" },
  //   OT_NoBonus: { color: "#3b82f6", icon: "●", label: "OT tiếng nhảy" },
  // };

  const styles = {
    Limit: { color: "#ef4444", label: "Limit" },
    OT: { color: "#16a34a", label: "OT" },
    OT_NoBonus: { color: "#3b82f6", label: "OT_NoBonus" },
  };

  // Lọc trùng do Bar + Line
  const filtered = payload.filter(
    (item, idx, arr) => idx === arr.findIndex((x) => x.dataKey === item.dataKey)
  );

  return (
    <div
      style={{
        background: "white",
        padding: "12px 15px",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
      }}
      className="dark:bg-gray-800 dark:border-gray-600"
    >
      {/* Name */}
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
        {label}
      </p>

      {/* Rows */}
      {filtered.map((item, index) => {
        const style = styles[item.dataKey];

        return (
          <p
            key={index}
            className="text-sm flex items-center gap-2"
            style={{ color: style.color }}
          >
            <div key={index} className="flex items-center gap-2 text-sm">
              <LegendIcon color={style.color} />
              <span className="text-gray-700 dark:text-gray-300">
                {style.label}: {item.value} giờ
              </span>
            </div>
          </p>
        );
      })}
    </div>
  );
};

export default function OvertimeChartByMember({
  members = [],
  overtimes = [],
  shiftSchedules = {},
  selectedMonth,
  selectedYear,
}) {
  const [hoverIndex, setHoverIndex] = useState(null);

  // ⭐ dark mode từ class html
  const isDark = document.documentElement.classList.contains("dark");

  const axisColor = isDark ? "#d1d5db" : "#4b5563";
  const gridColor = isDark ? "#374151" : "#e5e7eb";
  const tooltipBg = isDark ? "#1f2937" : "#ffffff";
  const tooltipBorder = isDark ? "#4b5563" : "#d1d5db";
  const tooltipText = isDark ? "#e5e7eb" : "#1f2937";

  // ⭐ tính OT
  const data = useMemo(() => {
    return members.map((m) => {
      let totalOT = 0;
      let totalOT_noBonus = 0;

      const daysInMonth = dayjs(
        `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`
      ).daysInMonth();

      for (let d = 1; d <= daysInMonth; d++) {
        const key = dayjs(
          `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(
            d
          ).padStart(2, "0")}`
        ).format("YYYY-MM-DD");

        const ot = overtimes.find((o) => {
          const dateKey =
            o.date?.slice(0, 10) ||
            (typeof o.currentDate === "string"
              ? o.currentDate.slice(0, 10)
              : null);

          if (!dateKey) return false;

          return (
            dateKey === key &&
            ((o.memberId && String(o.memberId) === String(m.id)) ||
              (o.realName && o.realName === m.realName))
          );
        });

        if (ot) {
          const tang = Number(ot.tangCaHomNay || 0);
          const thuong = Number(ot.thuong || 0);

          totalOT += tang + thuong;
          totalOT_noBonus += tang;
          continue;
        }

        if (shiftSchedules[key]) {
          const rec =
            shiftSchedules[key][m.realName] ||
            Object.values(shiftSchedules[key]).find(
              (s) => String(s.memberId) === String(m.id)
            );

          if (rec) {
            const tang = Number(rec.tangCaHomNay || 0);
            const thuong = Number(rec.thuong || 0);
            totalOT += tang + thuong;
            totalOT_noBonus += tang;
          }
        }
      }

      return {
        name: m.nickname || m.realName,
        OT: totalOT,
        OT_NoBonus: totalOT_noBonus,
        Limit: m.overtimeLimit?.monthlyLimit || 0,
      };
    });
  }, [members, overtimes, shiftSchedules, selectedMonth, selectedYear]);

  return (
    <div className="w-full bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 text-center mb-4">
        📊 Tổng giờ tăng ca tháng {selectedMonth}/{selectedYear}
      </h2>

      <div className="h-[450px]">
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            margin={{ top: 40, right: 30, bottom: 60 }}
            onMouseMove={(state) => {
              if (state && state.activeTooltipIndex != null) {
                setHoverIndex(state.activeTooltipIndex);
              }
            }}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />

            <XAxis
              dataKey="name"
              interval={0}
              tick={{ fill: axisColor, fontSize: 12 }}
              angle={-30}
              textAnchor="end"
            />

            <YAxis tick={{ fontSize: 12, fill: axisColor }} />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              align="center"
              wrapperStyle={{
                paddingTop: 10,
                paddingBottom: 20,
                color: axisColor,
                fontSize: 13,
              }}
            />

            {hoverIndex != null && (
              <ReferenceLine
                x={data[hoverIndex].name}
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 3"
              />
            )}

            <Bar
              dataKey="OT"
              fill="url(#otGrad)"
              barSize={40}
              radius={[8, 8, 0, 0]}
            />

            {/* ⭐ ICON NGỒI TRÊN ĐẦU DOT CỦA ĐƯỜNG OT */}
            <Line
              type="monotone"
              dataKey="OT"
              stroke="#16a34a"
              strokeWidth={3}
              dot={(props) => <CustomDotAvatar {...props} members={members} />}
              activeDot={false}
            />

            <Line
              type="monotone"
              dataKey="OT_NoBonus"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 5, fill: "#3b82f6" }}
              activeDot={{ r: 7 }}
            />

            <Line
              type="monotone"
              dataKey="Limit"
              stroke="#ef4444"
              strokeWidth={3}
              dot={false}
            />

            <defs>
              <linearGradient id="otGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="#22c55e"
                  stopOpacity={isDark ? 0.85 : 0.95}
                />
                <stop
                  offset="100%"
                  stopColor="#16a34a"
                  stopOpacity={isDark ? 0.25 : 0.4}
                />
              </linearGradient>
            </defs>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
