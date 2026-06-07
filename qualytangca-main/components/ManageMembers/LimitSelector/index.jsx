// components/ManageMembers/LimitSelector/LimitSelector.jsx
import React, { useRef, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronUp,
  Trash2,
  Undo2,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import { useOvertimeConfig } from "../../../hooks/useOvertimeConfig";

import LimitSelectorGuide from "./LimitSelectorGuide";
import LimitSelectorTable from "./LimitSelectorTable";

// ============================================================================
//                       LimitSelector Component
// ============================================================================
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

  const [showGuide, setShowGuide] = useState(false);
  const [localMembers, setLocalMembers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLimit, setBulkLimit] = useState("");
  const [deleteMode, setDeleteMode] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);

  const { defaultDailyCap, loading } = useOvertimeConfig();

  // ========================================================================
  //   Tính giới hạn tháng
  // ========================================================================
  const calcFullMonthLimit = () => {
    const now = new Date();
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return days * defaultDailyCap;
  };

  const fullLimitDisplay = calcFullMonthLimit();

  useEffect(() => {
    setLocalMembers(members.map((m) => ({ ...m })));
    setSelectedIds([]);
    setDeleteMode(false);
  }, [members]);

  // ========================================================================
  //   Chọn 1 / chọn tất cả
  // ========================================================================
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === localMembers.length) setSelectedIds([]);
    else setSelectedIds(localMembers.map((m) => m.id));
  };

  // ========================================================================
  //   Đặt giới hạn chung
  // ========================================================================
  const handleApplyBulkLimit = () => {
    const value = parseFloat(bulkLimit);
    const fullLimit = calcFullMonthLimit(); // số giờ tối đa trong tháng

    // 1) Kiểm tra nhập đúng
    if (isNaN(value) || value < 0) {
      showToast("Nhập số giờ hợp lệ.", "error");
      return;
    }

    // 2) Chưa chọn nhân viên
    if (selectedIds.length === 0) {
      showToast("Hãy chọn nhân viên trước.", "error");
      return;
    }

    // 3) Kiểm tra vượt full limit
    if (value > fullLimit) {
      showToast(`Giới hạn vượt mức tối đa ${fullLimit}h/tháng.`, "error");
      return;
    }

    // 4) Áp dụng hợp lệ
    setLocalMembers((prev) =>
      prev.map((m) =>
        selectedIds.includes(m.id)
          ? { ...m, overtimeLimit: { ...m.overtimeLimit, monthlyLimit: value } }
          : m
      )
    );
  };

  // ========================================================================
  //   Xóa giới hạn (đặt lại fullLimit)
  // ========================================================================
  const handleDeleteBtn = () => {
    const fullLimit = calcFullMonthLimit();

    if (!deleteMode) {
      setDeleteMode(true);
      return;
    }

    if (selectedIds.length === 0) {
      setDeleteMode(false);
      return;
    }

    setLocalMembers((prev) =>
      prev.map((m) =>
        selectedIds.includes(m.id)
          ? {
              ...m,
              overtimeLimit: { ...m.overtimeLimit, monthlyLimit: fullLimit },
            }
          : m
      )
    );

    setSelectedIds([]);
    setDeleteMode(false);
  };

  // ========================================================================
  //   Lưu dữ liệu
  // ========================================================================
  const handleConfirm = () => {
    const fullLimit = calcFullMonthLimit(); // = số ngày × defaultDailyCap
    const MAX_LIMIT = fullLimit;

    // 1) Chặn nếu bất kỳ nhân viên nào vượt mức giới hạn tối đa
    for (const m of localMembers) {
      const limit = m?.overtimeLimit?.monthlyLimit ?? MAX_LIMIT;

      if (limit > MAX_LIMIT) {
        showToast(
          `Giới hạn của ${
            m.realName || m.nickname || m.ten || "nhân viên"
          } vượt mức tối đa ${MAX_LIMIT}h/tháng.`,
          "error"
        );
        return;
      }
    }

    // 2) Không có chọn và không có thay đổi → báo lỗi
    const noSelection = selectedIds.length === 0 && bulkLimit.trim() === "";
    const hasRealChange = members.some((m, i) => {
      const oldVal = m.overtimeLimit?.monthlyLimit ?? MAX_LIMIT;
      const newVal = localMembers[i]?.overtimeLimit?.monthlyLimit ?? MAX_LIMIT;
      return oldVal !== newVal;
    });

    if (noSelection && !hasRealChange) {
      showToast("Không có thay đổi để lưu.", "error");
      return;
    }

    // 3) Lưu hợp lệ
    const updated = localMembers;
    onConfirm(updated);

    if (typeof onUpdateOvertimeLimits === "function") {
      onUpdateOvertimeLimits();
    }
  };

  // ========================================================================
  //   Overlay click
  // ========================================================================
  const handleOverlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onCancel?.();
    }
  };

  // ========================================================================
  //   CLASSES
  // ========================================================================
  const colorClasses = {
    indigo: "bg-indigo-600 hover:bg-indigo-700",
    blue: "bg-blue-600 hover:bg-blue-700",
    green: "bg-green-600 hover:bg-green-700",
    red: "bg-red-600 hover:bg-red-700",
  };

  // ========================================================================
  //   Loading
  // ========================================================================
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-2xl">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
        </div>
      </div>
    );
  }

  // ========================================================================
  //   MAIN RENDER
  // ============================================================================
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={handleOverlayClick}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onMouseDown={(e) => e.stopPropagation()}
        className="
          relative w-11/12 max-w-4xl rounded-2xl 
          bg-white dark:bg-gray-900 
          text-gray-800 dark:text-gray-100 
          shadow-2xl border border-gray-300 dark:border-gray-700 
          overflow-hidden
        "
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold">{title}</h3>

          <button onClick={onCancel} className="hover:text-gray-200 transition">
            <X size={22} />
          </button>
        </div>

        {/* HƯỚNG DẪN */}
        <LimitSelectorGuide showGuide={showGuide} setShowGuide={setShowGuide} />

        {/* Ô nhập giới hạn chung */}
        <div className="px-6 mt-2 flex items-center gap-2">
          <input
            type="number"
            value={bulkLimit}
            onChange={(e) => setBulkLimit(e.target.value)}
            placeholder="Nhập giới hạn chung (giờ)"
            className="
              flex-1 border rounded-lg px-3 py-2 
              bg-gray-50 dark:bg-gray-800 
              border-gray-300 dark:border-gray-600
            "
          />

          <button
            onClick={handleApplyBulkLimit}
            className="
              px-4 py-2 rounded-lg 
              bg-indigo-600 hover:bg-indigo-700 
              text-white font-medium text-sm
            "
          >
            Áp dụng
          </button>
        </div>

        {/* TABLE */}
        <LimitSelectorTable
          localMembers={localMembers}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          toggleAll={toggleAll}
          deleteMode={deleteMode}
          sortAsc={sortAsc}
          setSortAsc={setSortAsc}
        />

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          {/* Xóa giới hạn */}
          <button
            onClick={handleDeleteBtn}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg
              ${deleteMode ? "bg-red-600" : "bg-red-500"} 
              hover:bg-red-700 text-white text-sm shadow
            `}
          >
            <Trash2 className="w-4 h-4" />
            {deleteMode ? `Xóa (${selectedIds.length})` : "Xóa giới hạn"}
          </button>

          {/* Nút Lưu */}
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="
                px-4 py-2 rounded-lg text-sm 
                bg-gray-300 dark:bg-gray-700 
                hover:bg-gray-400 dark:hover:bg-gray-600
              "
            >
              <Undo2 className="w-4 h-4 inline-block mr-1" />
              Quay lại
            </button>

            <button
              onClick={handleConfirm}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white shadow
                ${colorClasses[color] || colorClasses.indigo}
              `}
            >
              <CheckCircle2 className="w-4 h-4" />
              {confirmText}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
