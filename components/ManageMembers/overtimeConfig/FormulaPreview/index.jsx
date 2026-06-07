import React, { useMemo } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import FlowBox from "./FlowBox";
import { toHHMM, calcOfficeFromTimes } from "./utils";

export default function FormulaPreview({
  shiftData = {},
  limitData = {},
  bonusData = {},
}) {
  const cfg = {
    // SHIFT
    start: Number(shiftData.start ?? 7),
    end: Number(shiftData.end ?? 16),
    rest: Number(shiftData.rest ?? 1),
    officeHours: Number(shiftData.officeHours ?? 8),

    // LIMIT
    days: Number(limitData.days ?? 0),
    perDay: Number(limitData.perDay ?? 0),
    monthlyLimit: Number(limitData.monthlyLimit ?? 0),
    workedHours: Number(limitData.workedHours ?? 0),

    // BONUS
    bonusEnabled: Boolean(bonusData.bonusEnabled ?? false),
    bonusEvery: Number(bonusData.bonusEvery ?? 2),
    bonusAmount: Number(bonusData.bonusAmount ?? 0.5),
  };

  const derived = useMemo(() => {
    const officeHours = calcOfficeFromTimes(cfg.start, cfg.end, cfg.rest);

    const effectiveShiftOffice =
      Math.round((cfg.officeHours || officeHours) * 100) / 100;

    const worked = cfg.workedHours;

    const monthlyLimit =
      cfg.monthlyLimit > 0 ? cfg.monthlyLimit : cfg.days * cfg.perDay || 0;

    const totalLimit =
      cfg.days && cfg.perDay ? cfg.days * cfg.perDay : monthlyLimit;

    const remainingHours = Math.max(totalLimit - worked, 0);

    const bonusPerDay = cfg.perDay >= cfg.bonusEvery ? cfg.bonusAmount : 0;

    const totalBonus = cfg.days ? cfg.days * bonusPerDay : 0;

    return {
      officeHours,
      effectiveShiftOffice,
      worked,
      monthlyLimit,
      totalLimit,
      remainingHours,
      bonusPerDay,
      totalBonus,
    };
  }, [cfg]);

  const steps = [
    {
      id: "shift",
      title: "Giờ hành chính",
      subtitle: "Tính giờ làm thực tế từ mốc vào/ra và nghỉ giữa ca",
      gradient: "from-blue-400 to-blue-600",
    },
    {
      id: "overtime",
      title: "Ghi nhận tăng ca",
      subtitle: "Sau tan ca: mọi phút = phút tăng ca (1:1)",
      gradient: "from-indigo-500 to-violet-600",
    },
    {
      id: "limit",
      title: "Áp giới hạn tháng",
      subtitle: "monthlyLimit hoặc days × perDay → tổng giới hạn",
      gradient: "from-amber-400 to-amber-600",
    },
    {
      id: "bonus",
      title: "Tính thưởng tăng ca",
      subtitle: "Theo nhánh: nếu bật thưởng và đủ điều kiện → cộng giờ thưởng",
      gradient: "from-green-400 to-green-600",
    },
    {
      id: "save",
      title: "Cập nhật Firestore",
      subtitle:
        "Ghi tổng giới hạn, members, trạng thái thưởng, reset gioThuongDaNhan",
      gradient: "from-purple-500 to-pink-500",
    },
  ];

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("ring-4", "ring-indigo-300", "ring-opacity-30");
    setTimeout(() => {
      el.classList.remove("ring-4", "ring-indigo-300", "ring-opacity-30");
    }, 900);
  };

  return (
    <div
      id="section-formula"
      className="space-y-4 p-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
          📊 Sơ đồ & công thức tính chi tiết
        </h3>
        <div className="text-xs text-gray-500">
          Nhấp vào khung để xem công thức tương ứng
        </div>
      </div>

      {/* Flowchart navigator */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {steps.map((s, i) => (
          <div key={s.id} className="flex flex-col items-center">
            <FlowBox
              id={s.id}
              title={`${i + 1}. ${s.title}`}
              subtitle={s.subtitle}
              gradient={s.gradient}
              onClick={scrollTo}
            />

            {i !== steps.length - 1 && (
              <div className="text-gray-400 mt-2">
                <ArrowDown className="w-5 h-5 mx-auto" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Detailed panels */}
      <div className="space-y-6 mt-4">
        {/* Shift */}
        <div
          id="shift"
          className="p-4 rounded-xl border bg-white dark:bg-gray-800 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-indigo-600">
                1) Giờ hành chính — công thức
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Công thức cơ bản:
              </div>

              <pre className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded text-xs mt-2 overflow-auto whitespace-pre-wrap break-all">
                {`giờ_sớm = (tanCaSomBatDau - lenCaSomKetThuc) - nghỉGiữaCa
giờ_muộn = (tanCaMuonBatDau - lenCaMuonKetThuc) - nghỉGiữaCa
Nếu negative → +24
Giờ hành chính = giờ_sớm`}
              </pre>
            </div>

            <div className="text-sm sm:text-right bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-2 shrink-0">
              <div className="font-medium">Ví dụ (config):</div>

              <div className="mt-1">Giờ vào ca: {toHHMM(cfg.start)}</div>
              <div>Giờ tan ca: {toHHMM(cfg.end)}</div>
              <div>Nghỉ giữa ca: {cfg.rest}h</div>

              <div className="mt-2 font-semibold">
                Giờ hành chính = {toHHMM(derived.effectiveShiftOffice)}
              </div>
            </div>
          </div>
        </div>

        {/* Overtime */}
        <div
          id="overtime"
          className="p-4 rounded-xl border bg-white dark:bg-gray-800 shadow-sm"
        >
          <div className="font-semibold text-indigo-600">
            2) Ghi nhận tăng ca (logic)
          </div>

          <div className="mt-2 text-xs">
            <ul className="list-disc pl-5 space-y-1">
              <li>Mốc tan ca dựa vào ca sớm / ca muộn</li>
              <li>Sau mốc tan ca → tính OT 1:1</li>
              <li>workedHours lấy từ Firestore</li>
            </ul>

            <div className="mt-3">
              <div className="text-xs font-medium">Ví dụ:</div>
              <div className="text-sm mt-1">Đã làm = {derived.worked}h</div>
            </div>
          </div>
        </div>

        {/* Limit */}
        <div
          id="limit"
          className="p-4 rounded-xl border bg-white dark:bg-gray-800 shadow-sm"
        >
          <div className="font-semibold text-amber-600">
            3) Áp giới hạn tháng (totalLimit)
          </div>

          <div className="mt-2 text-xs">
            <pre className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded text-xs overflow-auto">
              {`Nếu chọn days × perDay:
  totalLimit = days × perDay
Ngược lại:
  totalLimit = monthlyLimit

gioConLai = max(totalLimit - workedHours, 0)`}
            </pre>

            <div className="mt-2">
              <div className="text-sm font-medium">Ví dụ:</div>
              <div>
                perDay: {cfg.perDay}h — days: {cfg.days}
              </div>
              <div>monthlyLimit: {derived.monthlyLimit}h</div>

              <div className="font-semibold mt-1">
                Tổng giới hạn = {derived.totalLimit}h
              </div>

              <div>Giờ đã làm: {derived.worked}h</div>

              <div className="text-amber-600 font-semibold mt-1">
                Giờ còn lại = {derived.remainingHours}h
              </div>
            </div>
          </div>
        </div>

        {/* Bonus */}
        <div
          id="bonus"
          className="p-4 rounded-xl border bg-white dark:bg-gray-800 shadow-sm"
        >
          <div className="font-semibold text-green-600">
            4) Tính thưởng tăng ca
          </div>

          <div className="mt-2 text-xs">
            <pre className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded text-xs overflow-auto">
              {`Nếu bonusEnabled = true và đủ điều kiện:
  bonusPerDay = bonusAmount
Ngược lại:
  bonusPerDay = 0

tongGioThuong = days × bonusPerDay`}
            </pre>

            <div className="mt-3">
              <div className="text-sm font-medium">Ví dụ:</div>

              <div>Thưởng bật: {String(cfg.bonusEnabled)}</div>
              <div>
                Điều kiện ≥ {cfg.bonusEvery}h → {derived.bonusPerDay}h/ngày
              </div>

              <div className="mt-1 font-semibold">
                Tổng thưởng kỳ này = {derived.totalBonus}h
              </div>
            </div>
          </div>
        </div>

        {/* Save */}
        <div
          id="save"
          className="p-4 rounded-xl border bg-white dark:bg-gray-800 shadow-sm"
        >
          <div className="font-semibold text-purple-600">
            5) Cập nhật Firestore — nội dung lưu
          </div>

          <div className="mt-2 text-xs">
            <ul className="list-disc pl-5 space-y-1">
              <li>month, year, limit</li>
              <li>days, perDay</li>
              <li>bonusEnabled, bonusEvery, bonusAmount</li>
              <li>
                members:{" "}
                {`{ id, ten, tongGioKeHoach, gioDaLam, gioConLai,... }`}
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-3 p-3 rounded-lg border bg-gray-100 dark:bg-gray-900/30 text-sm grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <div className="text-xs text-gray-500">Giờ hành chính</div>
          <div className="font-medium">
            {toHHMM(derived.effectiveShiftOffice)}
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500">Tổng giới hạn</div>
          <div className="font-medium">{derived.totalLimit} h</div>
        </div>

        <div>
          <div className="text-xs text-gray-500">Tổng thưởng</div>
          <div className="font-medium">{derived.totalBonus} h</div>
        </div>
      </div>
    </div>
  );
}
