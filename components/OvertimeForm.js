// components/OvertimeForm.js
import { useState, useRef, useEffect } from "react";
import { CirclePlus } from "lucide-react";
import Toast from "./Toast";
import NewStaffModal from "./NewStaffModal";
import useOvertimeParser from "../hooks/useOvertimeParser";

export default function OvertimeForm({ user, members: parentMembers = [], setMembers: setParentMembers }) {
  const [formOpen, setFormOpen] = useState(false);
  const [dayText, setDayText] = useState("");
  const [nightText, setNightText] = useState("");
  const modalRef = useRef();
  

  // Dùng hook riêng cho toàn bộ xử lý chấm công
  const {
    toast,
    newStaffDetected,
    setNewStaffDetected,
    parseText,
    addNewStaffConfirmed,
  } = useOvertimeParser({ user, parentMembers, setParentMembers });

  return (
    <>
      {toast.message && <Toast message={toast.message} type={toast.type} />}

      <div className="flex justify-end mb-2">
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg"
        >
          <CirclePlus className="w-5 h-5" /> Thêm tăng ca
        </button>
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onMouseDown={(e) =>
            modalRef.current &&
            !modalRef.current.contains(e.target) &&
            setFormOpen(false)
          }
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            ref={modalRef}
            className="relative bg-white w-11/12 max-w-xl p-6 rounded-xl shadow-2xl z-10"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Thêm tăng ca</h3>
              <button onClick={() => setFormOpen(false)}>✕</button>
            </div>

            {/* === Ca ngày === */}
            <label className="text-sm text-gray-600">Dán chấm công Ca ngày</label>
            <textarea
              rows={4}
              className="w-full border p-2 rounded mt-1"
              value={dayText}
              onChange={(e) => setDayText(e.target.value)}
              placeholder="Dán dữ liệu chấm công ca ngày..."
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => parseText(dayText, "checkin")}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Lên ca
              </button>
              <button
                onClick={() => parseText(dayText, "checkout")}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Xuống ca
              </button>
            </div>

            {/* === Ca đêm === */}
            <label className="text-sm text-gray-600 mt-3">Dán chấm công Ca đêm</label>
            <textarea
              rows={4}
              className="w-full border p-2 rounded mt-1"
              value={nightText}
              onChange={(e) => setNightText(e.target.value)}
              placeholder="Dán dữ liệu chấm công ca đêm..."
            />
            <button
              onClick={() => parseText(nightText)}
              className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
            >
              Xử lý Ca đêm
            </button>
          </div>
        </div>
      )}

      {newStaffDetected.length > 0 && (
        <NewStaffModal
          newStaffDetected={newStaffDetected}
          setNewStaffDetected={setNewStaffDetected}
          onConfirm={addNewStaffConfirmed}
        />
      )}
    </>
  );
}
