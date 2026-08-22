/**
 * Server-Sent Events (SSE) Hub for real-time live seat map updates and user notifications.
 */

// Map of showId -> Set of response objects
const showSubscribers = new Map();

// Map of userId -> Set of response objects
const userSubscribers = new Map();

export function addShowSubscriber(showId, res, req) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!showSubscribers.has(showId)) {
    showSubscribers.set(showId, new Set());
  }
  showSubscribers.get(showId).add(res);

  // Send initial connection ACK
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', showId, timestamp: new Date().toISOString() })}\n\n`);

  // Heartbeat to keep connection alive across proxies
  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch (err) {
      clearInterval(heartbeat);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const set = showSubscribers.get(showId);
    if (set) {
      set.delete(res);
      if (set.size === 0) showSubscribers.delete(showId);
    }
  });
}

export function addUserSubscriber(userId, res, req) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!userSubscribers.has(userId)) {
    userSubscribers.set(userId, new Set());
  }
  userSubscribers.get(userId).add(res);

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED_USER', userId, timestamp: new Date().toISOString() })}\n\n`);

  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch (err) {
      clearInterval(heartbeat);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const set = userSubscribers.get(userId);
    if (set) {
      set.delete(res);
      if (set.size === 0) userSubscribers.delete(userId);
    }
  });
}

/**
 * Broadcast seat state change delta to all viewers of a show
 */
export function broadcastSeatUpdate(showId, payload) {
  const subscribers = showSubscribers.get(showId);
  if (!subscribers || subscribers.size === 0) return;

  const message = `data: ${JSON.stringify({
    type: 'SEAT_UPDATE',
    showId,
    ...payload,
    timestamp: new Date().toISOString()
  })}\n\n`;

  for (const client of subscribers) {
    try {
      client.write(message);
    } catch (err) {
      console.error('Error writing to SSE subscriber:', err);
      subscribers.delete(client);
    }
  }
}

/**
 * Notify a specific user (e.g. Waitlist offer, hold timer alert)
 */
export function notifyUser(userId, payload) {
  const subscribers = userSubscribers.get(userId);
  if (!subscribers || subscribers.size === 0) return;

  const message = `data: ${JSON.stringify({
    type: 'USER_NOTIFICATION',
    ...payload,
    timestamp: new Date().toISOString()
  })}\n\n`;

  for (const client of subscribers) {
    try {
      client.write(message);
    } catch (err) {
      console.error('Error writing to user SSE subscriber:', err);
      subscribers.delete(client);
    }
  }
}
