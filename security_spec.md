# Security Specification — OrderPulse Firestore Rules

## 1. Data Invariants
1. **Default-Deny Baseline**: Every path not explicitly matched under `/admins/{uid}`, `/appConfigs/{configId}`, `/orders/{orderId}`, or `/products/{productId}` is denied for both reads and writes.
2. **Verified Admin-Only PII Isolation**: Orders (`/orders/{orderId}`), store credentials/config (`/appConfigs/{configId}`), and catalog rules (`/products/{productId}`) contain customer PII (phone, name, delivery address) and operational secrets. Only an authenticated, `email_verified == true` bootstrapped owner (`trdsafarr@gmail.com`) or a trusted `/admins/{uid}` document holder may read or write them.
3. **Zero Unverified Email Spoofing**: Every email check mandates `request.auth.token.email_verified == true`.
4. **No Self-Assigned Admin Escalation**: A non-admin user cannot create, modify, or delete `/admins/{uid}` documents or inject `role: 'admin'`.
5. **Path ID Poisoning Guard**: Every single-document operation (`get`, `create`, `update`, `delete`) enforces `isValidId(docId)` (`<= 128` chars, `^[a-zA-Z0-9_\-]+$`).
6. **Strict Schema & Zero Shadow Fields**: Every write validates `keys().hasAll(...) && keys().hasOnly(...)`, exact string `.size()` bounds matching `firebase-blueprint.json`, bounded array lengths (`<= 200`), and enum allowlists.
7. **Immutable Identity & Server Timestamps**: `ownerUid` must equal `request.auth.uid` on create and remain immutable on update. `createdAt == request.time` on create (immutable thereafter) and `updatedAt == request.time` on every write.
8. **Secure Cost-Optimized List Queries**: `allow list` never invokes `get()`/`exists()` and strictly requires `isVerifiedBootstrappedAdmin() && resource.data.ownerUid == request.auth.uid`.

## 2. The "Dirty Dozen" Attack Payloads (Must All Return PERMISSION_DENIED)
1. **Unauthenticated Order Read**: `GET /orders/ord-1345` with `auth = null`.
2. **Unverified Admin Email Spoof**: `GET /orders/ord-1345` with `email = "trdsafarr@gmail.com"` and `email_verified = false`.
3. **Non-Owner Signed-In PII Scrape (`get`)**: `GET /orders/ord-1345` with verified random Gmail user `attacker@gmail.com`.
4. **Unauthorized Blanket List Query (`list`)**: `LIST /orders` by non-owner or querying another `ownerUid`.
5. **Self-Assigned Admin Escalation**: `CREATE /admins/attacker-uid` with `{ uid: "attacker-uid", role: "admin", ... }` by non-admin.
6. **Shadow / Ghost Field Injection**: `CREATE /orders/ord-999` including extra field `isSuperAdmin: true`.
7. **Owner Identity Spoofing**: `CREATE /orders/ord-999` with `ownerUid: "victim-uid"` != `request.auth.uid`.
8. **Path ID Poisoning**: `CREATE /orders/../../etc/passwd` or 200-character ID string.
9. **Value Poisoning / Size Overflow**: `UPDATE /orders/ord-1345` with `customerName` > 160 chars or invalid `pollStatus: "hacked"`.
10. **Immutable Field Tampering**: `UPDATE /orders/ord-1345` attempting to mutate `ownerUid`, `orderId`, `shopifyOrderId`, or `createdAt`.
11. **Client Timestamp Forgery**: `CREATE /appConfigs/main` with backdated `createdAt` (`!= request.time`) or `UPDATE` with `updatedAt != request.time`.
12. **Unbounded Array / Invalid Element Type Attack**: `CREATE /products/prod-1` with `allowedPincodes` containing 201 entries or a numeric element `[121003]` instead of string.
