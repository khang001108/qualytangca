import { useState } from "react";

export default function usePreviewData() {
  const [shiftData, setShiftData] = useState({});
  const [limitData, setLimitData] = useState({});
  const [bonusData, setBonusData] = useState({});

  return {
    shiftData,
    limitData,
    bonusData,
    updateShift: (d) => setShiftData((p) => ({ ...p, ...d })),
    updateLimit: (d) => setLimitData((p) => ({ ...p, ...d })),
    updateBonus: (d) => setBonusData((p) => ({ ...p, ...d })),
  };
}
