import React, { useState, useRef, useEffect } from "react";
import {
    addDoc,
    collection,
    doc,
    setDoc,
    getDocs,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import {
    Loader2,
    UserPlus,
    Undo2,
    UserCircle2,
    CalendarDays,
} from "lucide-react";
import dayjs from "dayjs";
import DayPopup from "./DayPopup";
import BranchPopup from "./BranchPopup";

export default function AddMemberForm({ user, setShowAdd, members, setMembers, showToast }) {
    const modalRef = useRef();
    const [adding, setAdding] = useState(false);
    const [tree, setTree] = useState({});
    const [loadingTree, setLoadingTree] = useState(true);
    const [showDayPopup, setShowDayPopup] = useState(false);
    const [showBranchPopup, setShowBranchPopup] = useState(false);
    const [selectedLimitKey, setSelectedLimitKey] = useState(null);
    const [selectedLimitOption, setSelectedLimitOption] = useState(null);
    const [form, setForm] = useState({
        realName: "",
        nickname: "",
        shift: "Ca ngày",
        shiftStart: "08:00",
        restDay: "Chủ nhật",
        applyLimit: false,
    });

    useEffect(() => {
        const fetchTree = async () => {
            setLoadingTree(true);
            try {
                const snap = await getDocs(collection(db, "members"));
                const treeData = {};
                snap.forEach((d) => {
                    const m = d.data();
                    const limit = Number(m.overtimeLimit?.monthlyLimit || 0);
                    const key = String(limit);
                    if (!treeData[key]) treeData[key] = [];
                    treeData[key].push({ id: d.id, ...m });
                });
                setTree(treeData);
            } catch (err) {
                console.error("Lỗi khi tải tree:", err);
                showToast("Không lấy được danh sách nhánh tăng ca.", "error");
            } finally {
                setLoadingTree(false);
            }
        };
        fetchTree();
    }, []);

    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!form.realName.trim()) return showToast("Nhập tên chính.", "error");
        setAdding(true);

        try {
            let overtimeLimitPayload = { monthlyLimit: 0, workedHours: 0, remaining: 0 };
            let branchValue = null;

            if (form.applyLimit && selectedLimitKey) {
                const limitNum = Number(selectedLimitKey) || 0;
                if (selectedLimitOption && selectedLimitOption.perDay && selectedLimitOption.days) {
                    const totalLimit = selectedLimitOption.perDay * selectedLimitOption.days;
                    overtimeLimitPayload = { monthlyLimit: totalLimit, workedHours: 0, remaining: totalLimit };
                    branchValue = `limit_${limitNum}_day_${selectedLimitOption.days}`;
                } else {
                    overtimeLimitPayload = { monthlyLimit: limitNum, workedHours: 0, remaining: limitNum };
                    branchValue = `limit_${limitNum}`;
                }
            }

            const restDayToSave = form.restDay === "Không" ? "Chủ nhật" : form.restDay;
            const today = dayjs().format("YYYY-MM-DD");
            const payload = {
                realName: form.realName.trim(),
                nickname: form.nickname.trim() || form.realName.trim().charAt(0).toUpperCase(),
                shift: form.shift,
                shiftStart: form.shiftStart,
                restDay: restDayToSave,
                userId: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                updatedDate: today,
                branch: branchValue,
                overtimeLimit: overtimeLimitPayload,
            };

            const ref = await addDoc(collection(db, "members"), payload);
            const newMember = { id: ref.id, ...payload };
            setMembers((prev = []) => {
                if (prev.some((m) => m.id === ref.id)) return prev;
                return [newMember, ...prev];
            });


            const safeName = form.realName.replace(/[\/\\.#$[\]]/g, "_");
            const docId = `${user.uid}_${safeName}_${today}`;
            await setDoc(doc(db, "shiftSchedules", docId), {
                userId: user.uid,
                realName: form.realName.trim(),
                memberId: ref.id,
                shift: form.shift,
                shiftStart: form.shiftStart,
                date: today,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            setShowAdd(false);
            showToast("✅ Đã thêm nhân viên mới.", "info");
        } catch (err) {
            console.error("Lỗi khi thêm nhân viên:", err);
            showToast("Không thể thêm nhân viên mới.", "error");
        } finally {
            setAdding(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onMouseDown={(e) =>
                modalRef.current && !modalRef.current.contains(e.target) && setShowAdd(false)
            }
        >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div
                ref={modalRef}
                className="relative w-11/12 max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-4 flex items-center justify-center gap-2 font-semibold text-lg">
                    <UserCircle2 className="w-6 h-6" />
                    Thêm nhân viên mới
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <form onSubmit={handleAddMember} className="space-y-4">
                        <div>
                            <label className="block font-medium mb-1">Tên chính</label>
                            <input
                                value={form.realName}
                                onChange={(e) => setForm({ ...form, realName: e.target.value })}
                                className="w-full border rounded-lg p-2 bg-gray-50 dark:bg-gray-800"
                                placeholder="VD: Nguyễn Văn A"
                                required
                            />
                        </div>

                        <div>
                            <label className="block font-medium mb-1">Tên phụ</label>
                            <input
                                value={form.nickname}
                                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                                className="w-full border rounded-lg p-2 bg-gray-50 dark:bg-gray-800"
                                placeholder="VD: A"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block font-medium mb-1">Ca làm việc</label>
                                <select
                                    value={form.shift}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const start = val === "Ca đêm" ? "20:00" : "08:00";
                                        setForm({ ...form, shift: val, shiftStart: start });
                                    }}
                                    className="w-full border rounded-lg p-2 bg-gray-50 dark:bg-gray-800"
                                >
                                    <option value="Ca ngày">Ca ngày</option>
                                    <option value="Ca đêm">Ca đêm</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-medium mb-1">Giờ bắt đầu</label>
                                <input
                                    type="text"
                                    value={form.shiftStart}
                                    onChange={(e) => setForm({ ...form, shiftStart: e.target.value })}
                                    className="w-full border rounded-lg p-2 bg-gray-50 dark:bg-gray-800"
                                />
                            </div>
                        </div>

                        {/* restDay */}
                        <div>
                            <label className="block font-medium mb-1">Ngày nghỉ luân phiên</label>
                            <button
                                type="button"
                                onClick={() => setShowDayPopup(true)}
                                className="w-full border rounded-lg p-2 bg-gray-50 dark:bg-gray-800 flex justify-between items-center"
                            >
                                <span>{form.restDay}</span>
                                <CalendarDays className="w-4 h-4 opacity-70" />
                            </button>
                        </div>

                        {/* nhánh tăng ca */}
                        {/* nhánh tăng ca */}
                        <div>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={form.applyLimit}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setForm({ ...form, applyLimit: checked });
                                        if (checked) setShowBranchPopup(true);
                                        else {
                                            setSelectedLimitKey(null);
                                            setSelectedLimitOption(null);
                                        }
                                    }}
                                    className="w-4 h-4 accent-indigo-600"
                                />
                                <span className="font-medium">
                                    Áp dụng giới hạn tăng ca của nhánh hiện có
                                </span>
                            </label>

                            {form.applyLimit && (
                                <div className="mt-2 text-sm text-gray-500">
                                    {selectedLimitKey ? (
                                        <span>
                                            Đã chọn:{" "}
                                            <span className="font-semibold text-indigo-600">
                                                {selectedLimitKey}h
                                            </span>
                                            {selectedLimitOption ? (
                                                <span className="ml-1 text-gray-400">
                                                    → {selectedLimitOption.days} ngày × {selectedLimitOption.perDay}h/ngày
                                                </span>
                                            ) : (
                                                <span className="ml-1 italic text-gray-400">
                                                    (chưa chọn phân bổ)
                                                </span>
                                            )}
                                        </span>
                                    ) : (
                                        <span className="italic text-gray-400">Chưa chọn nhánh</span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setShowBranchPopup(true)}
                                        className="ml-2 text-indigo-500 underline hover:text-indigo-700"
                                    >
                                        Chọn lại
                                    </button>
                                </div>
                            )}
                        </div>


                        {/* Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                disabled={adding}
                                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-2 rounded-lg flex justify-center items-center gap-2"
                            >
                                {adding ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <UserPlus className="w-4 h-4" />
                                )}
                                {adding ? "Đang lưu..." : "Lưu nhân viên"}
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowAdd(false)}
                                className="flex-1 bg-gray-300 dark:bg-gray-700 py-2 rounded-lg"
                            >
                                <Undo2 className="w-4 h-4 inline-block mr-1" /> Quay lại
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {showDayPopup && <DayPopup form={form} setForm={setForm} setShowDayPopup={setShowDayPopup} />}
            {showBranchPopup && (
                <BranchPopup
                    tree={tree}
                    loadingTree={loadingTree}
                    showToast={showToast}
                    setShowBranchPopup={setShowBranchPopup}
                    selectedLimitKey={selectedLimitKey}
                    setSelectedLimitKey={setSelectedLimitKey}
                    selectedLimitOption={selectedLimitOption}
                    setSelectedLimitOption={setSelectedLimitOption}
                />
            )}
        </div>
    );
}
