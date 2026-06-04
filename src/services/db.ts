/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp, 
  onSnapshot,
  increment,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, ReferralEvent } from '../types';

/**
 * Fetch user profile from Firestore by their unique username (lowercase string query)
 */
export async function getProfileByUsername(username: string): Promise<UserProfile | null> {
  const cleanUsername = username.trim().toLowerCase();
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', cleanUsername), limit(1));
  
  try {
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    const userDoc = querySnapshot.docs[0];
    const data = userDoc.data();
    return {
      id: userDoc.id,
      code: data.accessCode || data.code || userDoc.id,
      username: data.username || '',
      arabicName: data.arabicName || '',
      englishName: data.englishName || '',
      displayName: data.displayName || data.arabicName || '',
      photoUrl: data.photoUrl || '',
      bio: data.bio || '',
      level: Number(data.level || 1),
      referralCount: Number(data.referralCount || 0),
      likes: Number(data.likes || 0),
      accessCode: data.accessCode || data.code || userDoc.id,
      phone: data.phone || '',
      appName: data.appName || '',
      views: Number(data.views || 0),
      createdAt: data.createdAt,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/query?username=${cleanUsername}`);
    return null;
  }
}

/**
 * Fetch user profile from Firestore by their Firebase Auth UID
 */
export async function getProfileByUID(uid: string): Promise<UserProfile | null> {
  const docRef = doc(db, 'users', uid);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        code: data.accessCode || data.code || '',
        username: data.username || '',
        arabicName: data.arabicName || '',
        englishName: data.englishName || '',
        displayName: data.displayName || data.arabicName || '',
        photoUrl: data.photoUrl || '',
        bio: data.bio || '',
        level: Number(data.level || 1),
        referralCount: Number(data.referralCount || 0),
        likes: Number(data.likes || 0),
        accessCode: data.accessCode || data.code || '',
        phone: data.phone || '',
        appName: data.appName || '',
        views: Number(data.views || 0),
        createdAt: data.createdAt,
      };
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    return null;
  }
}

/**
 * Look up access code in the accessCodes collection (first by document ID, then by code field fallback)
 */
export async function getAccessCode(code: string): Promise<{ id: string; code: string; used: boolean; activatedBy?: string; product?: string } | null> {
  const cleanCode = code.trim().toUpperCase();
  const docRef = doc(db, 'accessCodes', cleanCode);
  
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        code: data.code || cleanCode,
        used: data.used === true,
        activatedBy: data.activatedBy,
        product: data.product,
      };
    }
    
    // Fallback: search where code field == cleanCode in accessCodes collection
    const q = query(collection(db, 'accessCodes'), where('code', '==', cleanCode), limit(1));
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      const foundDoc = qSnap.docs[0];
      const data = foundDoc.data();
      return {
        id: foundDoc.id,
        code: data.code || cleanCode,
        used: data.used === true,
        activatedBy: data.activatedBy,
        product: data.product,
      };
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `accessCodes/${cleanCode}`);
    return null;
  }
}

/**
 * Fetch user profile from Firestore that is linked with a specific access code
 */
export async function getProfileByAccessCode(code: string): Promise<UserProfile | null> {
  const cleanCode = code.trim().toUpperCase();
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('accessCode', '==', cleanCode), limit(1));
  
  try {
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const data = userDoc.data();
      return {
        id: userDoc.id,
        code: data.accessCode || data.code || cleanCode,
        username: data.username || '',
        arabicName: data.arabicName || '',
        englishName: data.englishName || '',
        displayName: data.displayName || data.arabicName || '',
        photoUrl: data.photoUrl || '',
        bio: data.bio || '',
        level: Number(data.level || 1),
        referralCount: Number(data.referralCount || 0),
        likes: Number(data.likes || 0),
        accessCode: data.accessCode || data.code || cleanCode,
        phone: data.phone || '',
        appName: data.appName || '',
        views: Number(data.views || 0),
        createdAt: data.createdAt,
      };
    }
    
    // Fallback: look up in users where document ID is the code
    const docSnap = await getDoc(doc(db, 'users', cleanCode));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (!data.username) return null;
      return {
        id: docSnap.id,
        code: data.accessCode || data.code || cleanCode,
        username: data.username || '',
        arabicName: data.arabicName || '',
        englishName: data.englishName || '',
        displayName: data.displayName || data.arabicName || '',
        photoUrl: data.photoUrl || '',
        bio: data.bio || '',
        level: Number(data.level || 1),
        referralCount: Number(data.referralCount || 0),
        likes: Number(data.likes || 0),
        accessCode: data.accessCode || data.code || cleanCode,
        phone: data.phone || '',
        appName: data.appName || '',
        views: Number(data.views || 0),
        createdAt: data.createdAt,
      };
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/accessCode/${cleanCode}`);
    return null;
  }
}

/**
 * Set an access code as claimed in the accessCodes collection
 */
export async function claimAccessCode(codeId: string, username: string, uid: string): Promise<void> {
  const cleanCodeId = codeId.trim().toUpperCase();
  const docRef = doc(db, 'accessCodes', cleanCodeId);
  try {
    await updateDoc(docRef, {
      used: true,
      activatedBy: uid
    });
  } catch (err) {
    // If update by document ID fails, fallback to updating by code field match
    const q = query(collection(db, 'accessCodes'), where('code', '==', cleanCodeId), limit(1));
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      const liveDocRef = doc(db, 'accessCodes', qSnap.docs[0].id);
      await updateDoc(liveDocRef, {
        used: true,
        activatedBy: uid
      });
    } else {
      handleFirestoreError(err, OperationType.UPDATE, `accessCodes/${cleanCodeId}`);
    }
  }
}

export interface AppConfig {
  whatsappNumber: string;
  wearableAppUrl: string;
  stage1IconUrl: string;
  stage2IconUrl: string;
  stage3IconUrl: string;
  types: any[];
  vipAppUrl?: string;
}

/**
 * Automatically synchronize the current VIP App Origin to config/app under the vipAppUrl field
 */
export async function autoSyncVipAppUrl(): Promise<void> {
  if (typeof window === 'undefined') return;
  const currentOrigin = window.location.origin;
  
  if (currentOrigin.startsWith('http://localhost') || currentOrigin.startsWith('http://127.0.0.1')) {
    // Avoid overriding production URL while developing locally
    return;
  }
  
  try {
    const docRef = doc(db, 'config', 'app');
    // Using setDoc with merge: true is highly safe and works regardless of whether doc exists yet
    await setDoc(docRef, { vipAppUrl: currentOrigin }, { merge: true });
    console.log("VIP App URL synchronized successfully to config/app:", currentOrigin);
  } catch (err) {
    console.warn("Could not auto sync vipAppUrl to config/app:", err);
  }
}

/**
 * Fetch level configurations and settings from config/app
 */
export async function getAppConfig(): Promise<AppConfig | null> {
  const docRef = doc(db, 'config', 'app');
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        whatsappNumber: data.whatsappNumber || '',
        wearableAppUrl: data.wearableAppUrl || '',
        stage1IconUrl: data.stage1IconUrl || data.stage1 || '',
        stage2IconUrl: data.stage2IconUrl || data.stage2 || '',
        stage3IconUrl: data.stage3IconUrl || data.stage3 || '',
        types: data.types || [],
        vipAppUrl: data.vipAppUrl || '',
      };
    }
    return null;
  } catch (err) {
    console.warn("Could not retrieve config/app from firestore, using defaults:", err);
    return null;
  }
}

/**
 * Handle organic profile likes (Increment or decrement and update localStorage)
 */
export async function toggleLikeProfile(profileId: string, username: string, shouldLike: boolean): Promise<number> {
  const userRef = doc(db, 'users', profileId);
  const diff = shouldLike ? 1 : -1;
  const storageKey = `esm_liked_${username.toLowerCase()}`;
  
  try {
    await updateDoc(userRef, {
      likes: increment(diff)
    });
    
    if (shouldLike) {
      localStorage.setItem(storageKey, 'true');
    } else {
      localStorage.removeItem(storageKey);
    }
    return diff;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${profileId}`);
    throw err;
  }
}

/**
 * Check if the visitor has already liked the profile (cached in localStorage)
 */
export function hasLikedProfile(username: string): boolean {
  return localStorage.getItem(`esm_liked_${username.toLowerCase()}`) === 'true';
}

/**
 * Log a unique referral interaction for stats count tracking
 */
export async function recordReferral(fromUsername: string, visitorId: string): Promise<boolean> {
  const storageKey = `esm_referred_${fromUsername.toLowerCase()}`;
  
  // Guard against infinite spamming of same tracking in same browser instance
  if (localStorage.getItem(storageKey) === 'true') {
    return false;
  }

  try {
    // 1. Create a dynamic record in referrals collection
    await addDoc(collection(db, 'referrals'), {
      fromUsername: fromUsername.toLowerCase(),
      visitorId,
      timestamp: serverTimestamp()
    });

    // 2. We also need to increment the referralCount in the target user's document.
    // Let's first locate the user document by username.
    const profile = await getProfileByUsername(fromUsername);
    if (profile && profile.id) {
      const userRef = doc(db, 'users', profile.id);
      await updateDoc(userRef, {
        referralCount: increment(1)
      });
    }

    localStorage.setItem(storageKey, 'true');
    return true;
  } catch (err) {
    console.error("Referral recording ignored or blocked by security rules:", err);
    // Silent fail so it won't crash the user experience
    return false;
  }
}

/**
 * Open real-time updates for a single member document (used on VIP Dashboard)
 */
export function listenToProfile(uid: string, callback: (profile: UserProfile | null) => void) {
  const userRef = doc(db, 'users', uid);
  return onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback({
        id: docSnap.id,
        code: data.accessCode || data.code || docSnap.id,
        username: data.username || '',
        arabicName: data.arabicName || '',
        englishName: data.englishName || '',
        displayName: data.displayName || data.arabicName || '',
        photoUrl: data.photoUrl || '',
        bio: data.bio || '',
        level: Number(data.level || 1),
        referralCount: Number(data.referralCount || 0),
        likes: Number(data.likes || 0),
        accessCode: data.accessCode || data.code || docSnap.id,
        phone: data.phone || '',
        appName: data.appName || '',
        views: Number(data.views || 0),
        createdAt: data.createdAt
      });
    } else {
      callback(null);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
  });
}

/**
 * Retrieve user leaderboard list to show Ranks
 */
export async function getLeaderboard(): Promise<UserProfile[]> {
  const usersRef = collection(db, 'users');
  try {
    const qSnap = await getDocs(usersRef);
    const users: UserProfile[] = [];
    qSnap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d.username) {
        users.push({
          id: docSnap.id,
          code: d.accessCode || d.code || docSnap.id,
          username: d.username,
          arabicName: d.arabicName || '',
          englishName: d.englishName || '',
          displayName: d.displayName || d.arabicName || '',
          photoUrl: d.photoUrl || '',
          bio: d.bio || '',
          level: Number(d.level || 1),
          referralCount: Number(d.referralCount || 0),
          likes: Number(d.likes || 0),
          accessCode: d.accessCode || d.code || docSnap.id,
          phone: d.phone || '',
          appName: d.appName || '',
          views: Number(d.views || 0),
          createdAt: d.createdAt
        });
      }
    });
    
    // Sort descending by (likes * 2) + referrals/visitors + views
    return users.sort((a, b) => {
      const scoreA = (a.likes * 2) + a.referralCount + (a.views || 0);
      const scoreB = (b.likes * 2) + b.referralCount + (b.views || 0);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return b.likes - a.likes; // fallback likes
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
    return [];
  }
}
