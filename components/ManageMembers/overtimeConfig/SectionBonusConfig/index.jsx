import React, { useState, useEffect } from "react";
import { db } from "../../../../lib/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import { Save } from "lucide-react";
import { LEAVE_CODES } from "../../../../hooks/useOvertimeParser/parseHelpers";
import LimitTree from "./LimitTree";
import NoBonusCodes from "./NoBonusCodes";

export default function SectionBonusConfig({ config, setConfig }) {
  const [limitTree, setLimitTree] = useState({});
  const [openGroups, setOpenGroups] = useState({});
  const [selectedLimits, setSelectedLimits] = useState([]);
  const [newCode, setNewCode] = useState("");

  // LẤY DỮ LIỆU CÂY GIỚI HẠN
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "overtimeLimits"), (snap) => {
      const tree = {};
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const key = `${data.limit}h`;
        tree[key] = data.members || [];
      });
      setLimitTree(tree);
    });
    return () => unsub();
  }, []);

  // LẤY CẤU HÌNH THƯỞNG (realtime)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "bonusConfig", "main"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSelectedLimits(data.selectedLimits || []);
        setConfig((prev) => ({ ...prev, ...data })); // gộp thay vì ghi đè
      }
    });
    return () => unsub();
  }, []);

  const handleChange = (key, value) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const defaultConfig = {
    bonusEnabled: false,
    bonusEvery: 2,
    bonusAmount: 0.5,
    customNoBonus: [],
  };
  const merged = { ...defaultConfig, ...config };

  // BẬT / TẮT NHÓM
  const toggleGroup = (key) => setOpenGroups((p) => ({ ...p, [key]: !p[key] }));

  // CHỌN GIỚI HẠN
  const toggleLimit = async (limitKey) => {
    const isRemoving = selectedLimits.includes(limitKey);
    const newList = isRemoving
      ? selectedLimits.filter((k) => k !== limitKey)
      : [...selectedLimits, limitKey];

    setSelectedLimits(newList);

    try {
      await setDoc(
        doc(db, "bonusConfig", "main"),
        { ...merged, selectedLimits: newList },
        { merge: true }
      );

      // ⚙️ Nếu đang bỏ tick → xóa thưởng trong nhánh đó
      if (isRemoving) {
        const limits = await getDocs(collection(db, "overtimeLimits"));
        for (const docSnap of limits.docs) {
          const data = docSnap.data();
          if (`${data.limit}h` === limitKey) {
            const members = (data.members || []).map((m) => {
              const { thuongTangCa, ...rest } = m;
              return rest;
            });
            await setDoc(
              doc(db, "overtimeLimits", docSnap.id),
              { ...data, members },
              { merge: true }
            );
            console.log(`🧹 Đã xoá thưởng cho nhánh ${limitKey}`);
          }
        }
      }
    } catch (err) {
      console.error("❌ Lỗi khi cập nhật bonusConfig:", err);
    }
  };

  // LƯU CẤU HÌNH
  const handleSave = async () => {
    try {
      await setDoc(doc(db, "bonusConfig", "main"), {
        ...merged,
        selectedLimits,
      });

      if (!merged.bonusEnabled) {
        alert("✅ Đã lưu (thưởng đang tắt)");
        return;
      }

      const limits = await getDocs(collection(db, "overtimeLimits"));
      for (const limitKey of selectedLimits) {
        for (const docSnap of limits.docs) {
          const data = docSnap.data();
          if (`${data.limit}h` === limitKey) {
            const members = (data.members || []).map((m) => ({
              ...m,
              thuongTangCa: {
                sauBaoNhieuTieng: merged.bonusEvery,
                congThem: merged.bonusAmount,
              },
            }));
            await setDoc(
              doc(db, "overtimeLimits", docSnap.id),
              { ...data, members },
              { merge: true }
            );
          }
        }
      }
      alert("✅ Đã lưu cấu hình thưởng và cập nhật nhân viên!");
    } catch (err) {
      console.error("Lỗi khi lưu cấu hình thưởng:", err);
      alert("❌ Lưu thất bại, xem console.");
    }
  };

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-xl p-4 bg-indigo-50 dark:bg-indigo-950/20 space-y-4">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100">
        💰 Thưởng tăng ca
      </h3>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          💰 Thưởng tăng ca
        </span>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(merged.bonusEnabled)} // ✅ phụ thuộc Firestore
            onChange={async (e) => {
              const newVal = e.target.checked;

              // ⚠️ Nếu tắt khi đang bật thưởng
              if (!newVal && merged.bonusEnabled) {
                const confirmed = window.confirm(
                  "⚠️ Bạn có chắc muốn TẮT thưởng tăng ca?\nTất cả nhân viên sẽ bị gỡ thưởng hiện tại."
                );
                if (!confirmed) return;

                // 🧹 Xóa thưởng khỏi toàn bộ overtimeLimits
                const limits = await getDocs(collection(db, "overtimeLimits"));
                for (const docSnap of limits.docs) {
                  const data = docSnap.data();
                  const members = (data.members || []).map((m) => {
                    const { thuongTangCa, ...rest } = m;
                    return rest;
                  });
                  await setDoc(
                    doc(db, "overtimeLimits", docSnap.id),
                    { ...data, members },
                    { merge: true }
                  );
                }

                // 🧭 Cập nhật Firestore: tắt thưởng + xoá nhánh chọn
                handleChange("bonusEnabled", false);
                setSelectedLimits([]);
                await setDoc(
                  doc(db, "bonusConfig", "main"),
                  { bonusEnabled: false, selectedLimits: [] },
                  { merge: true }
                );

                alert(
                  "✅ Đã tắt toàn bộ thưởng tăng ca và gỡ thưởng khỏi nhân viên!"
                );
                return;
              }

              // ✅ Nếu bật (ON)
              handleChange("bonusEnabled", newVal);
              await setDoc(
                doc(db, "bonusConfig", "main"),
                { bonusEnabled: newVal },
                { merge: true }
              );
            }}
            className="sr-only peer"
          />
          <div
            className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700
                 peer-checked:bg-green-500 transition-all relative after:content-[''] after:absolute 
                 after:top-[2px] after:left-[2px] after:bg-white after:h-5 after:w-5 after:rounded-full 
                 after:transition-all peer-checked:after:translate-x-full"
          ></div>
        </label>
      </div>

      {merged.bonusEnabled && (
        <>
          {/* Điều kiện thưởng */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>Sau</span>
            <input
              type="number"
              step="0.5"
              className="w-16 text-center border rounded dark:bg-gray-800 dark:text-gray-100"
              value={merged.bonusEvery}
              onChange={(e) =>
                handleChange("bonusEvery", Number(e.target.value))
              }
            />
            <span>tiếng tăng ca, cộng thêm</span>
            <input
              type="number"
              step="0.1"
              className="w-16 text-center border rounded dark:bg-gray-800 dark:text-gray-100"
              value={merged.bonusAmount}
              onChange={(e) =>
                handleChange("bonusAmount", Number(e.target.value))
              }
            />
            <span>giờ thưởng</span>
          </div>

          {/* Tree */}
          <LimitTree
            limitTree={limitTree}
            openGroups={openGroups}
            selectedLimits={selectedLimits}
            toggleGroup={toggleGroup}
            toggleLimit={toggleLimit}
          />

          {/* Mã không được thưởng */}
          <NoBonusCodes
            merged={merged}
            handleChange={handleChange}
            newCode={newCode}
            setNewCode={setNewCode}
          />

          <div className="flex justify-end pt-3">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              <Save size={16} /> Lưu cấu hình thưởng
            </button>
          </div>
        </>
      )}
    </div>
  );
}
