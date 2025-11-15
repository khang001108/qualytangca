// components/ManageMembers/overtimeConfig/FormulaPreview.jsx
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowRight } from "lucide-react";

/**
 * FormulaPreview: flowchart + detail panels
 * - Click box => scroll tới panel tương ứng
 * - Hiển thị công thức chi tiết, các biến trung gian, và ví dụ tính toán theo `config`
 *
 * Expected `config` fields (sử dụng từ code bạn gửi):
 * - shiftStart, shiftEnd, shiftHalf, shiftOffice
 * - bonusEnabled, bonusEvery, bonusAmount
 * - monthlyLimit, workedHours, remaining
 *
 * Bạn có thể mở rộng để truyền bonusConfig / shiftConfig thực tế nếu cần.
 */

function FlowBox({ id, title, subtitle, gradient, onClick }) {
  return (
    <motion.button
      onClick={() => onClick(id)}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`w-full text-left px-4 py-3 rounded-2xl shadow-lg transform transition select-none
        bg-gradient-to-r ${gradient} text-white`}
    >
      <div className="font-semibold">{title}</div>
      {subtitle && <div className="text-xs opacity-90 mt-1">{subtitle}</div>}
    </motion.button>
  );
}

function toHHMM(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}:${mm.toString().padStart(2, "0")}`;
}

export default function FormulaPreview({
  shiftData = {},
  limitData = {},
  bonusData = {},
}) {
  // SAFE defaults
  // GỘP DATA TỪ 3 TAB
  const cfg = {
    // SHIFT
    start: Number(shiftData.shiftStart ?? 7),
    end: Number(shiftData.shiftEnd ?? 16),
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

  // helper parseTime-like calculations (use hours as floats)
  const calcOfficeFromTimes = (start, end, rest) => {
    // Works with simple hour numbers (e.g., 7 and 16). If end < start, wrap day.
    let d = end - start;
    if (d < 0) d += 24;
    return Math.max(0, d - rest);
  };

  // Derived values
  const derived = useMemo(() => {
    const officeHours = calcOfficeFromTimes(cfg.start, cfg.end, cfg.rest);
    const effectiveShiftOffice =
      Math.round((cfg.officeHours || officeHours) * 100) / 100;

    // Overtime rules: every minute after shift end => overtime 1:1
    // For examples we treat overtime window abstractly; actual workedHours comes from members/firestore.
    const worked = cfg.workedHours;
    const monthlyLimit =
      cfg.monthlyLimit > 0 ? cfg.monthlyLimit : cfg.days * cfg.perDay || 0;

    // If days & perDay provided -> totalLimit = days * perDay else fallback to monthlyLimit
    const totalLimit =
      cfg.days && cfg.perDay ? cfg.days * cfg.perDay : monthlyLimit;

    // Remaining hours
    const remainingHours = Math.max(totalLimit - worked, 0);

    // Bonus logic for a branch:
    // bonusPerDay applies only when perDay >= bonusEvery
    const bonusPerDay = cfg.perDay >= cfg.bonusEvery ? cfg.bonusAmount : 0;
    const totalBonus = cfg.days ? cfg.days * bonusPerDay : 0;

    // Tooltip-like derived numbers
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
    // add small focus animation (toggle class)
    el.classList.add("ring-4", "ring-indigo-300", "ring-opacity-30");
    setTimeout(
      () => el.classList.remove("ring-4", "ring-indigo-300", "ring-opacity-30"),
      900
    );
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
        {/* 1. Shift */}
        <div
          id="shift"
          className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold text-indigo-600">
                1) Giờ hành chính — công thức
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Công thức cơ bản (dùng giờ theo số thực):
              </div>

              <pre className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded text-xs mt-2 overflow-auto">
                {`giờ_sớm = (tanCaSomBatDau - lenCaSomKetThuc) - nghỉGiữaCa
giờ_muộn = (tanCaMuonBatDau - lenCaMuonKetThuc) - nghỉGiữaCa
(nếu negative -> +24)
Kiểm tra: nếu |giờ_sớm - giờ_muộn| > 0.01 => cấu hình sai
Giờ hành chính lấy = giờ_sớm (nếu hợp lệ)
`}
              </pre>
            </div>

            <div className="text-sm text-right">
              <div className="font-medium">Ví dụ (theo config):</div>
              <div className="mt-1">Giờ vào ca: {toHHMM(cfg.start)}</div>
              <div>Giờ tan ca: {toHHMM(cfg.end)}</div>
              <div>nghỉ giữa ca: {cfg.rest}h</div>
              <div className="mt-2 font-semibold">
                Giờ hành chính = {toHHMM(derived.effectiveShiftOffice)}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Overtime */}
        <div
          id="overtime"
          className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
        >
          <div className="font-semibold text-indigo-600">
            2) Ghi nhận tăng ca (logic)
          </div>

          <div className="mt-2 text-xs text-gray-700 dark:text-gray-300">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Mốc tan ca hành chính = shift.day.tanCaSomBatDau hoặc
                tanCaMuonBatDau (tùy nhân viên thuộc sớm/ muộn)
              </li>
              <li>
                Mọi thời gian sau mốc tan ca → tính 1:1 thành giờ tăng ca (1
                phút = 1 phút tăng ca)
              </li>
              <li>
                Giờ đã làm (workedHours) lấy từ Firestore
                (overtimeLimits.members[].workedHours hoặc
                members.overtimeLimit)
              </li>
            </ul>

            <div className="mt-3">
              <div className="text-xs font-medium">Ví dụ (theo config):</div>
              <div className="text-sm mt-1">Đã làm = {derived.worked}h</div>
            </div>

            <pre className="mt-3 bg-gray-50 dark:bg-gray-900/40 p-2 rounded text-xs">
              {`workedHours = lấy từ dữ liệu nhân viên (overtimeLimits / members)
ví dụ: workedHours = 12.5h
`}
            </pre>
          </div>
        </div>

        {/* 3. Limit */}
        <div
          id="limit"
          className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
        >
          <div className="font-semibold text-amber-600">
            3) Áp giới hạn tháng (totalLimit)
          </div>

          <div className="mt-2 text-xs text-gray-700 dark:text-gray-300">
            <div className="mb-2">Quy tắc:</div>

            <pre className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded text-xs overflow-auto">
              {`Nếu user chọn chia tháng (days × perDay):
    totalLimit = days × perDay
Ngược lại:
    totalLimit = monthlyLimit (nhánh mặc định)

gioConLai = max(totalLimit - workedHours, 0)
ngayConLai = max(days - soNgayDaLam, 0)
`}
            </pre>

            <div className="mt-2">
              <div className="text-sm font-medium">Ví dụ (theo config):</div>
              <div className="mt-1">
                perDay: {cfg.perDay}h — days: {cfg.days}
              </div>
              <div>monthlyLimit: {derived.monthlyLimit}h</div>
              <div className="mt-1 font-semibold">
                Tổng giới hạn (totalLimit): {derived.totalLimit}h
              </div>
              <div>Giờ đã làm (worked): {derived.worked}h</div>
              <div className="text-amber-600 font-semibold mt-1">
                Giờ còn lại = {derived.remainingHours}h
              </div>
            </div>
          </div>
        </div>

        {/* 4. Bonus */}
        <div
          id="bonus"
          className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
        >
          <div className="font-semibold text-green-600">
            4) Tính thưởng tăng ca (chi tiết)
          </div>

          <div className="mt-2 text-xs text-gray-700 dark:text-gray-300">
            <div className="mb-2">Điều kiện áp thưởng cho một nhánh:</div>

            <pre className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded text-xs overflow-auto">
              {`Nhánh được thưởng nếu:
  - bonusEnabled = true
  - và nhánh nằm trong selectedLimits (admin chọn)
Khi có days & perDay:
  nếu perDay >= bonusEvery:
    bonusPerDay = bonusAmount
  else:
    bonusPerDay = 0

tongGioThuong = days × bonusPerDay

Khi lưu cấu hình (đồng bộ):
  - gioThuongDaNhan = 0 (reset, vì chỉ ghi kế hoạch)
  - gioThuongConLai = tongGioThuong
`}
            </pre>

            <div className="mt-3">
              <div className="text-sm font-medium">Ví dụ (theo config):</div>
              <div className="mt-1">
                bonusEnabled: {String(cfg.bonusEnabled)}
              </div>
              <div>
                bonusEvery: {cfg.bonusEvery}h — bonusAmount: {cfg.bonusAmount}h
              </div>
              <div>
                perDay: {cfg.perDay}h → bonusPerDay = {derived.bonusPerDay}h
              </div>
              <div className="mt-1 font-semibold">
                Tổng thưởng kỳ này = {derived.totalBonus}h
              </div>
            </div>
          </div>
        </div>

        {/* 5. Save */}
        <div
          id="save"
          className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
        >
          <div className="font-semibold text-purple-600">
            5) Cập nhật Firestore — nội dung lưu
          </div>

          <div className="mt-2 text-xs text-gray-700 dark:text-gray-300">
            Khi admin nhấn Lưu → mỗi document: overtimeLimits/limit_[limitKey]
            sẽ nhận:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>month, year, limit (totalLimit)</li>
              <li>days, perDay (nếu user chọn)</li>
              <li>bonusEnabled, bonusEvery, bonusAmount</li>
              <li>
                members: mảng{" "}
                {`{ id, ten, tongGioKeHoach, tongGioThuong, gioDaLam, gioThuongDaNhan, gioConLai, gioThuongConLai, ngayConLai }`}
              </li>
            </ul>
            <pre className="mt-3 bg-gray-50 dark:bg-gray-900/40 p-2 rounded text-xs">
              {`Ví dụ payload.members[i] => {
  id,
  ten,
  tongGioKeHoach: totalLimit,
  tongGioThuong,
  gioDaLam: worked,
  gioThuongDaNhan: 0,
  gioConLai: Math.max(totalLimit - worked, 0),
  gioThuongConLai: tongGioThuong,
  ngayConLai: Math.max(days - soNgayDaLam, 0),
}
`}
            </pre>
          </div>
        </div>
      </div>

      {/* Small summary row */}
      <div className="mt-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900/30 text-sm grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <div className="text-xs text-gray-500">Giờ hành chính</div>
          <div className="font-medium">
            {toHHMM(derived.effectiveShiftOffice)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">
            Tổng giới hạn (totalLimit)
          </div>
          <div className="font-medium">{derived.totalLimit} h</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Tổng thưởng (kỳ)</div>
          <div className="font-medium">{derived.totalBonus} h</div>
        </div>
      </div>
    </div>
  );
}
