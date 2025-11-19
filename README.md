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
11/02上下班打卡记录：
1.陈明壯/休
2.阮玉泰/6:58
3.谭文越/ 年假
4.裴泰南/6:54
5.陈文雄/年假
6.吴维康/ 7:54
7.吴秀英/7:55

11/02上下班打卡记录：
1.陈明壯/休
2.阮玉泰/16:01
3.谭文越/ 年假
4.裴泰南/11:01 4h事假
5.陈文雄/年假
6.吴维康/ 17:01
7.吴秀英/ 17:01

vậy h 

t nhầm dữ liệu checkin vào checkout hay là nhầm ca ngày sang ca đêm đều báo lỗi r đúng k
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



===================================================================
                        ÁP DỤNG HỆ THỐNG NGÀY ĐỂ CHECK
===================================================================
nếu trong shiftSchedules -> 2025-11-03__dFR36hRzSgPemNYFt3Je -> 
date "2025-11-03"
shift "Ca ngày" (string)
ngày hôm đó chấm công là ca ngày thì phải lọc như sau

shiftConfig -> day(ca ngày)
bắt đầu tính khung giờ hợp lệ như trên

nếu đăng đúng giờ chấm công của ca ngày = ĐÚNG

đăng sai giờ ca đêm, đăng nhầm khung giờ xuống ca(checkout) vào lên ca(checkin) = error

createdAt November 17, 2025 at 10:46:44 PM UTC+7 (timestamp)
date "2025-11-03" (string)
lenCa null (null)
memberId "dFR36hRzSgPemNYFt3Je" (string)
nickname "TRẦN MINH TRANG" (string)
realName "陈明壯" (string)
shift "Ca ngày" (string)
shiftStart "08:00" (string)
updatedAt November 17, 2025 at 10:46:44 PM UTC+7 (timestamp)
userId "3ApO3NKNLJQiV8bUP0hInpJCw653" (string)
xuongCa null

========================================================
                        KHI CHECKIN
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
                            KHI CHECKOUT
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
CÓ ĐỦ CHECKIN VÀ CHECKOUT - GIỜ HÀNH CHÍNH 8 TIEENSEG LÀ OK
======================================================================



=========================================================================
                    SAU CHECKOUT -> TÍNH TĂNG CA
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
                            TÍNH THƯỞNG
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
                SỬA LỖI LÊN CA MUỘN TĂNG CA 3 TIẾNG
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




Tạo Flow sơ đồ tính toán để hiển thị trong FormulaPreview.

=============== CHẤM CÔNG =======================

input
checkin
1.陈明壯/18:52
5.陈文雄/19:46
shiftSchedules (xác định nv ngày hôm đó ca ngày hay đêm) 
shift: Ca đêm = shiftStart: lên_ca_đêm_sớm 
-> shiftConfig 
shiftStart: lên_ca_đêm_sớm -> shiftConfig -> night -> lenCaSomBatDau(18:45) < 18:52 < lenCaSomKetThuc(19:00) -> lenCa = 18:52 = lên ca sớm ok
shiftStart: lên_ca_đêm_muộn -> shiftConfig -> ngiht -> lenCaMuonBatDau(19:45) < 19:46 < lenCaMuonKetThuc(20:00) -> lenCa = 19:46 = lên ca muộn ok


input
checkout
1.陈明壯/4:01
5.陈文雄/5:01
shiftSchedules (xác định nv ngày hôm đó ca ngày hay đêm) 
shift: Ca đêm = shiftStart: lên_ca_đêm_sớm 
-> shiftConfig 
shiftStart: lên_ca_đêm_sớm -> shiftConfig -> night -> tanCaSomBatDau(04:00) > 04:01 > tanCaSomKetThuc(4:15) -> xuongCa = 04:01 = tan ca sớm ok
shiftStart: lên_ca_đêm_muộn -> shiftConfig -> ngiht -> tanCaMuonBatDau(05:00) > 05:01 > tanCaMuonKetThuc(5:15) -> xuongCa = 05:01 = tan ca muộn ok

=============== HÀNH CHÍNH =======================
đủ dữ liệu lên ca và xuống ca ok tính giờ hành 
giờ hành chính
shiftConfig -> night -> tongGioHanhChinh: 8
lenCaSomBatDau(18:45) < 18:52 < lenCaSomKetThuc(19:00) -> lenCa ok = 18:52
lenCaMuonBatDau(19:45) < 19:46 < lenCaMuonKetThuc(20:00) -> lenCa ok = 19:46

tanCaSomBatDau(04:00) > 04:01 > tanCaSomKetThuc(4:15) -> xuongCa ok = 04:01
tanCaMuonBatDau(05:00) > 05:01 > tanCaMuonKetThuc(5:15) -> xuongCa ok = 05:01

-> 19:00 đến 04:00 = 9 tiếng - 1 nghiGiuaCa(1) = 8 tiếng hành chính = tongGioHanhChinh(8)
-> 20:00 đến 05:00 = 9 tiếng - 1 nghiGiuaCa(1) = 8 tiếng hành chính = tongGioHanhChinh(8)


=============== THƯỞNG =======================
tính thưởng
tiếng hành chính > tongGioHanhChinh(8) >= 2 tiếng
-> bonusConfig -> main -> thuongSauBaoNhieuTieng(2) -> congThemBaoNhieuGio(0.5)

input
checkout
1.陈明壯/6:01
5.陈文雄/7:01
shiftSchedules (xác định nv ngày hôm đó ca ngày hay đêm) 
shift: Ca đêm = shiftStart: lên_ca_đêm_sớm 
shiftStart: lên_ca_đêm_sớm -> shiftConfig -> night -> tanCaSomBatDau(04:00) > tanCaSomKetThuc(4:15) > 06:01 -> tăng ca ok = 2 tiếng

lenCaSomBatDau(18:45) < 18:52 < lenCaSomKetThuc(19:00) -> lenCa ok = 19:00
tanCaSomBatDau(04:00) > 04:01 > tanCaSomKetThuc(4:15) -> xuongCa ok = 04:00
tanCaSomBatDau(04:00) > tanCaSomKetThuc(4:15) > 06:01 -> tăng ca ok = 2 tiếng
2 + 0.5 = 2.5

shiftStart: lên_ca_đêm_muộn -> shiftConfig -> ngiht -> tanCaMuonBatDau(05:00) > tanCaMuonKetThuc(5:15) > 06:01 -> xuongCa = 1 tiếng
lenCaMuonBatDau(19:45) < 19:46 < lenCaMuonKetThuc(20:00) -> lenCa ok = 20:00
tanCaMuonBatDau(05:00) > 05:01 > tanCaMuonKetThuc(5:15) -> xuongCa ok = 05:00
tanCaMuonBatDau(05:00) > tanCaMuonKetThuc(5:15) > 06:01 -> tăng ca ok = 1 tiếng
ko đủ >= 2 ko thưởng


=============== KẾT QUẢ =======================
kết quả

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


gioConLai 39 (number)
gioDaLam 1 (number)
gioThuongConLai 10 (number)
gioThuongDaNhan 0 (number)
id "WhuoLekGh2FrFMHomgFX" (string)
ngayConLai 19.5 (number) // vì tăng ca 1 tiếng trong khi perDay: 2, days: 20
soNgayDaLam 0.5 (number)
ten "TRẦN VĂN HÙNG" (string)
tongGioKeHoach 40 (number)
tongGioThuong 10 (number)



để mik nói rõ hơn khi checkout
4.裴泰南/11:01 4h事假 là trường hợp đi làm từ sáng sớm 4.裴泰南/6:54(7h) đến 11h là 4 tiếng rồi họ nghỉ chiều 4 tiếng nên là phép nửa ngày
4.裴泰南/12:01 4h事假 là trường hợp đi làm từ sáng muộn 4.裴泰南/7:54(8h) đến 12h là 4 tiếng rồi họ nghỉ chiều 4 tiếng nên là phép nửa ngày
trường hợp này ko có tăng ca vì họ đã xin nghỉ thì về hẳn luôn chứ ko quay lại nữa
ca đêm tương tự

còn trường hợp nữa là khi checkin
4.裴泰南/11:46 4h事假 là trường hợp đi làm từ chiều sớm 4.裴泰南/4h事假 đến 11h là hết 4 tiếng nghỉ phép, sau 1 giờ nghỉ trưa, 12h là 4 tiếng làm chiều
4.裴泰南/12:46 4h事假 là trường hợp đi làm từ chiều muộn 4.裴泰南/4h事假 đến 12h là hết 4 tiếng nghỉ phép, sau 1 giờ nghỉ trưa, 13h là 4 tiếng làm chiều
trường hợp này sẽ có tăng ca hoặc không tăng ca nhưng ko dc thưởng vì ko đủ giờ hành chính
ca đêm tương tự

1. Checkout logic (nghỉ chiều):
if (checkout <= 12:30 && workingHours <= 4.5):
    leaveType = "4h事假"
    isOvertime = false
    bonusAllowed = false


2. Checkin logic (nghỉ sáng):
if (checkin >= 11:30 && checkin <= 13:00):
    leaveType = "4h事假"
    afternoonWork = true
    if (totalWorkingHours < 8):
        bonusAllowed = false
chưa sửa