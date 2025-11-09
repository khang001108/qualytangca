import { useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";

export function useShiftFirestore(setConfig) {
  const fetchConfig = useCallback(async () => {
    try {
      const daySnap = await getDoc(doc(db, "shiftConfig", "day"));
      const nightSnap = await getDoc(doc(db, "shiftConfig", "night"));

      // giá trị mặc định để tính trong Firestore
      const dayData = daySnap.exists() ? daySnap.data() : {
        gioLenCa: 7,
        gioXuongCa: 16,
        nghiGiuaCa: 1,
        tongGioHanhChinh: 8,
      };

      // giá trị mặc định để tính trong Firestore
      const nightData = nightSnap.exists() ? nightSnap.data() : {
        gioLenCa: 19,
        gioXuongCa: 4,
        nghiGiuaCa: 1,
        tongGioHanhChinh: 8,
      };

      const newConfig = {
        shiftType: "day",
        shiftStart: dayData.gioLenCa || 7,
        shiftEnd: dayData.gioXuongCa || 16,
        shiftHalf: dayData.nghiGiuaCa || 1,
        shiftOffice: dayData.tongGioHanhChinh || 8,

        day: {
          lenCaSomBatDau: "06:45",
          lenCaSomKetThuc: "07:00",
          tanCaSomBatDau: "16:00",
          tanCaSomKetThuc: "16:15",
          lenCaMuonBatDau: "07:45",
          lenCaMuonKetThuc: "08:00",
          tanCaMuonBatDau: "17:00",
          tanCaMuonKetThuc: "17:15",
          gioLenCa: "7H",
          gioXuongCa: "16H",
          nghiGiuaCa: "1H",
          tongGioHanhChinh: 8,
          ...dayData,
        },

        night: {
          lenCaSomBatDau: "18:45",
          lenCaSomKetThuc: "19:00",
          tanCaSomBatDau: "04:00",
          tanCaSomKetThuc: "04:15",
          lenCaMuonBatDau: "19:45",
          lenCaMuonKetThuc: "20:00",
          tanCaMuonBatDau: "05:00",
          tanCaMuonKetThuc: "05:15",
          gioLenCa: "19H",
          gioXuongCa: "4H",
          nghiGiuaCa: "1H",
          tongGioHanhChinh: 8,
          ...nightData,
        },
      };

      setConfig((prev) => {
        const prevJson = JSON.stringify(prev);
        const newJson = JSON.stringify(newConfig);
        if (prevJson !== newJson) {
          console.log("✅ Loaded shift config (updated):", { dayData, nightData });
          return newConfig;
        }
        console.log("ℹ️ Config unchanged, skip re-render");
        return prev;
      });
    } catch (err) {
      console.error("❌ Lỗi khi tải cấu hình:", err);
    }
  }, [setConfig]);

  const saveConfig = async (config) => {
    const type = config.shiftType || "day";
    const dataToSave = config[type];

    try {
      await setDoc(doc(db, "shiftConfig", type), dataToSave, { merge: true });
      console.log(`✅ Saved shiftConfig/${type}:`, dataToSave);
      alert(`✅ Đã lưu cấu hình ca ${type === "day" ? "ngày" : "đêm"}`);
    } catch (err) {
      console.error("❌ Lỗi khi lưu cấu hình:", err);
      alert("❌ Lưu thất bại, xem console log.");
    }
  };

  return { fetchConfig, saveConfig };
}
