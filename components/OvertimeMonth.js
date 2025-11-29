// components/OvertimeSummary.js
// Bản nâng cấp: Hiển thị tên + đổi icon + đổi bố cục

import { useState } from "react";
import {
  Trophy,
  ArrowDownCircle,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

const formatHours = (num) => `${num.toLocaleString()} giờ`;

export default function OvertimeSummary({
  items = [],
  limit = {},
  selectedMonth,
  selectedYear,
}) {
  const [showValues, setShowValues] = useState(true);

  // ========================================
  // 🔥 Tính tổng theo nhân viên
  // ========================================
  const totals = {};

  items.forEach((i) => {
    const name =
      i.realName || i.name || i.nickname || i.memberName || "Không tên";
    const h = Number(i.hours || 0);

    totals[name] = (totals[name] || 0) + h;
  });

  const names = Object.keys(totals);
  const hours = Object.values(totals);

  const maxName =
    names.length > 0 ? names[hours.indexOf(Math.max(...hours))] : null;
  const minName =
    names.length > 0 ? names[hours.indexOf(Math.min(...hours))] : null;

  const maxOT = names.length > 0 ? Math.max(...hours) : 0;
  const minOT = names.length > 0 ? Math.min(...hours) : 0;

  // ========================================
  // 🎯 Giới hạn tháng (giữ nguyên)
  // ========================================
  const yearLimit = limit[String(selectedYear)] || {};
  const monthLimit = Number(yearLimit[String(selectedMonth)] || 0);

  // ========================================
  // 📦 Component Summary Item
  // ========================================
  const SummaryItem = ({
    label,
    value,
    color,
    icon: Icon,
    highlight = false,
  }) => {
    const [open, setOpen] = useState(false);

    return (
      <Tooltip.Root open={open} onOpenChange={setOpen}>
        <Tooltip.Trigger asChild>
          <div
            className={`p-4 rounded-2xl shadow-md border transition 
                     cursor-pointer active:scale-95 backdrop-blur-sm
                     ${
                       highlight
                         ? "bg-gradient-to-br from-orange-500/40 to-red-500/20 border-orange-400/50"
                         : "bg-indigo-900/40 border-indigo-600/50"
                     }`}
            onClick={() => setOpen((o) => !o)}
          >
            <div className="flex items-center gap-3">
              <Icon className={`w-7 h-7 ${color}`} />
              <div className="flex flex-col">
                <p className="text-sm text-indigo-200 font-medium">{label}</p>

                <p className={`text-lg font-semibold ${color}`}>
                  {showValues ? value : "••••"}
                </p>
              </div>
            </div>
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

  // ========================================
  // 🧩 UI BỐ CỤC
  // ========================================
  return (
    <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 p-6 rounded-2xl shadow-xl border border-indigo-700/60">

      {/* ======= HEADER ======= */}
      <div className="flex items-center justify-center mb-5 relative">
        <h2 className="text-xl font-bold text-indigo-100">Tổng hợp</h2>

        {/* Nút ẩn/hiện */}
        <button
          onClick={() => setShowValues((v) => !v)}
          className="absolute right-0 text-indigo-300 hover:text-white transition"
        >
          {showValues ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
        </button>
      </div>

      {/* ======= GRID 3 Ô ======= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* 🥇 TĂNG CA NHIỀU NHẤT */}
        <SummaryItem
          label="Tăng ca nhiều nhất"
          value={
            maxName
              ? `${maxName} – ${formatHours(maxOT)}`
              : "Không có dữ liệu"
          }
          color="text-yellow-300"
          icon={Trophy}
          highlight={true}
        />

        {/* 🥈 TĂNG CA ÍT NHẤT */}
        <SummaryItem
          label="Tăng ca ít nhất"
          value={
            minName
              ? `${minName} – ${formatHours(minOT)}`
              : "Không có dữ liệu"
          }
          color="text-green-300"
          icon={ArrowDownCircle}
        />

        {/* 🎯 GIỚI HẠN THÁNG */}
        <SummaryItem
          label="Giới hạn tháng"
          value={formatHours(monthLimit)}
          color="text-blue-300"
          icon={ShieldCheck}
        />
      </div>
    </div>
  );
}
