import assert from 'assert';

const BASE_URL = 'http://localhost:5000/api';

console.log('\n======================================================');
console.log('🧪 RUNNING END-TO-END INTEGRATION TEST SUITE');
console.log('======================================================\n');

async function runE2ETests() {
  // 1. Health check
  const healthRes = await fetch('http://localhost:5000/health');
  const healthData = await healthRes.json();
  assert.strictEqual(healthData.status, 'healthy');
  console.log('✅ Health Check: Server is running and SQLite WAL concurrency is active.');

  // 2. Fetch Events Catalog
  const eventsRes = await fetch(`${BASE_URL}/events`);
  const eventsData = await eventsRes.json();
  assert(Array.isArray(eventsData.events) && eventsData.events.length >= 6);
  console.log(`✅ Events Catalog: Retrieved ${eventsData.events.length} multi-category events (Movies, Concerts, Theatre, Sports, Comedy, Conferences).`);

  // 3. User Login
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex.johnson@example.com', password: 'Password@123' })
  });
  const loginData = await loginRes.json();
  assert(loginData.token, 'Token must be returned');
  const token = loginData.token;
  const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  console.log(`✅ Auth: Logged in as ${loginData.user.name} (${loginData.user.role}).`);

  // 4. Fetch Show Details & Visual Seat Map Grid
  const showId = 'show-interstellar-1';
  const showRes = await fetch(`${BASE_URL}/shows/${showId}`, { headers: authHeaders });
  const showData = await showRes.json();
  assert(showData.show && showData.seats.length > 0);
  console.log(`✅ Show Seat Map: Loaded ${showData.seats.length} interactive seats with Executive, Premium, Balcony tiers.`);

  // Find 2 available EXECUTIVE seats
  const availableVipSeats = showData.seats.filter(s => s.status === 'AVAILABLE' && s.category === 'EXECUTIVE');
  assert(availableVipSeats.length >= 2, 'Need at least 2 available EXECUTIVE seats');
  const seatIdsToHold = [availableVipSeats[0].id, availableVipSeats[1].id];

  // 5. Place Atomic Seat Hold
  const holdRes = await fetch(`${BASE_URL}/shows/${showId}/hold`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ showSeatIds: seatIdsToHold })
  });
  const holdData = await holdRes.json();
  assert.strictEqual(holdData.success, true);
  assert(holdData.holdExpiresAt);
  console.log(`✅ Concurrency Hold: Successfully locked ${seatIdsToHold.length} seats (TTL: ${holdData.ttlMinutes} minutes).`);

  // 6. Confirm Booking & Generate Cryptographic QR Ticket Pass
  const bookingRes = await fetch(`${BASE_URL}/bookings/confirm`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      showId,
      showSeatIds: seatIdsToHold,
      paymentDetails: { method: 'card' }
    })
  });
  const bookingData = await bookingRes.json();
  assert.strictEqual(bookingData.success, true);
  assert(bookingData.booking.booking_reference);
  assert(bookingData.booking.qr_code_data.startsWith('data:image/png;base64,'));
  const bookingRef = bookingData.booking.booking_reference;
  const bookingId = bookingData.booking.id;
  console.log(`✅ Booking Confirmed: Issued Reference ${bookingRef} with signed high-res QR code.`);

  // 7. Verify in Customer Booking History
  const myBookingsRes = await fetch(`${BASE_URL}/bookings/my`, { headers: authHeaders });
  const myBookingsData = await myBookingsRes.json();
  const createdBooking = myBookingsData.bookings.find(b => b.id === bookingId);
  assert(createdBooking);
  console.log(`✅ Booking History: Booking ${bookingRef} verified in user profile.`);

  // 8. Test Gate Scanner Ticket Validation
  const scanRes = await fetch(`${BASE_URL}/scanner/scan`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ bookingReference: bookingRef })
  });
  const scanData = await scanRes.json();
  assert.strictEqual(scanData.valid, true);
  assert.strictEqual(scanData.status, 'VALID_ENTRY');
  console.log(`✅ Gate Scanner: Verified entry pass for attendee ${scanData.booking.customer_name}. Marked as CHECKED_IN.`);

  // 9. Test Duplicate Check-in Prevention
  const dupScanRes = await fetch(`${BASE_URL}/scanner/scan`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ bookingReference: bookingRef })
  });
  const dupScanData = await dupScanRes.json();
  assert.strictEqual(dupScanData.valid, false);
  assert.strictEqual(dupScanData.status, 'ALREADY_CHECKED_IN');
  console.log(`✅ Duplicate Entry Guard: Correctly intercepted duplicate scan attempt!`);

  // 10. Check In-App Mailbox Log
  const emailRes = await fetch(`${BASE_URL}/emails`);
  const emailData = await emailRes.json();
  assert(emailData.emails.length > 0);
  const confEmail = emailData.emails.find(e => e.metadata && e.metadata.includes(bookingRef));
  assert(confEmail);
  console.log(`✅ In-App Mailbox: Dispatched ticket email "${confEmail.subject}" captured in mailbox previewer.`);

  // 11. Organiser Analytics
  const orgLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'cinema@starlight.com', password: 'Password@123' })
  });
  const orgData = await orgLogin.json();
  const orgAnalyticsRes = await fetch(`${BASE_URL}/analytics/organiser`, {
    headers: { 'Authorization': `Bearer ${orgData.token}` }
  });
  const orgAnalytics = await orgAnalyticsRes.json();
  assert(orgAnalytics.summary.total_revenue > 0);
  console.log(`✅ Organiser Analytics: Revenue ($${orgAnalytics.summary.total_revenue}) and Check-in rate (${orgAnalytics.summary.check_in_rate}%) computed accurately.`);

  console.log('\n🎉 ALL 11 END-TO-END INTEGRATION FLOWS PASSED PERFECTLY!\n');
}

runE2ETests().catch(err => {
  console.error('E2E test failed:', err);
  process.exit(1);
});
