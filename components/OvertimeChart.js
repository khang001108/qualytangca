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

const CustomTooltip = ({ active, payload, label, isDark }) => {
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
        background: isDark ? "#1f2937" : "white",
        padding: "12px 15px",
        borderRadius: 12,
        border: `1px solid ${isDark ? "#4b5563" : "#e5e7eb"}`,
        boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
        color: isDark ? "#e5e7eb" : "#1f2937",
      }}
    >

      {/* Name */}
      <p
        className="font-semibold mb-2"
        style={{ color: isDark ? "#e5e7eb" : "#1f2937" }}
      >
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
              <span style={{ color: isDark ? "#d1d5db" : "#374151" }}>
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
    <div className="space-y-4 animate-fade-in-up">

      {/* ── Header ── */}
      <div className="card">
        <h2 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-1.5 mb-4">
          📊 Tổng giờ tăng ca — Tháng {selectedMonth}/{selectedYear}
        </h2>

        <div className="h-[260px] sm:h-[360px]">
          <ResponsiveContainer>
            <ComposedChart
              data={data}
              margin={{ top: 30, right: 8, bottom: 50, left: -10 }}
              onMouseMove={(state) => {
                if (state && state.activeTooltipIndex != null) setHoverIndex(state.activeTooltipIndex);
              }}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <defs>
                <linearGradient id="otGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={isDark ? 0.85 : 0.95} />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={isDark ? 0.25 : 0.4} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />

              <XAxis
                dataKey="name"
                interval={0}
                tick={{ fill: axisColor, fontSize: 10 }}
                angle={-25}
                textAnchor="end"
              />

              <YAxis tick={{ fontSize: 10, fill: axisColor }} width={28} />

              <Tooltip content={<CustomTooltip isDark={isDark} />} />

              <Legend
                verticalAlign="top"
                align="center"
                wrapperStyle={{ paddingTop: 4, paddingBottom: 16, color: axisColor, fontSize: 11 }}
              />

              {hoverIndex != null && (
                <ReferenceLine
                  x={data[hoverIndex].name}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                />
              )}

              <Bar dataKey="OT" fill="url(#otGrad)" barSize={28} radius={[6, 6, 0, 0]} />
              <Line type="monotone" dataKey="OT" stroke="#16a34a" strokeWidth={2.5}
                dot={(props) => <CustomDotAvatar {...props} members={members} />} activeDot={false} />
              <Line type="monotone" dataKey="OT_NoBonus" stroke="#3b82f6" strokeWidth={2}
                dot={{ r: 4, fill: "#3b82f6" }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Limit" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="6 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Card từng thành viên ── */}
      <div className="card space-y-3">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm">👤 Chi tiết từng nhân viên</h3>
        <div className="space-y-2">
          {[...data].sort((a, b) => b.OT - a.OT).map((d, i) => {
            const limit = d.Limit;
            const pct = limit > 0 ? Math.min((d.OT / limit) * 100, 100) : 0;
            const noBonus = d.OT_NoBonus;
            const bonus = d.OT - noBonus;
            const remaining = Math.max(limit - d.OT, 0);
            const m = members.find(mem => (mem.nickname || mem.realName) === d.name);
            const match = m ? ICONS.find(ic => ic.name === m.avatar) : null;
            const Icon = match ? match.icon : null;
            const color = m?.color || "#6366f1";
            return (
              <div key={i} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 border border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: color + "25" }}>
                    {Icon ? <Icon className="w-4 h-4" style={{ color }} /> : <span className="text-xs font-bold" style={{ color }}>{d.name?.[0]}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{d.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                      <span className="text-green-600 dark:text-green-400 font-medium">OT: {d.OT.toFixed(1)}h</span>
                      {bonus > 0 && <span className="text-orange-500">Thưởng: +{bonus.toFixed(1)}h</span>}
                      {limit > 0 && <span className="text-gray-400">Còn: {remaining.toFixed(1)}h</span>}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${pct >= 90 ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" : pct >= 70 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400" : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"}`}>
                    {Math.round(pct)}%
                  </span>
                </div>
                {limit > 0 && (
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : color }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
