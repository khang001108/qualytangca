// components/OvertimeSummary.js
import { useMemo, useState } from "react";
import { Trophy, ArrowDownCircle, ShieldCheck, Eye, EyeOff, Users, TrendingUp, Clock, LogIn, LogOut } from "lucide-react";
import dayjs from "dayjs";
import { ICONS } from "../utils/iconUtils";
import { User } from "lucide-react";

const fmt = (n) => `${Number(n || 0).toFixed(1)}h`;

export default function OvertimeSummary({
  members = [],
  overtimes = [],
  shiftSchedules = {},
  selectedMonth,
  selectedYear,
  selectedDate,
}) {
  const [showValues, setShowValues] = useState(true);

  const data = useMemo(() => {
    return members.map((m) => {
      let totalOT = 0;
      const daysInMonth = dayjs(`${selectedYear}-${String(selectedMonth).padStart(2,"0")}-01`).daysInMonth();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = dayjs(`${selectedYear}-${String(selectedMonth).padStart(2,"0")}-${String(d).padStart(2,"0")}`).format("YYYY-MM-DD");
        const ot = overtimes.find((o) => {
          const dk = o.date?.slice(0,10) || (typeof o.currentDate === "string" ? o.currentDate.slice(0,10) : null);
          if (!dk || dk !== dateKey) return false;
          return String(o.memberId) === String(m.id) || o.realName === m.realName;
        });
        if (ot) { totalOT += Number(ot.tangCaHomNay || 0) + Number(ot.thuong || 0); continue; }
        if (shiftSchedules[dateKey]) {
          const rec = shiftSchedules[dateKey][m.realName] || Object.values(shiftSchedules[dateKey]).find(s => String(s.memberId) === String(m.id) || s.realName === m.realName);
          if (rec) totalOT += Number(rec.tangCaHomNay || 0) + Number(rec.thuong || 0);
        }
      }
      return {
        id: m.id, name: m.realName, nickname: m.nickname, avatar: m.avatar, color: m.color,
        total: totalOT,
        limit: Number(m.overtimeLimit?.monthlyLimit || 0),
        worked: Number(m.overtimeLimit?.workedHours || 0),
      };
    });
  }, [members, overtimes, shiftSchedules, selectedMonth, selectedYear]);

  const sorted = [...data].sort((a, b) => b.total - a.total);
  const maxData = data.reduce((a, b) => b.total > a.total ? b : a, { total: -1 });
  const minData = data.reduce((a, b) => b.total < a.total ? b : a, { total: Infinity });

  const currentKey = dayjs(selectedDate || new Date()).format("YYYY-MM-DD");
  const presentCount = members.filter((m) => {
    const rec = shiftSchedules[currentKey]?.[m.realName] || Object.values(shiftSchedules[currentKey] || {}).find(v => v.realName === m.realName || String(v.memberId) === String(m.id));
    if (!rec) return false;
    if (rec.type === "leave") return false;
    return rec.type === "work";
  }).length;

  const totalMembers = members.length;
  const monthLimit = Math.max(...data.map(d => d.limit || 0), 0);

  // Today attendance
  const todayData = useMemo(() => {
    return members.map(m => {
      const sched = shiftSchedules[currentKey];
      let rec = null;
      if (sched) rec = Object.values(sched).find(s => s.memberId === m.id || s.realName === m.realName);
      return {
        id: m.id, name: m.realName, avatar: m.avatar, color: m.color,
        checkIn: rec?.lenCa || "",
        checkOut: rec?.xuongCa || "",
        ot: Number(rec?.tangCaHomNay || 0),
        note: rec?.note || "",
        isNight: rec?.shift?.toLowerCase().includes("đêm"),
      };
    });
  }, [members, shiftSchedules, currentKey]);

  const StatChip = ({ label, value, color, icon: Icon, highlight }) => (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${highlight ? "bg-orange-50 dark:bg-orange-900/15 border-orange-200 dark:border-orange-800" : "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700"}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${highlight ? "bg-orange-100 dark:bg-orange-900/40" : "bg-white dark:bg-gray-700"}`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-sm font-bold mt-0.5 ${color} truncate`}>{showValues ? value : "••••"}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in-up">

      {/* ── Thống kê nhanh ── */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
            🗓 Trạng thái — {dayjs(selectedDate || new Date()).format("DD/MM/YYYY")}
          </h2>
          <button onClick={() => setShowValues(v => !v)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition">
            {showValues ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StatChip label="Tăng ca nhiều nhất" value={maxData.total >= 0 ? `${maxData.name} · ${fmt(maxData.total)}` : "—"} color="text-yellow-600 dark:text-yellow-400" icon={Trophy} highlight />
          <StatChip label="Tăng ca ít nhất" value={minData.total !== Infinity ? `${minData.name} · ${fmt(minData.total)}` : "—"} color="text-green-600 dark:text-green-400" icon={ArrowDownCircle} />
          <StatChip label="Giới hạn tháng" value={fmt(monthLimit)} color="text-blue-600 dark:text-blue-400" icon={ShieldCheck} />
          <StatChip label="Sĩ số hôm nay" value={`${presentCount}/${totalMembers} (nghỉ ${totalMembers - presentCount})`} color="text-cyan-600 dark:text-cyan-400" icon={Users} />
        </div>
      </div>

      {/* ── Bảng xếp hạng tăng ca tháng ── */}
      <div className="card space-y-3">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-indigo-500" /> Xếp hạng tăng ca tháng {selectedMonth}
        </h3>
        <div className="space-y-2">
          {sorted.map((d, i) => {
            const pct = d.limit > 0 ? Math.min((d.total / d.limit) * 100, 100) : 0;
            const match = ICONS.find(ic => ic.name === members.find(m => m.id === d.id)?.avatar);
            const Icon = match ? match.icon : User;
            const color = members.find(m => m.id === d.id)?.color || "#6366f1";
            return (
              <div key={d.id} className="flex items-center gap-2.5">
                <span className={`text-[11px] font-bold w-5 text-center shrink-0 ${i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-gray-400 dark:text-gray-500"}`}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                </span>
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: color + "25" }}>
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{d.name}</span>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0 ml-1">{showValues ? fmt(d.total) : "••"}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : color }}
                    />
                  </div>
                  {d.limit > 0 && (
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {showValues ? `${fmt(d.total)} / ${fmt(d.limit)} (${Math.round(pct)}%)` : "• / •"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Chấm công hôm nay ── */}
      <div className="card space-y-3">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-green-500" /> Chấm công hôm nay
        </h3>
        <div className="space-y-1.5">
          {todayData.map(td => {
            const hasData = td.checkIn || td.checkOut || td.note;
            const iconMatch = ICONS.find(ic => ic.name === td.avatar);
            const TdIcon = iconMatch ? iconMatch.icon : User;
            const tdColor = td.color || (td.isNight ? "#6366f1" : "#f59e0b");
            return (
              <div key={td.id} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 border ${hasData ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" : "bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-700/30"}`}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: tdColor + "25" }}>
                  <TdIcon className="w-3.5 h-3.5" style={{ color: tdColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{td.name}</p>
                  {td.note ? (
                    <p className="text-[10px] text-orange-500 truncate">{td.note}</p>
                  ) : hasData ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-0.5"><LogIn className="w-3 h-3" />{td.checkIn || "--"}</span>
                      <span className="text-[10px] text-red-500 dark:text-red-400 flex items-center gap-0.5"><LogOut className="w-3 h-3" />{td.checkOut || "--"}</span>
                      {td.ot > 0 && <span className="text-[10px] font-bold text-orange-500">+{td.ot}h TC</span>}
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-400">Chưa chấm công</p>
                  )}
                </div>
                <div className="shrink-0">
                  {td.checkOut ? <div className="w-2 h-2 rounded-full bg-green-400" />
                    : td.checkIn ? <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    : td.note ? <div className="w-2 h-2 rounded-full bg-orange-400" />
                    : <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-600" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
