import { useState, useEffect } from "react";
import { useAppStore } from "../../store";
import { DealerShowroom, DealerReview, Car } from "../../types";
import { showroomService, ShowroomInsights } from "../../services/showroom/showroomService";

export function useShowroom() {
  const {
    dealers,
    selectedDealerId,
    cars,
    setView,
    followedDealers,
    toggleFollowDealer,
    addDealerReview
  } = useAppStore();

  const [insights, setInsights] = useState<ShowroomInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // 1. Resolve current active dealer showroom
  const currentDealer = dealers.find((d) => d.id === selectedDealerId) || dealers[0];

  // 2. Filter cars belonging to this dealer
  // Some mock cars in localCarsInventory have ownerId: "dealer-001" or match dealer name
  const dealerCars = cars.filter((car) => {
    return (
      car.ownerId === currentDealer.id ||
      car.dealerId === currentDealer.id ||
      (car.ownerName && car.ownerName.toLowerCase().includes(currentDealer.name.toLowerCase()))
    );
  });

  // Featured car is whichever has the highest price or first EV/Luxury
  const featuredCar = dealerCars.find(c => c.type === "luxury" || c.type === "ev") || dealerCars[0];

  // 3. Load AI-powered showroom insights dynamically from the service
  useEffect(() => {
    let active = true;
    if (!currentDealer) return;

    async function loadInsights() {
      setLoadingInsights(true);
      try {
        const result = await showroomService.getAIInsights(
          currentDealer.name,
          currentDealer.description,
          dealerCars
        );
        if (active) {
          setInsights(result);
        }
      } catch (err) {
        console.error("Hook insights fetch failed", err);
      } finally {
        if (active) {
          setLoadingInsights(false);
        }
      }
    }

    loadInsights();

    return () => {
      active = false;
    };
  }, [currentDealer?.id, dealerCars.length]);

  // 4. Follow toggler
  const isFollowing = followedDealers.includes(currentDealer.id);
  const handleToggleFollow = () => {
    toggleFollowDealer(currentDealer.id);
  };

  // 5. Submit review helper
  const handleSubmitReview = (reviewerName: string, rating: number, comment: string, carModel?: string) => {
    if (!reviewerName) reviewerName = "ผู้เข้าชมทั่วไป";
    addDealerReview(currentDealer.id, {
      reviewerName,
      rating,
      comment,
      buyerOfCar: carModel,
      verifiedPurchase: !!carModel
    });
  };

  // 6. Share dealer website / showroom link
  const handleShareShowroom = () => {
    const shareUrl = `${window.location.origin}/dealers/${currentDealer.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      alert(`🔗 คัดลอกลิงก์แชร์โชว์รูม "${currentDealer.name}" ไปที่คลิปบอร์ดแล้วครับพี่! ส่งต่อทราฟฟิกได้ทันที`);
    } else {
      alert(`โชว์รูมลิงก์: ${shareUrl}`);
    }
  };

  return {
    currentDealer,
    dealerCars,
    featuredCar,
    insights,
    loadingInsights,
    isFollowing,
    handleToggleFollow,
    handleSubmitReview,
    handleShareShowroom,
    setView
  };
}
