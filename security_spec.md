# Security Specification: SAHYOG Team-Based Data Scoping & Role-Based Access Control

## 1. System Invariants
1. **Zero-Trust Global Default**: All Firestore paths deny read, create, update, and delete by default unless explicitly permitted by hardened rules.
2. **Team-Based Data Scoping (Multi-Tenant Isolation)**:
   - All operational resources (`members`, `locations`, `statuses`, `messages`, `medicalRequests`, `checkpoints`, `calls`, `activity`) exist under `/teams/{teamId}/...`.
   - Access to any subcollection within `/teams/{teamId}` is strictly gated by verified team membership:
     `exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid))`
   - A client cannot read, list, create, update, or delete records in another team's namespace.
3. **Identity & User Scoping**:
   - Members can only write to their own member record (`/members/{request.auth.uid}`).
   - Members can only publish telemetry to their own location document (`/locations/{request.auth.uid}`) and status document (`/statuses/{request.auth.uid}`).
   - Chat messages must have `senderId == request.auth.uid`.
4. **Authorized Roles for Medical Emergencies (RBAC)**:
   - Any authenticated team member can report an emergency for their unit (`reportedBy == request.auth.uid`).
   - Only authorized roles (`Team Leader` or `Medic`) can update or triage medical emergencies (e.g., acknowledging an emergency, modifying triage status to `ACKNOWLEDGED` or `RESOLVED`, or assigning response personnel).
   - Medical emergency audit records cannot be deleted (`allow delete: if false`).
5. **Call Session Security**:
   - Voice signaling is restricted to participants (`callerId == request.auth.uid || receiverId == request.auth.uid`).
6. **Path Variable Hardening**:
   - All IDs (`teamId`, `memberId`, `messageId`, `requestId`, etc.) must pass regex `^[a-zA-Z0-9_\-]+$` and length checks `<= 128`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Spoofed Team Member Join (ID Mismatch)**:
   - *Attack*: Attacker authenticated with UID `anon_attacker` attempts to create `/teams/ALPHA/members/victim_user` claiming `userId: victim_user`.
   - *Expected*: `PERMISSION_DENIED`.
2. **Cross-Team Data Leakage (Unauthorized Team Member Read)**:
   - *Attack*: Attacker belonging to team `TEAM_A` attempts to get or list `/teams/TEAM_B/members` or `/teams/TEAM_B/messages`.
   - *Expected*: `PERMISSION_DENIED`.
3. **Telemetry Hijacking (Location Spoofing)**:
   - *Attack*: Attacker authenticated as `operative_2` writes coordinates to `/teams/ALPHA/locations/operative_1`.
   - *Expected*: `PERMISSION_DENIED`.
4. **Chat Identity Spoofing (Impersonating Commander)**:
   - *Attack*: Attacker with UID `anon_42` sends chat message to `/teams/ALPHA/messages/m1` with `senderId: leader_1` and `senderName: Major General`.
   - *Expected*: `PERMISSION_DENIED`.
5. **Unauthorized Emergency Triage (Role Escalation)**:
   - *Attack*: Standard operator with role `Operator` or `Recon` attempts to resolve or acknowledge `/teams/ALPHA/medicalRequests/req_99`.
   - *Expected*: `PERMISSION_DENIED`.
6. **Authorized Emergency Triage by Medic / Team Leader**:
   - *Valid Action*: Operative with verified role `Medic` or `Team Leader` acknowledges or resolves `/teams/ALPHA/medicalRequests/req_99`.
   - *Expected*: `ALLOWED`.
7. **Emergency Deletion Attempt (Evidence Destruction)**:
   - *Attack*: Any user (even Team Leader) attempts to delete `/teams/ALPHA/medicalRequests/req_99`.
   - *Expected*: `PERMISSION_DENIED`.
8. **Junk Character / Buffer Overflow Path Injection**:
   - *Attack*: Attacker sends writes to `/teams/$$$__invalid__###/members/{uid}` with malicious ID strings.
   - *Expected*: `PERMISSION_DENIED` by `isValidId`.
9. **Unauthenticated Read or Write**:
   - *Attack*: Unauthenticated client (`request.auth == null`) requests `/teams/ALPHA/members`.
   - *Expected*: `PERMISSION_DENIED`.
10. **Shadow Key Injection in Chat Message**:
    - *Attack*: Attacker injects unauthorized fields like `isAdmin: true`, `superUser: true`, or binary payload strings > 5000 characters into chat message.
    - *Expected*: `PERMISSION_DENIED` by `isValidChatMessage`.
11. **Roster Role Self-Promotion During Update**:
    - *Attack*: Non-leader changes their own role from `Operator` to `Team Leader` or modifies `userId`.
    - *Expected*: `PERMISSION_DENIED` or strictly controlled role assignment.
12. **Cross-Team Call Eavesdropping**:
    - *Attack*: Non-member of team attempts to read WebRTC voice signaling offer in `/teams/ALPHA/calls/call_1`.
    - *Expected*: `PERMISSION_DENIED`.
