import { useState } from "react";
import OvertimeForm from "./OvertimeForm";
import OvertimeLimit from "./OvertimeLimit";
import OverMember from "./OverMember";
import PopupSettings from "./PopupSettings";

export default function PopupManager({
  onClose,
  user,
  members,
  setMembers,
  overtimeLimit,
  setOvertimeLimit,
  overtimeItems,
  setOvertimeItems,
  selectedMonth,
  selectedYear,
  selectedDate,
  handleDeleteAll,
}) {
  const [activeView, setActiveView] = useState("menu");

  const renderContent = () => {
    switch (activeView) {
      case "overtime":
        return (
          <OvertimeForm
            user={user}
            members={members}
            setMembers={setMembers}
            setItems={setOvertimeItems}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            selectedDate={selectedDate}
          />
        );
      case "limit":
        return (
          <OvertimeLimit
            user={user}
            overtimeLimit={overtimeLimit}
            setOvertimeLimit={setOvertimeLimit}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        );
      case "member":
        return (
          <OverMember
            user={user}
            overtimes={overtimeItems}
            limit={overtimeLimit}
            members={members}
            setMembers={setMembers}
            isPopupAdd
          />
        );
      case "settings":
        return (
          <PopupSettings
            member={members[0]}
            members={members}
            setMembers={setMembers}
            onClose={() => setActiveView("menu")}
          />
        );
      default:
        return (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setActiveView("overtime")}
              className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600"
            >
              ➕ Thêm tăng ca
            </button>
            <button
              onClick={() => setActiveView("limit")}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              ⏳ Giới hạn tăng ca
            </button>
            <button
              onClick={() => setActiveView("member")}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
            >
              👤 Thêm nhân viên
            </button>
            <button
              onClick={() => setActiveView("settings")}
              className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600"
            >
              ⚙️ Cài đặt nhân viên
            </button>
            <button
              onClick={handleDeleteAll}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
            >
              🗑️ Xóa dữ liệu ngày hiện tại
            </button>
          </div>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-[90%] max-w-2xl shadow-2xl animate-fadeIn relative"
        onClick={(e) => e.stopPropagation()}
      >
        {activeView !== "menu" && (
          <button
            onClick={() => setActiveView("menu")}
            className="absolute top-4 left-4 text-gray-600 hover:text-gray-800"
          >
            ⬅️ Quay lại
          </button>
        )}

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
        >
          ✖
        </button>

        <h2 className="text-xl font-semibold text-indigo-600 text-center mb-4">
          {activeView === "menu"
            ? "⚙️ Quản lý hệ thống"
            : activeView === "overtime"
            ? "➕ Thêm tăng ca"
            : activeView === "limit"
            ? "⏳ Giới hạn tăng ca"
            : activeView === "member"
            ? "👤 Thêm nhân viên"
            : "⚙️ Cài đặt nhân viên"}
        </h2>

        {renderContent()}
      </div>
    </div>
  );
}
