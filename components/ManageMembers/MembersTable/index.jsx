import React from "react";
import TableHeader from "./TableHeader";
import TableRow from "./TableRow";
import TableEmpty from "./TableEmpty";
import useOvertimeDates from "./useOvertimeDates";

export default function MembersTable({
  members = [],
  setMembers,
  user,
  selectedDate,
  shiftSchedules = {},
}) {
  const overtimeDates = useOvertimeDates();

  return (
    <div
      className="relative border border-gray-300 dark:border-gray-700 
                 rounded-xl shadow-sm overflow-hidden flex flex-col"
      style={{ maxHeight: "50vh", minHeight: "200px" }}
    >
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm border-collapse">
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
                  overtimeDates={overtimeDates}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-300 dark:border-gray-700 mt-auto" />
    </div>
  );
}
