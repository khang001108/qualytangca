import React from "react";
import {
  List,
  CircleUser,
  User,
  BriefcaseBusiness,
  ClockArrowUp,
  Hourglass,
  ClockFading,
  CalendarClock,
  Timer,
  CalendarDays,
  BedDouble,
} from "lucide-react";

export default function TableHeader() {
  const Col = ({ icon: Icon, text, color }) => (
    <th className="p-2 text-center">
      <div className="flex items-center justify-center gap-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span>{text}</span>
      </div>
    </th>
  );

  return (
    <thead className="sticky top-0 bg-gray-200 dark:bg-gray-700 
                      text-gray-700 dark:text-gray-200 font-semibold z-10">
      <tr className="[&>th]:border-b [&>th]:border-gray-300 dark:[&>th]:border-gray-700">
        <Col icon={List} text="STT" color="text-blue-500" />
        <Col icon={CircleUser} text="Tên chính" color="text-blue-500" />
        <Col icon={User} text="Tên phụ" color="text-blue-500" />
        <Col icon={BriefcaseBusiness} text="Ca" color="text-blue-500" />
        <Col icon={BedDouble} text="Nghỉ luân phiên" color="text-pink-500" />
        <Col icon={ClockArrowUp} text="Lên ca" color="text-blue-500" />
        <Col icon={Hourglass} text="Giới hạn" color="text-green-500" />
        <Col icon={ClockFading} text="Đã tăng" color="text-yellow-500" />
        <Col icon={CalendarClock} text="Tổng" color="text-indigo-500" />
        <Col icon={CalendarDays} text="Ngày" color="text-teal-500" />
        <Col icon={Timer} text="Lên ca sớm" color="text-purple-500" />
      </tr>
    </thead>
  );
}
