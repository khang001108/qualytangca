import React from "react";
import { List, BriefcaseBusiness, BedDouble, Hourglass, Timer } from "lucide-react";

export default function TableHeader() {
  const th = "p-1.5 text-center text-[10px] font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap";
  return (
    <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700 z-10 border-b border-gray-200 dark:border-gray-600">
      <tr>
        <th className={th}>#</th>
        <th className={`${th} text-left`}>Tên</th>
        <th className={th}>Ca</th>
        <th className={th}>Nghỉ</th>
        <th className={th}>Lên ca</th>
        <th className={th}>Giới hạn</th>
        <th className={th}>Đã TC</th>
        <th className={th}>Còn</th>
        <th className={th}>Sớm</th>
      </tr>
    </thead>
  );
}
