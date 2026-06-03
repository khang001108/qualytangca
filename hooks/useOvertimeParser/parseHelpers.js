// hooks/useOvertimeParser/parseHelpers.js
export const LEAVE_MAP = {
  "休": "Nghỉ",
  "年假": "Nghỉ năm",
  "病假": "Nghỉ bệnh",
  "事假": "Nghỉ việc riêng",
  "调休": "Nghỉ bù",
  "婚假": "Nghỉ cưới",
  "丧假": "Nghỉ tang",
  "产假": "Nghỉ sinh",
  "陪产假": "Nghỉ chăm vợ sinh",
  "工伤假": "Nghỉ tai nạn lao động",
  "产检假": "Nghỉ khám thai",
  "哺乳假": "Nghỉ cho con bú",
  "旷工": "Vắng mặt / Nghỉ không phép",
};

export const LEAVE_CODES = Object.keys(LEAVE_MAP);

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

export function calculateFullMonthLimit(defaultDailyCap = 4) {
  const now = new Date();
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return days * defaultDailyCap;
}
// Exported normalize helper
export function normalizeName(s) {
  if (!s) return "";
  return String(s).trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // strip diacritics
    .replace(/\s+/g, " ");
}
