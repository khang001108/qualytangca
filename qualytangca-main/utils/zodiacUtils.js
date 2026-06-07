// utils/zodiacUtils.js
// Tiện ích liên quan đến con giáp và biểu tượng tương ứng


export const zodiacAnimals = [
  "🐀", // Tý
  "🐂", // Sửu
  "🐅", // Dần
  "🐇", // Mão
  "🐉", // Thìn
  "🐍", // Tỵ
  "🐎", // Ngọ
  "🐐", // Mùi
  "🐒", // Thân
  "🐓", // Dậu
  "🐕", // Tuất
  "🐖", // Hợi
];

// 🔹 Mỗi tháng ứng với 1 con giáp cố định
export function getZodiacForMonth(monthIndex, year) {
  // monthIndex = 0–11 tương ứng 12 tháng
  return zodiacAnimals[monthIndex % 12];
}
