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

  const totalOT = (tang || 0) + (thuong || 0);

  // 1️⃣ OT THẬT — ƯU TIÊN CAO NHẤT (đè cả dự tính)
  if (totalOT > 0) {
    classes += ` ${CSS.ot}`;
    content = Number(
      totalOT % 1 === 0 ? totalOT : totalOT.toFixed(1)
    );
  }

  // 2️⃣ NGHỈ THẬT
  else if (isRest) {
    classes += ` ${CSS.rest}`;
    content = "休";
  }

  // 3️⃣ DỰ TÍNH TĂNG CA (BLOCKED)
  else if (isBlocked) {
    classes += ` ${CSS.blocked}`;
    content = "0";
  }

  // 4️⃣ NGÀY LÀM VIỆC BÌNH THƯỜNG
  else {
    classes += ` ${CSS.work}`;

    if (isToday) {
      // Hôm nay
      content = hasRecordToday ? "0" : "❔";
    }
    else if (isPastDay) {
      // Ngày đã qua
      content = "0";
    }
    else {
      // Ngày tương lai
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