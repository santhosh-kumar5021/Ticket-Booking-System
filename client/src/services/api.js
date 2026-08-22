export const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api` 
  : '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('ticketpass_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || 'Network request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),
  getDemoUsers: () => request('/auth/demo-users'),
  switchUser: (userId) => request('/auth/switch-user', { method: 'POST', body: JSON.stringify({ userId }) }),

  // Events & Shows
  getEvents: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/events${query ? `?${query}` : ''}`);
  },
  getEvent: (id) => request(`/events/${id}`),
  createEvent: (body) => request('/events', { method: 'POST', body: JSON.stringify(body) }),
  getOrganiserEvents: () => request('/organiser/events'),

  // Shows & Seat Holds
  getShow: (id) => request(`/shows/${id}`),
  createShow: (body) => request('/shows', { method: 'POST', body: JSON.stringify(body) }),
  holdSeats: (showId, showSeatIds) => request(`/shows/${showId}/hold`, { method: 'POST', body: JSON.stringify({ showSeatIds }) }),
  releaseHold: (showId, showSeatIds) => request(`/shows/${showId}/release-hold`, { method: 'POST', body: JSON.stringify({ showSeatIds }) }),

  // Bookings
  confirmBooking: (showId, showSeatIds, paymentDetails) =>
    request('/bookings/confirm', { method: 'POST', body: JSON.stringify({ showId, showSeatIds, paymentDetails }) }),
  getMyBookings: () => request('/bookings/my'),
  getBookingDetails: (idOrRef) => request(`/bookings/${idOrRef}`),
  cancelBooking: (id) => request(`/bookings/${id}/cancel`, { method: 'POST' }),

  // Waitlist
  joinWaitlist: (showId, seatCategory) =>
    request('/waitlist/join', { method: 'POST', body: JSON.stringify({ showId, seatCategory }) }),
  getMyWaitlist: () => request('/waitlist/my'),
  getWaitlistOffer: (id) => request(`/waitlist/${id}`),
  claimWaitlistOffer: (id) => request(`/waitlist/${id}/claim`, { method: 'POST' }),
  declineWaitlistOffer: (id) => request(`/waitlist/${id}/decline`, { method: 'POST' }),

  // Venues
  getVenues: () => request('/venues'),
  getVenue: (id) => request(`/venues/${id}`),
  createVenue: (body) => request('/venues', { method: 'POST', body: JSON.stringify(body) }),

  // Scanner
  scanTicket: (body) => request('/scanner/scan', { method: 'POST', body: JSON.stringify(body) }),

  // In-App Mailbox
  getEmails: () => request('/emails'),
  getEmail: (id) => request(`/emails/${id}`),
  clearEmails: () => request('/emails', { method: 'DELETE' }),

  // Analytics
  getOrganiserAnalytics: () => request('/analytics/organiser'),
  getAdminAnalytics: () => request('/analytics/admin')
};
