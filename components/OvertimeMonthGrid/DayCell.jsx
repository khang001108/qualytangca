import React from "react";
import { CSS } from "./styles";

export default function DayCell({ isRest, isBlocked, isCn, tang, thuong, onClick }) {
  let classes = CSS.baseCell;
  let content = "";

  // 1️⃣ BLOCK — ô TRỐNG màu xám
  if (isBlocked) {
    classes += ` ${CSS.blocked}`;
    content = "B";   // đổi ký hiệu tại đây
  }


  // 2️⃣ NGHỈ THẬT — hiện chữ 休
  else if (isRest) {
    classes += ` ${CSS.rest}`;
    content = "休";
  }

  // 3️⃣ TĂNG CA — hiện số
  else if (tang + thuong > 0) {
    classes += ` ${CSS.ot}`;
    const total = tang + thuong;
    content = Number(total % 1 === 0 ? total : total.toFixed(1));
  }

  // 4️⃣ LÀM BÌNH THƯỜNG
  else {
    classes += ` ${CSS.work}`;
  }

  if (isCn) classes += ` ${CSS.sundayStripe}`;

  return (
    <div
      className={`${classes} w-[32px] cursor-pointer hover:bg-gray-200/60 dark:hover:bg-gray-700/40`}
      onClick={() => onClick?.()}  // ❗ Cho phép click cả block để tắt block
    >
      <span className="px-1 py-[2px] rounded-md text-[11px]">
        {content}
      </span>
    </div>
  );
}
