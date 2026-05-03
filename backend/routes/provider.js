const db = require('../config/database');
const { requireAuth } = require('../lib/auth');
const { HttpError, json } = require('../lib/http');

module.exports = (router) => {
  router.get('/api/providers/profile', async (req, res) => {
    const user = requireAuth(req, ['provider']);
    const [rows] = await db.execute(
      `SELECT sp.provider_id, sp.name, sp.email, sp.phone, sp.experience_years, sp.status, sp.bio, sp.created_at,
              l.location_id, l.city, l.area, l.pincode
       FROM SERVICE_PROVIDER sp
       LEFT JOIN LOCATION l ON l.location_id = sp.location_id
       WHERE sp.provider_id = ?
       LIMIT 1`,
      [user.id],
    );

    if (!rows[0]) {
      throw new HttpError(404, 'Provider account not found.');
    }

    json(res, 200, { success: true, data: rows[0] });
  });

  router.put('/api/providers/profile', async (req, res) => {
    const user = requireAuth(req, ['provider']);
    const { name, phone, experience_years, location_id, bio } = req.body;

    await db.execute(
      `UPDATE SERVICE_PROVIDER
       SET name = COALESCE(?, name),
           phone = COALESCE(?, phone),
           experience_years = COALESCE(?, experience_years),
           location_id = COALESCE(?, location_id),
           bio = COALESCE(?, bio)
       WHERE provider_id = ?`,
      [
        name?.trim() || null,
        phone?.trim() || null,
        experience_years ?? null,
        location_id || null,
        bio?.trim() || null,
        user.id,
      ],
    );

    json(res, 200, { success: true, message: 'Provider profile updated successfully.' });
  });

  router.get('/api/providers/dashboard', async (req, res) => {
    const user = requireAuth(req, ['provider']);
    const [[summary]] = await db.execute(
      `SELECT COUNT(*) AS total_bookings,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_bookings,
              SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_bookings,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_bookings
       FROM BOOKING
       WHERE provider_id = ?`,
      [user.id],
    );
    const [[earnings]] = await db.execute(
      `SELECT COALESCE(SUM(p.amount), 0) AS total_earnings,
              ROUND(AVG(r.rating), 1) AS avg_rating
       FROM BOOKING b
       LEFT JOIN PAYMENT p ON p.booking_id = b.booking_id AND p.payment_status = 'completed'
       LEFT JOIN REVIEW r ON r.booking_id = b.booking_id
       WHERE b.provider_id = ?`,
      [user.id],
    );
    const [reviews] = await db.execute(
      `SELECT r.booking_id, r.rating, r.comment, c.name AS customer_name, s.service_name
       FROM REVIEW r
       JOIN BOOKING b ON b.booking_id = r.booking_id
       JOIN CUSTOMER c ON c.customer_id = b.customer_id
       JOIN SERVICE s ON s.service_id = b.service_id
       WHERE b.provider_id = ?
       ORDER BY r.booking_id DESC
       LIMIT 6`,
      [user.id],
    );

    json(res, 200, {
      success: true,
      data: {
        summary: {
          total_bookings: Number(summary.total_bookings || 0),
          pending_bookings: Number(summary.pending_bookings || 0),
          confirmed_bookings: Number(summary.confirmed_bookings || 0),
          completed_bookings: Number(summary.completed_bookings || 0),
          total_earnings: Number(earnings.total_earnings || 0),
          avg_rating: Number(earnings.avg_rating || 0),
        },
        reviews,
      },
    });
  });

  router.get('/api/providers/services', async (req, res) => {
    const user = requireAuth(req, ['provider']);
    const [rows] = await db.execute(
      `SELECT s.service_id, s.service_name, s.description, s.price, s.created_at,
              sc.category_id, sc.category_name
       FROM SERVICE s
       JOIN SERVICE_CATEGORY sc ON sc.category_id = s.category_id
       WHERE s.provider_id = ?
       ORDER BY s.created_at DESC`,
      [user.id],
    );

    json(res, 200, { success: true, data: rows });
  });

  router.post('/api/providers/services', async (req, res) => {
    const user = requireAuth(req, ['provider']);
    const { service_name, description, price, category_id } = req.body;

    if (!service_name || !price || !category_id) {
      throw new HttpError(400, 'Service name, category, and price are required.');
    }

    const [result] = await db.execute(
      `INSERT INTO SERVICE (service_name, description, price, provider_id, category_id)
       VALUES (?, ?, ?, ?, ?)`,
      [service_name.trim(), description?.trim() || null, Number(price), user.id, category_id],
    );

    json(res, 201, {
      success: true,
      message: 'Service created successfully.',
      data: { service_id: result.insertId },
    });
  });

  router.put('/api/providers/services/:id', async (req, res) => {
    const user = requireAuth(req, ['provider']);
    const { service_name, description, price, category_id } = req.body;

    const [result] = await db.execute(
      `UPDATE SERVICE
       SET service_name = COALESCE(?, service_name),
           description = COALESCE(?, description),
           price = COALESCE(?, price),
           category_id = COALESCE(?, category_id)
       WHERE service_id = ? AND provider_id = ?`,
      [
        service_name?.trim() || null,
        description?.trim() || null,
        price ?? null,
        category_id || null,
        req.params.id,
        user.id,
      ],
    );

    if (result.affectedRows === 0) {
      throw new HttpError(404, 'Service not found.');
    }

    json(res, 200, { success: true, message: 'Service updated successfully.' });
  });

  router.delete('/api/providers/services/:id', async (req, res) => {
    const user = requireAuth(req, ['provider']);
    const [result] = await db.execute(
      'DELETE FROM SERVICE WHERE service_id = ? AND provider_id = ?',
      [req.params.id, user.id],
    );

    if (result.affectedRows === 0) {
      throw new HttpError(404, 'Service not found.');
    }

    json(res, 200, { success: true, message: 'Service deleted successfully.' });
  });

  router.get('/api/providers/slots', async (req, res) => {
    const user = requireAuth(req, ['provider']);
    const [rows] = await db.execute(
      `SELECT s.provider_id, s.slot_id, s.service_id, s.available_date, s.start_time, s.end_time,
              svc.service_name
       FROM AVAILABILITY_SLOT s
       JOIN SERVICE svc ON svc.service_id = s.service_id
       WHERE s.provider_id = ?
       ORDER BY s.available_date, s.start_time`,
      [user.id],
    );

    json(res, 200, { success: true, data: rows });
  });

  router.post('/api/providers/slots', async (req, res) => {
    const user = requireAuth(req, ['provider']);
    const { service_id, available_date, start_time, end_time } = req.body;

    if (!service_id || !available_date || !start_time || !end_time) {
      throw new HttpError(400, 'Service, date, start time, and end time are required.');
    }

    const [serviceRows] = await db.execute(
      `SELECT service_id
       FROM SERVICE
       WHERE service_id = ? AND provider_id = ?
       LIMIT 1`,
      [service_id, user.id],
    );

    if (!serviceRows[0]) {
      throw new HttpError(404, 'Service not found for this provider.');
    }

    const [[slotSeed]] = await db.execute(
      `SELECT COALESCE(MAX(slot_id), 0) + 1 AS next_slot_id
       FROM AVAILABILITY_SLOT
       WHERE provider_id = ?`,
      [user.id],
    );

    await db.execute(
      `INSERT INTO AVAILABILITY_SLOT (provider_id, slot_id, service_id, available_date, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.id, Number(slotSeed.next_slot_id), Number(service_id), available_date, start_time, end_time],
    );

    const [rows] = await db.execute(
      `SELECT s.provider_id, s.slot_id, s.service_id, s.available_date, s.start_time, s.end_time,
              svc.service_name
       FROM AVAILABILITY_SLOT s
       JOIN SERVICE svc ON svc.service_id = s.service_id
       WHERE s.provider_id = ?
       ORDER BY s.slot_id DESC
       LIMIT 1`,
      [user.id],
    );

    json(res, 201, {
      success: true,
      message: 'Availability slot created successfully.',
      data: rows[0],
    });
  });

  router.delete('/api/providers/slots/:slotId', async (req, res) => {
    const user = requireAuth(req, ['provider']);
    const [result] = await db.execute(
      'DELETE FROM AVAILABILITY_SLOT WHERE provider_id = ? AND slot_id = ?',
      [user.id, req.params.slotId],
    );

    if (result.affectedRows === 0) {
      throw new HttpError(404, 'Availability slot not found.');
    }

    json(res, 200, { success: true, message: 'Availability slot removed successfully.' });
  });
};
