# 🎟️ TicketPass — Event-Agnostic High-Concurrency Ticket Booking Platform

> A full-stack ticket booking platform built for any seated event — movies, concerts, theatre, stadium sports, comedy shows, and conferences. Features real-time visual seat selection, atomic transaction-level concurrency control, configurable hold TTL auto-release, an automated FIFO waitlist cascade engine on cancellation, cryptographic QR ticket generation, and a gate check-in scanner.

---

## 🌟 Key Capabilities

1. **Event-Agnostic Architecture**: A unified data model where a `Show` is an instance of an `Event` at a `Venue` with custom category tier pricing (`VIP`, `PREMIUM`, `STANDARD`).
2. **Hard Concurrency Guarantees**: SQLite WAL mode with `BEGIN IMMEDIATE` atomic transactions ensuring simultaneous attempts on the same seat never result in double-booking or race conditions.
3. **Seat Hold with Configurable TTL**: Seats placed on hold display a live countdown timer (e.g., 10 minutes). A background worker running every 3 seconds automatically reclaims expired holds and broadcasts state changes over Server-Sent Events (SSE).
4. **Automated Waitlist & Cascading Reallocation**: Sold-out shows allow customers to join a category queue. When a ticket is cancelled, the freed seat is automatically reserved and offered to the next waitlisted user via a time-limited (5-min) email link with automated cascading if declined or expired.
5. **Post-Booking QR Passes & In-App Mailbox**: Generates high-res cryptographic signed QR passes delivered via Nodemailer, with a built-in **In-App Mailbox Previewer** to test and view delivered tickets and waitlist offers without third-party email configuration.
6. **Gate Scanner & Ticket Validation**: Gate check-in terminal verifying QR payload signatures and intercepting duplicate entry attempts.
7. **Role-Based Portals**:
   - **Customer**: Visual interactive SVG seat map, hold timer bar, digital passes, booking history, waitlist management.
   - **Organiser**: Event and show creation wizard, custom tier pricing, hold TTL sliders, real-time revenue analytics, and occupancy charts.
   - **Admin**: Visual Venue Layout Architect with live SVG preview, custom sections, rows, columns, and aisles.

---

## 🏗️ Architecture & Tech Stack

```
ticketbookingSystemunthinkable/
├── server/                    # Node.js + Express + Better-SQLite3 (WAL Mode)
│   ├── src/
│   │   ├── db/                # Schema, Migrations, Connection, Seed Data
│   │   ├── controllers/       # Auth, Venues, Events, Shows, Bookings, Waitlist, Scanner, Analytics
│   │   ├── services/          # Concurrency Engine, Hold Worker, Waitlist Cascade, Email, QR, SSE
│   │   ├── middleware/        # JWT Authentication, Role Guards, Error Handler
│   │   ├── routes/            # REST API & SSE Endpoints
│   │   └── server.js          # Express Entry Point
│   └── tests/
│       ├── concurrency.test.js# 50-worker concurrent collision & waitlist cascade test
│       └── e2e-api.test.js    # 11-step end-to-end integration test suite
├── client/                    # React 18 + Vite + Lucide Icons + Glassmorphism Design System
│   ├── src/
│   │   ├── components/        # SeatMap (SVG), HoldCountdownBar, CheckoutModal, DigitalTicketPass, Navbar
│   │   ├── pages/             # EventCatalog, ShowBookingPage, MyBookings, MyWaitlist, ClaimWaitlist, Organiser, Admin, Scanner, Mailbox
│   │   ├── context/           # AuthContext, NotificationContext
│   │   ├── services/          # API Client & SSE Stream Listener
│   │   └── styles/            # Modern Glassmorphic CSS System
│   └── vite.config.js
├── system_design.md           # System Design write-up (Seat Hold, Concurrency, Waitlist Flow)
└── package.json               # Monorepo Scripts
```

---

## 💾 Database Schema

The platform relies on a relational schema designed for high-performance concurrency. Key tables include:

- **`users`**: Role-based accounts (`ADMIN`, `ORGANISER`, `CUSTOMER`).
- **`venues` & `seats`**: Venues own physical layouts and individual `seats` with specific x/y coordinates and categories.
- **`events` & `shows`**: `events` act as logical containers; `shows` represent specific instances with start/end times and per-tier pricing.
- **`show_seats`**: Maps physical seats to a specific show, tracking real-time status (`AVAILABLE`, `HELD`, `BOOKED`), hold expiry TTLs, and a `version` counter for optimistic locking.
- **`bookings` & `booking_seats`**: Final confirmed checkout records with cryptographic QR payloads.
- **`waitlist_entries`**: FIFO queue for sold-out events tracking user position, requested category, and time-limited `offer_expires_at` metadata.
- **`emails_log`**: In-App Mailbox preview storage for HTML tickets and waitlist offers.

---

## 🧠 Logic Explanations (Seat Hold & Waitlist)

For a detailed 800-word system design write-up covering:
- Seat Hold TTL & Auto-Release Mechanisms
- Concurrency Protection (Atomic Transactions & Lock Avoidance)
- Waitlist Auto-Assignment & Time-Limited Cascading Offers

Please refer to the detailed architecture document here: **[system_design.md](./system_design.md)**

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (tested on Node v24.x)
- **NPM**: v9+

### 1. Install Dependencies
```bash
# From the root directory:
npm run install:all
```
*(Or navigate to `/server` and `/client` and run `npm install` in each).*

### 2. Seed the Database
Populates venues, realistic multi-category events, shows, seat layouts, sample bookings, and active waitlist entries:
```bash
npm run seed
```

### 3. Run Application
Run backend and frontend simultaneously:
```bash
# Option A: Start both concurrently from root
npm run dev

# Option B: Run individually
# Terminal 1 (Backend API on http://localhost:5000)
npm run dev:server

# Terminal 2 (Frontend Client on http://localhost:5173)
npm run dev:client
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 👥 Demo User Accounts (1-Click Switcher Available in UI)

| Role | Name | Email | Password |
|---|---|---|---|
| **Admin** | System Administrator | `admin@ticketpass.app` | `Admin@123` |
| **Organiser** | Starlight Cinema & Theatres | `cinema@starlight.com` | `Password@123` |
| **Organiser** | LivePulse Concerts & Sports | `events@livepulse.com` | `Password@123` |
| **Customer** | Alex Johnson | `alex.johnson@example.com` | `Password@123` |
| **Customer** | Samantha Reed | `samantha.reed@example.com` | `Password@123` |
| **Customer** | Marcus Chen | `marcus.chen@example.com` | `Password@123` |
| **Customer** | Elena Rostova | `elena.rostova@example.com` | `Password@123` |

*Note: You can click the user avatar in the top-right navbar to instantly switch between any demo user without logging out.*

---

## 🧪 Automated Concurrency & Integration Tests

### 1. High-Concurrency Collision & Waitlist Cascade Test
Simulates 50 simultaneous parallel requests competing for the exact same VIP seat, verifying that exactly 1 request succeeds and 49 receive 409 Conflict. Also tests hold TTL auto-release, waitlist FIFO assignment, and cascading on decline.
```bash
npm run test:concurrency
```

### 2. End-to-End API Integration Suite
Executes 11 end-to-end integration flows (Event browsing, seat holds, checkout, QR pass generation, duplicate gate check-in detection, cancellation cascade, email delivery, and analytics):
```bash
cd server
node tests/e2e-api.test.js
```

---

## ⚙️ Environment Variables

A `.env` file is pre-configured in `server/.env`:

```ini
PORT=5000
NODE_ENV=development
JWT_SECRET=super_secret_jwt_ticket_booking_key_2026
CLIENT_URL=http://localhost:5173
DATABASE_PATH=./data/ticket_booking.db
DEFAULT_HOLD_TTL_MINUTES=10
WAITLIST_OFFER_TTL_MINUTES=5

# Optional SMTP Provider (Emails are always viewable in the In-App Mailbox)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="TicketPass Support <tickets@ticketpass.app>"
```

---

## 📡 Key API Reference

### Shows & Concurrency Hold
- `GET /api/shows/:id` — Get show details with real-time seat status (`AVAILABLE`, `HELD`, `BOOKED`) and tier pricing.
- `POST /api/shows/:id/hold` — **Atomic Seat Hold**. Locks requested seat IDs with configurable TTL. Returns `409 Conflict` if contested.
- `POST /api/shows/:id/release-hold` — Manually releases holds placed by current user.
- `GET /api/sse/shows/:id` — Server-Sent Events stream for live seat map updates.

### Bookings & Tickets
- `POST /api/bookings/confirm` — Atomic checkout for held seats. Issues reference & cryptographic QR pass.
- `GET /api/bookings/my` — Get user's confirmed and past booking passes.
- `GET /api/bookings/:idOrRef` — Retrieve booking pass details.
- `POST /api/bookings/:id/cancel` — Cancels booking and **triggers automatic waitlist reallocation cascade**.

### Waitlist
- `POST /api/waitlist/join` — Join FIFO queue for a sold-out show and category.
- `GET /api/waitlist/my` — Get user's active waitlist queue positions and offers.
- `POST /api/waitlist/:id/claim` — Claim allocated waitlist seat within 5-minute window.
- `POST /api/waitlist/:id/decline` — Decline offer and immediately cascade seat to next user in line.

### Scanner & Mailbox
- `POST /api/scanner/scan` — Gate QR code & booking verification with duplicate check-in guard.
- `GET /api/emails` — In-App Mailbox inspection for all dispatched HTML ticket emails.

---

## 🌐 Deployment Guide (Vercel / Render / Railway)

- **Backend (Render / Railway / Fly.io)**:
  - Root directory: `server`
  - Build command: `npm install`
  - Start command: `node src/server.js`
  - Set environment variables (`NODE_ENV=production`, `PORT=5000`, `JWT_SECRET=...`).
- **Frontend (Vercel / Netlify / Cloudflare Pages)**:
  - Root directory: `client`
  - Build command: `npm run build`
  - Output directory: `dist`
  - Configure `VITE_API_URL` or reverse proxy to backend.
