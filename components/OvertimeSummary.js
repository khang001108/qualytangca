// components/OvertimeSummary.js — Mobile-first summary cards
import { useMemo, useState } from "react";
import { Trophy, Users, TrendingUp, Eye, EyeOff } from "lucide-react";
import dayjs from "dayjs";

function StatCard({ icon, label, value, sub, accent = "indigo" }) {
  const colors = {
    indigo: "from-indigo-500 to-indigo-600",
    orange: "from-orange-500 to-orange-600",
    green:  "from-green-500 to-green-600",
    yellow: "from-yellow-500 to-yellow-600",
  };
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[accent]} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</div>
        <div className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-tight">{value}</div>
        {sub && <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{sub}</div>}
      </div>
    </div>
  );
}

export default function OvertimeSummary({ members = [], overtimes = [], shiftSchedules = {}, selectedMonth, selectedYear, selectedDate }) {
  const [showValues, setShowValues] = useState(true);

  const stats = useMemo(() => {
    const daysInMonth = dayjs(`${selectedYear}-${String(selectedMonth).padStart(2,"0")}-01`).daysInMonth();

    let totalOT = 0, totalMembers = members.length;
    let topName = "—", topHours = 0;

    members.forEach((m) => {
      let mOT = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dk = dayjs(`${selectedYear}-${String(selectedMonth).padStart(2,"0")}-${String(d).padStart(2,"0")}`).format("YYYY-MM-DD");
        const ot = overtimes.find((o) => {
          const dk2 = o.date?.slice(0,10);
          return dk2 === dk && (String(o.memberId) === String(m.id) || o.realName === m.realName);
        });
        if (ot) { mOT += Number(ot.tangCaHomNay||0) + Number(ot.thuong||0); continue; }
        const rec = shiftSchedules[dk]?.[m.realName];
        if (rec) mOT += Number(rec.tangCaHomNay||0) + Number(rec.thuong||0);
      }
      totalOT += mOT;
      if (mOT > topHours) { topHours = mOT; topName = m.realName || m.nickname || "?"; }
    });

    // Count unique active dates
    const activeDays = new Set(
      overtimes.filter((o) => (Number(o.tangCaHomNay)||0) > 0).map((o) => o.date?.slice(0,10))
    ).size;

    return { totalOT, totalMembers, topName, topHours, activeDays };
  }, [members, overtimes, shiftSchedules, selectedMonth, selectedYear]);

  const fmt = (n) => showValues ? `${Number(n||0).toLocaleString()}h` : "***";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
          Tổng quan tháng {selectedMonth}/{selectedYear}
        </h2>
        <button
          onClick={() => setShowValues((v) => !v)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          {showValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-white" />}
          label="Tổng giờ tăng ca"
          value={fmt(stats.totalOT)}
          accent="indigo"
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-white" />}
          label="Nhân viên"
          value={stats.totalMembers}
          sub={`${stats.activeDays} ngày OT`}
          accent="orange"
        />
        <div className="col-span-2">
          <StatCard
            icon={<Trophy className="w-5 h-5 text-white" />}
            label="Nhiều nhất tháng"
            value={showValues ? `${stats.topName}` : "***"}
            sub={showValues ? `${stats.topHours}h tăng ca` : "***"}
            accent="yellow"
          />
        </div>
      </div>
    </div>
  );
}
