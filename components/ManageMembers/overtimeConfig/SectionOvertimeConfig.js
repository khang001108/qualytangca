import React, { useEffect, useState } from "react";
import { db } from "../../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

/* ----------------------
   SectionOvertimeConfig (giữ nguyên, dùng để hiển thị từng nhân viên)
   ---------------------- */
function SectionOvertimeConfig({ config }) {
  const daysRequired =
    config?.bonusEnabled && config?.bonusEvery > 0
      ? Math.floor(config.monthlyLimit / config.bonusEvery)
      : 0;

  const progress =
    config && config.monthlyLimit > 0
      ? Math.min((config.workedHours / config.monthlyLimit) * 100, 100)
      : 0;

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/50 space-y-4">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100">⏱️ Giờ tăng ca</h3>

      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>Giới hạn tháng:</span>
          <span className="font-semibold text-indigo-600">{config?.monthlyLimit ?? 0} tiếng</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Đã làm:</span>
          <span className="font-semibold text-green-500">{config?.workedHours ?? 0} tiếng</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Còn lại:</span>
          <span className="font-semibold text-amber-500">{config?.remaining ?? 0} tiếng</span>
        </div>

        <div className="mt-2 bg-gray-300 dark:bg-gray-700 rounded-full h-2">
          <div
            className="h-2 bg-indigo-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Hoàn thành {progress.toFixed(1)}% giới hạn tháng này.
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 border rounded-lg p-2 flex justify-between text-sm">
        <span>Ngày cần tăng ca:</span>
        <span className="font-semibold text-amber-500">{daysRequired} ngày</span>
      </div>
    </div>
  );
}

/* ----------------------
   Hàm tính toán
   ---------------------- */
function calcEqualPerDay(limit, monthDays) {
  const v = monthDays > 0 ? limit / monthDays : 0;
  return Number(v.toFixed(2)); // tiếng/ngày
}

function calcProgressivePerWeek(limit, weeks = 4) {
  const totalWeight = (weeks * (weeks + 1)) / 2; // 1+2+...+weeks
  const base = weeks > 0 ? limit / totalWeight : 0;
  return Array.from({ length: weeks }, (_, i) => Number((base * (i + 1)).toFixed(2)));
}

/* ----------------------
   Popup: cấu hình nhánh / sử dụng giới hạn
   - prefilledLimit: số giờ từ nhánh (ví dụ 40)
   - membersInBranch: danh sách member objects trong nhánh
   ---------------------- */
function BranchPopup({ prefilledLimit, membersInBranch, onClose, onAddBranch }) {
  const [formula, setFormula] = useState("equal");
  const [applyAll, setApplyAll] = useState(true);
  const [selectedIds, setSelectedIds] = useState(() =>
    membersInBranch.map((m) => m.id)
  );
  const [monthDays, setMonthDays] = useState(30);

  useEffect(() => {
    setSelectedIds(membersInBranch.map((m) => m.id));
  }, [membersInBranch]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setApplyAll(false);
  };

  const handleConfirm = () => {
    const branch = {
      id: Date.now().toString(),
      name: `Giới hạn ${prefilledLimit} tiếng`,
      limit: prefilledLimit,
      formula,
      monthDays,
      memberIds: applyAll ? membersInBranch.map((m) => m.id) : selectedIds,
    };
    onAddBranch(branch);
  };

  // preview
  const preview =
    formula === "equal"
      ? `${calcEqualPerDay(prefilledLimit, monthDays)} tiếng/ngày`
      : `${calcProgressivePerWeek(prefilledLimit).join(" | ")} tiếng/tuần`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-96 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg space-y-3">
        <h3 className="text-lg font-semibold">Sử dụng giới hạn {prefilledLimit} tiếng</h3>

        <div>
          <label className="text-sm">Công thức</label>
          <select
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            className="w-full mt-1 p-1 border rounded bg-gray-50 dark:bg-gray-900"
          >
            <option value="equal">Chia đều theo ngày</option>
            <option value="progressive">Tăng dần theo tuần</option>
          </select>
        </div>

        <div>
          <label className="text-sm">Số ngày của tháng</label>
          <input
            type="number"
            min={1}
            value={monthDays}
            onChange={(e) => setMonthDays(Number(e.target.value) || 30)}
            className="w-full mt-1 p-1 border rounded bg-gray-50 dark:bg-gray-900"
          />
        </div>

        <div>
          <p className="text-sm text-gray-600">Preview: <span className="font-medium">{preview}</span></p>
        </div>

        <div className="border-t pt-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={applyAll} onChange={(e) => { setApplyAll(e.target.checked); if (e.target.checked) setSelectedIds(membersInBranch.map(m => m.id)); }} />
            Áp dụng cho tất cả nhân viên trong nhánh ({membersInBranch.length})
          </label>

          {!applyAll && (
            <div className="mt-2 max-h-40 overflow-auto border rounded p-2 bg-gray-50 dark:bg-gray-900">
              {membersInBranch.map((m) => (
                <label key={m.id} className="flex justify-between items-center py-1">
                  <div>
                    <div className="font-medium">{m.nickname || m.realName || "Không tên"}</div>
                    <div className="text-xs text-gray-500">Đã làm: {m.overtimeLimit?.workedHours ?? 0}h</div>
                  </div>
                  <input type="checkbox" checked={selectedIds.includes(m.id)} onChange={() => toggleSelect(m.id)} />
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 border py-1 rounded">Hủy</button>
          <button onClick={handleConfirm} className="flex-1 bg-indigo-600 text-white py-1 rounded">Thêm nhánh</button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------
   Component chính
   ---------------------- */
export default function OvertimeBranchManager() {
  const [tree, setTree] = useState({});
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]); // nhánh đã cấu hình để quản lý
  const [popupFor, setPopupFor] = useState(null); // { limit: number, members: [...] } hoặc null

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "members"));
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        const grouped = {};
        data.forEach((member) => {
          const limit = member.overtimeLimit?.monthlyLimit ?? 0;
          if (!grouped[limit]) grouped[limit] = [];
          grouped[limit].push(member);
        });

        setTree(grouped);
      } catch (err) {
        console.error("Lỗi đọc members:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  const openPopupForLimit = (limit) => {
    const membersForLimit = tree[limit] ?? [];
    setPopupFor({ limit, members: membersForLimit });
  };

  const addBranch = (branch) => {
    setBranches((prev) => [...prev, branch]);
    setPopupFor(null);
  };

  const removeBranch = (id) => {
    setBranches((prev) => prev.filter((b) => b.id !== id));
  };

  if (loading) return <p className="p-4">Đang tải...</p>;

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <h2 className="text-xl font-semibold">Quản lý giới hạn tăng ca (tree)</h2>

      <div className="space-y-3">
        {Object.entries(tree)
          .sort((a, b) => Number(b[0]) - Number(a[0]))
          .map(([limit, members]) => (
            <div key={limit} className="border rounded-xl p-3 bg-gray-50 dark:bg-gray-800">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-indigo-600">Giới hạn {limit} tiếng</div>
                  <div className="text-sm text-gray-500">{members.length} nhân viên</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openPopupForLimit(Number(limit))}
                    className="px-3 py-1 bg-amber-400 text-white rounded"
                  >
                    Quản lý / Sử dụng
                  </button>
                </div>
              </div>

              <ul className="mt-3 divide-y">
                {members.map((m) => (
                  <li key={m.id} className="py-2 flex justify-between items-start">
                    <div>
                      <div className="font-medium">{m.nickname || m.realName || "Không tên"}</div>
                      <div className="text-xs text-gray-500">ID: {m.id}</div>
                    </div>

                    <div className="w-72">
                      <SectionOvertimeConfig config={m.overtimeLimit ?? {}} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>

      {/* Danh sách nhánh đã cấu hình (local state) */}
      <div className="mt-4">
        <h3 className="font-semibold">Nhánh đã thêm (để quản lý công thức)</h3>
        <div className="mt-2 space-y-2">
          {branches.length === 0 && <div className="text-sm text-gray-500">Chưa có nhánh nào.</div>}
          {branches.map((b) => (
            <div key={b.id} className="border rounded p-2 flex justify-between items-center bg-white dark:bg-gray-900">
              <div>
                <div className="font-medium">{b.name}</div>
                <div className="text-sm text-gray-500">
                  Công thức: {b.formula === "equal" ? `Chia đều (${b.monthDays} ngày)` : "Tăng dần theo tuần"}
                </div>
                <div className="text-sm text-gray-500">Áp dụng cho: {b.memberIds.length} nhân viên</div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="text-sm text-indigo-600">
                  {b.formula === "equal"
                    ? `${calcEqualPerDay(b.limit, b.monthDays)} h/ngày`
                    : `${calcProgressivePerWeek(b.limit).join(" | ")} h/tuần`}
                </div>
                <button className="text-red-500 text-sm" onClick={() => removeBranch(b.id)}>Xoá</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {popupFor && (
        <BranchPopup
          prefilledLimit={popupFor.limit}
          membersInBranch={popupFor.members}
          onClose={() => setPopupFor(null)}
          onAddBranch={addBranch}
        />
      )}
    </div>
  );
}
