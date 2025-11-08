export function getDefaultTime(
    shiftType,
    type,
    mode,
    gap = 15,
    shiftStart = 7.0,
    shiftEnd = 16.0
  ) {
    const gapHours = gap / 60;
    const oneMin = 1 / 60;
    const oneHour = 1.0;
  
    if (type === "start") {
      const base = shiftStart;
      return mode === "early"
        ? [base - gapHours, base]
        : [base + oneHour - gapHours, base + oneHour];
    }
  
    const base = shiftEnd;
    return mode === "early"
      ? [base + oneMin, base + oneMin + gapHours]
      : [base + oneHour + oneMin, base + oneHour + oneMin + gapHours];
  }
  
  export function convertToTime(hour) {
    const totalMinutes = Math.round(hour * 60);
    const h = Math.floor((totalMinutes / 60) % 24);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  