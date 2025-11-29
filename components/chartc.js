// components/OvertimeChart.js
// Biểu đồ tăng ca hàng tháng theo nhân viên — phiên bản ghép hoàn chỉnh

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
  
  export default function OvertimeChart({
    members = [],
    overtimes = [],
    shiftSchedules = {},
    selectedMonth,
    selectedYear,
  }) {
  
    // ⭐ Tính tổng giờ OT từng nhân viên (theo đúng logic OverMember.js)
    const data = useMemo(() => {
      return members.map((m) => {
        let totalOT = 0;
  
        const daysInMonth = dayjs(
          `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`
        ).daysInMonth();
  
        for (let d = 1; d <= daysInMonth; d++) {
          const key = dayjs(
            `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(
              d
            ).padStart(2, "0")}`
          ).format("YYYY-MM-DD");
  
          // -------- ƯU TIÊN 1: Lấy từ bảng overtimes --------
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
            totalOT += Number(ot.tangCaHomNay || 0) + Number(ot.thuong || 0);
            continue;
          }
  
          // -------- ƯU TIÊN 2: shiftSchedules fallback --------
          if (shiftSchedules[key]) {
            const rec =
              shiftSchedules[key][m.realName] ||
              Object.values(shiftSchedules[key]).find(
                (s) => String(s.memberId) === String(m.id)
              );
  
            if (rec) {
              totalOT +=
                Number(rec.tangCaHomNay || 0) + Number(rec.thuong || 0);
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
      <div className="w-full bg-white p-6 md:p-10 rounded-2xl shadow-lg border border-gray-100">
        {/* Tiêu đề giống form cũ */}
        <h2 className="text-2xl font-semibold text-gray-800 text-center mb-4 flex justify-center items-center gap-2">
          📊 Tổng giờ tăng ca tháng {selectedMonth}/{selectedYear}
        </h2>
  
        <div className="h-[400px]">
          <ResponsiveContainer>
            <ComposedChart
              data={data}
              margin={{ top: 20, right: 30, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "#4b5563" }}
                interval={0}
                angle={-30}
                textAnchor="end"
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#4b5563" }}
                label={{
                  value: "Giờ tăng ca",
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "#6b7280" },
                }}
              />
  
              {/* Tooltip đẹp, style giống form cũ */}
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-200 text-sm">
                      <p className="font-semibold text-gray-800 mb-1">
                        {label}
                      </p>
                      {payload.map((e, i) => (
                        <p key={i}>
                          <span className="font-medium">
                            {e.name}:
                          </span>{" "}
                          {e.value} giờ
                        </p>
                      ))}
                    </div>
                  ) : null
                }
              />
  
              {/* Legend */}
              <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
  
              {/* Gradient màu giống style cũ */}
              <defs>
                <linearGradient id="otGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0.3} />
                </linearGradient>
  
                <linearGradient id="limitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.3} />
                </linearGradient>
              </defs>
  
              {/* CỘT OT */}
              <Bar
                dataKey="OT"
                fill="url(#otGrad)"
                barSize={40}
                radius={[8, 8, 0, 0]}
              />
  
              {/* ĐƯỜNG GIỚI HẠN */}
              <Line
                type="monotone"
                dataKey="Limit"
                stroke="url(#limitGrad)"
                strokeWidth={3}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
  
        <p className="text-sm text-gray-500 mt-3 text-center">
          💡 Di chuột vào từng nhân viên để xem chi tiết giờ tăng ca.
        </p>
      </div>
    );
  }
  