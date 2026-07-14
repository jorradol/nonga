import { auth } from "../lib/firebase";
import { hashPiiForLog } from "./piiLogRedaction";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function buildRedactedAuthInfo(): FirestoreErrorInfo["authInfo"] {
  const user = auth?.currentUser;
  return {
    userId: hashPiiForLog(user?.uid ?? null),
    email: hashPiiForLog(user?.email ?? null),
    emailVerified: user?.emailVerified ?? null,
    isAnonymous: user?.isAnonymous ?? null,
    tenantId: user?.tenantId ?? null,
    providerInfo:
      user?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: hashPiiForLog(provider.email),
      })) ?? [],
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: buildRedactedAuthInfo(),
    operationType,
    path
  };
  console.error('Firestore Error Detailed Info: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
