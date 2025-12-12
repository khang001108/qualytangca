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
  hasRecordToday, // <-- new prop
  onClick
}) {

  let classes = CSS.baseCell;
  let content = "";

  // 1️⃣ BLOCK — ô TRỐNG màu xám (dự tính)
  if (isBlocked) {
    classes += ` ${CSS.blocked}`;
    content = "❌";
  }

  // 2️⃣ NGHỈ THẬT — hiện chữ 休
  else if (isRest) {
    classes += ` ${CSS.rest}`;
    content = "休";
  }

  // 3️⃣ TĂNG CA THẬT HOẶC DỰ TÍNH — hiện số
  else if (tang + thuong > 0) {
    classes += ` ${CSS.ot}`;
    const total = tang + thuong;
    content = Number(total % 1 === 0 ? total : total.toFixed(1));
  }

  // 4️⃣ Ô TRỐNG (không OT)
  else {
    classes += ` ${CSS.work}`;

    if (isToday) {
      // Nếu hôm nay đã có record (đã chấm công) → hiện 0
      if (hasRecordToday) {
        content = "0";
      } else {
        // Hôm nay chưa chấm công → ?
        content = "❔";
      }
    }
    else if (isPastDay) {
      content = "0"; // ngày đã qua và không có OT => 0
    }
    else {
      content = ""; // ngày tương lai => trống
    }
  }

  if (isCn) classes += ` ${CSS.sundayStripe}`;
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
