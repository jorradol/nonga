# Security Specification & Threat Model (Nong A RBAC)

## 1. Data Invariants
1. **Self-Assigned Role Defeat**: Users can NEVER set, escalate, or modify their own `role` or `membershipType` during signup or profile updates. Only `admin` and `superadmin` can execute these modifications.
2. **Post Count Caps**: Guest/Member tiers cannot exceed a `postLimit` of 5 car listings. Any attempt to write a 6th listing will be blocked programmatically or via rule verification.
3. **User Profile Retrieval Safeguards**: Personally Identifiable Information (PII) like emails must only be accessible by the document owner or an authoritative admin.
4. **Immutable Fields**: `createdAt`, `uid`, and `email` configurations cannot be modified once set.
5. **Atomic Relationship Integrity**: User sessions or AI preferences must only reference registered, existing users.

---

## 2. The "Dirty Dozen" Malicious Payloads
The following payloads represents attacks that our `firestore.rules` and application gateways must defeat:

### Payload 1: Privilege Escalation on Profile Creation
**Target:** `/users/malicious_uid`  
**Goal:** Self-appointing a `superadmin` role.
```json
{
  "uid": "malicious_uid",
  "email": "attacker@gmail.com",
  "displayName": "Attacker",
  "role": "superadmin",
  "membershipType": "unlimited",
  "postLimit": 999999
}
```
*Expected Resolution:* `PERMISSION_DENIED` - Rules must force default roles to `member` on create.

### Payload 2: Privilege Escalation on Profile Update
**Target:** `/users/normal_uid` (as the signed-in user)  
**Goal:** Modify role to `admin`.
```json
{
  "role": "admin"
}
```
*Expected Resolution:* `PERMISSION_DENIED` - Update hasOnly keys should exclude `role`, `membershipType`, `postLimit`.

### Payload 3: Shadow Field Injection in Profile Update
**Target:** `/users/normal_uid`  
**Goal:** Inject custom backend control states like `isSystemAuthorized: true` or `bypassBilling: true`.
```json
{
  "displayName": "Normal User",
  "isSystemAuthorized": true
}
```
*Expected Resolution:* `PERMISSION_DENIED` - Update keys are locked using `affectedKeys().hasOnly()`.

### Payload 4: Fake Odometer / Negative Price Poisoning
**Target:** `/cars/fake_car_1`  
**Goal:** Inject bad data types or negative pricing to disrupt listing lists.
```json
{
  "title": "Malicious Corvette",
  "brand": "Chevrolet",
  "model": "C8",
  "year": 2024,
  "price": -500000,
  "type": "luxury",
  "ownerId": "attacker_uid",
  "ownerName": "Attacker"
}
```
*Expected Resolution:* `PERMISSION_DENIED` - Schema validates price >= 0.

### Payload 5: Spoofed Owner ID listing creation
**Target:** `/cars/fake_car_2`  
**Goal:** Post a car with someone else's ID, piggybacking on their posting limit.
```json
{
  "title": "Fake Lexus",
  "brand": "Lexus",
  "model": "RX",
  "year": 2023,
  "price": 2400000,
  "type": "luxury",
  "ownerId": "victim_uid",
  "ownerName": "Victim"
}
```
*Expected Resolution:* `PERMISSION_DENIED` - Rules verify `incoming().ownerId == request.auth.uid`.

### Payload 6: Bypassing Creation Quota (Attacking Listing Count)
**Target:** `/cars/fake_car_6`  
**Goal:** Standard user attempts to post above their `postLimit` check by ignoring UI gates.
*Expected Resolution:* Prevented on client & verified on backend by transaction query counting.

### Payload 7: Deleting Showrooms Without Admin Clearances
**Target:** `/dealers/dealer_1`  
**Goal:** Malicious guest trying to swipe out dealer directories.
```json
{}
```
*Expected Resolution:* `PERMISSION_DENIED` - Write/Delete for `/dealers/` requires `isAdmin()` validation lookup.

### Payload 8: Blanket Email Retrieval Query Attack
**Target:** `/users`  
**Goal:** Fetching user profiles with other email lists.
*Expected Resolution:* `PERMISSION_DENIED` - List queries are restricted to only returning the current user's profile where `uid == request.auth.uid`.

### Payload 9: Hijacking Sibling Chat Sessions
**Target:** `/chats/victim_session_id`  
**Goal:** Listening to another user's interactive talks with Nong A.
*Expected Resolution:* `PERMISSION_DENIED` - Read/Write blocks evaluate `resource.data.userId == request.auth.uid`.

### Payload 10: Value Poisoning in Favorite Creation
**Target:** `/favorites/fav_1`  
**Goal:** Creating a favorite listing for another user's dashboard.
```json
{
  "userId": "victim_uid",
  "carId": "car_abc"
}
```
*Expected Resolution:* `PERMISSION_DENIED` - Rules enforce `incoming().userId == request.auth.uid`.

### Payload 11: Injecting Non-Id characters for Document ID
**Target:** `/users/user@@!!!###$$$`  
**Goal:** Injecting long, unescaped, or dangerous keys into Firestore indexing pathways.
*Expected Resolution:* `PERMISSION_DENIED` - Validates `isValidId()` matching standard alpha-numerical formats.

### Payload 12: Changing Immutable Creation Date
**Target:** `/users/normal_uid` (as user updates profile)  
**Goal:** Changing `createdAt` timestamp to game streak counters.
```json
{
  "createdAt": "2020-01-01T00:00:00Z"
}
```
*Expected Resolution:* `PERMISSION_DENIED` - Rules lock `incoming().createdAt == existing().createdAt` on updates.

---

## 3. Threat Matrix & Pen-Test Verdicts
| Collection | Spoofing Defense | Update Locks | Key Schema Validation | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **users** | Yes (`isOwner()`) | Yes (`affectedKeys()`) | Exclude role assignment | **SECURE** |
| **user_settings** | Yes | Yes | Strict owner rules | **SECURE** |
| **user_sessions**| Yes | Yes | Session-integrity checked | **SECURE** |
| **favorites** | Yes | Immutable | Bound lists | **SECURE** |
| **ai_preferences**| Yes | Yes | Persona size limits | **SECURE** |
