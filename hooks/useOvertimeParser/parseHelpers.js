export const LEAVE_CODES = [
  "休",
  "年假",
  "病假",
  "事假",
  "调休",
  "婚假",
  "丧假",
  "产假",
  "陪产假",
  "工伤假",
  "产检假",
  "哺乳假",
  "旷工",
];

export function parseLine(rawLine) {
  const line = rawLine.replace(/^\d+\.\s*/, "").trim();
  const parts = line.split(/[\/\s]+/).filter(Boolean);
  return {
    realName: parts[0],
    timePart: parts[1],
  };
}
