/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  id?: string; // Document ID (which is the access code, eg. ESM-XXXX)
  code?: string; // same as Document ID
  username: string; // lowercase english chosen name
  arabicName: string; // arabic name chosen by member
  displayName: string; // equals to arabicName (or custom displayName)
  photoUrl: string;
  bio: string;
  level: number; // 1 = Bronze, 2 = Silver, 3 = Gold
  referralCount: number;
  likes: number;
  accessCode: string; // same as code / document ID
  createdAt?: any;
  phone?: string;
  englishName?: string;
  appName?: string;
  views?: number;
  stage1IconUrl?: string;
  stage2IconUrl?: string;
  stage3IconUrl?: string;
}

export interface ReferralEvent {
  fromUsername: string;
  visitorId: string;
  timestamp: any; // Server timestamp or Date
}

export enum RoyalLevel {
  BRONZE = 1,
  SILVER = 2,
  GOLD = 3,
}
