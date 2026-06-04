# Security Specification & "Dirty Dozen" Attack Payloads

## 1. Data Invariants
- **User Integrity**: A user account `doc(db, 'users', uid)` must contain a valid `username`, `displayName`, `photoUrl`, `bio`, `level` (1=Bronze, 2=Silver, 3=Gold), `referralCount` >= 0, and `likes` >= 0.
- **Reference Guarding**: Users can only write to their own profile. Non-owners cannot change anyone else's configuration, except for the `likes` key where a public visitor can update by +1 or -1 if they haven't liked yet.
- **Identifier Protection**: The `username` field is unique, lowercase, and cannot be spoofed.
- **Timestamp Integrity**: Referral events `doc(db, 'referrals', id)` must use `request.time` for timestamps rather than client-configured values.

---

## 2. The "Dirty Dozen" Payloads (Identity, Integrity & State)
1. **Unsigned User Registration**: A visitor tries to write a profile document with an arbitary UID they do not own.
2. **Profile Spoofing**: An authenticated user tries to overwrite another subscriber's profile data through client-scoped payload injections.
3. **Privilege Escalation**: An authenticated user attempts to upgrade their `level` from Bronze (1) to Gold (3) without making a purchase.
4. **Likes Inflating**: A user attempts to update their own profile's `likes` field directly using local state manipulation bypassing strict key audits.
5. **System Field Ransom**: An attacker attempts to set `referralCount` arbitrarily to 99999 to gain false status.
6. **Path Poisoning**: An attacker tries to write to a document ID with standard system files or recursive characters (e.g., `../admin`).
7. **Phantom Referral**: A visitor posts a referral record where `visitorId` is null or too large.
8. **Epoch-Backdated Referral**: A client sets a stale timestamp (`timestamp = 0`) to manipulate priority or analytics.
9. **Referral Count High-jacking**: An attacker tries to modify an existing referral event that they do not own.
10. **Bypassing Affected Keys**: A visitor tries to edit `photoUrl` or `bio` whilst liking someone's page.
11. **Negative Value Injectors**: Setting `likes = -999` to break the display or status trackers.
12. **Self-Referencing Referral Loops**: Generating multiple dynamic referrals for oneself with identical visitor keys.

---

## 3. Fortress Rules (`firestore.rules`)
Our rules must reject all of these cases using exact checks on keys, sizes, types, and owner verification.
