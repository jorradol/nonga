import { useState, useEffect } from "react";
import { useAuthContext } from "../../contexts/auth/AuthContext";
import { userService, UserProfileData } from "../../services/user/userService";
import { useAppStore } from "../../store";
import { Car } from "../../types";

export interface ToastInfo {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export function useUserProfile() {
  const { user, updateUserProfile, isSimulatedState } = useAuthContext();
  const cars = useAppStore((state) => state.cars);
  const storeFavorites = useAppStore((state) => state.favorites);
  const triggerStoreToggleFav = useAppStore((state) => state.toggleFavorite);

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  // Simple in-app toast utility
  const showToast = (message: string, type: ToastInfo["type"] = "success") => {
    const id = `${Date.now()}`;
    const newToast = { id, message, type };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  /**
   * Safely updates user display name and AI Persona
   */
  const updateProfileFields = async (displayName: string, aiPersona: string) => {
    if (!user) {
      showToast("กรุณาเข้าสู่ระบบก่อนอัปเดตแกนข้อมูลครับ", "error");
      return;
    }

    setIsLoading(true);
    // Optimistic UI Update
    const oldDisplayName = user.displayName;
    const oldPersona = user.aiPersona ?? "";

    try {
      await updateUserProfile({
        displayName,
        aiPersona
      });
      showToast("ปรับปรุงข้อมูลประวัติผู้ขายและระดับสไตล์ AI สำเร็จแล้วครับ! 🎉");
    } catch (err: any) {
      showToast(err?.message || "ล้มเหลวในการบันทึกข้อมูลหลัก", "error");
      // rollback UI state if context allows
      await updateUserProfile({
        displayName: oldDisplayName,
        aiPersona: oldPersona
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles mock avatar uploads using files with loading feedback
   */
  const uploadAvatarImage = async (file: File) => {
    if (!user) return;
    
    // Check file size limit: 4MB
    if (file.size > 4 * 1024 * 1024) {
      showToast("ไฟล์รูปภาพจำเป็นต้องมีขนาดไม่เกิน 4MB นะครับ", "error");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    showToast("เริ่มจัดส่งรูปภาพเข้าคลังระบบจัดเก็บ...", "info");

    try {
      const updatedUrl = await userService.simulateAvatarUpload(
        user.uid,
        file,
        (progress) => setUploadProgress(progress)
      );

      await updateUserProfile({
        photoURL: updatedUrl
      });
      showToast("อัปเดตรูปอวาตาร์ศูนย์ซ่อมพรีเมียมเรียบร้อยแล้วคร้าบ! 🎨");
    } catch (err: any) {
      showToast("จัดเก็บล้มเหลว: " + err.message, "error");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Safe toggle favorite car listings with toast signals
   */
  const handleToggleFavorite = (carId: string, carTitle?: string) => {
    if (!user) {
      showToast("กรุณาเดินทางเซ็นอินเพื่อเลือกคันโปรดนะครับ", "info");
      return;
    }
    
    const isNowFav = !storeFavorites.includes(carId);
    triggerStoreToggleFav(carId);

    // Sync back to context/DB if possible
    const claimFavs = isNowFav 
      ? [...(user.favoriteCars || []), carId]
      : (user.favoriteCars || []).filter((id: string) => id !== carId);
    
    updateUserProfile({
      favoriteCars: claimFavs
    }).catch(e => console.warn("Background favorites DB sync deferred:", e));

    if (isNowFav) {
      showToast(`บันทึกรถยนต์ ${carTitle || "คันนี้"} เข้าประวัติบันทึกชอบแล้วครับ 🧡`);
    } else {
      showToast(`ลบรถยนต์ออกจากดีไซน์ส่วนตัวชอบเรียบร้อยครับ`);
    }
  };

  /**
   * Filter and map actual favorites from store
   */
  const getFavoriteCars = (): Car[] => {
    const listIds = user?.favoriteCars || storeFavorites || [];
    return cars.filter((car) => listIds.includes(car.id));
  };

  return {
    user,
    isLoading,
    isUploading,
    uploadProgress,
    toasts,
    showToast,
    updateProfileFields,
    uploadAvatarImage,
    handleToggleFavorite,
    getFavoriteCars,
    favoriteIds: user?.favoriteCars || storeFavorites || []
  };
}
