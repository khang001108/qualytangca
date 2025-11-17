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

=======================================
CA NGÀY
=======================================
10/29上下班打卡记录：
1.陈明壯/18:52
2.阮玉泰/休
3.谭文越/ 19:54
4.裴泰南/18:56
5.陈文雄/19:46
6.吴维康/ 19:48
7.吴秀英/19:56

10/29上下班打卡记录：
1.陈明壯/6:01
2.阮玉泰/休
3.谭文越/ 7:01
4.裴泰南/6:01
5.陈文雄/7:01
6.吴维康/ 7:01
7.吴秀英/7:01

=========================================
CA ĐÊM
=========================================
11/04上下班打卡记录：
1.陈明壯/18:52
2.阮玉泰/18:54
3.谭文越/ 19:48
4.裴泰南/18:54
5.陈文雄/19:46
6.吴维康/休

11/04上下班打卡记录：
1.陈明壯/6:01
2.阮玉泰/6:01
3.谭文越/ 7:01
4.裴泰南/6:01
5.陈文雄/7:01
6.吴维康/休


khang khang



mik muốn viết lại để khi mik dán 

1.陈明壯/18:52
2.阮玉泰/休
3.谭文越/ 19:54
4.裴泰南/18:56
5.陈文雄/19:46
6.吴维康/ 19:48
7.吴秀英/19:56




thứ nhất
lọc tên và giờ
nhận dc dữ liệu  -> áp dụng công thức có sẵn từ cấu hình người dùng nhập trên db để tính-> ra kết quả hiển thị vào shiftSchedules -> overmember hiển thị dữ liệu đã tính đc|


vd:

chọn ngày trong OvertimeMonth -> shiftSchedules nhân viên ngày đó đc lấy ra để nhận thông tin dữ liệu

khi chưa checkin - checkout trong overtimeform

createdAt November 17, 2025 at 12:48:04 AM UTC+7 (timestamp)
date "2025-11-01" (string)
lenCa null (null)
memberId "2YUgXrNVlH6ynB9OSsIB" (string)
nickname "TRẦN MINH TRANG" (string)
realName "陈明壯" (string)
shift "Ca ngày" (string)
shiftStart "07:00" (string)
updatedAt November 17, 2025 at 12:48:04 AM UTC+7 (timestamp)
userId "3ApO3NKNLJQiV8bUP0hInpJCw653" (string)
xuongCa null( null)
========================================================

khi checkin trong overtimeform
1.陈明壯/18:52

lọc dữ liệu
realName "陈明壯"


được tích là lên ca sớm (db có members - shiftStart: 19:00), 
khoảng thời gian chấm công là: shiftConfig - night - 
lenCaSomBatDau(18:45) < 18:52 < lenCaSomKetThuc(19:00) = ok chấm công thành công
khi đó nhập là: lenCa 18:52

createdAt November 17, 2025 at 12:48:04 AM UTC+7 (timestamp)
date "2025-11-01" (string)
lenCa 18:52 (null)
memberId "2YUgXrNVlH6ynB9OSsIB" (string)
nickname "TRẦN MINH TRANG" (string)
realName "陈明壯" (string)
shift "Ca ngày" (string)
shiftStart "07:00" (string)
updatedAt November 17, 2025 at 12:48:04 AM UTC+7 (timestamp)
userId "3ApO3NKNLJQiV8bUP0hInpJCw653" (string)
xuongCa null( null)
=========================================================================

khi checkout trong overtimeform
1.陈明壯/4:01

lọc dữ liệu
realName "陈明壯"


được tích là xuống ca sớm (db có members - shiftStart: 19:00), 
khoảng thời gian chấm công là: shiftConfig - night - 
tanCaSomBatDau(04:00) > 04:01 > tanCaSomKetThuc(4:15) = ok chấm công thành công
khi đó nhập là: xuongCa 04:01

createdAt November 17, 2025 at 12:48:04 AM UTC+7 (timestamp)
date "2025-11-01" (string)
lenCa 18:52 (null)
memberId "2YUgXrNVlH6ynB9OSsIB" (string)
nickname "TRẦN MINH TRANG" (string)
realName "陈明壯" (string)
shift "Ca ngày" (string)
shiftStart "07:00" (string)
updatedAt November 17, 2025 at 12:48:04 AM UTC+7 (timestamp)
userId "3ApO3NKNLJQiV8bUP0hInpJCw653" (string)
xuongCa 04:01( null)

======================================================================

có đủ checkin và checkout = giờ hành chính 8 tiếng là ok


=========================================================================

khi checkout trong overtimeform
1.陈明壯/6:01
=> có nghĩa là tăng ca


ở phần limit giới hạn tăng ca đã có công thức
overtimeLimits - limit_40 -
gioConLai : 40
gioDaLam : 0 
ngayConLai: 20
soNgayDaLam: 0
sau 04:00 đến 06:01 = 2 tiếng tăng ca, làm tròn giờ bỏ phút

gioConLai 38 (number)
gioDaLam 2 (number)
gioThuongConLai 0 (number)
gioThuongDaNhan 0 (number)
id "2YUgXrNVlH6ynB9OSsIB" (string)
ngayConLai 19 (number)
soNgayDaLam 1 (number)
ten "TRẦN MINH TRANG" (string)
tongGioKeHoach 40 (number)
tongGioThuong 0 (number)

=========================================================================

tính thưởng cho nhân viên

lọc các tên có trong parseHelpers sẽ ko dc thưởng

cứ đủ giờ hành chính 8 tiếng là đc tính thưởng theo công thức

bonusConfig - main -
congThemBaoNhieuGio: 0.5
thuongSauBaoNhieuTieng: 2

giờ giới hạn 40 + 10 giờ thưởng vì chọn 20 ngày làm mõi ngày 2 tiếng tăng ca 2 = 2.5 tiếng mỗi ngày


batThuongTangCa true (boolean)
cacMaKhongThuong (array)
cacNhanhDuocThuong (array)
0 "40" (string)
congThemBaoNhieuGio 0. (number)
thuongSauBaoNhieuTieng 2


lúc đó trong limit_40 là

gioConLai 38 (number)
gioDaLam 2 (number)
gioThuongConLai 9.5 (number)
gioThuongDaNhan 0.5 (number)
id "2YUgXrNVlH6ynB9OSsIB" (string)
ngayConLai 19 (number)
soNgayDaLam 1 (number)
ten "TRẦN MINH TRANG" (string)
tongGioKeHoach 40 (number)
tongGioThuong 10 (number)


======================================================================
======================================================================

ý là
11/04上下班打卡记录：
1.陈明壯/18:52
2.阮玉泰/18:54
3.谭文越/ 19:48
4.裴泰南/18:54
5.陈文雄/19:46
6.吴维康/休

11/04上下班打卡记录：
1.陈明壯/6:01
2.阮玉泰/6:01
3.谭文越/ 7:01
4.裴泰南/6:01
5.陈文雄/7:01
6.吴维康/休

ng lên ca muộn cũng có hành chính 8 tiếng mà

lên ca
5.陈文雄/19:46
lenCaMuonBatDau(19:45) < 19:46 < lenCaMuonKetThuc(20:00) = ok chấm công thành công

xuống ca
5.陈文雄/7:01
tanCaMuonBatDau(05:00) > 04:01 > tanCaMuonKetThuc(5:15) = ok chấm công thành công
khi tính thưởng và tăng ca vẫn là 2.5 vì từ 05:00 - 07:00 = 2.5 ( đủ giờ hành chính)
===========================================================================================
va mik nhầm ví dụ ở trên
khi checkout trong overtimeform
1.陈明壯/4:01

lọc dữ liệu
realName "陈明壯"
tanCaSomBatDa, tanCaSomKetThuc

được tích là xuống ca sớm (db có members - shiftStart: 19:00), 
khoảng thời gian chấm công là: shiftConfig - night - 
tanCaSomBatDau(04:00) > 04:01 > tanCaSomKetThuc(4:15) = ok chấm công thành công
khi đó nhập là: xuongCa 04:01


LÊN CA SỚM:      18:45 – 19:00
LÊN CA MUỘN:     19:45 – 20:00
XUỐNG CA SỚM:    04:00 – 04:15
XUỐNG CA MUỘN:   05:00 – 05:15
MỐC TĂNG CA:     sau 04:00 với ca sớm && sau 05:00 với ca muộn
HÀNH CHÍNH:      8 giờ
Làm tròn OT:     FLOOR (bỏ phút)
Bonus:           +0.5 nếu OT ≥ 2, chia theo cấu hình
