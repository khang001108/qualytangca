export const CSS = {
  /* ===== CONTAINER ===== */
  container:
    "rounded-xl bg-white dark:bg-[#1E1E2E] text-gray-900 dark:text-gray-100 p-4 shadow-sm",

  scrollArea: "overflow-auto max-w-full mt-3 rounded-xl",

  /* ===== HEADER ===== */
  headerBox:
    "flex items-center justify-between mb-4 px-5 py-3 rounded-xl " +
    "bg-[#F7F8FA] border border-gray-200 text-gray-900 shadow-sm " +
    "dark:bg-[#2F3145] dark:border-[#3A3B54] dark:text-gray-100",

  headerSelect:
    "px-3 py-2 rounded-lg text-sm border outline-none cursor-pointer " +
    "bg-white text-gray-700 border-gray-300 " +
    "dark:bg-[#2F3145] dark:text-[#E5E7F0] dark:border-[#3A3B54] " +
    "transition",

  headerTitle: "text-lg font-bold tracking-wide",

  table: "table-fixed w-max border-separate border-spacing-0 text-center",

  headerCell:
    "text-[11px] font-semibold py-2 px-2 sticky top-0 z-20 " +
    "bg-gray-100 text-gray-800 border-b border-gray-300 shadow-sm " +
    "dark:bg-[#2F3145] dark:text-[#E5E7F0] dark:border-[#3A3B54]",

  /* ===== STICKY LEFT COLUMNS ===== */
  stickySTT:
    "sticky left-0 w-[40px] z-30 " +
    "bg-gray-100 text-gray-800 border-r border-gray-300 " +
    "dark:bg-[#2F3145] dark:text-[#E5E7F0] dark:border-[#3A3B54] text-[11px]",

  stickyName:
    "sticky left-[40px] w-[90px] z-30 " +
    "bg-gray-100 text-gray-800 border-r border-gray-300 " +
    "dark:bg-[#2F3145] dark:text-[#E5E7F0] dark:border-[#3A3B54] text-[12px]",

  stickyNick:
    "sticky left-[130px] w-[110px] z-30 " +
    "bg-gray-100 text-gray-800 border-r border-gray-300 " +
    "dark:bg-[#2F3145] dark:text-[#E5E7F0] dark:border-[#3A3B54] text-[12px]",

  stickyShift:
    "sticky left-[240px] w-[70px] z-30 " +
    "bg-gray-100 text-gray-800 border-r border-gray-300 " +
    "dark:bg-[#2F3145] dark:text-[#E5E7F0] dark:border-[#3A3B54] text-[11px]",

  /* ===== CELL BASE ===== */
  baseCell:
    "min-w-[32px] h-8 flex items-center justify-center text-[11px] rounded-md " +
    "border border-gray-300 text-gray-800 bg-white transition " +
    "dark:border-[#3A3B54] dark:text-[#D7DAE6] dark:bg-[#2A2B3C]",

  /* ===== CELL COLORS ===== */

  // OT cell
  ot:
    "bg-emerald-100 text-emerald-800 font-semibold " +
    "dark:bg-[#0F3B37] dark:text-[#5FF8D5]",

  // Rest cell
  rest:
    "bg-red-100 text-red-600 font-semibold " +
    "dark:bg-[#442529] dark:text-[#FF7A7A]",

  // Normal day
  work: "bg-white text-gray-800 " + "dark:bg-[#2A2B3C] dark:text-[#D7DAE6]",

  // Sunday highlight
  sundayStripe: "bg-orange-50 " + "dark:bg-[#2E2A40]",
};
