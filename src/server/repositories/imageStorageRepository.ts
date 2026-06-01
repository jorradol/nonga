import fs from "fs";
import path from "path";
import { createHash, randomUUID } from "crypto";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { normalizeDealerId } from "../../utils/dealerIdentity";
import {
  getListingImagesRoot,
  saveListingImageUpload,
  saveProcessedListingImagePair,
} from "../listingImageStorage";
import { vehicleMetadataFromValidation } from "../vehicleImageValidation";
import type { ListingImageSetMetadataFields } from "../../utils/listingImageSetConsistencyShared";
import type { VehicleImageMetadataFields } from "../../utils/vehicleImageValidationShared";
import type { ProcessedImageExt } from "../listingImageProcessor";

export type NongaImageBackend = "file" | "firebase-storage";
export type ListingImageTargetType = "listing" | "draft";

export interface ImageUploadInput {
  buffer: Buffer;
  mimeType: string;
  imageId?: string;
  originalFileName?: string;
  seed?: string;
  width?: number;
  height?: number;
  sortOrder?: number;
  targetType?: ListingImageTargetType;
}

export interface ProcessedImagePairUploadInput {
  mainBuffer: Buffer;
  thumbBuffer: Buffer;
  ext: ProcessedImageExt;
  mimeType: string;
  imageId?: string;
  width: number;
  height: number;
  originalFileName?: string;
  seed?: string;
  sortOrder?: number;
  targetType?: ListingImageTargetType;
}

export interface StoredListingImageMetadata extends ListingImageSetMetadataFields {
  imageId: string;
  dealerId: string;
  listingId: string;
  targetType: ListingImageTargetType;
  fileName: string;
  originalFileName?: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  storagePath: string;
  publicUrl: string;
  downloadUrl?: string;
  imagePath: string;
  imageUrl: string;
  thumbnailPath?: string;
  thumbnailUrl?: string;
  createdAt: string;
  sortOrder: number;
}

export interface UploadListingImageResult {
  storedUrl: string;
  thumbnailUrl?: string;
  metadata: StoredListingImageMetadata;
}

export interface ImageStorageRepository {
  backend: NongaImageBackend;
  uploadListingImage(
    dealerId: string,
    listingId: string,
    input: ImageUploadInput
  ): Promise<UploadListingImageResult>;
  uploadListingImagePair(
    dealerId: string,
    listingId: string,
    input: ProcessedImagePairUploadInput
  ): Promise<UploadListingImageResult>;
  listListingImages(
    dealerId: string,
    listingId: string,
    targetType?: ListingImageTargetType
  ): Promise<StoredListingImageMetadata[]>;
  deleteListingImage(
    dealerId: string,
    listingId: string,
    imageId: string,
    targetType?: ListingImageTargetType
  ): Promise<boolean>;
  getPublicImageUrl(storagePath: string): string;
}

const SAFE_ID = /^[a-zA-Z0-9_-]+$/;
const SAFE_FILE_NAME = /^[a-zA-Z0-9_.-]+$/;
const DEFAULT_FIREBASE_BUCKET_SUFFIX = "appspot.com";

export const DEALER_IMAGE_STORAGE_COLLECTIONS = {
  listing: "listing-images",
  draft: "draft-images",
} as const;

function requireSafeId(label: string, value: string): string {
  const trimmed = String(value ?? "").trim();
  if (!SAFE_ID.test(trimmed)) {
    throw new Error(`${label} is invalid`);
  }
  return trimmed;
}

function requireSafeFileName(value: string): string {
  const trimmed = String(value ?? "").trim();
  if (!SAFE_FILE_NAME.test(trimmed) || trimmed.includes("/") || trimmed.includes("\\")) {
    throw new Error("fileName is invalid");
  }
  return trimmed;
}

function safeDealerId(dealerId: string): string {
  return requireSafeId("dealerId", normalizeDealerId(dealerId));
}

function safeListingId(listingId: string): string {
  return requireSafeId("listingId", listingId);
}

function extFromMime(mimeType: string): string {
  const mime = mimeType.toLowerCase();
  if (mime.includes("png")) return ".png";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("gif")) return ".gif";
  return ".jpg";
}

function hashSlug(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 10);
}

function nowIso(): string {
  return new Date().toISOString();
}

function resolveConfiguredStorageBucket(projectId?: string): string {
  return (
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
    process.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() ||
    (projectId ? `${projectId}.${DEFAULT_FIREBASE_BUCKET_SUFFIX}` : "")
  );
}

function filenameFromUrl(url: string): string {
  return url.split("/").pop() ?? "";
}

export function resolveImageStorageBackend(
  env: Partial<Pick<NodeJS.ProcessEnv, "NONGA_IMAGE_BACKEND">> = process.env
): NongaImageBackend {
  return String(env.NONGA_IMAGE_BACKEND ?? "file").toLowerCase() ===
    "firebase-storage"
    ? "firebase-storage"
    : "file";
}

export function firebaseImageCollectionPrefix(
  targetType: ListingImageTargetType = "listing"
): "listing-images" | "draft-images" {
  return targetType === "draft"
    ? DEALER_IMAGE_STORAGE_COLLECTIONS.draft
    : DEALER_IMAGE_STORAGE_COLLECTIONS.listing;
}

export function buildFirebaseImageStoragePath(
  dealerId: string,
  listingId: string,
  fileName: string,
  targetType: ListingImageTargetType = "listing"
): string {
  return [
    firebaseImageCollectionPrefix(targetType),
    safeDealerId(dealerId),
    safeListingId(listingId),
    requireSafeFileName(fileName),
  ].join("/");
}

function buildLocalMetadata(params: {
  dealerId: string;
  listingId: string;
  targetType: ListingImageTargetType;
  storedUrl: string;
  thumbnailUrl?: string;
  originalFileName?: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  sortOrder?: number;
  createdAt?: string;
  hasVehicle?: boolean;
  vehicleConfidence?: number;
  vehicleImageStatus?: VehicleImageMetadataFields["vehicleImageStatus"];
  vehicleImageReason?: string;
  imageRole?: ListingImageSetMetadataFields["imageRole"];
  imageSetConsistencyStatus?: ListingImageSetMetadataFields["imageSetConsistencyStatus"];
}): StoredListingImageMetadata {
  const fileName = filenameFromUrl(params.storedUrl);
  return {
    imageId: fileName,
    dealerId: safeDealerId(params.dealerId),
    listingId: safeListingId(params.listingId),
    targetType: params.targetType,
    fileName,
    ...(params.originalFileName ? { originalFileName: params.originalFileName } : {}),
    mimeType: params.mimeType,
    size: params.size,
    width: params.width ?? 0,
    height: params.height ?? 0,
    storagePath: path
      .join("data", "listing-images", params.listingId, fileName)
      .replace(/\\/g, "/"),
    publicUrl: params.storedUrl,
    imagePath: params.storedUrl,
    imageUrl: params.storedUrl,
    ...(params.thumbnailUrl
      ? {
          thumbnailPath: params.thumbnailUrl,
          thumbnailUrl: params.thumbnailUrl,
        }
      : {}),
    createdAt: params.createdAt ?? nowIso(),
    sortOrder: params.sortOrder ?? 0,
    ...(params.hasVehicle !== undefined ? { hasVehicle: params.hasVehicle } : {}),
    ...(params.vehicleConfidence !== undefined
      ? { vehicleConfidence: params.vehicleConfidence }
      : {}),
    ...(params.vehicleImageStatus
      ? { vehicleImageStatus: params.vehicleImageStatus }
      : {}),
    ...(params.vehicleImageReason
      ? { vehicleImageReason: params.vehicleImageReason }
      : {}),
    ...(params.imageRole ? { imageRole: params.imageRole } : {}),
    ...(params.imageSetConsistencyStatus
      ? { imageSetConsistencyStatus: params.imageSetConsistencyStatus }
      : {}),
  };
}

export class FileImageStorageRepository implements ImageStorageRepository {
  backend: NongaImageBackend = "file";

  async uploadListingImage(
    dealerId: string,
    listingId: string,
    input: ImageUploadInput
  ): Promise<UploadListingImageResult> {
    const safeDealer = safeDealerId(dealerId);
    const safeListing = safeListingId(listingId);
    const saved = await saveListingImageUpload(
      safeListing,
      input.buffer,
      input.mimeType,
      input.seed ?? input.originalFileName
    );
    if (saved.ok === false) throw new Error(saved.error);
    const metadata = buildLocalMetadata({
      dealerId: safeDealer,
      listingId: safeListing,
      targetType: input.targetType ?? "listing",
      storedUrl: saved.storedUrl,
      originalFileName: input.originalFileName,
      mimeType: input.mimeType,
      size: input.buffer.length,
      width: input.width,
      height: input.height,
      sortOrder: input.sortOrder,
      ...vehicleMetadataFromValidation(saved.vehicleValidation),
    });
    return { storedUrl: saved.storedUrl, metadata };
  }

  async uploadListingImagePair(
    dealerId: string,
    listingId: string,
    input: ProcessedImagePairUploadInput
  ): Promise<UploadListingImageResult> {
    const safeDealer = safeDealerId(dealerId);
    const safeListing = safeListingId(listingId);
    const saved = saveProcessedListingImagePair(
      safeListing,
      input.mainBuffer,
      input.thumbBuffer,
      input.ext,
      input.seed ?? input.originalFileName
    );
    if (saved.ok === false) throw new Error(saved.error);
    const metadata = buildLocalMetadata({
      dealerId: safeDealer,
      listingId: safeListing,
      targetType: input.targetType ?? "listing",
      storedUrl: saved.storedUrl,
      thumbnailUrl: saved.thumbnailUrl,
      originalFileName: input.originalFileName,
      mimeType: input.mimeType,
      size: input.mainBuffer.length,
      width: input.width,
      height: input.height,
      sortOrder: input.sortOrder,
    });
    return { storedUrl: saved.storedUrl, thumbnailUrl: saved.thumbnailUrl, metadata };
  }

  async listListingImages(
    dealerId: string,
    listingId: string,
    targetType: ListingImageTargetType = "listing"
  ): Promise<StoredListingImageMetadata[]> {
    const safeDealer = safeDealerId(dealerId);
    const safeListing = safeListingId(listingId);
    const dir = path.join(getListingImagesRoot(), safeListing);
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((fileName) => /\.(jpe?g|png|webp|gif)$/i.test(fileName))
      .filter((fileName) => !fileName.startsWith("thumb-"))
      .sort()
      .map((fileName, index) => {
        const fullPath = path.join(dir, fileName);
        const stat = fs.statSync(fullPath);
        const url = `/storage/listings/${safeListing}/${fileName}`;
        const thumbFile = `thumb-${fileName}`;
        const thumbPath = path.join(dir, thumbFile);
        return buildLocalMetadata({
          dealerId: safeDealer,
          listingId: safeListing,
          targetType,
          storedUrl: url,
          thumbnailUrl: fs.existsSync(thumbPath)
            ? `/storage/listings/${safeListing}/${thumbFile}`
            : undefined,
          mimeType: mimeFromFileName(fileName),
          size: stat.size,
          sortOrder: index,
          createdAt: stat.birthtime.toISOString(),
        });
      });
  }

  async deleteListingImage(
    dealerId: string,
    listingId: string,
    imageId: string
  ): Promise<boolean> {
    safeDealerId(dealerId);
    const safeListing = safeListingId(listingId);
    const fileName = requireSafeFileName(imageId);
    const dir = path.join(getListingImagesRoot(), safeListing);
    const resolved = path.resolve(dir, fileName);
    if (!resolved.startsWith(path.resolve(dir))) return false;
    const targets = [resolved, path.resolve(dir, `thumb-${fileName}`)];
    let removed = false;
    for (const target of targets) {
      if (fs.existsSync(target)) {
        fs.unlinkSync(target);
        removed = true;
      }
    }
    return removed;
  }

  getPublicImageUrl(storagePath: string): string {
    return storagePath.startsWith("/storage/listings/")
      ? storagePath
      : `/${storagePath.replace(/^data\/listing-images\//, "storage/listings/")}`;
  }
}

function mimeFromFileName(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

interface FirebaseFileLike {
  name: string;
  metadata?: {
    size?: string | number;
    contentType?: string;
    timeCreated?: string;
    metadata?: Record<string, string>;
  };
  save(
    buffer: Buffer,
    options: {
      contentType: string;
      resumable: false;
      metadata?: Record<string, unknown>;
    }
  ): Promise<unknown>;
  delete(options?: { ignoreNotFound?: boolean }): Promise<unknown>;
}

interface FirebaseBucketLike {
  name: string;
  file(path: string): FirebaseFileLike;
  getFiles(options: { prefix: string }): Promise<[FirebaseFileLike[]]>;
}

export class FirebaseStorageImageRepository implements ImageStorageRepository {
  backend: NongaImageBackend = "firebase-storage";

  constructor(private readonly bucket: FirebaseBucketLike) {}

  async uploadListingImage(
    dealerId: string,
    listingId: string,
    input: ImageUploadInput
  ): Promise<UploadListingImageResult> {
    const ext = extFromMime(input.mimeType);
    const imageId = input.imageId
      ? sanitizeImageId(input.imageId)
      : buildImageId(input.seed ?? input.originalFileName);
    const fileName = `${imageId}${ext}`;
    const targetType = input.targetType ?? "listing";
    const storagePath = buildFirebaseImageStoragePath(
      dealerId,
      listingId,
      fileName,
      targetType
    );
    const metadata = await this.saveFirebaseImage({
      dealerId,
      listingId,
      targetType,
      storagePath,
      fileName,
      buffer: input.buffer,
      mimeType: input.mimeType,
      originalFileName: input.originalFileName,
      width: input.width ?? 0,
      height: input.height ?? 0,
      sortOrder: input.sortOrder ?? 0,
    });
    return { storedUrl: metadata.imageUrl, metadata };
  }

  async uploadListingImagePair(
    dealerId: string,
    listingId: string,
    input: ProcessedImagePairUploadInput
  ): Promise<UploadListingImageResult> {
    const imageId = input.imageId
      ? sanitizeImageId(input.imageId)
      : buildImageId(input.seed ?? input.originalFileName);
    const fileName = `${imageId}${input.ext}`;
    const thumbFileName = `thumb-${fileName}`;
    const targetType = input.targetType ?? "listing";
    const storagePath = buildFirebaseImageStoragePath(
      dealerId,
      listingId,
      fileName,
      targetType
    );
    const thumbStoragePath = buildFirebaseImageStoragePath(
      dealerId,
      listingId,
      thumbFileName,
      targetType
    );
    const metadata = await this.saveFirebaseImage({
      dealerId,
      listingId,
      targetType,
      storagePath,
      fileName,
      buffer: input.mainBuffer,
      mimeType: input.mimeType,
      originalFileName: input.originalFileName,
      width: input.width,
      height: input.height,
      sortOrder: input.sortOrder ?? 0,
    });
    const thumbToken = randomUUID();
    const thumbUrl = firebaseDownloadUrl(this.bucket.name, thumbStoragePath, thumbToken);
    await this.bucket.file(thumbStoragePath).save(input.thumbBuffer, {
      contentType: input.mimeType,
      resumable: false,
      metadata: {
        cacheControl: "public,max-age=604800",
        metadata: {
          firebaseStorageDownloadTokens: thumbToken,
          dealerId: safeDealerId(dealerId),
          listingId: safeListingId(listingId),
          targetType,
          role: "thumbnail",
        },
      },
    });
    return {
      storedUrl: metadata.imageUrl,
      thumbnailUrl: thumbUrl,
      metadata: {
        ...metadata,
        thumbnailPath: thumbStoragePath,
        thumbnailUrl: thumbUrl,
      },
    };
  }

  async listListingImages(
    dealerId: string,
    listingId: string,
    targetType: ListingImageTargetType = "listing"
  ): Promise<StoredListingImageMetadata[]> {
    const prefix = [
      firebaseImageCollectionPrefix(targetType),
      safeDealerId(dealerId),
      safeListingId(listingId),
      "",
    ].join("/");
    const [files] = await this.bucket.getFiles({ prefix });
    return files
      .filter((file) => !file.name.split("/").pop()?.startsWith("thumb-"))
      .map((file, index) => this.metadataFromFirebaseFile(file, dealerId, listingId, targetType, index));
  }

  async deleteListingImage(
    dealerId: string,
    listingId: string,
    imageId: string,
    targetType: ListingImageTargetType = "listing"
  ): Promise<boolean> {
    const fileName = requireSafeFileName(imageId);
    const storagePath = buildFirebaseImageStoragePath(
      dealerId,
      listingId,
      fileName,
      targetType
    );
    const thumbPath = buildFirebaseImageStoragePath(
      dealerId,
      listingId,
      `thumb-${fileName}`,
      targetType
    );
    await this.bucket.file(storagePath).delete({ ignoreNotFound: true });
    await this.bucket.file(thumbPath).delete({ ignoreNotFound: true });
    return true;
  }

  getPublicImageUrl(storagePath: string): string {
    return firebaseMediaUrl(this.bucket.name, storagePath);
  }

  private async saveFirebaseImage(params: {
    dealerId: string;
    listingId: string;
    targetType: ListingImageTargetType;
    storagePath: string;
    fileName: string;
    buffer: Buffer;
    mimeType: string;
    originalFileName?: string;
    width: number;
    height: number;
    sortOrder: number;
  }): Promise<StoredListingImageMetadata> {
    const token = randomUUID();
    const file = this.bucket.file(params.storagePath);
    await file.save(params.buffer, {
      contentType: params.mimeType,
      resumable: false,
      metadata: {
        cacheControl: "public,max-age=604800",
        metadata: {
          firebaseStorageDownloadTokens: token,
          dealerId: safeDealerId(params.dealerId),
          listingId: safeListingId(params.listingId),
          targetType: params.targetType,
          originalFileName: params.originalFileName ?? "",
          width: String(params.width),
          height: String(params.height),
        },
      },
    });
    const downloadUrl = firebaseDownloadUrl(this.bucket.name, params.storagePath, token);
    return {
      imageId: params.fileName,
      dealerId: safeDealerId(params.dealerId),
      listingId: safeListingId(params.listingId),
      targetType: params.targetType,
      fileName: params.fileName,
      ...(params.originalFileName ? { originalFileName: params.originalFileName } : {}),
      mimeType: params.mimeType,
      size: params.buffer.length,
      width: params.width,
      height: params.height,
      storagePath: params.storagePath,
      publicUrl: downloadUrl,
      downloadUrl,
      imagePath: params.storagePath,
      imageUrl: downloadUrl,
      createdAt: nowIso(),
      sortOrder: params.sortOrder,
    };
  }

  private metadataFromFirebaseFile(
    file: FirebaseFileLike,
    dealerId: string,
    listingId: string,
    targetType: ListingImageTargetType,
    sortOrder: number
  ): StoredListingImageMetadata {
    const fileName = file.name.split("/").pop() ?? file.name;
    const token = file.metadata?.metadata?.firebaseStorageDownloadTokens;
    const storedOriginal = String(file.metadata?.metadata?.originalFileName ?? "").trim();
    const url = token
      ? firebaseDownloadUrl(this.bucket.name, file.name, token)
      : firebaseMediaUrl(this.bucket.name, file.name);
    return {
      imageId: fileName,
      dealerId: safeDealerId(dealerId),
      listingId: safeListingId(listingId),
      targetType,
      fileName,
      ...(storedOriginal ? { originalFileName: storedOriginal } : {}),
      mimeType: file.metadata?.contentType ?? mimeFromFileName(fileName),
      size: Number(file.metadata?.size ?? 0),
      width: Number(file.metadata?.metadata?.width ?? 0),
      height: Number(file.metadata?.metadata?.height ?? 0),
      storagePath: file.name,
      publicUrl: url,
      ...(token ? { downloadUrl: url } : {}),
      imagePath: file.name,
      imageUrl: url,
      createdAt: file.metadata?.timeCreated ?? nowIso(),
      sortOrder,
    };
  }
}

function buildImageId(seed?: string): string {
  const base = seed?.trim() || randomUUID();
  return `${Date.now()}-${hashSlug(base)}`;
}

function sanitizeImageId(imageId: string): string {
  const base = requireSafeFileName(imageId).replace(/\.(jpe?g|png|webp|gif)$/i, "");
  if (!base) throw new Error("imageId is invalid");
  return base;
}

function firebaseMediaUrl(bucketName: string, storagePath: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
    storagePath
  )}?alt=media`;
}

function firebaseDownloadUrl(
  bucketName: string,
  storagePath: string,
  token: string
): string {
  return `${firebaseMediaUrl(bucketName, storagePath)}&token=${encodeURIComponent(token)}`;
}

function initializeImageStorageAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NONGA_FIREBASE_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim();
  const storageBucket = resolveConfiguredStorageBucket(projectId);
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (serviceAccountJson) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
      ...(projectId ? { projectId } : {}),
      ...(storageBucket ? { storageBucket } : {}),
    });
  }
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
      ...(storageBucket ? { storageBucket } : {}),
    });
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    return initializeApp({
      credential: applicationDefault(),
      ...(projectId ? { projectId } : {}),
      ...(storageBucket ? { storageBucket } : {}),
    });
  }
  throw new Error(
    "Firebase Admin credentials are required for NONGA_IMAGE_BACKEND=firebase-storage"
  );
}

export function createImageStorageRepository(
  backend: NongaImageBackend = resolveImageStorageBackend()
): ImageStorageRepository {
  if (backend === "firebase-storage") {
    const app = initializeImageStorageAdminApp();
    const bucketName = resolveConfiguredStorageBucket(app.options.projectId);
    if (!bucketName) {
      throw new Error("FIREBASE_STORAGE_BUCKET is required for firebase-storage image uploads");
    }
    return new FirebaseStorageImageRepository(
      getStorage(app).bucket(bucketName) as unknown as FirebaseBucketLike
    );
  }
  return new FileImageStorageRepository();
}
