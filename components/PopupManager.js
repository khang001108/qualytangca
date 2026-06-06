// components/PopupManager.js
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import ManageMembers from "./ManageMembers";
import ShiftAssign from "./ManageMembers/ShiftAssign";
import { Users, Trash2, X } from "lucide-react";

export default function PopupManager({
  onClose,
  user,
  selectedMonth,
  selectedYear,
  selectedDate,
  shiftSchedules = {},
  handleDeleteAll,   // dùng đúng prop từ index.js
  setToast,
}) {
  const [showAssign, setShowAssign] = useState(false);

  const [deletePopup, setDeletePopup] = useState({
    visible: false,
    state: "confirm",   // confirm | loading | success
    current: "",
  });

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "");
  }, []);

  // -------------------------------
  // 🔥 HÀM XÓA DỮ LIỆU — DÙNG PROP handleDeleteAll
  // -------------------------------
  const runDeleteProcess = async () => {
    setDeletePopup({
      visible: true,
      state: "loading",
      current: "Chuẩn bị...",
    });

    try {
      await handleDeleteAll((current) => {
        setDeletePopup({
          visible: true,
          state: "loading",
          current,
        });
      });

      setDeletePopup({
        visible: true,
        state: "success",
        current: "",
      });
    } catch (err) {
      console.error(err);
      setDeletePopup({
        visible: true,
        state: "confirm",
        current: "",
      });
      setToast({ type: "error", msg: "❌ Lỗi khi xóa dữ liệu!" });
    }
  };

  // -------------------------------
  // SHOW SHIFT ASSIGN POPUP
  // -------------------------------
  if (showAssign) {
    return (
      <ShiftAssign
        user={user}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onCancel={() => setShowAssign(false)}
        onStatusChange={({ loading, saving, success, month }) => {
          if (loading) {
            if (saving) {
              setToast({
                type: "loading",
                msg: `⏳ Đang lưu ngày ${saving.day} (${saving.index}/${saving.total})`,
              });
            } else {
              setToast({
                type: "loading",
                msg: "⏳ Đang chuẩn bị lưu phân ca...",
              });
            }
            return;
          }

          if (success) {
            setToast({
              type: "success",
              msg: `✅ Phân ca tháng ${month} hoàn tất.`,
            });
            return;
          }

          setToast({ type: "error", msg: "❌ Lỗi khi lưu phân ca!" });
        }}
      />
    );
  }

  // -------------------------------
  // MAIN POPUP
  // -------------------------------
  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={(e) => {
          // Chỉ đóng nếu popup Delete chưa mở
          if (!deletePopup.visible && e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-2xl w-[95vw] max-w-2xl max-h-[90vh] shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
        >
          {/* CLOSE BUTTON - luôn hiện ở góc phải */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          {/* HEADER */}
          <div className="flex-1 p-5 overflow-y-auto">
            <div className="flex items-center justify-center mb-4 text-purple-600 
                            dark:text-purple-400 font-semibold gap-2">
              <Users className="w-6 h-6" />
              <span className="text-xl">Quản lý nhân viên</span>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 text-center">
              Ngày hiện tại:{" "}
              <span className="font-medium text-indigo-600 dark:text-indigo-400">
                {new Date().toLocaleDateString("vi-VN")}
              </span>
            </div>

            <div className="border border-zinc-300 dark:border-zinc-700 
                            rounded-xl p-4 mb-4">
              <ManageMembers
                user={user}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                selectedDate={selectedDate}
                shiftSchedules={shiftSchedules}
                setToast={setToast}
              />
            </div>
          </div>

          {/* FOOTER */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 
                          text-center bg-white dark:bg-gray-900">
            <button
              onClick={() =>
                setDeletePopup({ visible: true, state: "confirm", current: "" })
              }
              className="w-full border border-red-300 dark:border-red-700 
                         text-red-600 dark:text-red-400 hover:bg-red-50 
                         dark:hover:bg-red-900/20 py-2 rounded-lg 
                         flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Xóa toàn bộ dữ liệu tháng {selectedMonth}/{selectedYear}
            </button>
          </div>
        </motion.div>
      </div>

      {/* ======================================== */}
      {/* DELETE POPUP */}
      {/* ======================================== */}
      {deletePopup.visible && (
        <div
          className="fixed inset-0 bg-black/50 z-[999] flex items-center justify-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget)
              setDeletePopup({ visible: false, state: "confirm", current: "" });
          }}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl w-[350px] 
                       text-center shadow-xl"
          >
            {/* CONFIRM */}
            {deletePopup.state === "confirm" && (
              <>
                <div className="text-xl font-semibold text-red-600 mb-3">
                  Xóa toàn bộ dữ liệu tháng?
                </div>
                <div className="text-gray-700 dark:text-gray-300 mb-5">
                  Thao tác này không thể khôi phục.
                </div>

                <div className="flex gap-3">
                  <button
                    className="flex-1 py-2 rounded-lg bg-gray-200 dark:bg-gray-700"
                    onClick={() =>
                      setDeletePopup({
                        visible: false,
                        state: "confirm",
                        current: "",
                      })
                    }
                  >
                    Hủy
                  </button>
                  <button
                    className="flex-1 py-2 rounded-lg bg-red-600 text-white"
                    onClick={runDeleteProcess}
                  >
                    Xóa
                  </button>
                </div>
              </>
            )}

            {/* LOADING */}
            {deletePopup.state === "loading" && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-10 h-10 border-4 border-gray-300 
                                border-t-orange-500 rounded-full animate-spin" />
                <div className="text-gray-700 dark:text-gray-300 text-lg font-medium">
                  Đang xóa dữ liệu tháng {selectedMonth}/{selectedYear}...
                </div>
                {deletePopup.current && (
                  <div className="text-sm text-gray-500">
                    Đang xóa: <b>{deletePopup.current}</b>
                  </div>
                )}
              </div>
            )}

            {/* SUCCESS */}
            {deletePopup.state === "success" && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="text-green-500 text-5xl">✓</div>
                <div className="text-green-600 text-lg font-semibold">
                  Đã xóa sạch dữ liệu!
                </div>
                <button
                  className="mt-2 py-2 px-5 bg-green-600 text-white rounded-lg"
                  onClick={() =>
                    setDeletePopup({
                      visible: false,
                      state: "confirm",
                      current: "",
                    })
                  }
                >
                  Đóng
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
