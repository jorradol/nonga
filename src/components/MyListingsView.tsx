import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppStore } from "../store";
import type { Car } from "../types";
import {
  ClipboardList,
  RefreshCw,
  CarFront,
  PlusCircle,
  Pencil,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { devClientMarketplaceLog } from "../utils/marketplaceCarMapper";
import { ListingCoverImage } from "./listings/ListingCoverImage";
import { useNotifyStore } from "../stores/notifyStore";
import EditListingModal from "./listings/EditListingModal";
import {
  fetchMyListings,
  patchMyListing,
  setMyListingVisibility,
  deleteMyListing,
  cancelPendingSaleRelist,
  type MyListingsApiScope,
} from "../services/listings/myListingsApi";
import {
  validateMemberListingRecordReadyToPublish,
} from "../services/listings/memberListingPublishGuard";
import { useDealerPortal } from "../hooks/dealer/useDealerPortal";
import { ListingLeadQueueSection } from "./leads/ListingLeadQueueSection";
import { MyRevenueStatementSection } from "./leads/MyRevenueStatementSection";
import {
  PENDING_SALE_OWNER_BADGE,
  PENDING_SALE_OWNER_NOTICE,
  CANCEL_PENDING_SALE_ACTION_LABEL,
  CANCEL_PENDING_SALE_CONFIRM_MESSAGE,
} from "../services/leads/listingSaleCopy";

export default function MyListingsView() {
  const { user, fetchCars, setView, setFilters, isDarkMode } = useAppStore();
  const { apiHeaders, canAccessPortal } = useDealerPortal();
  const notifyFriendlyError = useNotifyStore((s) => s.notifyFriendlyError);
  const notifySuccess = useNotifyStore((s) => s.notifySuccess);

  const ownerId = user?.uid ?? "";
  const listingApiScope: MyListingsApiScope = useMemo(
    () => ({
      ownerId,
      ...(canAccessPortal && apiHeaders ? { dealerHeaders: apiHeaders } : {}),
    }),
    [apiHeaders, canAccessPortal, ownerId]
  );
  const [myCars, setMyCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [friendlyHint, setFriendlyHint] = useState<string | null>(null);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [cancelPendingSaleId, setCancelPendingSaleId] = useState<string | null>(null);
  const [revenueRefreshSignal, setRevenueRefreshSignal] = useState(0);

  const load = useCallback(async () => {
    if (!ownerId) {
      setMyCars([]);
      setLoading(false);
      setLoadFailed(false);
      setFriendlyHint(null);
      return;
    }
    setLoading(true);
    setLoadFailed(false);
    setFriendlyHint(null);
    try {
      const data = await fetchMyListings(listingApiScope);
      setMyCars(data);
      devClientMarketplaceLog("my-listings", {
        ownerId,
        mine: data.length,
        source: canAccessPortal
          ? "GET /api/dealer/inventory"
          : "GET /api/my/listings",
      });
    } catch (e) {
      const friendly = notifyFriendlyError(e, "โหลดประกาศของฉัน");
      setLoadFailed(true);
      setFriendlyHint(friendly.friendlyMessage.split("\n")[0]);
      setMyCars([]);
    } finally {
      setLoading(false);
    }
  }, [canAccessPortal, listingApiScope, notifyFriendlyError, ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshMarketplace = async () => {
    await fetchCars();
    await load();
  };

  const handleCancelPendingSale = async (car: Car) => {
    setActionId(car.id);
    try {
      const result = await cancelPendingSaleRelist(listingApiScope, car.id);
      setCancelPendingSaleId(null);
      await load();
      await fetchCars();
      setRevenueRefreshSignal(Date.now());
      if (result.published) {
        notifySuccess("กลับไปขายต่อแล้วค่ะ", result.message);
      } else {
        notifyFriendlyError(new Error(result.message), "ยกเลิกสถานะรอขาย");
      }
    } catch (e) {
      notifyFriendlyError(e, "ยกเลิกสถานะรอขาย");
    } finally {
      setActionId(null);
    }
  };

  const handleVisibility = async (car: Car) => {
    if (car.saleStatus === "pending_sale") {
      notifyFriendlyError(
        new Error(
          "รถคันนี้อยู่ระหว่างดำเนินการขาย กรุณาใช้ปุ่ม “ยกเลิกดีล / กลับไปขายต่อ” ครับ"
        ),
        "เปลี่ยนการแสดงประกาศ"
      );
      return;
    }
    const hidden = car.listingStatus !== "hidden";
    if (!hidden) {
      const readiness = validateMemberListingRecordReadyToPublish(car);
      if (readiness.ok === false) {
        notifyFriendlyError(new Error(readiness.message), "เผยแพร่ประกาศ");
        return;
      }
    }

    const msg = hidden
      ? "ซ่อนประกาศนี้จากตลาด?"
      : "แสดงประกาศนี้ในตลาดอีกครั้ง?";
    if (!confirm(msg)) return;

    setActionId(car.id);
    try {
      const updated = await setMyListingVisibility(
        listingApiScope,
        car.id,
        hidden
      );
      setMyCars((list) =>
        list.map((c) => (c.id === updated.id ? updated : c))
      );
      await fetchCars();
      notifySuccess(
        hidden ? "ซ่อนประกาศแล้วค่ะ" : "แสดงประกาศในตลาดแล้วค่ะ",
        hidden
          ? "รายการนี้จะไม่โผล่ในตลาดรถจนกว่าจะกดแสดงอีกครั้ง"
          : "ลูกค้าสามารถเห็นในตลาดได้แล้วนะคะ"
      );
    } catch (e) {
      notifyFriendlyError(e, "เปลี่ยนสถานะประกาศ");
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (car: Car) => {
    if (
      !confirm(
        `ลบประกาศ "${car.title}" ถาวร?\n\nการลบไม่สามารถย้อนกลับได้ — ถ้าต้องการซ่อนชั่วคราว ให้ใช้ปุ่ม "ซ่อน" แทน`
      )
    ) {
      return;
    }

    setActionId(car.id);
    try {
      await deleteMyListing(listingApiScope, car.id, true);
      setMyCars((list) => list.filter((c) => c.id !== car.id));
      await fetchCars();
      notifySuccess("ลบประกาศแล้วค่ะ", "รายการนี้ถูกลบออกจากระบบแล้วนะคะ");
    } catch (e) {
      notifyFriendlyError(e, "ลบประกาศ");
    } finally {
      setActionId(null);
    }
  };

  const openInMarketplace = (car: Car) => {
    setFilters({ search: car.title });
    setView("marketplace", car.id);
  };

  const panel = isDarkMode
    ? "border-slate-800 bg-slate-900/50"
    : "border-slate-200 bg-white";

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-orange-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <ClipboardList className="w-4 h-4" />
            จัดการประกาศ
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">
            ประกาศของฉัน
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            แก้ไข ซ่อน หรือลบประกาศของคุณได้จากหน้านี้
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => refreshMarketplace()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs hover:bg-slate-800 transition"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
            โหลดใหม่
          </button>
          <button
            type="button"
            onClick={() => setView("sell")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 transition"
          >
            <PlusCircle className="w-4 h-4" />
            ลงประกาศใหม่
          </button>
        </div>
      </div>

      {ownerId ? (
        <MyRevenueStatementSection
          scope={listingApiScope}
          isDarkMode={isDarkMode}
          refreshSignal={revenueRefreshSignal}
        />
      ) : null}

      {loadFailed && (
        <div
          className={`p-6 rounded-2xl border flex gap-4 ${
            isDarkMode
              ? "bg-slate-900/50 border-amber-500/25"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <AlertCircle className="w-8 h-8 text-amber-400 shrink-0" />
          <div className="text-left space-y-2">
            <h2 className="font-bold text-sm">น้องเอโหลดรายการไม่สำเร็จค่ะ</h2>
            <p className="text-sm text-slate-400 whitespace-pre-line">
              {friendlyHint ??
                "ลองกดโหลดใหม่ หรือรีเฟรชหน้าเว็บนะคะ\nถ้ายังไม่หาย อาจต้อง restart npm run dev ค่ะ"}
            </p>
            <button
              type="button"
              onClick={() => load()}
              className="px-4 py-2 rounded-lg bg-orange-600 text-white text-xs font-bold"
            >
              ลองโหลดอีกครั้ง
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : !loadFailed && myCars.length === 0 ? (
        <div
          className={`p-12 text-center rounded-2xl border space-y-4 ${
            isDarkMode
              ? "bg-slate-900/30 border-slate-800"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <CarFront className="w-12 h-12 mx-auto text-slate-500" />
          <h2 className="font-bold text-lg">ยังไม่มีประกาศของคุณในระบบ</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            คุยกับน้องเอในแชทเพื่อสร้างประกาศรถบ้านแรก — ส่งรูปและข้อมูล แล้วน้องเอจะช่วยร่างประกาศให้
            จากนั้นเข้าสู่ระบบ บันทึก และลงตลาดได้เลย
          </p>
          <button
            type="button"
            onClick={() => setView("chat")}
            className="px-6 py-3 bg-orange-600 text-white rounded-xl text-sm font-bold"
          >
            ไปคุยกับน้องเอ
          </button>
        </div>
      ) : !loadFailed ? (
        <div className="space-y-3">
          {myCars.map((car) => {
            const busy = actionId === car.id;
            const hidden = car.listingStatus === "hidden";
            const pendingSale = car.saleStatus === "pending_sale";

            return (
              <article
                key={car.id}
                className={`p-4 rounded-2xl border flex flex-col gap-4 ${panel}`}
                data-testid="my-listings-card"
                data-listing-id={car.id}
              >
                <div
                  className="flex flex-col lg:flex-row gap-4 min-w-0"
                  data-testid="my-listings-card-main"
                  data-layout="my-listings-card-main-row"
                >
                <div className="relative w-full lg:w-44 h-28 shrink-0 rounded-xl overflow-hidden bg-slate-800">
                  <ListingCoverImage
                    listingId={car.id}
                    images={car.images}
                    alt={car.title}
                    className="w-full h-full object-cover"
                    testId="my-listings-card-image"
                  />
                </div>
                <div className="flex-1 space-y-2 text-left min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-sm truncate">{car.title}</h3>
                    {pendingSale ? (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300"
                        data-testid="my-listings-pending-sale-badge"
                      >
                        {PENDING_SALE_OWNER_BADGE}
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          hidden
                            ? "bg-slate-700 text-slate-300"
                            : "bg-green-500/15 text-green-400"
                        }`}
                      >
                        {hidden ? "ซ่อนอยู่" : "แสดงในตลาด"}
                      </span>
                    )}
                  </div>
                  {pendingSale ? (
                    <div className="space-y-2" data-testid="my-listings-pending-sale-block">
                      <p
                        className="text-[11px] text-amber-200/90 leading-relaxed"
                        data-testid="my-listings-pending-sale-notice"
                      >
                        {PENDING_SALE_OWNER_NOTICE}
                      </p>
                      {cancelPendingSaleId === car.id ? (
                        <div
                          className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-2 space-y-2"
                          data-testid="my-listings-cancel-pending-sale-confirm"
                        >
                          <p className="text-[11px] text-amber-100 leading-relaxed">
                            {CANCEL_PENDING_SALE_CONFIRM_MESSAGE}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleCancelPendingSale(car)}
                              className="px-3 py-2 text-[11px] font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                              data-testid="my-listings-cancel-pending-sale-confirm-btn"
                            >
                              {busy ? "กำลังดำเนินการ…" : "ยืนยันกลับไปขายต่อ"}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setCancelPendingSaleId(null)}
                              className="px-3 py-2 text-[11px] font-semibold rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                              data-testid="my-listings-cancel-pending-sale-cancel-btn"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={busy || canAccessPortal}
                          onClick={() => setCancelPendingSaleId(car.id)}
                          className="w-full sm:w-auto px-3 py-2 text-[11px] font-semibold rounded-lg border border-amber-500/50 text-amber-200 hover:bg-amber-500/10 disabled:opacity-40"
                          data-testid="my-listings-cancel-pending-sale-btn"
                        >
                          {CANCEL_PENDING_SALE_ACTION_LABEL}
                        </button>
                      )}
                    </div>
                  ) : null}
                  <p className="text-xs text-slate-400 font-mono truncate">
                    ID: {car.id}
                  </p>
                  <p className="text-xs text-orange-400 font-semibold">
                    ฿{car.price.toLocaleString("th-TH")} · {car.year} ·{" "}
                    {car.mileage.toLocaleString()} กม.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    ลงเมื่อ{" "}
                    {new Date(car.createdAt).toLocaleString("th-TH")}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 shrink-0 lg:flex-col lg:items-stretch">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setEditingCar(car)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    แก้ไข
                  </button>
                  {!pendingSale ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleVisibility(car)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                    >
                      {hidden ? (
                        <>
                          <Eye className="w-3.5 h-3.5" /> แสดงอีกครั้ง
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> ซ่อนประกาศ
                        </>
                      )}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy || hidden}
                    onClick={() => openInMarketplace(car)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 disabled:opacity-40"
                    title={hidden ? "ต้องแสดงประกาศก่อนจึงจะเห็นในตลาด" : ""}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    ดูในตลาด
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDelete(car)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    ลบ
                  </button>
                </div>
                </div>
                {ownerId ? (
                  <ListingLeadQueueSection
                    listingId={car.id}
                    isListingOwnerContext
                    isDarkMode={isDarkMode}
                  />
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}

      {editingCar && (
        <EditListingModal
          car={editingCar}
          ownerId={ownerId}
          listingApiScope={listingApiScope}
          isDarkMode={isDarkMode}
          onClose={() => setEditingCar(null)}
          onSave={async (patch) => {
            try {
              const updated = await patchMyListing(
                listingApiScope,
                editingCar.id,
                patch
              );
              setMyCars((list) =>
                list.map((c) => (c.id === updated.id ? updated : c))
              );
              await fetchCars();
              notifySuccess("บันทึกการแก้ไขแล้วค่ะ", updated.title);
              setEditingCar(null);
            } catch (e) {
              notifyFriendlyError(e, "บันทึกประกาศ");
              throw e;
            }
          }}
        />
      )}
    </div>
  );
}
