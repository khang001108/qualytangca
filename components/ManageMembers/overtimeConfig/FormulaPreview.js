// components/ManageMembers/overtimeConfig/FormulaPreview.js
// Hiển thị sơ đồ công thức tính giờ hành chính và thưởng tăng ca

import React from "react";
import { ArrowRight } from "lucide-react";

export default function FormulaPreview({ config }) {
  return (
    <div className="border border-dashed border-gray-400 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/50">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">
        📊 Sơ đồ công thức (xem trước)
      </h3>
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <span>({config.shiftEnd} - {config.shiftStart})</span>
        <ArrowRight className="w-4 h-4" />
        <span>Thời lượng: {config.shiftEnd - config.shiftStart}h</span>
        <ArrowRight className="w-4 h-4" />
        <span>Trừ nghỉ {config.shiftHalf}h</span>
        <ArrowRight className="w-4 h-4" />
        <span>= Giờ hành chính: {config.shiftOffice}h</span>
        {config.bonusEnabled && (
          <>
            <ArrowRight className="w-4 h-4" />
            <span>Thưởng: +{config.bonusAmount}h / {config.bonusEvery}h tăng ca</span>
          </>
        )}
      </div>
    </div>
  );
}
