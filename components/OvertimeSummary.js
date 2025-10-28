// components/OvertimeSummary.js
import { useState } from "react";
import { Timer, Clock4, Hourglass, Eye, EyeOff } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { getZodiacForMonth } from "../utils/zodiacUtils";

const formatHours = (num) => `${num.toLocaleString()} giờ`;

export default function OvertimeSummary({
  items = [],
  limit = {}, // dữ liệu giới hạn giờ tăng ca trong năm
  selectedMonth,
  selectedYear,
}) {
  const [showValues, setShowValues] = useState(true);

  // 🔹 Lấy giới hạn tháng hiện tại
  const yearLimit = limit[String(selectedYear)] || {};
  const monthLimit = Number(yearLimit[String(selectedMonth)] || 0);

  // 🔹 Tổng giờ tăng ca đã làm
  const totalOvertime = items.reduce((sum, i) => sum + Number(i.hours || 0), 0);

  // 🔹 Số giờ còn lại
  const remaining = Math.max(monthLimit - totalOvertime, 0);

  const SummaryItem = ({ label, value, color, icon: Icon }) => {
    const [open, setOpen] = useState(false);
    return (
      <Tooltip.Root open={open} onOpenChange={setOpen}>
        <Tooltip.Trigger asChild>
          <div
            className={`bg-indigo-900/40 backdrop-blur-sm rounded-xl p-4 border border-indigo-600/50 
                        flex flex-col items-center justify-center cursor-pointer w-full 
                        transition-transform active:scale-95`}
            onClick={() => setOpen((o) => !o)}
          >
            {Icon && <Icon className={`w-6 h-6 mb-1 ${color}`} />}
            <p className="text-sm text-indigo-200 font-medium">{label}</p>
            <p className={`text-lg font-semibold truncate max-w-full ${color}`}>
              {showValues ? value : "••••"}
            </p>
          </div>
        </Tooltip.Trigger>
        {showValues && (
          <Tooltip.Content
            side="top"
            align="center"
            className="rounded-md bg-indigo-800 text-white text-xs px-2 py-1 shadow-lg z-50"
          >
            {value}
            <Tooltip.Arrow className="fill-indigo-800" />
          </Tooltip.Content>
        )}
      </Tooltip.Root>
    );
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 p-5 rounded-2xl shadow-lg border border-indigo-700/60">
      {/* 🔹 Tiêu đề */}
      <div className="flex items-center justify-center mb-4 relative">
        <h2 className="text-lg font-semibold text-indigo-100 flex items-center gap-2">
          <span className="text-2xl animate-bounce-slow inline-block">
            {getZodiacForMonth(selectedMonth, selectedYear)}
          </span>
          Tổng hợp tăng ca tháng {selectedMonth + 1}/{selectedYear}
        </h2>

        <button
          onClick={() => setShowValues((v) => !v)}
          className="absolute right-0 text-indigo-300 hover:text-white transition"
          title={showValues ? "Ẩn giá trị" : "Hiện giá trị"}
        >
          {showValues ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      {/* 🔸 Tổng giới hạn + Tổng giờ tăng */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <SummaryItem
          label="Giới hạn tháng"
          value={formatHours(monthLimit)}
          color="text-green-400"
          icon={Timer}
        />
        <SummaryItem
          label="Đã tăng"
          value={formatHours(totalOvertime)}
          color="text-yellow-400"
          icon={Clock4}
        />
      </div>

      {/* 🔹 Còn lại */}
      <SummaryItem
        label="Còn lại"
        value={formatHours(remaining)}
        color={remaining === 0 ? "text-red-400" : "text-blue-400"}
        icon={Hourglass}
      />
    </div>
  );
}
