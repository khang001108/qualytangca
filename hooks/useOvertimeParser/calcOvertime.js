export function calcOvertimeHours(shiftStart = "07:00", checkOut) {
  if (!checkOut) return 0;
  const [sH, sM] = (shiftStart || "07:00").split(":").map(Number);
  const [oH, oM] = checkOut.split(":").map(Number);
  const diff = oH * 60 + oM - (sH + 9) * 60 - sM;
  if (diff < 60) return 0;
  return Math.floor(diff / 60);
}
