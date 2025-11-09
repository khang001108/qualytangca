export function getDefaultTime(
  shiftType,
  type,
  mode,
  gap = 15,
  shiftStart = 7.0,
  shiftEnd = 16.0
) {
  const gapHours = gap / 60;
  const oneHour = 1.0;

  const normalize = (val) => {
    if (val < 0) val += 24;
    if (val >= 24) val -= 24;
    return val;
  };

  // === Giờ lên ca ===
  if (type === "start") {
    const base = shiftStart;
    return mode === "early"
      ? [normalize(base - gapHours), normalize(base)]
      : [normalize(base + oneHour - gapHours), normalize(base + oneHour)];
  }

  // === Giờ tan ca ===
  const base = shiftEnd;
  return mode === "early"
    ? [normalize(base), normalize(base + gapHours)]
    : [normalize(base + oneHour), normalize(base + oneHour + gapHours)];
}

export function convertToTime(hour) {
  const totalMinutes = Math.floor(hour * 60) % (24 * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
