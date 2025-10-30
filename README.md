# Quản lý chi tiêu - Next.js + Tailwind (skeleton)
Mở thư mục `quanlychitieu`, chạy:
```bash
npm install
npm run dev
```
Truy cập: http://localhost:3000



QUANLYTHITIEU/
│
├── .next/                   # Thư mục build tự động của Next.js (có thể xóa, sẽ được tạo lại)
├── .vscode/                 # Cấu hình VS Code (không bắt buộc)
│
├── components/              # Các thành phần React dùng nhiều lần
│   ├── ExpenseForm.js       # Form nhập khoản chi
│   ├── ExpenseList.js       # Danh sách các khoản chi
│   └── Summary.js           # Tổng kết (tổng chi, còn dư,...)
│
├── node_modules/            # Nơi chứa thư viện npm (tự tạo khi cài)
│
├── pages/                   # Các trang chính (Next.js routing)
│   ├── _app.js              # File cấu hình gốc (áp dụng layout, style toàn cục)
│   └── index.js             # Trang chính (hiển thị form + danh sách + tổng kết)
│
├── styles/                  # Thư mục CSS (có thể chứa globals.css)
│
├── next.config.js           # Cấu hình Next.js
├── postcss.config.js        # Dành cho Tailwind CSS xử lý CSS
├── tailwind.config.js       # Cấu hình Tailwind CSS
│
├── package.json             # Thông tin dự án, dependencies, scripts
├── package-lock.json        # Ghi lại phiên bản chính xác của các dependencies
│
└── README.md                # Ghi chú hướng dẫn (cách chạy, tính năng, v.v.)

10/29上下班打卡记录：
1.陈明壯/6:52
2.阮玉泰/休
3.谭文越/ 7:54
4.裴泰南/6:56
5.陈文雄/7:46
6.吴维康/ 7:48
7.吴秀英/7:56



10/29上下班打卡记录：
1.陈明壯/18:01
2.阮玉泰/休
3.谭文越/ 19:01
4.裴泰南/18:01
5.陈文雄/19:01
6.吴维康/ 19:01
7.吴秀英/19:01
