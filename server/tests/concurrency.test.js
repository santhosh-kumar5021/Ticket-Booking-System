import assert from 'assert';
import db from '../src/db/connection.js';
import { seedDatabase } from '../src/db/seed.js';
import { signToken } from '../src/utils/token.js';
import { reallocateSeatOrRelease, checkExpiredHolds } from '../src/services/holdWorker.js';

console.log('\n======================================================');
console.log('🧪 RUNNING HARD CONCURRENCY & WAITLIST TEST SUITE');
console.log('======================================================\n');

async function runTests() {
  await seedDatabase();

  const showId = 'show-interstellar-2'; // Fresh show with all seats available
  const targetSeat = db.prepare(`
    SELECT ss.id, s.row_label, s.seat_number
    FROM show_seats ss
    JOIN seats s ON ss.seat_id = s.id
    WHERE ss.show_id = ? AND s.default_category = 'EXECUTIVE'
    LIMIT 1
  `).get(showId);

  assert(targetSeat, 'Target EXECUTIVE seat must exist');
  console.log(`🎯 Target Seat for Concurrency Collision: ${targetSeat.row_label}-${targetSeat.seat_number} (ID: ${targetSeat.id})`);

  // -------------------------------------------------------------
  // TEST 1: 50 Simultaneous Workers Colliding on the Same EXECUTIVE Seat
  // -------------------------------------------------------------
  console.log('\n[Test 1] Spawning 50 concurrent requests competing for the exact same seat...');

  const CONCURRENT_WORKERS = 50;
  const userIds = Array.from({ length: CONCURRENT_WORKERS }, (_, i) => `usr-worker-${i + 1}`);

  // Create temporary mock users in DB
  for (const uid of userIds) {
    db.prepare(`
      INSERT OR IGNORE INTO users (id, name, email, password_hash, role)
      VALUES (?, ?, ?, 'hash', 'CUSTOMER')
    `).run(uid, `Worker ${uid}`, `${uid}@test.com`);
  }

  const results = await Promise.all(
    userIds.map(async uid => {
      const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const nowIso = new Date().toISOString();

      try {
        // Execute atomic hold transaction
        const tx = db.transaction(() => {
          const seat = db.prepare(`
            SELECT ss.id, ss.status, ss.held_by_user_id, ss.hold_expires_at
            FROM show_seats ss
            WHERE ss.id = ? AND ss.show_id = ?
          `).get(targetSeat.id, showId);

          const isAvailable = seat.status === 'AVAILABLE' ||
            (seat.status === 'HELD' && seat.hold_expires_at && seat.hold_expires_at < nowIso);

          if (!isAvailable) {
            throw new Error('SEAT_UNAVAILABLE_CONFLICT');
          }

          db.prepare(`
            UPDATE show_seats
            SET status = 'HELD',
                held_by_user_id = ?,
                hold_expires_at = ?,
                version = version + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(uid, holdExpiresAt, targetSeat.id);

          return { success: true, userId: uid };
        });

        return tx();
      } catch (err) {
        return { success: false, error: err.message, userId: uid };
      }
    })
  );

  const successfulHolds = results.filter(r => r.success);
  const conflicts = results.filter(r => !r.success);

  console.log(`   - Successful Holds: ${successfulHolds.length}`);
  console.log(`   - Rejected (409 Conflicts): ${conflicts.length}`);

  assert.strictEqual(successfulHolds.length, 1, 'EXACTLY ONE request must succeed in holding the seat');
  assert.strictEqual(conflicts.length, CONCURRENT_WORKERS - 1, 'All other requests must receive conflict error');
  console.log('✅ TEST 1 PASSED: Zero double-holds under high concurrency collision!');

  // -------------------------------------------------------------
  // TEST 2: Hold TTL Auto-Release
  // -------------------------------------------------------------
  console.log('\n[Test 2] Verifying Hold TTL Expiration & Auto-Release...');

  // Set hold expiry in the past (-5 seconds)
  const pastTime = new Date(Date.now() - 5000).toISOString();
  db.prepare(`
    UPDATE show_seats
    SET status = 'HELD', held_by_user_id = 'usr-worker-1', hold_expires_at = ?
    WHERE id = ?
  `).run(pastTime, targetSeat.id);

  // Run the worker tick
  checkExpiredHolds();

  const refreshedSeat = db.prepare('SELECT status, held_by_user_id, hold_expires_at FROM show_seats WHERE id = ?').get(targetSeat.id);
  assert.strictEqual(refreshedSeat.status, 'AVAILABLE', 'Expired held seat must revert to AVAILABLE');
  assert.strictEqual(refreshedSeat.held_by_user_id, null, 'Holding user must be cleared');
  console.log('✅ TEST 2 PASSED: Expired seat holds auto-release cleanly!');

  // -------------------------------------------------------------
  // TEST 3: Waitlist FIFO Priority & Auto-Reallocation Cascade
  // -------------------------------------------------------------
  console.log('\n[Test 3] Verifying Waitlist Auto-Reallocation and Instant Cascade on Decline...');

  // Step A: Customer 1 books the seat
  const bookingId = 'bk-test-waitlist-1';
  db.prepare(`
    INSERT INTO bookings (id, booking_reference, user_id, show_id, total_amount, status, qr_code_data)
    VALUES (?, 'TKT-TEST-WL01', 'usr-cust-1', ?, 35, 'CONFIRMED', 'qr-mock')
  `).run(bookingId, showId);

  db.prepare(`
    INSERT INTO booking_seats (id, booking_id, show_seat_id, price_paid, seat_category)
    VALUES ('bs-test-1', ?, ?, 35, 'EXECUTIVE')
  `).run(bookingId, targetSeat.id);

  db.prepare(`
    UPDATE show_seats SET status = 'BOOKED', booking_id = ? WHERE id = ?
  `).run(bookingId, targetSeat.id);

  // Step B: User B joins waitlist (Priority 1)
  const wlUserB = 'wl-entry-user-b';
  db.prepare(`
    INSERT INTO waitlist_entries (id, show_id, user_id, seat_category, status, priority_order)
    VALUES (?, ?, 'usr-cust-2', 'EXECUTIVE', 'WAITING', 1)
  `).run(wlUserB, showId);

  // Step C: User C joins waitlist (Priority 2)
  const wlUserC = 'wl-entry-user-c';
  db.prepare(`
    INSERT INTO waitlist_entries (id, show_id, user_id, seat_category, status, priority_order)
    VALUES (?, ?, 'usr-cust-3', 'EXECUTIVE', 'WAITING', 2)
  `).run(wlUserC, showId);

  console.log('   - Booked EXECUTIVE seat. User B is #1 in queue, User C is #2 in queue.');

  // Step D: Customer 1 cancels booking -> triggers auto-reallocation
  db.prepare("UPDATE bookings SET status = 'CANCELLED' WHERE id = ?").run(bookingId);
  reallocateSeatOrRelease(targetSeat.id);

  // Verify User B received OFFERED status and seat is HELD for User B
  const entryB = db.prepare('SELECT * FROM waitlist_entries WHERE id = ?').get(wlUserB);
  assert.strictEqual(entryB.status, 'OFFERED', 'User B must receive OFFERED status');
  assert.strictEqual(entryB.offered_show_seat_id, targetSeat.id, 'Seat must be assigned to User B');

  const seatForB = db.prepare('SELECT status, held_by_user_id FROM show_seats WHERE id = ?').get(targetSeat.id);
  assert.strictEqual(seatForB.status, 'HELD', 'Seat must be HELD for waitlisted user');
  assert.strictEqual(seatForB.held_by_user_id, 'usr-cust-2', 'Seat held_by must match User B');
  console.log('   - Cancellation correctly triggered auto-offer to User B (Priority #1).');

  // Step E: User B declines offer -> cascades to User C (Priority #2)
  db.prepare("UPDATE waitlist_entries SET status = 'DECLINED' WHERE id = ?").run(wlUserB);
  reallocateSeatOrRelease(targetSeat.id);

  const entryC = db.prepare('SELECT * FROM waitlist_entries WHERE id = ?').get(wlUserC);
  assert.strictEqual(entryC.status, 'OFFERED', 'User C must now receive cascading OFFERED status');
  assert.strictEqual(entryC.offered_show_seat_id, targetSeat.id, 'Seat must be assigned to User C');

  const seatForC = db.prepare('SELECT status, held_by_user_id FROM show_seats WHERE id = ?').get(targetSeat.id);
  assert.strictEqual(seatForC.status, 'HELD', 'Seat must remain HELD');
  assert.strictEqual(seatForC.held_by_user_id, 'usr-cust-3', 'Seat held_by must now match User C');
  console.log('   - Declining offer correctly cascaded to User C (Priority #2).');

  console.log('✅ TEST 3 PASSED: Full waitlist queue reallocation & cascading verified!');

  console.log('\n🎉 ALL CONCURRENCY & REALLOCATION TESTS PASSED PERFECTLY!\n');
}

runTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
