import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CarsService } from "../../services/cars";
import { CarListing } from "../../types/cars";

// Hook to fetch list of cars
export function useCars(filters?: {
  brand?: string;
  model?: string;
  status?: string;
  sellerId?: string;
  fuelType?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  limitCount?: number;
}) {
  return useQuery({
    queryKey: ["cars", filters],
    queryFn: () => CarsService.listCars(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

// Hook to fetch a single car by its ID
export function useCar(carId: string) {
  return useQuery({
    queryKey: ["car", carId],
    queryFn: () => CarsService.getCar(carId),
    enabled: !!carId,
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });
}

// Hook to create a new car listing
export function useCreateCar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      userId, 
      userRole, 
      carInput 
    }: { 
      userId: string; 
      userRole: string; 
      carInput: Omit<CarListing, "id" | "createdAt" | "updatedAt" | "totalViews" | "totalFavorites"> 
    }) => {
      return CarsService.createCar(userId, userRole, carInput);
    },
    onSuccess: (data) => {
      // Invalidate the listings queries to fetch fresh records
      queryClient.invalidateQueries({ queryKey: ["cars"] });
    },
  });
}

// Hook to update a car listing
export function useUpdateCar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      carId, 
      userId, 
      updates 
    }: { 
      carId: string; 
      userId: string; 
      updates: Partial<CarListing> 
    }) => {
      return CarsService.updateCar(carId, userId, updates);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      queryClient.invalidateQueries({ queryKey: ["car", variables.carId] });
    },
  });
}

// Hook to delete a car listing
export function useDeleteCar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      carId, 
      userId 
    }: { 
      carId: string; 
      userId: string 
    }) => {
      return CarsService.deleteCar(carId, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cars"] });
    },
  });
}

// Hook to toggle favorite status
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      carId, 
      userId 
    }: { 
      carId: string; 
      userId: string 
    }) => {
      return CarsService.toggleFavorite(carId, userId);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      queryClient.invalidateQueries({ queryKey: ["car", variables.carId] });
      queryClient.invalidateQueries({ queryKey: ["favorites", variables.userId] });
    },
  });
}

// Hook to record a view count
export function useRecordView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      carId, 
      userId, 
      ipAddress, 
      userAgent 
    }: { 
      carId: string; 
      userId?: string | null; 
      ipAddress?: string; 
      userAgent?: string 
    }) => {
      return CarsService.incrementViews(carId, userId, ipAddress, userAgent);
    },
    onSuccess: (data, variables) => {
      // Only invalidate single item so that view updates are reflected
      queryClient.invalidateQueries({ queryKey: ["car", variables.carId] });
    },
  });
}

// Hook to fetch comments of a car
export function useCarComments(carId: string) {
  return useQuery({
    queryKey: ["comments", carId],
    queryFn: () => CarsService.listComments(carId),
    enabled: !!carId,
  });
}

// Hook to post a comment
export function useAddCarComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      carId, 
      userId, 
      userDisplayName, 
      userPhotoURL, 
      commentText 
    }: { 
      carId: string; 
      userId: string; 
      userDisplayName: string; 
      userPhotoURL: string; 
      commentText: string 
    }) => {
      return CarsService.addComment(carId, userId, userDisplayName, userPhotoURL, commentText);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.carId] });
    },
  });
}

// Hook to submit issue report
export function useSubmitCarReport() {
  return useMutation({
    mutationFn: ({ 
      carId, 
      reporterId, 
      reporterEmail, 
      reason, 
      description 
    }: { 
      carId: string; 
      reporterId: string; 
      reporterEmail: string; 
      reason: string; 
      description?: string 
    }) => {
      return CarsService.submitReport(carId, reporterId, reporterEmail, reason, description);
    },
  });
}

// Hook to fetch and list dealers
export function useDealers() {
  return useQuery({
    queryKey: ["dealers"],
    queryFn: () => CarsService.listDealers(),
    staleTime: 1000 * 60 * 30, // 30 minutes cache
  });
}

// Hook to get brands
export function useCarBrands() {
  return useQuery({
    queryKey: ["car-brands"],
    queryFn: () => CarsService.listBrands(),
    staleTime: 1000 * 60 * 60, // 1 hour cache
  });
}

// Hook to get models
export function useCarModels(brandId?: string) {
  return useQuery({
    queryKey: ["car-models", brandId],
    queryFn: () => CarsService.listModels(brandId),
    staleTime: 1000 * 60 * 60, // 1 hour cache
  });
}
