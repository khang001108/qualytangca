export function toHHMM(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}:${mm.toString().padStart(2, "0")}`;
}

export function calcOfficeFromTimes(start, end, rest) {
  let d = end - start;
  if (d < 0) d += 24;
  return Math.max(0, d - rest);
}
