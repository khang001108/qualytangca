export const CSS = {
  container:
    "overflow-auto rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 p-2",

  headerBox:
    "flex items-center justify-between mb-2 px-3 py-2 bg-white/70 dark:bg-gray-800/70 rounded-lg border border-gray-200 dark:border-gray-700",

  headerTitle: "text-lg font-semibold",

  headerSelect:
    "px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm",

  table: "table-fixed w-max border-collapse",

  headerCell:
    "text-xs font-semibold text-gray-600 dark:text-gray-300 py-2 px-2 sticky top-0 z-20 bg-white dark:bg-gray-900",

  // Sticky columns (ID removed → positions updated)
  stickyCA: "sticky left-0 w-[80px] z-20 bg-white dark:bg-gray-900",
  stickyName: "sticky left-[80px] w-[140px] z-20 bg-white dark:bg-gray-900",
  stickyNick: "sticky left-[220px] w-[140px] z-20 bg-white dark:bg-gray-900",
  stickyShift: "sticky left-[360px] w-[140px] z-20 bg-white dark:bg-gray-900",

  // Cell base – minimal, no thick borders
  baseCell:
    "min-w-[40px] h-9 flex items-center justify-center text-[13px] rounded-md transition",

  // Colors
  rest: "bg-blue-500 text-white",
  ot: "bg-emerald-500 text-white shadow-sm",
  work: "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
  sundayStripe: "bg-orange-200/40 dark:bg-orange-700/40",
};
