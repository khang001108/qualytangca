import { useState, useRef, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Calculator, Save, X } from "lucide-react";
import Toast from "./Toast";

export default function PopupOvertimeFormula({ user, onClose }) {
  const [formula, setFormula] = useState({
    earlyCheckInMinutes: 30,
    lateCheckOutMinutes: 60,
    dayShiftStart: "08:00",
    dayShiftEnd: "17:00",
    nightShiftStart: "20:00",
    nightShiftEnd: "07:00",
    nightMultiplier: 1.3,
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "" });

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 3000);
  };

  useEffect(() => {
    const fetchFormula = async () => {
      const ref = doc(db, "overtimeFormulas", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) setFormula(snap.data());
    };
    fetchFormula();
  }, [user.uid]);

  const saveFormula = async () => {
    setLoading(true);
    try {
      const ref = doc(db, "overtimeFormulas", user.uid);
      await setDoc(ref, formula, { merge: true });
      showToast("✅ Đã lưu công thức tính tăng ca!", "success");
      onClose();
    } catch (err) {
      console.error("Lỗi lưu công thức:", err);
      showToast("❌ Không thể lưu công thức.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 w-11/12 max-w-lg p-6 rounded-xl shadow-2xl z-10">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-500" />
            Công thức tính tăng ca
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Lên ca sớm (phút)</label>
              <input
                type="number"
                value={formula.earlyCheckInMinutes}
                onChange={(e) =>
                  setFormula({ ...formula, earlyCheckInMinutes: +e.target.value })
                }
                className="w-full border rounded p-2 mt-1"
              />
            </div>
            <div>
              <label className="text-sm">Xuống ca muộn (phút)</label>
              <input
                type="number"
                value={formula.lateCheckOutMinutes}
                onChange={(e) =>
                  setFormula({ ...formula, lateCheckOutMinutes: +e.target.value })
                }
                className="w-full border rounded p-2 mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Ca ngày bắt đầu</label>
              <input
                type="text"
                value={formula.dayShiftStart}
                onChange={(e) =>
                  setFormula({ ...formula, dayShiftStart: e.target.value })
                }
                className="w-full border rounded p-2 mt-1"
              />
            </div>
            <div>
              <label className="text-sm">Ca ngày kết thúc</label>
              <input
                type="text"
                value={formula.dayShiftEnd}
                onChange={(e) =>
                  setFormula({ ...formula, dayShiftEnd: e.target.value })
                }
                className="w-full border rounded p-2 mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Ca đêm bắt đầu</label>
              <input
                type="text"
                value={formula.nightShiftStart}
                onChange={(e) =>
                  setFormula({ ...formula, nightShiftStart: e.target.value })
                }
                className="w-full border rounded p-2 mt-1"
              />
            </div>
            <div>
              <label className="text-sm">Ca đêm kết thúc</label>
              <input
                type="text"
                value={formula.nightShiftEnd}
                onChange={(e) =>
                  setFormula({ ...formula, nightShiftEnd: e.target.value })
                }
                className="w-full border rounded p-2 mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-sm">Hệ số tăng ca ban đêm</label>
            <input
              type="number"
              step="0.1"
              value={formula.nightMultiplier}
              onChange={(e) =>
                setFormula({ ...formula, nightMultiplier: +e.target.value })
              }
              className="w-full border rounded p-2 mt-1"
            />
          </div>

          <button
            onClick={saveFormula}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg flex justify-center items-center gap-2 mt-4"
          >
            <Save className="w-4 h-4" />
            {loading ? "Đang lưu..." : "Lưu công thức"}
          </button>
        </div>

        {toast.message && (
          <Toast message={toast.message} type={toast.type} />
        )}
      </div>
    </div>
  );
}
