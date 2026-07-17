import { recordFixtureFirebaseCall } from "./firebaseCallLog";

function blockedFn(api: string): (...args: unknown[]) => never {
  return (..._args: unknown[]): never => {
    if (api === "getFirestore") recordFixtureFirebaseCall("getFirestore");
    else recordFixtureFirebaseCall("firestoreApi");
    throw new Error(`ปิดในโหมดตรวจสอบหน้าจอ: Firestore ${api} is blocked`);
  };
}

export const getFirestore = blockedFn("getFirestore");
export const doc = blockedFn("doc");
export const collection = blockedFn("collection");
export const getDoc = blockedFn("getDoc");
export const getDocs = blockedFn("getDocs");
export const getDocFromServer = blockedFn("getDocFromServer");
export const setDoc = blockedFn("setDoc");
export const addDoc = blockedFn("addDoc");
export const updateDoc = blockedFn("updateDoc");
export const deleteDoc = blockedFn("deleteDoc");
export const query = blockedFn("query");
export const where = blockedFn("where");
export const orderBy = blockedFn("orderBy");
export const limit = blockedFn("limit");
export const startAfter = blockedFn("startAfter");
export const endBefore = blockedFn("endBefore");
export const serverTimestamp = blockedFn("serverTimestamp");
export const increment = blockedFn("increment");
export const arrayUnion = blockedFn("arrayUnion");
export const arrayRemove = blockedFn("arrayRemove");
export const runTransaction = blockedFn("runTransaction");
export const writeBatch = blockedFn("writeBatch");
export const onSnapshot = blockedFn("onSnapshot");

export const Timestamp = {
  now: blockedFn("Timestamp.now"),
  fromDate: blockedFn("Timestamp.fromDate"),
  fromMillis: blockedFn("Timestamp.fromMillis"),
};

export const FieldValue = {
  serverTimestamp: blockedFn("FieldValue.serverTimestamp"),
  increment: blockedFn("FieldValue.increment"),
  arrayUnion: blockedFn("FieldValue.arrayUnion"),
  arrayRemove: blockedFn("FieldValue.arrayRemove"),
  delete: blockedFn("FieldValue.delete"),
};

export default {
  getFirestore,
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  FieldValue,
  Timestamp,
};
