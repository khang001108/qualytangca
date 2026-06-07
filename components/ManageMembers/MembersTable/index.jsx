import React, { useState } from "react";
import TableHeader from "./TableHeader";
import TableRow from "./TableRow";
import TableEmpty from "./TableEmpty";
import MobileCard from "./MobileCard";
import useOvertimeDates from "./useOvertimeDates";

export default function MembersTable({
  members = [],
  setMembers,
  user,
  selectedDate,
  shiftSchedules = {},
  overtimeDates,
  shiftConfig,
}) {
  const [view, setView] = useState("cards"); // "cards" | "table"
  const hookDates = useOvertimeDates();
  const finalOvertimeDates = overtimeDates || hookDates;

  return (
    <div className="space-y-2">
      {/* Toggle view */}
      <div className="flex justify-end gap-1">
        <button
          onClick={() => setView("cards")}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${view === "cards" ? "bg-indigo-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}
        >
          📋 Card
        </button>
        <button
          onClick={() => setView("table")}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${view === "table" ? "bg-indigo-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}
        >
          📊 Bảng
        </button>
      </div>

      {view === "cards" ? (
        /* Card view — mobile-friendly */
        <div className="space-y-2">
          {members.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center text-sm text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700">
              Chưa có nhân viên
            </div>
          ) : (
            members.map((m, index) => (
              <MobileCard
                key={m.id}
                index={index}
                m={m}
                setMembers={setMembers}
                user={user}
                selectedDate={selectedDate}
                shiftSchedules={shiftSchedules}
                shiftConfig={shiftConfig}
              />
            ))
          )}
        </div>
      ) : (
        /* Table view — desktop */
        <div
          className="relative border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden flex flex-col"
          style={{ maxHeight: "55vh", minHeight: "200px" }}
        >
          <div className="flex-1 overflow-auto">
            <table className="w-full min-w-[700px] text-sm border-collapse">
              <TableHeader />
              <tbody className="text-center">
                {members.length === 0 ? (
                  <TableEmpty />
                ) : (
                  members.map((m, index) => (
                    <TableRow
                      key={m.id}
                      index={index}
                      m={m}
                      setMembers={setMembers}
                      user={user}
                      selectedDate={selectedDate}
                      shiftSchedules={shiftSchedules}
                      overtimeDates={finalOvertimeDates}
                      shiftConfig={shiftConfig}
                      limitInfo={m.limitInfo}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-300 dark:border-gray-700 mt-auto" />
        </div>
      )}
    </div>
  );
}
