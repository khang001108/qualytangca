import React from "react";
import { CSS } from "./styles";

export default function DayCell({ isRest, isCn, tang, thuong, onClick }) {
  let classes = CSS.baseCell;
  let content = "";

  if (isRest) {
    classes += ` ${CSS.rest}`;
    content = "休";
  } else if (tang + thuong > 0) {
    classes += ` ${CSS.ot}`;
    const total = tang + thuong;
    content = Number(total % 1 === 0 ? total : total.toFixed(1));
  } else {
    classes += ` ${CSS.work}`;
  }

  if (isCn) classes += ` ${CSS.sundayStripe}`;

  return (
    <div
      className={`${classes} w-[48px] cursor-pointer`}
      onClick={() => !isRest && onClick?.()}
    >
      <span className="px-2 py-[2px] rounded-md">{content}</span>
    </div>
  );
}
