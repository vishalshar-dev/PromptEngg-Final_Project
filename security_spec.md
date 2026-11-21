# CartAudit Cloud Sync Security Specification (Phase 0)

## 1. Data Invariants
1. **Strict Owner Isolation**: A user may only read (`get`/`list`) or write (`create`/`update`/`delete`) documents under `/users/{userId}` where `request.auth != null`, `request.auth.token.email_verified == true`, and `request.auth.uid == userId`.
2. **PII Isolation**: User email addresses are stored exclusively in `/users/{userId}/private/info` and are never readable by any other authenticated or unauthenticated caller.
3. **Master Gate**: Any write or read on `/users/{userId}/workspace/{sectionId}` validates parent account ownership (`users/{userId}`) and enforces `section == sectionId` strictly within `['settings', 'ledger', 'catalog', 'splits', 'wellness', 'penny']`.
4. **Immutable Ownership & Temporal Integrity**: `ownerId`, `section`, and `createdAt` cannot be modified after creation. `createdAt == request.time` on create; `updatedAt == request.time` on both create and update.
5. **Bounded Native Payloads**: Every string length is bounded, `payload` must be a Firestore `map` with `<= 30` keys, and zero arbitrary ghost fields are allowed (`hasOnly`).

## 2. Adversarial "Dirty Dozen" Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated read/write**: Read `/users/uid1/workspace/ledger` with `request.auth == null`.
2. **Cross-user read**: Signed-in `uid2` attempts `get` on `/users/uid1`.
3. **Cross-user PII read**: Signed-in `uid2` attempts `get` on `/users/uid1/private/info`.
4. **Cross-user workspace list**: Signed-in `uid2` attempts `list` on `/users/uid1/workspace`.
5. **Identity spoofing on create**: `uid1` writes `/users/uid1/workspace/ledger` with `ownerId: "uid2"`.
6. **Shadow/Ghost field injection**: `uid1` writes `/users/uid1/workspace/ledger` with extra key `isAdmin: true`.
7. **Unverified email bypass**: Auth token has `email_verified: false` when attempting write to `/users/uid1`.
8. **Invalid path ID poisoning**: `uid1` writes `/users/uid1/workspace/../../bad` or invalid `sectionId` (`"arbitrary"`).
9. **Client-forged timestamp**: `uid1` sets `createdAt` or `updatedAt` to a past client `Timestamp` instead of `request.time`.
10. **Immutable field mutation on update**: `uid1` updates `/users/uid1/workspace/ledger` changing `createdAt` or `section`.
11. **Oversized string DoW**: `uid1` writes `displayName` or `deviceName` exceeding max length (`> 120` / `> 80` chars).
12. **Invalid payload type**: `uid1` writes `payload: "json-string"` instead of a native `map` (`is map`).
