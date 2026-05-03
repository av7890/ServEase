const db = require('../config/database');
const { requireAuth } = require('../lib/auth');
const { HttpError, json } = require('../lib/http');

function assertBookingStatus(status) {
  const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!allowed.includes(status)) {
    throw new HttpError(400, 'Invalid booking status.');
  }
}

function normalizeScheduledTime(value) {
  const text = String(value || '').trim();
  const dateMatch = text.match(/\d{4}-\d{2}-\d{2}/);
  const timeMatches = text.match(/\b\d{2}:\d{2}:\d{2}\b/g);
  const timeMatch = timeMatches?.[timeMatches.length - 1];

  if (!dateMatch || !timeMatch) {
    throw new HttpError(400, 'Scheduled time is invalid.');
  }

  return `${dateMatch[0]} ${timeMatch}`;
}

module.exports = (router) => {
  router.get('/api/bookings', async (req, res) => {
    const user = requireAuth(req);
    let query;
    let params;

    if (user.role === 'customer') {
      query = `
        SELECT b.booking_id, b.booking_date, b.scheduled_time, b.status, b.notes,
               s.service_id, s.service_name, s.price,
               sp.provider_id, sp.name AS provider_name,
               p.payment_id, p.amount, p.method AS payment_method, p.payment_status,
               r.review_id, r.rating, r.comment
        FROM BOOKING b
        JOIN SERVICE s ON s.service_id = b.service_id
        JOIN SERVICE_PROVIDER sp ON sp.provider_id = b.provider_id
        LEFT JOIN PAYMENT p ON p.booking_id = b.booking_id
        LEFT JOIN REVIEW r ON r.booking_id = b.booking_id
        WHERE b.customer_id = ?
        ORDER BY b.scheduled_time DESC
      `;
      params = [user.id];
    } else if (user.role === 'provider') {
      query = `
        SELECT b.booking_id, b.booking_date, b.scheduled_time, b.status, b.notes,
               s.service_id, s.service_name, s.price,
               c.customer_id, c.name AS customer_name, c.phone AS customer_phone,
               p.payment_id, p.amount, p.method AS payment_method, p.payment_status
        FROM BOOKING b
        JOIN SERVICE s ON s.service_id = b.service_id
        JOIN CUSTOMER c ON c.customer_id = b.customer_id
        LEFT JOIN PAYMENT p ON p.booking_id = b.booking_id
        WHERE b.provider_id = ?
        ORDER BY b.scheduled_time DESC
      `;
      params = [user.id];
    } else {
      query = `
        SELECT b.booking_id, b.booking_date, b.scheduled_time, b.status, b.notes,
               s.service_name, s.price,
               c.name AS customer_name,
               sp.name AS provider_name,
               p.payment_id, p.amount, p.method AS payment_method, p.payment_status
        FROM BOOKING b
        JOIN SERVICE s ON s.service_id = b.service_id
        JOIN CUSTOMER c ON c.customer_id = b.customer_id
        JOIN SERVICE_PROVIDER sp ON sp.provider_id = b.provider_id
        LEFT JOIN PAYMENT p ON p.booking_id = b.booking_id
        ORDER BY b.scheduled_time DESC
      `;
      params = [];
    }

    const [rows] = await db.execute(query, params);
    json(res, 200, { success: true, data: rows });
  });

  router.post('/api/bookings', async (req, res) => {
    const user = requireAuth(req, ['customer']);
    const { service_id, scheduled_time, notes } = req.body;

    if (!service_id || !scheduled_time) {
      throw new HttpError(400, 'Service and schedule are required.');
    }

    const [serviceRows] = await db.execute(
      `SELECT s.service_id, s.price, s.provider_id, sp.status AS provider_status
       FROM SERVICE s
       JOIN SERVICE_PROVIDER sp ON sp.provider_id = s.provider_id
       WHERE s.service_id = ? LIMIT 1`,
      [service_id],
    );

    const service = serviceRows[0];
    if (!service) {
      throw new HttpError(404, 'Selected service was not found.');
    }

    if (service.provider_status !== 'approved') {
      throw new HttpError(400, 'This service is not currently bookable.');
    }

    const bookingDate = new Date().toISOString().slice(0, 10);
    const normalizedScheduledTime = normalizeScheduledTime(scheduled_time);
    const [result] = await db.execute(
      `INSERT INTO BOOKING
        (booking_date, scheduled_time, status, customer_id, service_id, provider_id, notes)
       VALUES (?, ?, 'pending', ?, ?, ?, ?)`,
      [bookingDate, normalizedScheduledTime, user.id, service.service_id, service.provider_id, notes?.trim() || null],
    );

    json(res, 201, {
      success: true,
      message: 'Booking created successfully.',
      data: {
        booking_id: result.insertId,
        service_id: service.service_id,
        provider_id: service.provider_id,
        amount: Number(service.price),
      },
    });
  });

  router.patch('/api/bookings/:id/cancel', async (req, res) => {
    const user = requireAuth(req, ['customer', 'admin']);
    const bookingId = Number(req.params.id);

    const clauses = ['booking_id = ?'];
    const params = [bookingId];

    if (user.role === 'customer') {
      clauses.push('customer_id = ?');
      params.push(user.id);
    }

    const [rows] = await db.execute(
      `SELECT booking_id, status FROM BOOKING WHERE ${clauses.join(' AND ')} LIMIT 1`,
      params,
    );

    const booking = rows[0];
    if (!booking) {
      throw new HttpError(404, 'Booking not found.');
    }

    if (!['pending', 'confirmed'].includes(booking.status)) {
      throw new HttpError(400, 'Only pending or confirmed bookings can be cancelled.');
    }

    await db.execute('UPDATE BOOKING SET status = ? WHERE booking_id = ?', ['cancelled', bookingId]);
    json(res, 200, { success: true, message: 'Booking cancelled successfully.' });
  });

  router.patch('/api/bookings/:id/status', async (req, res) => {
    const user = requireAuth(req, ['provider', 'admin']);
    const bookingId = Number(req.params.id);
    const { status } = req.body;

    assertBookingStatus(status);

    const conditions = ['booking_id = ?'];
    const params = [bookingId];

    if (user.role === 'provider') {
      conditions.push('provider_id = ?');
      params.push(user.id);
    }

    const [rows] = await db.execute(
      `SELECT booking_id FROM BOOKING WHERE ${conditions.join(' AND ')} LIMIT 1`,
      params,
    );

    if (!rows[0]) {
      throw new HttpError(404, 'Booking not found.');
    }

    await db.execute('UPDATE BOOKING SET status = ? WHERE booking_id = ?', [status, bookingId]);
    json(res, 200, { success: true, message: `Booking status updated to ${status}.` });
  });

  router.post('/api/bookings/:id/payment', async (req, res) => {
    const user = requireAuth(req, ['customer', 'admin']);
    const bookingId = Number(req.params.id);
    const { amount, method } = req.body;

    if (!amount || !method) {
      throw new HttpError(400, 'Payment amount and method are required.');
    }

    const conditions = ['b.booking_id = ?'];
    const params = [bookingId];

    if (user.role === 'customer') {
      conditions.push('b.customer_id = ?');
      params.push(user.id);
    }

    const [bookingRows] = await db.execute(
      `SELECT b.booking_id, s.price
       FROM BOOKING b
       JOIN SERVICE s ON s.service_id = b.service_id
       WHERE ${conditions.join(' AND ')}
       LIMIT 1`,
      params,
    );

    const booking = bookingRows[0];
    if (!booking) {
      throw new HttpError(404, 'Booking not found.');
    }

    const [[paymentSeed]] = await db.execute(
      `SELECT COALESCE(MAX(payment_id), 0) + 1 AS next_payment_id
       FROM PAYMENT
       WHERE booking_id = ?`,
      [bookingId],
    );

    await db.execute(
      `INSERT INTO PAYMENT (booking_id, payment_id, amount, method, payment_status, payment_date)
       VALUES (?, ?, ?, ?, 'completed', CURDATE())`,
      [bookingId, Number(paymentSeed.next_payment_id), amount, method],
    );

    const [paymentRows] = await db.execute(
      `SELECT payment_id, amount, method, payment_status, payment_date
       FROM PAYMENT
       WHERE booking_id = ?
       ORDER BY payment_id DESC
       LIMIT 1`,
      [bookingId],
    );

    json(res, 201, {
      success: true,
      message: 'Payment recorded successfully.',
      data: {
        booking_id: bookingId,
        payment_id: paymentRows[0]?.payment_id,
        amount: Number(paymentRows[0]?.amount || amount),
        method: paymentRows[0]?.method || method,
        payment_status: paymentRows[0]?.payment_status || 'completed',
      },
    });
  });

  router.post('/api/bookings/:id/review', async (req, res) => {
    const user = requireAuth(req, ['customer']);
    const bookingId = Number(req.params.id);
    const { rating, comment } = req.body;

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      throw new HttpError(400, 'Rating must be between 1 and 5.');
    }

    const [bookingRows] = await db.execute(
      `SELECT booking_id, status
       FROM BOOKING
       WHERE booking_id = ? AND customer_id = ?
       LIMIT 1`,
      [bookingId, user.id],
    );

    const booking = bookingRows[0];
    if (!booking) {
      throw new HttpError(404, 'Booking not found.');
    }

    if (booking.status !== 'completed') {
      throw new HttpError(400, 'Only completed bookings can be reviewed.');
    }

    const [existingReviews] = await db.execute(
      'SELECT review_id FROM REVIEW WHERE booking_id = ? LIMIT 1',
      [bookingId],
    );

    if (existingReviews[0]) {
      throw new HttpError(409, 'A review already exists for this booking.');
    }

    const [[reviewSeed]] = await db.execute(
      `SELECT COALESCE(MAX(review_id), 0) + 1 AS next_review_id
       FROM REVIEW
       WHERE booking_id = ?`,
      [bookingId],
    );

    await db.execute(
      'INSERT INTO REVIEW (booking_id, review_id, rating, comment) VALUES (?, ?, ?, ?)',
      [bookingId, Number(reviewSeed.next_review_id), Number(rating), comment?.trim() || null],
    );

    json(res, 201, { success: true, message: 'Review submitted successfully.' });
  });
};
