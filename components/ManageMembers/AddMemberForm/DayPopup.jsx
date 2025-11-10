import React from "react";
import { CalendarDays } from "lucide-react";

export default function DayPopup({ form, setForm, setShowDayPopup }) {
  const weekdays = ["Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7","Chủ nhật"];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onMouseDown={() => setShowDayPopup(false)}>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 w-72"
        onMouseDown={(e)=>e.stopPropagation()}>
        <h4 className="font-semibold mb-3 text-indigo-600 flex items-center gap-2">
          <CalendarDays className="w-4 h-4"/> Chọn ngày nghỉ
        </h4>
        <div className="space-y-2">
          {weekdays.map(day=>(
            <button key={day}
              onClick={()=>{
                setForm(f=>({...f,restDay:day}));
                setShowDayPopup(false);
              }}
              className={`w-full py-2 rounded-lg border ${
                form.restDay===day?"bg-indigo-600 text-white":"bg-gray-100 dark:bg-gray-700"
              }`}>
              {day}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
