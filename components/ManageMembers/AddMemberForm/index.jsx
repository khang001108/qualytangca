// components/ManageMembers/AddMemberForm.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  addDoc,
  collection,
  doc,
  setDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import {
  Loader2,
  UserPlus,
  Undo2,
  UserCircle2,
  CalendarDays,
  X,
} from "lucide-react";
import dayjs from "dayjs";
import DayPopup from "./DayPopup";
import BranchPopup from "./BranchPopup";

export default function AddMemberForm({
  user,
  setShowAdd,
  members,
  setMembers,
  showToast,
}) {
  const modalRef = useRef();
  const [adding, setAdding] = useState(false);
  const [tree, setTree] = useState({});
  const [loadingTree, setLoadingTree] = useState(true);
  const [showDayPopup, setShowDayPopup] = useState(false);
  const [showBranchPopup, setShowBranchPopup] = useState(false);
  const [selectedLimitKey, setSelectedLimitKey] = useState(null);
  const [selectedLimitOption, setSelectedLimitOption] = useState(null);

  // Form state
  const [form, setForm] = useState({
    realName: "",
    nickname: "",
    shift: "Ca ngày",
    shiftStart: "08:00",
    restDay: "Chủ nhật",
    applyLimit: false,
  });

  useEffect(() => {
    const fetchTree = async () => {
      setLoadingTree(true);
      try {
        const snap = await getDocs(collection(db, "members"));
        const treeData = {};
        snap.forEach((d) => {
          const m = d.data();
          const limit = Number(m.overtimeLimit?.monthlyLimit || 0);
          const key = String(limit);
          if (!treeData[key]) treeData[key] = [];
          treeData[key].push({ id: d.id, ...m });
        });
        setTree(treeData);
      } catch (err) {
        console.error("Lỗi khi tải tree:", err);
        showToast("Không lấy được danh sách nhánh tăng ca.", "error");
      } finally {
        setLoadingTree(false);
      }
    };

    fetchTree();
  }, []);

  // ----------------------------------------------------
  // THÊM NHÂN VIÊN
  // ----------------------------------------------------
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!form.realName.trim()) return showToast("Nhập tên chính.", "error");

    setAdding(true);

    try {
      let overtimeLimitPayload = {
        monthlyLimit: 0,
        workedHours: 0,
        remaining: 0,
      };

      let branchValue = null;

      // Có áp dụng nhánh giới hạn?
      if (form.applyLimit && selectedLimitKey) {
        const limitNum = Number(selectedLimitKey) || 0;

        if (
          selectedLimitOption &&
          selectedLimitOption.perDay &&
          selectedLimitOption.days
        ) {
          const totalLimit =
            selectedLimitOption.perDay * selectedLimitOption.days;

          overtimeLimitPayload = {
            monthlyLimit: totalLimit,
            workedHours: 0,
            remaining: totalLimit,
          };

          branchValue = `limit_${limitNum}_day_${selectedLimitOption.days}`;
        } else {
          overtimeLimitPayload = {
            monthlyLimit: limitNum,
            workedHours: 0,
            remaining: limitNum,
          };

          branchValue = `limit_${limitNum}`;
        }
      }

      const restDayToSave =
        form.restDay === "Không" ? "Chủ nhật" : form.restDay;

      const today = dayjs().format("YYYY-MM-DD");

      const payload = {
        realName: form.realName.trim(),
        nickname:
          form.nickname.trim() || form.realName.trim().charAt(0).toUpperCase(),
        shift: form.shift,
        shiftStart: form.shiftStart,
        restDay: restDayToSave,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedDate: today,
        branch: branchValue,
        overtimeLimit: overtimeLimitPayload,
      };

      const ref = await addDoc(collection(db, "members"), payload);

      setMembers((prev = []) => [{ id: ref.id, ...payload }, ...prev]);
      setShowAdd(false);
      showToast("Đã thêm nhân viên mới.", "info");
    } catch (err) {
      console.error("Lỗi khi thêm nhân viên:", err);
      showToast("Không thể thêm nhân viên mới.", "error");
    } finally {
      setAdding(false);
    }
  };

  // ----------------------------------------------------
  // ĐÓNG POPUP CHUẨN
  // ----------------------------------------------------
  const handleOverlayClick = (e) => {
    const target = e.target;

    if (modalRef.current && modalRef.current.contains(target)) return;

    const popupDay = document.querySelector(".day-popup");
    const popupBranch = document.querySelector(".branch-popup");

    if (
      (popupDay && popupDay.contains(target)) ||
      (popupBranch && popupBranch.contains(target))
    )
      return;

    setShowAdd(false);
  };

  // ----------------------------------------------------
  // RENDER
  // ----------------------------------------------------
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={handleOverlayClick}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        ref={modalRef}
        className="
          relative w-11/12 max-w-xl rounded-2xl 
          bg-white dark:bg-gray-900 
          text-gray-800 dark:text-gray-100 
          shadow-2xl border border-gray-300 dark:border-gray-700 
          overflow-hidden
          animate-scaleIn
        "
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <UserCircle2 className="w-5 h-5" />
            Thêm nhân viên mới
          </div>

          <button
            onClick={() => setShowAdd(false)}
            className="hover:text-gray-200 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <form className="space-y-4" onSubmit={handleAddMember}>
            {/* Name */}
            <div>
              <label className="block font-medium mb-1">Tên chính</label>
              <input
                value={form.realName}
                onChange={(e) =>
                  setForm({ ...form, realName: e.target.value })
                }
                className="w-full border rounded-xl p-2 bg-gray-50 dark:bg-gray-800"
                placeholder="VD: Nguyễn Văn A"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Tên phụ</label>
              <input
                value={form.nickname}
                onChange={(e) =>
                  setForm({ ...form, nickname: e.target.value })
                }
                className="w-full border rounded-xl p-2 bg-gray-50 dark:bg-gray-800"
                placeholder="VD: A"
              />
            </div>

            {/* Ca làm + giờ bắt đầu */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Ca làm</label>
                <select
                  value={form.shift}
                  onChange={(e) => {
                    const shift = e.target.value;
                    const start = shift === "Ca đêm" ? "20:00" : "08:00";
                    setForm({ ...form, shift, shiftStart: start });
                  }}
                  className="w-full border rounded-xl p-2 bg-gray-50 dark:bg-gray-800"
                >
                  <option value="Ca ngày">Ca ngày</option>
                  <option value="Ca đêm">Ca đêm</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">Giờ bắt đầu</label>
                <input
                  value={form.shiftStart}
                  onChange={(e) =>
                    setForm({ ...form, shiftStart: e.target.value })
                  }
                  className="w-full border rounded-xl p-2 bg-gray-50 dark:bg-gray-800"
                />
              </div>
            </div>

            {/* Ngày nghỉ */}
            <div>
              <label className="block font-medium mb-1">
                Ngày nghỉ luân phiên
              </label>
              <button
                type="button"
                onClick={() => setShowDayPopup(true)}
                className="
                  w-full border rounded-xl p-2 
                  bg-gray-50 dark:bg-gray-800 flex justify-between items-center
                "
              >
                <span>{form.restDay}</span>
                <CalendarDays className="w-4 h-4 opacity-70" />
              </button>
            </div>

            {/* Limit branch */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.applyLimit}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm({ ...form, applyLimit: checked });
                    if (checked) setShowBranchPopup(true);
                  }}
                  className="w-4 h-4 accent-green-600"
                />
                <span className="font-medium">
                  Áp dụng giới hạn tăng ca theo nhánh
                </span>
              </label>

              {form.applyLimit && (
                <div className="mt-2 text-sm text-gray-500">
                  {selectedLimitKey ? (
                    <span>
                      Nhánh:{" "}
                      <span className="font-semibold text-green-600">
                        {selectedLimitKey}h
                      </span>

                      {selectedLimitOption ? (
                        <span className="ml-1 text-gray-400">
                          → {selectedLimitOption.days} ngày ×{" "}
                          {selectedLimitOption.perDay}h/ngày
                        </span>
                      ) : (
                        <span className="italic ml-1 text-gray-400">
                          (chưa chọn phân bổ)
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="italic text-gray-400">
                      Chưa chọn nhánh
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowBranchPopup(true)}
                    className="ml-2 text-green-500 underline"
                  >
                    Chọn lại
                  </button>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={adding}
                className="
                  flex-1 px-4 py-2 rounded-xl 
                  bg-gradient-to-r from-green-500 to-green-600 
                  text-white flex items-center justify-center gap-2 
                  shadow transition-all
                "
              >
                {adding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Lưu nhân viên
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="
                  flex-1 px-4 py-2 rounded-xl 
                  bg-gray-300 dark:bg-gray-700 
                  hover:bg-gray-400 dark:hover:bg-gray-600 
                  shadow
                "
              >
                <Undo2 className="w-4 h-4 inline-block mr-1" />
                Quay lại
              </button>
            </div>
          </form>
        </div>
      </div>

      {showDayPopup && (
        <DayPopup
          form={form}
          setForm={setForm}
          setShowDayPopup={setShowDayPopup}
        />
      )}

      {showBranchPopup && (
        <BranchPopup
          tree={tree}
          loadingTree={loadingTree}
          showToast={showToast}
          setShowBranchPopup={setShowBranchPopup}
          selectedLimitKey={selectedLimitKey}
          setSelectedLimitKey={setSelectedLimitKey}
          selectedLimitOption={selectedLimitOption}
          setSelectedLimitOption={setSelectedLimitOption}
        />
      )}
    </div>
  );
}
