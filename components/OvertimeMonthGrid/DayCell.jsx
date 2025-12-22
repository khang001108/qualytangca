import React from "react";
import { CSS } from "./styles";

export default function DayCell({
  isRest,
  isBlocked,
  isCn,
  tang,
  thuong,
  isPastDay,
  isToday,
  hasRecordToday,
  onClick
}) {
  let classes = CSS.baseCell;
  let content = "";

  // 🔥 FIX QUAN TRỌNG: ÉP SỐ THỰC
  const otTang = Number(tang) || 0;
  const otThuong = Number(thuong) || 0;
  const totalOT = otTang + otThuong;

  // 1️⃣ OT THẬT — ƯU TIÊN TUYỆT ĐỐI
  // DÙ NGÀY NGHỈ / DỰ TÍNH / HÔM NAY
  if (totalOT > 0) {
    classes += ` ${CSS.ot}`;
    content =
      totalOT % 1 === 0 ? totalOT : totalOT.toFixed(1);
  }

  // 2️⃣ NGHỈ THẬT (chỉ khi KHÔNG có OT)
  else if (isRest) {
    classes += ` ${CSS.rest}`;
    content = "休";
  }

  // 3️⃣ DỰ TÍNH TĂNG CA
  else if (isBlocked) {
    classes += ` ${CSS.blocked}`;
    content = "0";
  }

  // 4️⃣ NGÀY LÀM VIỆC BÌNH THƯỜNG
  else {
    classes += ` ${CSS.work}`;

    if (isToday) {
      content = hasRecordToday ? "0" : "❔";
    }
    else if (isPastDay) {
      content = "0";
    }
    else {
      content = "";
    }
  }

  // Chủ nhật
  if (isCn) classes += ` ${CSS.sundayStripe}`;

  // Hôm nay
  if (isToday) classes += ` ${CSS.today}`;

  return (
    <div
      className={`${classes} w-[32px] cursor-pointer hover:bg-gray-200/60 dark:hover:bg-gray-700/40`}
      onClick={() => onClick?.()}
    >
      <span className="px-1 py-[2px] rounded-md text-[11px]">
        {content}
      </span>
    </div>
  );
}