import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";

export function useShiftFirestore(setConfig) {
  // Tải dữ liệu ca ngày & ca đêm
  const fetchConfig = async () => {
    try {
      const daySnap = await getDoc(doc(db, "shiftConfig", "day"));
      const nightSnap = await getDoc(doc(db, "shiftConfig", "night"));

      const dayData = daySnap.exists() ? daySnap.data() : {};
      const nightData = nightSnap.exists() ? nightSnap.data() : {};

      // Dữ liệu mặc định
      setConfig({
        shiftType: "day",
        shiftStart: 7,
        shiftEnd: 16,
        shiftHalf: dayData.shiftHalf || 1,
        shiftOffice: dayData.shiftOffice || 8,
        day: {
          ...{
            earlyStartStart: "06:45",
            earlyStartEnd: "07:00",
            earlyStartGap: 15,
            earlyEndStart: "16:01",
            earlyEndEnd: "16:16",
            earlyEndGap: 15,
            lateStartStart: "07:45",
            lateStartEnd: "08:00",
            lateStartGap: 15,
            lateEndStart: "17:01",
            lateEndEnd: "17:16",
            lateEndGap: 15,
            shiftHalf: 1,
            shiftOffice: 8,
          },
          ...dayData,
        },
        night: {
          ...{
            earlyStartStart: "18:45",
            earlyStartEnd: "19:00",
            earlyStartGap: 15,
            earlyEndStart: "04:01",
            earlyEndEnd: "04:16",
            earlyEndGap: 15,
            lateStartStart: "19:45",
            lateStartEnd: "20:00",
            lateStartGap: 15,
            lateEndStart: "05:01",
            lateEndEnd: "05:16",
            lateEndGap: 15,
            shiftHalf: 1,
            shiftOffice: 8,
          },
          ...nightData,
        },
      });

      console.log("✅ Loaded shift config:", { dayData, nightData });
    } catch (err) {
      console.error("❌ Lỗi khi tải cấu hình:", err);
    }
  };

  // Lưu theo loại ca hiện tại (day hoặc night)
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
