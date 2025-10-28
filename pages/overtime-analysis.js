// pages/overtime-analysis.js
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

export default function OvertimeAnalysis() {
  const [rawText, setRawText] = useState("");
  const [limit, setLimit] = useState(50); // giờ giới hạn/tháng
  const [data, setData] = useState([]);

  const parseData = () => {
    const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
    const overtimeMap = {};

    const timeRegex = /(\d{1,2}):(\d{2})/;

    for (const line of lines) {
      const parts = line.split(/[./：:]/);
      const name = line.match(/[^\d./:\s]+/)?.[0]?.trim();
      const time = line.match(timeRegex);

      if (!name || !time) continue;

      const hour = parseInt(time[1]);
      const minute = parseInt(time[2]);
      const totalMinutes = hour * 60 + minute;

      // tăng ca buổi chiều (sau 17:00)
      if (totalMinutes > 17 * 60) {
        const overtime = (totalMinutes - 17 * 60) / 60;
        overtimeMap[name] = (overtimeMap[name] || 0) + overtime;
      }
    }

    const chartData = Object.keys(overtimeMap).map((name) => ({
      name,
      overtime: parseFloat(overtimeMap[name].toFixed(1)),
    }));

    setData(chartData);
  };

  const barColor = (value) =>
    value > limit ? "#ef4444" : "#6366f1"; // đỏ nếu vượt giới hạn, tím nếu trong giới hạn

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-indigo-800 text-white p-6">
      <div className="max-w-3xl mx-auto bg-white/10 backdrop-blur-lg p-6 rounded-2xl shadow-2xl border border-white/20">
        <h1 className="text-2xl font-bold text-center mb-6 text-indigo-200">
          📊 Phân tích tăng ca
        </h1>

        {/* Ô nhập */}
        <textarea
          rows={8}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Dán dữ liệu chấm công vào đây..."
          className="w-full p-3 rounded-xl bg-white/10 text-indigo-100 placeholder-indigo-300 border border-indigo-400 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
        />

        {/* Giới hạn */}
        <div className="flex items-center justify-between mt-4">
          <label className="text-indigo-200 text-sm font-medium">
            Giới hạn giờ tăng ca / tháng:
          </label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-24 text-right p-2 rounded-lg bg-white/20 text-indigo-100 border border-indigo-400 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          />
        </div>

        <button
          onClick={parseData}
          className="mt-5 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 font-semibold shadow-lg transition-all"
        >
          🔍 Phân tích
        </button>

        {/* Biểu đồ */}
        {data.length > 0 && (
          <div className="mt-8 bg-white/10 p-4 rounded-2xl border border-white/20">
            <h2 className="text-lg font-semibold text-center text-indigo-200 mb-4">
              Biểu đồ tăng ca (tổng giờ/tháng)
            </h2>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#a5b4fc40" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#c7d2fe" }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis tick={{ fill: "#c7d2fe" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#312e81",
                    color: "white",
                    border: "1px solid #6366f1",
                  }}
                  labelStyle={{ color: "#a5b4fc" }}
                />
                <Bar
                  dataKey="overtime"
                  radius={[8, 8, 0, 0]}
                  fill="#6366f1"
                  label={{ position: "top", fill: "#e0e7ff" }}
                >
                  <LabelList dataKey="overtime" position="top" fill="#e0e7ff" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Gợi ý */}
            <p className="text-sm text-center text-indigo-300 mt-3 italic">
              Cột màu đỏ là vượt giới hạn {limit} giờ/tháng.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
