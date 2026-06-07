import { timeToMinutes, inRangeWrap } from "./shiftHelpers";
import { loadShiftConfigs } from "./shiftHelpers";

export async function calcOvertimeHours(shiftStartRule, checkOut) {
  if (!checkOut) return 0;

  // Load config
  const { day, night } = await loadShiftConfigs();
  if (!day || !night) return 0;

  const outMin = timeToMinutes(checkOut);
  if (outMin == null) return 0;

  // Xác định rule thuộc ca ngày hay đêm
  const isNight =
    shiftStartRule.includes("đêm") ||
    shiftStartRule.includes("night") ||
    shiftStartRule.includes("dem");

  const cfg = isNight ? night : day;

  // Xác định đang là sớm hay muộn
  const isSom = shiftStartRule.includes("sớm") || shiftStartRule.includes("som");

  // Lấy giờ tan ca chuẩn
  const endKey = isSom ? "tanCaSomKetThuc" : "tanCaMuonKetThuc";

  let endMin = timeToMinutes(cfg[endKey]);
  if (isNight) endMin += 1440; // wrap-night

  // Tính OT
  const diff = outMin - endMin;
  if (diff < 60) return 0;

  return Math.floor(diff / 60);
}
