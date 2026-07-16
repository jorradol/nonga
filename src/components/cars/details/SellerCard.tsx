import React from "react";
import { Phone, MapPin, MessageSquareCode, Store, ShieldCheck } from "lucide-react";
import { Car } from "../../../types";

interface SellerCardProps {
  car: Car;
  isDarkMode?: boolean;
  onContactClick?: () => void;
  onStartChat?: () => void;
}

function trimText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Resolve public seller/dealer display name from listing canonical fields only. */
export function resolveListingSellerDisplayName(car: Car): string {
  return (
    trimText(car.dealerDisplayName) ||
    trimText(car.sellerDisplayName) ||
    trimText(car.showroomName) ||
    trimText(car.ownerName)
  );
}

export function listingHasPublicDealerIdentity(car: Car): boolean {
  return (
    car.sellerType === "dealer" ||
    Boolean(trimText(car.dealerDisplayName)) ||
    Boolean(trimText(car.showroomName)) ||
    Boolean(trimText(car.dealerSlug))
  );
}

export function listingHasPublicContactPhone(car: Car): boolean {
  return Boolean(trimText(car.ownerPhone));
}

export default function SellerCard({
  car,
  isDarkMode = true,
  onContactClick,
  onStartChat,
}: SellerCardProps) {
  const isDealer = listingHasPublicDealerIdentity(car);
  const displayName = resolveListingSellerDisplayName(car);
  const locationLabel = trimText(car.province);
  const hasPhone = listingHasPublicContactPhone(car);
  const avatarLetter = (displayName[0] || (isDealer ? "D" : "S")).toUpperCase();

  return (
    <div
      className="p-6 rounded-3xl border nonga-bg-surface nonga-border nonga-text-primary shadow-2xl space-y-6 text-left"
      data-testid="car-detail-seller-card"
    >
      <span className="text-[10px] font-mono font-black nonga-text-muted uppercase tracking-widest block">
        ข้อมูลตัวแทนและโชว์รูมผู้ลงขาย (Dealer Profile)
      </span>

      <div className="flex items-start gap-4">
        <div className="relative shrink-0 select-none">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center font-display font-black text-white text-lg border border-orange-500/30">
            {isDealer ? (
              <Store className="w-6 h-6 text-white" aria-hidden />
            ) : (
              avatarLetter
            )}
          </div>
        </div>

        <div className="text-left leading-tight flex-1">
          <h4
            className="font-display font-black text-[15px] nonga-text-primary leading-snug"
            data-testid="car-detail-seller-name"
          >
            {displayName ||
              (isDealer
                ? "ข้อมูลดีลเลอร์ยังไม่พร้อมแสดง"
                : "ข้อมูลผู้ขายยังไม่พร้อมแสดง")}
          </h4>

          <p className="text-[11px] nonga-text-secondary mt-1">
            {isDealer ? "ดีลเลอร์จากประกาศนี้" : "ผู้ลงขายจากประกาศนี้"}
          </p>
        </div>
      </div>

      <div className="space-y-3 pt-2.5 border-t nonga-border text-xs">
        {locationLabel ? (
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4.5 h-4.5 text-[var(--nonga-action-primary)] shrink-0 mt-0.5" />
            <p className="nonga-text-secondary leading-normal">{locationLabel}</p>
          </div>
        ) : (
          <p
            className="nonga-text-muted text-[11px] leading-normal"
            data-testid="car-detail-seller-location-unavailable"
          >
            ยังไม่มีที่อยู่โชว์รูมสำหรับแสดงต่อสาธารณะ
          </p>
        )}

        {(car.licensePlateMasked || car.registrationProvince) && (
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4.5 h-4.5 text-[var(--nonga-info)] shrink-0 mt-0.5" />
            <p className="nonga-text-secondary leading-normal">
              ทะเบียน: {car.licensePlateMasked || "ปิดเลขทะเบียน"}{" "}
              {car.registrationProvince ? `(${car.registrationProvince})` : ""}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 z-10 relative">
        <button
          type="button"
          onClick={hasPhone ? onContactClick : undefined}
          disabled={!hasPhone}
          aria-disabled={!hasPhone}
          title={
            hasPhone
              ? "ติดต่อทางโทรศัพท์"
              : "ยังไม่มีเบอร์ติดต่อสาธารณะสำหรับประกาศนี้"
          }
          data-testid="car-detail-seller-phone"
          className={`flex items-center justify-center gap-2 py-3 px-4 font-bold rounded-xl text-xs transition-all text-center nonga-focus-ring ${
            hasPhone
              ? "nonga-action active:scale-95 shadow-md shadow-orange-600/10 cursor-pointer"
              : "nonga-bg-subtle border nonga-border nonga-text-muted cursor-not-allowed opacity-60"
          }`}
        >
          <Phone className="w-4 h-4" />
          <span>{hasPhone ? "นัดดูทางโทรศัพท์" : "ยังไม่มีเบอร์โทร"}</span>
        </button>

        <button
          type="button"
          onClick={onStartChat}
          data-testid="car-detail-seller-chat"
          className="flex items-center justify-center gap-2 py-3 px-4 nonga-bg-subtle border nonga-border-strong hover:bg-[var(--nonga-bg-elevated)] nonga-text-primary font-bold rounded-xl text-xs active:scale-95 transition-all cursor-pointer text-center nonga-focus-ring"
        >
          <MessageSquareCode className="w-4 h-4 text-[var(--nonga-action-primary)]" />
          <span>แชทปรึกษา น้องเอ</span>
        </button>
      </div>
    </div>
  );
}
