import {
  updateProfile,
  updatePassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { useState, useEffect } from "react";
import {
  X, User, Edit3, Lock, Trash2, CheckCircle2, AlertTriangle, Eye, EyeOff,
} from "lucide-react";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { ICONS } from "../utils/iconUtils";

const COLORS = [
  "#3B82F6", // xanh dương
  "#10B981", // xanh lục
  "#F59E0B", // vàng cam
  "#cb2727ff", // đỏ
  "#8B5CF6", // tím
  "#EC4899", // hồng
  "#6B7280", // xám
  "#14B8A6", // teal ngọc xanh
  "#84CC16", // xanh non sáng
  "#f11338ff", // hồng đậm (khác tone #EC4899)
  "#0EA5E9", // cyan sáng
  "#A16207"  // nâu vàng đất (ấm, tương phản tốt)
];



export default function AccountPopup({ user, onClose }) {
  // ========================
  // State quản lý
  // ========================
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [selectedIcon, setSelectedIcon] = useState(user.avatar || "User");
  const [selectedColor, setSelectedColor] = useState(user.avatarColor || "#3B82F6");
  const [toast, setToast] = useState(null);

  // Popup điều khiển
  const [showNamePopup, setShowNamePopup] = useState(false);
  const [showPasswordPopup, setShowPasswordPopup] = useState(false);
  const [showAvatarPopup, setShowAvatarPopup] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [showReauthPopup, setShowReauthPopup] = useState(false);

  // Trạng thái phụ
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [reauthPassword, setReauthPassword] = useState("");
  const [pendingDelete, setPendingDelete] = useState(false);

  // ========================
  // Toast tiện ích
  // ========================
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const showToast = (msg, type = "success") => setToast({ msg, type });

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      const date = d.toLocaleDateString("vi-VN");
      return `${time} || ${date}`;
    } catch {
      return "Không xác định";
    }
  };

  // ========================
  // Hàm xử lý cập nhật / xóa
  // ========================
  const handleSave = async (fields) => {
    const currentUser = auth.currentUser;
    const userRef = doc(db, "users", user.uid);
    try {
      if (fields.displayName) {
        await updateProfile(currentUser, { displayName });
        await updateDoc(userRef, { displayName, avatar: selectedIcon, avatarColor: selectedColor });
        showToast("Cập nhật tên hiển thị thành công!");
      }

      if (fields.avatar) {
        await updateDoc(userRef, { avatar: fields.avatar, avatarColor: fields.avatarColor });
        setSelectedIcon(fields.avatar);
        setSelectedColor(fields.avatarColor);
        showToast("Cập nhật biểu tượng thành công!");
      }

      if (fields.password) {
        await updatePassword(currentUser, fields.password);
        showToast("Đổi mật khẩu thành công!");
      }

      if (fields.deleted) {
        try {
          await deleteDoc(userRef);
          await deleteUser(currentUser);
          window.location.href = "/login";
        } catch (err) {
          if (err.code === "auth/requires-recent-login") {
            setPendingDelete(true);
            setShowReauthPopup(true);
            showToast("Vui lòng xác thực lại để xóa tài khoản.", "error");
          } else {
            showToast("Lỗi khi xóa tài khoản: " + err.message, "error");
          }
        }
      }
    } catch (e) {
      showToast("Lỗi: " + e.message, "error");
    }
  };

  // ========================
  // JSX chính
  // ========================
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) =>
        e.target === e.currentTarget &&
        onClose({ displayName, avatar: selectedIcon, avatarColor: selectedColor })
      }
    >
      <div
        className="bg-white rounded-3xl shadow-2xl p-6 w-80 sm:w-96 border border-gray-100 relative animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng */}
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition"
          onClick={() => onClose({ displayName, avatar: selectedIcon, avatarColor: selectedColor })}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Thông tin tài khoản */}
        <h2 className="text-lg font-semibold text-gray-800 text-center mb-3">
          Thông tin tài khoản
        </h2>
        <div className="text-sm text-gray-600 text-center space-y-2">
          <div className="flex flex-col items-center gap-2">
            {(() => {
              const Icon = ICONS.find((i) => i.name === selectedIcon)?.icon || User;
              return <Icon className="w-10 h-10" style={{ color: selectedColor }} />;
            })()}
            <span className="font-medium text-gray-800">{displayName || "Người dùng ẩn danh"}</span>
            <span className="text-xs text-gray-400">{user.email}</span>
          </div>
          <p className="text-xs text-gray-400">
            Ngày tạo: {formatDate(user.metadata?.creationTime)}
          </p>
        </div>

        {/* Các nút hành động */}
        <div className="flex justify-center gap-4 mt-5">
          <ActionButton icon={Edit3} onClick={() => setShowNamePopup(true)} />
          <ActionButton icon={Lock} onClick={() => setShowPasswordPopup(true)} />
          <ActionButton icon={User} onClick={() => setShowAvatarPopup(true)} />
          <ActionButton icon={Trash2} color="red" onClick={() => setShowDeletePopup(true)} />
        </div>

        {/* Các popup chức năng */}
        {showNamePopup && (
          <PopupContainer onClose={() => setShowNamePopup(false)}>
            <PopupName {...{ displayName, setDisplayName, handleSave, setShowNamePopup }} />
          </PopupContainer>
        )}

        {showPasswordPopup && (
          <PopupPassword {...{ showToast, setShowPasswordPopup }} />
        )}

        {showAvatarPopup && (
          <PopupAvatar
            {...{ ICONS, COLORS, selectedIcon, setSelectedIcon, selectedColor, setSelectedColor, handleSave, setShowAvatarPopup }}
          />
        )}

        {showDeletePopup && (
          <PopupDelete
            {...{ displayName, deleteConfirm, setDeleteConfirm, handleSave, showToast, setShowDeletePopup }}
          />
        )}

        {showReauthPopup && (
          <PopupReauth
            {...{ user, reauthPassword, setReauthPassword, pendingDelete, setPendingDelete, setShowReauthPopup, showToast }}
          />
        )}

        {/* Toast thông báo */}
        {toast && (
          <div
            className={`fixed top-6 right-6 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-white text-sm animate-fadeIn z-[100] ${toast.type === "error" ? "bg-red-500" : "bg-green-500"
              }`}
          >
            {toast.type === "error" ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{toast.msg}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ========================
// Các component con
// ========================

const ActionButton = ({ icon: Icon, color = "gray", ...props }) => (
  <button {...props} className={`p-2 text-${color}-500 hover:bg-${color}-50 rounded-full transition`}>
    <Icon className="w-5 h-5" />
  </button>
);

const PopupContainer = ({ children, onClose }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
    <div className="bg-white rounded-2xl p-5 w-72 shadow-xl" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  </div>
);

// Popup đổi tên
const PopupName = ({ displayName, setDisplayName, handleSave, setShowNamePopup }) => (
  <>
    <h3 className="text-sm font-medium text-gray-800 mb-3">Nhập tên hiển thị mới</h3>
    <input
      value={displayName}
      onChange={(e) => setDisplayName(e.target.value)}
      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
    />
    <button
      onClick={() => {
        handleSave({ displayName });
        setShowNamePopup(false);
      }}
      className="mt-3 w-full bg-indigo-500 hover:bg-indigo-600 text-white py-1.5 rounded-lg text-sm"
    >
      Lưu
    </button>
  </>
);

// Popup đổi mật khẩu
const PopupPassword = ({ showToast, setShowPasswordPopup }) => {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [step2, setStep2] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <PopupContainer onClose={() => setShowPasswordPopup(false)}>
      <h3 className="text-base font-semibold text-gray-800 mb-4 text-center">Đổi mật khẩu</h3>
      {!step2 ? (
        <>
          <InputPw label="Mật khẩu hiện tại" value={oldPw} setValue={setOldPw} show={showOld} setShow={setShowOld} />
          <button
            onClick={async () => {
              try {
                const cred = EmailAuthProvider.credential(auth.currentUser.email, oldPw);
                await reauthenticateWithCredential(auth.currentUser, cred);
                showToast("✅ Xác thực thành công!");
                setStep2(true);
              } catch {
                showToast("Sai mật khẩu hiện tại!", "error");
              }
            }}
            className="mt-4 w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-lg text-sm"
          >
            Tiếp tục
          </button>
        </>
      ) : (
        <>
          <InputPw label="Mật khẩu mới" value={newPw} setValue={setNewPw} show={showNew} setShow={setShowNew} />
          <InputPw label="Xác nhận mật khẩu" value={confirmPw} setValue={setConfirmPw} show={showConfirm} setShow={setShowConfirm} />
          <button
            onClick={async () => {
              if (!newPw || !confirmPw) return showToast("Vui lòng nhập đủ!", "error");
              if (newPw !== confirmPw) return showToast("Mật khẩu xác nhận không khớp!", "error");
              await updatePassword(auth.currentUser, newPw);
              showToast("🎉 Đổi mật khẩu thành công!");
              setShowPasswordPopup(false);
            }}
            className="mt-4 w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-lg text-sm"
          >
            Đổi mật khẩu
          </button>
        </>
      )}
    </PopupContainer>
  );
};

const InputPw = ({ label, value, setValue, show, setShow }) => (
  <div className="relative mb-3">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      type={show ? "text" : "password"}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none pr-9"
    />
    <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-8 text-gray-400 hover:text-gray-600">
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  </div>
);

// Popup chọn avatar
const PopupAvatar = ({
  ICONS,
  COLORS,
  selectedIcon,
  setSelectedIcon,
  selectedColor,
  setSelectedColor,
  handleSave,
  setShowAvatarPopup,
}) => (
  <PopupContainer onClose={() => setShowAvatarPopup(false)}>
    <h3 className="text-sm font-medium text-gray-800 mb-3 text-center">Chọn biểu tượng</h3>

    {/* Danh sách icon */}
    <div className="flex flex-wrap gap-2 justify-center">
      {ICONS.map(({ name, icon: Icon }) => {
        const isActive = selectedIcon === name;
        const borderColor = isActive ? selectedColor : "#e5e7eb"; // gray-200
        const bgColor = isActive ? `${selectedColor}20` : "transparent"; // nền mờ (20 ≈ 12% opacity)
        return (
          <button
            key={name}
            type="button"
            onClick={() => setSelectedIcon(name)}
            className={`p-2 rounded-lg border transition-transform duration-200 ${isActive ? "scale-110 shadow-md" : "hover:bg-gray-50"
              }`}
            style={{ borderColor, backgroundColor: bgColor }}
          >
            <Icon
              className="w-5 h-5 transition"
              style={{ color: isActive ? selectedColor : "#6b7280" }}
            />
          </button>
        );
      })}
    </div>

    {/* Chọn màu biểu tượng */}
    <div className="mt-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">Màu biểu tượng</label>
      <div className="flex flex-wrap gap-2 justify-center">
        {COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => setSelectedColor(color)}
            className={`w-8 h-8 rounded-full border-2 transition ${selectedColor === color ? "border-indigo-500 scale-110" : "border-gray-200"
              }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>

    <button
      onClick={async () => {
        await handleSave({ avatar: selectedIcon, avatarColor: selectedColor });
        setShowAvatarPopup(false);
      }}
      className="mt-4 w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-lg text-sm"
    >
      Lưu biểu tượng
    </button>
  </PopupContainer>
);


// Popup xác nhận xóa
const PopupDelete = ({ displayName, deleteConfirm, setDeleteConfirm, handleSave, showToast, setShowDeletePopup }) => (
  <PopupContainer onClose={() => setShowDeletePopup(false)}>
    <h3 className="text-sm font-medium text-red-600 mb-3 text-center">Nhập lại tên để xác nhận xóa</h3>
    <input
      type="text"
      placeholder={displayName}
      value={deleteConfirm}
      onChange={(e) => setDeleteConfirm(e.target.value)}
      className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-300 outline-none"
    />
    <button
      onClick={() => {
        if (deleteConfirm === displayName) handleSave({ deleted: true });
        else showToast("Tên không khớp!", "error");
        setShowDeletePopup(false);
      }}
      className="mt-3 w-full bg-red-500 hover:bg-red-600 text-white py-1.5 rounded-lg text-sm"
    >
      Xóa tài khoản
    </button>
  </PopupContainer>
);

// Popup xác thực lại
const PopupReauth = ({ user, reauthPassword, setReauthPassword, pendingDelete, setPendingDelete, setShowReauthPopup, showToast }) => (
  <PopupContainer onClose={() => setShowReauthPopup(false)}>
    <h3 className="text-sm font-medium text-gray-800 mb-3 text-center">Xác thực lại để tiếp tục</h3>
    <input
      type="password"
      placeholder="Nhập lại mật khẩu"
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
      value={reauthPassword}
      onChange={(e) => setReauthPassword(e.target.value)}
    />
    <button
      onClick={async () => {
        try {
          const cred = EmailAuthProvider.credential(user.email, reauthPassword);
          await reauthenticateWithCredential(auth.currentUser, cred);
          showToast("✅ Xác thực lại thành công!");
          setShowReauthPopup(false);
          if (pendingDelete) {
            const userRef = doc(db, "users", user.uid);
            await deleteDoc(userRef);
            await deleteUser(auth.currentUser);
            window.location.href = "/login";
          }
        } catch {
          showToast("Sai mật khẩu, vui lòng thử lại.", "error");
        } finally {
          setPendingDelete(false);
          setReauthPassword("");
        }
      }}
      className="mt-3 w-full bg-indigo-500 hover:bg-indigo-600 text-white py-1.5 rounded-lg text-sm"
    >
      Xác thực
    </button>
  </PopupContainer>
);
