import { Router } from 'express';
import { requireAuth, optionalAuth, requireRole } from '../middleware/auth.js';
import * as authCtrl from '../controllers/authController.js';
import * as venueCtrl from '../controllers/venueController.js';
import * as eventCtrl from '../controllers/eventController.js';
import * as showCtrl from '../controllers/showController.js';
import * as bookingCtrl from '../controllers/bookingController.js';
import * as waitlistCtrl from '../controllers/waitlistController.js';
import * as scannerCtrl from '../controllers/scannerController.js';
import * as emailCtrl from '../controllers/emailController.js';
import * as analyticsCtrl from '../controllers/analyticsController.js';
import { addShowSubscriber, addUserSubscriber } from '../services/sseService.js';
import { verifyToken } from '../utils/token.js';
import { seedDatabase } from '../db/seed.js';

const router = Router();

// --- Auth Routes ---
router.post('/auth/register', authCtrl.register);
router.post('/auth/login', authCtrl.login);
router.get('/auth/me', requireAuth, authCtrl.getMe);
router.get('/auth/demo-users', authCtrl.getDemoUsers);
router.post('/auth/switch-user', authCtrl.switchUser);

// --- Venue Routes ---
router.get('/venues', venueCtrl.listVenues);
router.get('/venues/:id', venueCtrl.getVenue);
router.post('/venues', requireAuth, requireRole('ADMIN'), venueCtrl.createVenue);

// --- Event Routes ---
router.get('/events', eventCtrl.listEvents);
router.get('/events/:id', eventCtrl.getEvent);
router.post('/events', requireAuth, requireRole('ORGANISER', 'ADMIN'), eventCtrl.createEvent);
router.get('/organiser/events', requireAuth, requireRole('ORGANISER', 'ADMIN'), eventCtrl.getOrganiserEvents);

// --- Show & Real-time Seat Hold Routes ---
router.get('/shows/:id', optionalAuth, showCtrl.getShow);
router.post('/shows', requireAuth, requireRole('ORGANISER', 'ADMIN'), showCtrl.createShow);
router.post('/shows/:id/hold', requireAuth, showCtrl.holdSeats);
router.post('/shows/:id/release-hold', requireAuth, showCtrl.releaseHold);

// --- Booking Routes ---
router.post('/bookings/confirm', requireAuth, bookingCtrl.confirmBooking);
router.get('/bookings/my', requireAuth, bookingCtrl.getUserBookings);
router.get('/bookings/:idOrRef', bookingCtrl.getBookingDetails);
router.post('/bookings/:id/cancel', requireAuth, bookingCtrl.cancelBooking);

// --- Waitlist Routes ---
router.post('/waitlist/join', requireAuth, waitlistCtrl.joinWaitlist);
router.get('/waitlist/my', requireAuth, waitlistCtrl.getUserWaitlist);
router.get('/waitlist/:id', waitlistCtrl.getWaitlistOffer);
router.post('/waitlist/:id/claim', requireAuth, waitlistCtrl.claimOffer);
router.post('/waitlist/:id/decline', requireAuth, waitlistCtrl.declineOffer);

// --- Scanner / Door Check-in Routes ---
router.post('/scanner/scan', requireAuth, scannerCtrl.scanTicket);

// --- In-App Mailbox Routes ---
router.get('/emails', emailCtrl.listEmails);
router.get('/emails/:id', emailCtrl.getEmail);
router.delete('/emails', emailCtrl.clearEmails);

// --- Analytics Routes ---
router.get('/analytics/organiser', requireAuth, requireRole('ORGANISER', 'ADMIN'), analyticsCtrl.getOrganiserAnalytics);
router.get('/analytics/admin', requireAuth, requireRole('ADMIN'), analyticsCtrl.getAdminAnalytics);

// --- Realtime Server-Sent Events (SSE) Routes ---
router.get('/sse/shows/:id', (req, res) => {
  addShowSubscriber(req.params.id, res, req);
});

router.get('/sse/user', (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ error: 'Token required for user SSE notification stream.' });
  }
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) {
    return res.status(401).json({ error: 'Invalid token.' });
  }
  addUserSubscriber(decoded.id, res, req);
});

// --- Sample Data Seeding Endpoint ---
router.post('/seed', async (req, res, next) => {
  try {
    await seedDatabase();
    res.json({ success: true, message: 'Sample events, venues, and shows seeded successfully!' });
  } catch (err) {
    next(err);
  }
});

export default router;
