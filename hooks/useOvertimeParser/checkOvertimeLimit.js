export function checkOvertimeLimit(member, overtimeHours) {
  if (!member.overtimeLimit) return { ok: true, finalHours: overtimeHours };

  const limit = member.overtimeLimit.monthlyLimit ?? 0;
  const worked = member.overtimeLimit.workedHours ?? 0;
  const remaining = limit - worked;

  if (remaining <= 0) {
    return { 
      ok: false,
      finalHours: 0,
      reason: "Hết giờ tăng ca trong tháng"
    };
  }

  // nếu overtimeHours > remaining → chỉ được phần còn lại
  if (overtimeHours > remaining) {
    return { 
      ok: true,
      finalHours: remaining,
      reason: "Đã vượt giới hạn – chỉ cộng phần còn lại"
    };
  }

  return { ok: true, finalHours: overtimeHours };
}
