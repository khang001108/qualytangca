// components/OverMember.js
import { useState, useEffect, useRef } from "react";
import {
    addDoc,
    collection,
    serverTimestamp,
    query,
    where,
    onSnapshot,
    doc,
    deleteDoc
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { UserPlus, Trash2, User } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

function formatHours(n) {
    return `${Number(n || 0).toLocaleString()} giờ`;
}

export default function OverMember({
    user = null,
    overtimes = [], // mảng tăng ca
    limit = {}, // overtime limit object
    selectedMonth,
    selectedYear,
}) {
    const [open, setOpen] = useState(false);
    const [members, setMembers] = useState([]);
    const modalRef = useRef();
    const [form, setForm] = useState({
        realName: "",
        nickname: "",
        shift: "Ca ngày",
        shiftStart: "07:00",
    });
    const [saving, setSaving] = useState(false);

    // Load members + overtimeLimit
    useEffect(() => {
        if (!user?.uid) return;

        const membersRef = collection(db, "members");
        const q = query(membersRef, where("userId", "==", user.uid));

        const unsub = onSnapshot(
            q,
            (snap) => {
                if (!snap?.docs) return;
                setMembers(snap.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                    overtimeLimit: d.data().overtimeLimit || {}
                })));
            },
            (err) => console.error("Firestore snapshot error:", err)
        );

        return () => unsub();
    }, [user?.uid]);

    // ESC để đóng modal
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && setOpen(false);
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    const handleChange = (k, v) => {
        setForm(f => {
            const next = { ...f, [k]: v };
            if (k === "shift") next.shiftStart = v.includes("đêm") ? "19:00" : "07:00";
            return next;
        });
    };

    const addMember = async (e) => {
        e?.preventDefault();
        if (!form.realName.trim()) return alert("Nhập tên nhân viên");
        setSaving(true);
        const payload = {
            realName: form.realName.trim(),
            nickname: form.nickname.trim() || form.realName.trim().charAt(0).toUpperCase(),
            shift: form.shift,
            shiftStart: form.shiftStart,
            createdAt: serverTimestamp(),
            overtimeLimit: {} // mặc định rỗng
        };

        try {
            if (user) {
                await addDoc(collection(db, "members"), { ...payload, userId: user.uid });
            } else {
                setMembers(prev => [{ id: `local-${Date.now()}`, ...payload }, ...prev]);
            }
            setForm({ realName: "", nickname: "", shift: "Ca ngày", shiftStart: "07:00" });
            setOpen(false);
        } catch (err) {
            console.error("Lỗi thêm member:", err);
            alert("Thêm thất bại");
        } finally {
            setSaving(false);
        }
    };

    const removeMember = async (id) => {
        if (!confirm("Xóa nhân viên này?")) return;
        try {
            if (user) await deleteDoc(doc(db, "members", id));
            else setMembers(prev => prev.filter(m => m.id !== id));
        } catch (err) {
            console.error("Xóa thất bại", err);
        }
    };

    // Tính giờ đã tăng ca cho 1 member trong tháng/năm
    const calcMemberOvertime = (memberId) => {
        return overtimes
            .filter(o => o.memberId === memberId)
            .reduce((sum, it) => sum + Number(it.hours || 0), 0);
    };

    // Lấy limit của member theo tháng/năm
    const getMonthLimit = (m) => {
        return m.overtimeLimit?.[String(selectedYear)]?.[String(selectedMonth)] || 0;
    };

    // Kiểm tra trạng thái online/offline hôm nay
    // Kiểm tra trạng thái online/offline hôm nay
    // 🧮 Hàm tính số giờ tăng ca dựa trên checkIn/checkOut
    // đặt ở đầu file hoặc chỗ phù hợp
    function calcOvertimeHours(shiftStart, checkOut) {
        if (!checkOut) return 0;
        // chuyển shiftStart (hh:mm) -> phút kết thúc hành chính = shiftStart + 9h
        const [sH, sM] = shiftStart.split(":").map(Number);
        const endAdminMinutes = (Number(sH) + 9) * 60 + (Number(sM) || 0);
        // parse checkOut
        const [oH, oM] = checkOut.split(":").map(Number);
        const outMinutes = oH * 60 + (oM || 0);

        const diff = outMinutes - endAdminMinutes;
        if (diff <= 0) return 0;
        if (diff < 60) return 0;
        return Math.floor(diff / 60);
    }


    // 🔍 Kiểm tra trạng thái hôm nay (và tự tính tăng ca)
    const getTodayStatus = (member) => {
    const now = new Date();
    const todayY = now.getFullYear();
    const todayM = now.getMonth();
    const todayD = now.getDate();

    // 🔹 Ưu tiên dữ liệu từ members
    if (member.checkIn || member.checkOut) {
        const hours = member.checkOut
            ? calcOvertimeHours(member.shiftStart || "07:00", member.checkOut)
            : 0;

        let text = `Lên ca: ${member.checkIn || "..." } • Xuống ca: ${member.checkOut || "..."}`;
        if (hours > 0 && member.checkIn && member.checkOut)
            text += ` • +${hours}h`;

        let color = "text-gray-400";
        if (member.checkIn && !member.checkOut) color = "text-green-600";
        else if (member.checkIn && member.checkOut) color = hours > 0 ? "text-blue-600" : "text-gray-500";

        return { text, color, overtime: hours };
    }

    // 🔹 Nếu không có checkIn/checkOut, kiểm tra overtime record
    const todayOvertime = overtimes.find(o => {
        const d = o.date ? new Date(o.date) : o.createdAt?.toDate?.() || null;
        if (!d || o.memberId !== member.id) return false;
        return (
            d.getFullYear() === todayY &&
            d.getMonth() === todayM &&
            d.getDate() === todayD
        );
    });

    if (todayOvertime) {
        const { checkIn, checkOut } = todayOvertime;
        const hours = checkOut
            ? calcOvertimeHours(member.shiftStart || "07:00", checkOut)
            : 0;

        let text = `Lên ca: ${checkIn || "..." } • Xuống ca: ${checkOut || "..."}`;
        if (hours > 0 && checkIn && checkOut)
            text += ` • +${hours}h`;

        let color = "text-gray-400";
        if (checkIn && !checkOut) color = "text-green-600";
        else if (checkIn && checkOut) color = hours > 0 ? "text-blue-600" : "text-gray-500";

        return { text, color, overtime: hours };
    }

    // 🔹 Nếu hoàn toàn chưa có dữ liệu hôm nay
    return { text: "Lên ca: null • Xuống ca: null", color: "text-gray-400", overtime: 0 };
};


    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User className="w-5 h-5" /> Quản lý nhân viên
                </h3>
                <button
                    onClick={() => setOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2 rounded-xl shadow hover:brightness-105 active:scale-95"
                >
                    <UserPlus className="w-4 h-4" /> Thêm nhân viên
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {members.length === 0 ? (
                    <div className="bg-white p-6 rounded-2xl shadow border border-gray-100 text-center text-gray-500">
                        Chưa có nhân viên. Thêm để bắt đầu.
                    </div>
                ) : members.map((m) => {
                    const status = getTodayStatus(m); // ✅ Phải có trước
                    const done = calcMemberOvertime(m.id) + (status.overtime || 0); // ✅ Cộng thêm giờ OT hôm nay nếu có
                    const monthLimit = getMonthLimit(m);
                    const remaining = Math.max(monthLimit - done, 0);

                    const shiftName = {
                        "07:00": "Sáng sớm",
                        "08:00": "Sáng muộn",
                        "19:00": "Tối sớm",
                        "20:00": "Tối muộn"
                    }[m.shiftStart] || m.shiftStart;

                    const statusLabel = `${m.shift} • ${shiftName}`;


                    return (
                        <div key={m.id} className="bg-gradient-to-br from-white to-blue-50 p-4 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold">
                                        {m.nickname ? m.nickname.charAt(0).toUpperCase() : (m.realName ? m.realName.charAt(0).toUpperCase() : "N")}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-800">{m.realName || "Không tên"}</div>
                                        <div className="text-sm text-gray-500">{m.nickname ? `“${m.nickname}”` : ""}</div>
                                        <div className={`text-xs mt-1 font-medium ${status.color}`}>{status.text}</div>
                                        <div className="text-xs text-gray-400 mt-1">{statusLabel}</div>
                                    </div>
                                </div>

                                <div className="flex gap-2 items-start">
                                    <button onClick={() => removeMember(m.id)} className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mt-4">
                                {[
                                    { label: "Giới hạn", value: formatHours(monthLimit) },
                                    { label: "Đã tăng", value: formatHours(done) },
                                    { label: "Còn lại", value: formatHours(remaining), color: remaining === 0 ? "text-red-500" : "text-sky-600" },
                                ].map((box, i) => (
                                    <SummaryBox key={i} {...box} />
                                ))}
                            </div>


                        </div>
                    );
                })}
            </div>

            {/* Modal thêm */}
            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    onMouseDown={(e) => modalRef.current && !modalRef.current.contains(e.target) && setOpen(false)}
                >
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div ref={modalRef} className="relative bg-white w-11/12 max-w-md p-6 rounded-xl shadow-2xl z-10" onMouseDown={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-semibold">Thêm nhân viên</h3>
                            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-800">✕</button>
                        </div>

                        <form onSubmit={addMember} className="space-y-3">
                            <div>
                                <label className="text-sm text-gray-600">Tên thực</label>
                                <input value={form.realName} onChange={(e) => handleChange("realName", e.target.value)} className="w-full border p-2 rounded mt-1" />
                            </div>

                            <div>
                                <label className="text-sm text-gray-600">Biệt danh</label>
                                <input value={form.nickname} onChange={(e) => handleChange("nickname", e.target.value)} className="w-full border p-2 rounded mt-1" />
                            </div>

                            <div>
                                <label className="text-sm text-gray-600">Ca</label>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    {["Ca ngày", "Ca đêm", "Full ngày", "Full đêm"].map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => handleChange("shift", s)}
                                            className={`py-2 rounded-lg border ${form.shift === s ? "bg-indigo-50 border-indigo-400" : "border-gray-200"}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-gray-600">Lên ca</label>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    {["07:00", "08:00", "19:00", "20:00"].map(time => {
                                        const label = {
                                            "07:00": "Sáng sớm",
                                            "08:00": "Sáng muộn",
                                            "19:00": "Tối sớm",
                                            "20:00": "Tối muộn"
                                        }[time];
                                        return (
                                            <button
                                                key={time}
                                                type="button"
                                                onClick={() => handleChange("shiftStart", time)}
                                                className={`flex-1 py-2 rounded-lg border ${form.shiftStart === time ? "bg-yellow-50 border-yellow-400" : "border-gray-200"}`}
                                            >
                                                {label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 text-white py-2 rounded hover:brightness-110">
                                    {saving ? "Đang lưu..." : "Lưu"}
                                </button>
                                <button type="button" onClick={() => setOpen(false)} className="flex-1 bg-gray-200 py-2 rounded hover:bg-gray-300">
                                    Hủy
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function SummaryBox({ label, value, color = "text-indigo-700" }) {
    return (
        <Tooltip.Root>
            <Tooltip.Trigger asChild>
                <div className="bg-indigo-50/40 rounded-xl p-3 border border-indigo-100 flex flex-col items-center">
                    <div className="text-xs text-gray-500">{label}</div>
                    <div className={`font-semibold mt-1 ${color}`}>{value}</div>
                </div>
            </Tooltip.Trigger>
            <Tooltip.Content side="top" align="center" className="rounded-md bg-gray-800 text-white text-xs px-2 py-1">
                {label}: {value}
                <Tooltip.Arrow className="fill-gray-800" />
            </Tooltip.Content>
        </Tooltip.Root>
    );
}
