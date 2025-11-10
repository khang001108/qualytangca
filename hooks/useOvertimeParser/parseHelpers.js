// hooks/useOvertimeParser/parseHelpers.js
export const LEAVE_CODES = [
  "休", "年假", "病假", "事假", "调休", "婚假",
  "丧假", "产假", "陪产假", "工伤假", "产检假",
  "哺乳假", "旷工",
];

// Hàm tính thưởng tăng ca
export function applyOvertimeBonus(overtimeHours, config, leaveCode = "") {
  const allNoBonus = [...LEAVE_CODES, ...(config?.customNoBonus || [])];

  // Nếu thuộc mã không được thưởng → giữ nguyên
  if (allNoBonus.some((code) => leaveCode.includes(code))) {
    return overtimeHours;
  }

  if (!config?.bonusEnabled) return overtimeHours;

  const every = config.bonusEvery || 2;
  const amount = config.bonusAmount || 0.5;

  return overtimeHours >= every
    ? overtimeHours + amount
    : overtimeHours;
}
