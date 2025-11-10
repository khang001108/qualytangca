// components/ManageMembers/AddMemberForm.jsx
// Form thêm nhân viên mới với popup chọn ngày nghỉ và popup chọn nhánh giới hạn tăng ca
// - Popup chọn ngày: Thứ 2..Thứ 7, "Không" => mặc định Chủ nhật
// - Popup chọn nhánh: lấy tree từ collection "members", nhóm theo overtimeLimit.monthlyLimit
//   cho phép chọn 1 nhánh và 1 phương án (days × perDay). Khi lưu gắn branch và overtimeLimit tương ứng.

import React, { useState, useRef, useEffect } from "react";
import {
  addDoc,
  collection,
  doc,
  setDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  Loader2,
  UserPlus,
  Undo2,
  UserCircle2,
  CalendarDays,
  ChevronRight,
  ChevronDown,
  Users,
} from "lucide-react";
import dayjs from "dayjs";

export default function AddMemberForm({
  user,
  setShowAdd,
  members,
  setMembers,
  showToast,
}) {
  const modalRef = useRef();
  const [adding, setAdding] = useState(false);

  // form state
  const [form, setForm] = useState({
    realName: "",
    nickname: "",
    shift: "Ca ngày",
    shiftStart: "08:00",
    restDay: "Chủ nhật",
    applyLimit: false,
  });

  // tree data (nhóm theo monthlyLimit)
  const [tree, setTree] = useState({});
  const [loadingTree, setLoadingTree] = useState(true);

  // popup controls
  const [showDayPopup, setShowDayPopup] = useState(false);
  const [showBranchPopup, setShowBranchPopup] = useState(false);

  // selection when choosing a branch for the new member
  // selectedLimitKey: string key in tree (e.g., "40")
  // selectedLimitOption: { perDay, days } or null
  const [selectedLimitKey, setSelectedLimitKey] = useState(null);
  const [selectedLimitOption, setSelectedLimitOption] = useState(null);
  const [openGroups, setOpenGroups] = useState({});

  // weekdays choices
  const weekdays = [
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
    "Chủ nhật",
  ];

  // fetch tree from members collection and group by monthlyLimit
  useEffect(() => {
    const fetchTree = async () => {
      setLoadingTree(true);
      try {
        const snap = await getDocs(collection(db, "members"));
        const treeData = {};
        snap.forEach((d) => {
          const m = d.data();
          const limit = Number(m.overtimeLimit?.monthlyLimit || 0);
          const key = String(limit); // "0" allowed
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

  // helper: compute month info and split options for a given monthlyLimit
  const monthInfo = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { year, month, daysInMonth };
  })();

  const getMonthSplitOptions = (monthlyLimit) => {
    const daysInMonth = monthInfo.daysInMonth;
    const opts = [];
    for (let h = 6; h >= 1; h--) {
      const d = monthlyLimit / h;
      if (Number.isInteger(d) && d <= daysInMonth) {
        opts.push({ perDay: h, days: d });
      }
    }
    if (!opts.length) {
      for (let h = 6; h >= 1; h--) {
        const d = Math.ceil(monthlyLimit / h);
        if (d <= daysInMonth) opts.push({ perDay: h, days: d });
      }
    }
    return opts.sort((a, b) => b.days - a.days);
  };

  // toggle open group in popup tree
  const toggleGroup = (key) => setOpenGroups((p) => ({ ...p, [key]: !p[key] }));

  // submit add member
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!form.realName.trim()) return showToast("Nhập tên chính.", "error");
    setAdding(true);

    try {
      // determine overtimeLimit and branch to assign
      let overtimeLimitPayload = { monthlyLimit: 0, workedHours: 0, remaining: 0 };
      let branchValue = null;

      if (form.applyLimit && selectedLimitKey) {
        // if user selected a specific option (days × perDay), use that; otherwise fallback to monthlyLimit = selectedLimitKey
        const limitNum = Number(selectedLimitKey) || 0;
        if (selectedLimitOption && selectedLimitOption.perDay && selectedLimitOption.days) {
          const totalLimit = Number(selectedLimitOption.perDay) * Number(selectedLimitOption.days);
          overtimeLimitPayload = {
            monthlyLimit: totalLimit,
            workedHours: 0,
            remaining: totalLimit,
          };
          branchValue = `limit_${limitNum}_day_${selectedLimitOption.days}`;
        } else {
          // no option chosen, use group monthlyLimit
          overtimeLimitPayload = {
            monthlyLimit: limitNum,
            workedHours: 0,
            remaining: limitNum,
          };
          branchValue = `limit_${limitNum}`;
        }
      }

      // restDay "Không" => default "Chủ nhật"
      let restDayToSave = form.restDay === "Không" ? "Chủ nhật" : form.restDay;

      const today = dayjs().format("YYYY-MM-DD");
      const payload = {
        realName: form.realName.trim(),
        nickname: form.nickname.trim() || form.realName.trim().charAt(0).toUpperCase(),
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
      const newMember = { id: ref.id, ...payload };
      setMembers((prev) => [newMember, ...(prev || [])]);

      // write initial shiftSchedule for today
      const safeName = form.realName.replace(/[\/\\.#$[\]]/g, "_");
      const docId = `${user.uid}_${safeName}_${today}`;
      await setDoc(doc(db, "shiftSchedules", docId), {
        userId: user.uid,
        realName: form.realName.trim(),
        memberId: ref.id,
        shift: form.shift,
        shiftStart: form.shiftStart,
        date: today,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // If assigned into a branch that already exists in overtimeLimits (limit_{n}_day_{d}), optionally you might want to update that doc - not required here.
      setShowAdd(false);
      showToast("✅ Đã thêm nhân viên và gán nhánh/nghỉ.", "info");
    } catch (err) {
      console.error("Lỗi khi thêm nhân viên:", err);
      showToast("Không thể thêm nhân viên mới.", "error");
    } finally {
      setAdding(false);
    }
  };

  // UI helpers: sorted limit keys (descending)
  const sortedLimitKeys = Object.keys(tree)
    .map(Number)
    .sort((a, b) => b - a)
    .map(String);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={(e) =>
        modalRef.current && !modalRef.current.contains(e.target) && setShowAdd(false)
      }
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        ref={modalRef}
        className="relative w-11/12 max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <UserCircle2 className="w-6 h-6" />
            Thêm nhân viên mới
          </div>
          <button
            onClick={() => setShowAdd(false)}
            className="bg-white/20 px-3 py-1 rounded-lg text-sm hover:bg-white/30 transition"
          >
            Đóng
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Tên chính</label>
              <input
                value={form.realName}
                onChange={(e) => setForm({ ...form, realName: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500"
                placeholder="VD: Nguyễn Văn A"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Tên phụ</label>
              <input
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500"
                placeholder="VD: A"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Ca làm việc</label>
                <select
                  value={form.shift}
                  onChange={(e) => {
                    const val = e.target.value;
                    const start = val === "Ca đêm" ? "20:00" : "08:00";
                    setForm({ ...form, shift: val, shiftStart: start });
                  }}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-800"
                >
                  <option value="Ca ngày">Ca ngày</option>
                  <option value="Ca đêm">Ca đêm</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">Giờ bắt đầu</label>
                <input
                  type="text"
                  value={form.shiftStart}
                  onChange={(e) => setForm({ ...form, shiftStart: e.target.value })}
                  placeholder="08:00 hoặc 20:00"
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-800"
                />
              </div>
            </div>

            {/* restDay with popup */}
            <div>
              <label className="block font-medium mb-1">Ngày nghỉ luân phiên</label>
              <button
                type="button"
                onClick={() => setShowDayPopup(true)}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-800 flex justify-between items-center"
              >
                <span>{form.restDay}</span>
                <CalendarDays className="w-4 h-4 opacity-70" />
              </button>
            </div>

            {/* applyLimit and open branch popup */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.applyLimit}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm({ ...form, applyLimit: checked });
                    if (checked) {
                      // open the branch popup immediately to choose group
                      setShowBranchPopup(true);
                    } else {
                      // clear selections when turned off
                      setSelectedLimitKey(null);
                      setSelectedLimitOption(null);
                    }
                  }}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span className="font-medium">Áp dụng giới hạn tăng ca của nhánh hiện có</span>
              </label>

              <div className="mt-2">
                {form.applyLimit ? (
                  <div className="flex gap-2 items-center">
                    <button
                      type="button"
                      onClick={() => setShowBranchPopup(true)}
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                    >
                      Chọn nhánh tăng ca
                    </button>
                    <div className="text-sm text-gray-500">
                      {selectedLimitKey ? (
                        <span>
                          Đã chọn: <span className="font-medium text-indigo-600">{selectedLimitKey}h</span>
                          {selectedLimitOption ? (
                            <span className="ml-2 text-gray-400">→ {selectedLimitOption.days} ngày × {selectedLimitOption.perDay}h</span>
                          ) : (
                            <span className="ml-2 text-gray-400">→ (chưa chọn phân bổ)</span>
                          )}
                        </span>
                      ) : (
                        <span className="italic text-gray-400">Chưa chọn nhánh</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 italic">Không gán nhánh tăng ca</div>
                )}
              </div>
            </div>

            {/* buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={adding}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-2 rounded-lg font-semibold flex justify-center items-center gap-2 hover:opacity-90 transition"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {adding ? "Đang lưu..." : "Lưu nhân viên"}
              </button>

              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex-1 bg-gray-300 dark:bg-gray-700 py-2 rounded-lg font-semibold hover:opacity-80 transition"
              >
                <Undo2 className="w-4 h-4 inline-block mr-1" />
                Quay lại
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Popup chọn ngày nghỉ */}
      {showDayPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onMouseDown={() => setShowDayPopup(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 w-72" onMouseDown={(e) => e.stopPropagation()}>
            <h4 className="font-semibold mb-3 text-indigo-600">Chọn ngày nghỉ</h4>
            <div className="space-y-2">
              {weekdays.map((day) => (
                <button
                  key={day}
                  onClick={() => {
                    const rest = day === "Không" ? "Chủ nhật" : day;
                    setForm({ ...form, restDay: rest });
                    setShowDayPopup(false);
                  }}
                  className={`w-full py-2 rounded-lg border ${form.restDay === (day === "Không" ? "Chủ nhật" : day) ? "bg-indigo-600 text-white border-indigo-700" : "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100"}`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Popup chọn nhánh (tree) */}
      {showBranchPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onMouseDown={() => setShowBranchPopup(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 w-[520px] max-w-[95%] max-h-[80vh] overflow-auto" onMouseDown={(e) => e.stopPropagation()}>
            {/* header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-lg font-semibold text-indigo-600">Chọn nhánh tăng ca</div>
                <div className="text-xs text-gray-500">Nhóm theo giới hạn giờ/tháng. Chọn một nhánh rồi chọn phân bố ngày × giờ nếu cần.</div>
              </div>
              <div className="text-xs text-gray-400">Tháng {monthInfo.month + 1}/{monthInfo.year}</div>
            </div>

            {/* tree */}
            <div className="space-y-2">
              {loadingTree ? (
                <div className="text-sm italic text-gray-500">Đang tải...</div>
              ) : sortedLimitKeys.length === 0 ? (
                <div className="text-sm text-gray-500">Không có nhánh.</div>
              ) : (
                sortedLimitKeys.map((limitKey) => {
                  const membersInGroup = tree[limitKey] || [];
                  const limitNum = Number(limitKey);
                  const options = getMonthSplitOptions(limitNum);
                  const isOpen = openGroups[limitKey] ?? false;
                  const isThisSelectedGroup = selectedLimitKey === limitKey;

                  return (
                    <div key={limitKey} className="border border-gray-700/20 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleGroup(limitKey)}
                        className="w-full flex justify-between items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                      >
                        <div className="flex items-center gap-2">
                          {isOpen ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronRight className="w-4 h-4 text-amber-400" />}
                          <div>
                            <div className="font-medium text-amber-300">Giới hạn {limitNum}h</div>
                            <div className="text-xs text-gray-400">{membersInGroup.length} người</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // select group but don't pick option
                              setSelectedLimitKey(limitKey);
                              setSelectedLimitOption(null);
                            }}
                            className={`px-2 py-1 rounded text-xs border ${isThisSelectedGroup && !selectedLimitOption ? "bg-indigo-600 text-white border-indigo-700" : "bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100"}`}
                          >
                            Chọn nhánh
                          </button>
                          <div className="text-xs text-gray-400 flex items-center gap-2"><Users className="w-4 h-4" />{membersInGroup.length}</div>
                        </div>
                      </button>

                      {/* options */}
                      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <div className="flex flex-wrap gap-2">
                          {options.map((opt, i) => {
                            const isActive = selectedLimitKey === limitKey &&
                              selectedLimitOption?.perDay === opt.perDay &&
                              selectedLimitOption?.days === opt.days;
                            return (
                              <button
                                key={i}
                                onClick={() => {
                                  setSelectedLimitKey(limitKey);
                                  setSelectedLimitOption(opt);
                                }}
                                className={`px-2 py-1 rounded-lg text-xs border ${isActive ? "bg-amber-500 text-white border-amber-600" : "bg-gray-900 dark:bg-gray-700 text-gray-300 border-gray-700 hover:bg-gray-700"}`}
                              >
                                {opt.days} ngày × {opt.perDay}h
                              </button>
                            );
                          })}
                        </div>

                        {/* expanded members list */}
                        {isOpen && (
                          <ul className="mt-3 text-sm space-y-1">
                            {membersInGroup.map((m) => {
                              const name = m.nickname || m.realName || "Không tên";
                              const worked = m.overtimeLimit?.workedHours || 0;
                              const remaining = Math.max(limitNum - worked, 0);
                              const chosen = selectedLimitOption || { perDay: 0 };
                              const remainDays = chosen.perDay ? Math.ceil(remaining / chosen.perDay) : "-";
                              return (
                                <li key={m.id} className="flex justify-between border-b border-gray-700/40 pb-1 py-1">
                                  <div>
                                    <div className="text-green-400">{name}</div>
                                    <div className="text-xs text-gray-400">Đã làm: {worked}h · Còn: {remaining}h</div>
                                  </div>
                                  <div className="text-right text-xs text-gray-400">{remainDays} ngày</div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* footer */}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  // clear selection and close
                  setSelectedLimitKey(null);
                  setSelectedLimitOption(null);
                  setShowBranchPopup(false);
                }}
                className="px-3 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800"
              >
                Hủy
              </button>

              <button
                onClick={() => {
                  // if selectedLimitKey exists but no option chosen that's fine
                  if (!selectedLimitKey) {
                    showToast("Chưa chọn nhánh.", "error");
                    return;
                  }
                  setShowBranchPopup(false);
                }}
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
              >
                Áp dụng cho nhân viên
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
