// src/components/ManageMembers/OvertimeFormulaPopup.jsx
import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function OvertimeFormulaPopup({ user, onClose, showToast }) {
  const [formula, setFormula] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Load công thức từ DB ---
  useEffect(() => {
    if (!user?.uid) return;

    const fetchFormula = async () => {
      const ref = doc(db, "overtimeFormulas", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setFormula(snap.data().formula || "");
      }
    };
    fetchFormula();
  }, [user?.uid]);

  // --- Lưu công thức ---
  const handleSave = async () => {
    if (!formula.trim()) return showToast("Nhập công thức hợp lệ.", "error");
    setLoading(true);
    try {
      await setDoc(
        doc(db, "overtimeFormulas", user.uid),
        {
          formula,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      showToast("Đã lưu công thức tăng ca.", "success");
      onClose();
    } catch (err) {
      console.error("Lỗi lưu công thức:", err);
      showToast("Không thể lưu công thức.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-96 p-6 space-y-4 animate-fadeIn"
      >
        <div className="flex justify-between items-center border-b border-gray-300 dark:border-gray-700 pb-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Công thức tính tăng ca
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <textarea
          className="w-full h-40 p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          placeholder="Ví dụ: (số giờ * 1.5) + thưởng"
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Save className="w-4 h-4" />
            {loading ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
