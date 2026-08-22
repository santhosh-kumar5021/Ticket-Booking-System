# System Design Write-Up — Ticket Booking & Concurrency Platform

## 1. Overview & Event-Agnostic Data Model
The system is built on an **event-agnostic entity model** where an `Event` (film screening, stadium soccer match, rock concert, Broadway play, comedy night, or conference) has multiple scheduled `Show` instances hosted at a `Venue`. 

A `Venue` maintains a declarative layout configuration (sections, aisles, rows, and coordinate metadata), while physical seats are instantiated per show in a `show_seats` table. Each `show_seat` tracks its real-time lifecycle: `AVAILABLE` ➔ `HELD` (with user binding and UTC expiry timestamp) ➔ `BOOKED` (bound to a confirmed `Booking`).

---

## 2. Seat Hold & TTL Auto-Release Mechanism
When a customer selects seats, the system initiates a time-limited **Hold** with a configurable Time-To-Live (TTL) (e.g., 5–15 minutes, default 10m).

```
[User Selects Seats] ──► [Atomic Lock Transaction] ──► [Status: HELD, Expiry = NOW() + TTL]
                                                                  │
                                   ┌──────────────────────────────┴──────────────────────────────┐
                                   ▼                                                             ▼
                        [User Completes Checkout]                                     [TTL Expires / Abandons]
                                   │                                                             │
                         [Status: BOOKED]                                            [Background Worker Scans]
                         [Emit QR Ticket]                                                        │
                                                                                 ┌───────┴───────┐
                                                                                 ▼               ▼
                                                                        [Waitlist Exists?]    [No Waitlist]
                                                                                 │               │
                                                                        [Offer to Next User]  [Status: AVAILABLE]
```

### Auto-Release Engine:
1. **Background Scheduled Worker**: A ticker running every 3 seconds scans for `status = 'HELD' AND hold_expires_at < CURRENT_TIMESTAMP`.
2. **Lazy Evaluation**: On any read operation (`GET /api/shows/:id`), seats with expired hold timestamps are lazily calculated as available to prevent stale UI states.
3. **Reallocation or Release**: When a hold expires without checkout, the engine checks whether a waitlist queue exists for that seat's tier category. If waitlisted candidates exist, the seat is transitioned directly to the next waitlisted user; otherwise, it reverts to `AVAILABLE`.
4. **Real-Time Delta Broadcast**: Any state change triggers a delta broadcast over Server-Sent Events (SSE) to instantly update connected visual seat maps without polling.

---

## 3. Concurrency Protection Under Simultaneous Selection
To provide a hard guarantee that two customers can **never simultaneously hold or book the same seat**, the database layer enforces atomic transactional serialization with SQLite in **Write-Ahead Logging (WAL)** mode and `BEGIN IMMEDIATE` transaction semantics:

```sql
BEGIN IMMEDIATE;
-- 1. Inspect state of all requested seats within the active transaction
SELECT id, status, held_by_user_id, hold_expires_at
FROM show_seats
WHERE id IN (:seatIds) AND show_id = :showId;

-- 2. Verify all seats satisfy: status = 'AVAILABLE' OR (status = 'HELD' AND hold_expires_at < NOW())
-- If any seat is held by another active user or booked -> ROLLBACK & raise 409 Conflict

-- 3. Atomically update all seats
UPDATE show_seats
SET status = 'HELD', held_by_user_id = :userId, hold_expires_at = :holdExpiry, version = version + 1
WHERE id IN (:seatIds);
COMMIT;
```

If multiple requests collide on the same seat, exactly one transaction obtains the write lock and succeeds; subsequent concurrent transactions fail the availability check and receive a `409 Conflict` containing the exact contested seats.

---

## 4. Waitlist Auto-Assignment & Time-Limited Cascading
When a show or specific seat tier (e.g., VIP, Premium) sells out, customers can join a strictly ordered FIFO waitlist queue (`waitlist_entries` with `priority_order`).

```
[Booking Cancelled] ──► [Freed Seat Identified] ──► [Query First WAITING User in Queue]
                                                               │
                                                               ▼
                                                  [Status: OFFERED, Expiry: +5m]
                                                  [Seat: HELD for Waitlist User]
                                                  [Send Email + Push Alert with Token]
                                                               │
                                        ┌──────────────────────┴──────────────────────┐
                                        ▼                                             ▼
                             [User Claims in 5m]                            [User Declines / Expires]
                                        │                                             │
                              [Checkout & Confirm]                          [Status: EXPIRED/DECLINED]
                                                                            [Cascade to Next User (FIFO)]
```

### Cascading Reallocation Flow:
1. **Trigger on Cancellation / Expiry**: When a booking is cancelled (or a held seat for a sold-out show expires), the cancellation transaction immediately invokes `reallocateSeatOrRelease()`.
2. **Offer Generation**: The worker locates the first `WAITING` customer for that category (`ORDER BY priority_order ASC, created_at ASC LIMIT 1`), transitions their entry to `OFFERED`, sets an `offer_expires_at` (5-minute window), places the seat in `HELD` for that user, and dispatches an instant HTML email with a secure claim token.
3. **Instant Cascade**: If the user clicks **Decline** or the 5-minute timer expires, the entry is marked `DECLINED`/`EXPIRED`, and the seat automatically cascades to the **next** customer in line. If no waitlist entries remain, the seat returns to the general `AVAILABLE` pool.

---

## 5. Post-Booking & QR Verification
Every confirmed booking generates a tamper-proof cryptographically signed QR code (`HMAC-SHA256` digest of booking reference, show ID, seat numbers, and customer identity). Gate personnel scan the QR code using the built-in validation terminal, which checks the signature, confirms booking validity, and records `checked_in_at` to permanently prevent duplicate entry attempts.
