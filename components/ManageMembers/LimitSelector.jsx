// components/ManageMembers/LimitSelector.jsx
// Popup chọn giới hạn tăng ca cho nhân viên

import React, { useRef, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, Trash2, Undo2, Loader2, CheckCircle2 } from "lucide-react";
import { useOvertimeConfig } from "../../hooks/useOvertimeConfig";
export default function LimitSelector({
  title = "Giới hạn tăng ca",
  confirmText = "Lưu thay đổi",
  onConfirm,
  onCancel,
  members = [],
  color = "indigo",
  showToast,
  onUpdateOvertimeLimits,
}) {
  const modalRef = useRef();

  // === Hook phải luôn ở đầu ===
  const [showGuide, setShowGuide] = useState(false);
  const [localMembers, setLocalMembers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLimit, setBulkLimit] = useState("");
  const [deleteMode, setDeleteMode] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);
  const { defaultDailyCap, loading } = useOvertimeConfig();


  // === Hàm tính tổng giờ tháng ===
  const calcFullMonthLimit = () => {
    const now = new Date();
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return days * defaultDailyCap;
  };

  useEffect(() => {
    setLocalMembers(members.map((m) => ({ ...m })));
    setSelectedIds([]);
    setDeleteMode(false);
  }, [members]);
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === localMembers.length) setSelectedIds([]);
    else setSelectedIds(localMembers.map((m) => m.id));
  };

  const handleApplyBulkLimit = () => {
    const value = parseFloat(bulkLimit);
    if (isNaN(value) || value < 0) {
      showToast("Nhập số giờ hợp lệ.", "error");
      return;
    }

    setLocalMembers((prev) =>
      prev.map((m) =>
        selectedIds.includes(m.id)
          ? {
            ...m,
            overtimeLimit: {
              ...m.overtimeLimit,
              monthlyLimit: value,
            },
          }
          : m
      )
    );
  };

  const handleDeleteBtn = () => {
    const fullLimit = calcFullMonthLimit();

    if (!deleteMode) {
      setDeleteMode(true);
      return;
    }

    if (selectedIds.length > 0) {
      setLocalMembers((prev) =>
        prev.map((m) =>
          selectedIds.includes(m.id)
            ? {
              ...m,
              overtimeLimit: {
                ...m.overtimeLimit,
                monthlyLimit: fullLimit,
              },
            }
            : m
        )
      );
      setSelectedIds([]);
      setDeleteMode(false);
    } else {
      setDeleteMode(false);
    }
  };

  const handleConfirm = () => {
    const fullLimit = calcFullMonthLimit();

    // Không tick ai, không nhập gì, và không có thay đổi dữ liệu thực tế
    const noSelection = selectedIds.length === 0 && bulkLimit.trim() === "";
    const hasRealChange = members.some((m, i) => {
      const oldVal = m.overtimeLimit?.monthlyLimit ?? fullLimit;
      const newVal = localMembers[i]?.overtimeLimit?.monthlyLimit ?? fullLimit;
      return oldVal !== newVal;
    });

    // 🧩 Kiểm tra nhập giá trị mà chưa chọn ai
    if (bulkLimit.trim() !== "" && selectedIds.length === 0) {
      showToast("Vui lòng chọn nhân viên để áp dụng giới hạn.", "error");
      return;
    }

    // Nếu không có gì để lưu
    if (noSelection && !hasRealChange) {
      showToast("Không có thay đổi để lưu.", "error");
      return;
    }

    // Kiểm tra dữ liệu không hợp lệ
    const hasInvalid = localMembers.some(
      (m) =>
        selectedIds.includes(m.id) &&
        (isNaN(m.overtimeLimit?.monthlyLimit) ||
          m.overtimeLimit?.monthlyLimit < 0)
    );
    if (hasInvalid) {
      showToast("Nhập số giờ hợp lệ.", "error");
      return;
    }

    // Cập nhật lại danh sách cuối cùng để lưu
    const updated = localMembers.map((m) => {
      const isLimited = selectedIds.includes(m.id);
      return {
        ...m,
        overtimeLimit: {
          ...m.overtimeLimit,
          monthlyLimit: isLimited
            ? m.overtimeLimit?.monthlyLimit || fullLimit
            : m.overtimeLimit?.monthlyLimit ?? fullLimit,
        },
      };
    });

    onConfirm(updated);
    if (typeof onUpdateOvertimeLimits === "function") {
      onUpdateOvertimeLimits();
    }

    setSelectedIds([]);
    setDeleteMode(false);
    // showToast("Đã lưu thay đổi.", "success");
  };

  const renderStatus = (m) => {
    const fullLimit = calcFullMonthLimit();
    const val = m.overtimeLimit?.monthlyLimit;
    if (val == null) return { text: "Không giới hạn", color: "text-gray-400" };
    return val < fullLimit
      ? { text: "Giới hạn", color: "text-green-500 font-semibold" }
      : { text: "Không giới hạn", color: "text-gray-400" };
  };

  const fullLimitDisplay = calcFullMonthLimit();

  // Sắp xếp danh sách
  const sortedMembers = [...localMembers].sort((a, b) => {
    const full = calcFullMonthLimit();
    const aLimited = (a.overtimeLimit?.monthlyLimit ?? full) < full;
    const bLimited = (b.overtimeLimit?.monthlyLimit ?? full) < full;
    if (sortAsc) return aLimited === bLimited ? 0 : aLimited ? -1 : 1;
    else return aLimited === bLimited ? 0 : aLimited ? 1 : -1;
  });

  const colorClasses = {
    indigo: "bg-indigo-600 hover:bg-indigo-700",
    blue: "bg-blue-600 hover:bg-blue-700",
    green: "bg-green-600 hover:bg-green-700",
    red: "bg-red-600 hover:bg-red-700",
  };

  if (loading) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        onMouseDown={(e) =>
          modalRef.current && !modalRef.current.contains(e.target) && onCancel?.()
        }
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div
          ref={modalRef}
          className="relative bg-white dark:bg-gray-800 w-11/12 max-w-md p-6 rounded-xl shadow-2xl text-gray-800 dark:text-gray-200 z-10 text-center"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">
            Đang tải cấu hình tăng ca...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={(e) =>
        modalRef.current && !modalRef.current.contains(e.target) && onCancel?.()
      }
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        ref={modalRef}
        className="relative bg-white dark:bg-gray-800 w-11/12 max-w-3xl p-6 rounded-xl shadow-2xl text-gray-800 dark:text-gray-200 z-10"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onCancel}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Toggle hướng dẫn sử dụng */}
        <div className="flex justify-between items-center mb-2">
          {/* <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
            <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Hướng dẫn
          </h3> */}
          <button
            onClick={() => setShowGuide((p) => !p)}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline transition-colors"
          >
            {showGuide ? "Ẩn hướng  ▲" : "Hướng dẫn ▼"}
          </button>
        </div>

        {/* Phần hướng dẫn xổ/thu mượt bằng AnimatePresence */}
        <AnimatePresence initial={false}>
          {showGuide && (
            <motion.div
              key="guide"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="flex items-start gap-2 bg-indigo-50 dark:bg-gray-700/40 p-3 rounded-md mb-3 text-sm text-gray-600 dark:text-gray-300">
                {/* <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" /> */}
                <div className="space-y-1">
                  <p>
                    ✅ <b>Chọn</b> nhân viên để áp dụng giới hạn.
                    Dùng ô nhập trên để đặt <b>giới hạn chung</b>.
                  </p>
                  <p>
                    🔍 <b>Trạng thái:</b> nhấn tiêu đề để <b>sắp xếp</b> theo loại giới hạn.
                  </p>
                  <p>
                    🗑️ <b>Xóa giới hạn:</b> nhấn nút đỏ, tick nhân viên cần xóa,
                    rồi <b>nhấn lại</b> nút đỏ để xác nhận.
                  </p>
                  <p>
                    💾 Cuối cùng, nhấn <b>Lưu thay đổi</b> để ghi dữ liệu lên hệ thống.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>



        {/* Ô nhập giới hạn chung */}
        <div className="mb-3 flex items-center gap-2">
          <input
            type="number"
            value={bulkLimit}
            onChange={(e) => setBulkLimit(e.target.value)}
            placeholder="Nhập giới hạn chung (giờ)"
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md 
               px-3 py-2 bg-white dark:bg-gray-700 
               text-gray-800 dark:text-gray-200 
               placeholder-gray-400 dark:placeholder-gray-500"
          />
          <button
            onClick={handleApplyBulkLimit}
            className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium 
               hover:bg-indigo-700 active:scale-[0.98] transition-transform"
          >
            Áp dụng
          </button>
        </div>

        {/* Danh sách nhân viên */}
        <div className="max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md mb-4">
          <table className="w-full text-sm table-fixed">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700">
              <tr className="text-center">
                <th className="p-2 w-[5%] align-middle">
                  <input
                    type="checkbox"
                    onChange={toggleAll}
                    checked={
                      sortedMembers.length > 0 &&
                      selectedIds.length === sortedMembers.length
                    }
                    className={deleteMode ? "accent-red-500" : "accent-indigo-500"}
                  />
                </th>

                {/* Cột tên chính */}
                <th className="p-2 w-[25%] align-middle">
                  <div>
                    <div className="font-semibold">Tên nhân viên</div>
                    <div className="text-xs text-gray-500">(Họ và tên)</div>
                  </div>
                </th>

                {/* Cột tên phụ */}
                <th className="p-2 w-[25%] align-middle">
                  <div>
                    <div className="font-semibold">Tên phụ</div>
                    <div className="text-xs text-gray-500">(nickname / mã NV)</div>
                  </div>
                </th>

                {/* Cột giới hạn */}
                <th className="p-2 w-[15%] align-middle">
                  <div>
                    <div className="font-semibold">Giới hạn</div>
                    <div className="text-xs text-gray-500">(giờ)</div>
                  </div>
                </th>

                {/* Cột trạng thái */}
                <th className="p-2 w-[15%] align-middle cursor-pointer select-none">
                  <div
                    className="flex flex-col items-center justify-center"
                    onClick={() => setSortAsc((p) => !p)}
                  >
                    <div className="font-semibold flex items-center gap-1">
                      Trạng thái
                      <ChevronUp
                        className={`w-4 h-4 transition-transform ${sortAsc ? "" : "rotate-180"
                          }`}
                      />
                    </div>
                    <div className="text-xs text-gray-500">(Giới hạn / Không)</div>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedMembers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-3 text-gray-400">
                    Không có nhân viên
                  </td>
                </tr>
              ) : (
                sortedMembers.map((m) => {
                  const isSelected = selectedIds.includes(m.id);
                  const limitVal = m.overtimeLimit?.monthlyLimit ?? fullLimitDisplay;
                  const status = renderStatus(m);
                  return (
                    <tr
                      key={m.id}
                      className="border-t border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-gray-700 text-center"
                    >
                      {/* checkbox */}
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(m.id)}
                          className={deleteMode ? "accent-red-500" : "accent-indigo-500"}
                        />
                      </td>

                      {/* tên chính */}
                      <td className="p-2">{m.realName}</td>

                      {/* tên phụ */}
                      <td className="p-2">{m.nickname}</td>

                      {/* giới hạn */}
                      <td className="p-2 text-gray-500">{limitVal}h</td>

                      {/* trạng thái */}
                      <td className={`p-2 ${status.color}`}>{status.text}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>


        {/* Footer */}
        <div className="flex justify-between items-center">
          <button
            onClick={handleDeleteBtn}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${deleteMode
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-red-500 hover:bg-red-600 text-white"
              }`}
          >
            <Trash2 className="w-4 h-4" />
            {deleteMode ? `Xóa (${selectedIds.length})` : "Xóa giới hạn"}
          </button>

          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex items-center gap-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-3 py-1.5 rounded text-sm"
            >
              <Undo2 className="w-4 h-4" />
              Quay lại
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`flex items-center gap-1 ${colorClasses[color] || colorClasses.indigo
                } text-white px-3 py-1.5 rounded text-sm`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {confirmText}
            </button>
          </div>
        </div>
      </div>

    </div>

  );
}
