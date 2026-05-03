const db = require('../config/database');
const { requireAuth } = require('../lib/auth');
const { HttpError, json } = require('../lib/http');

module.exports = (router) => {
  router.get('/api/customers/profile', async (req, res) => {
    const user = requireAuth(req, ['customer']);
    const [rows] = await db.execute(
      'SELECT customer_id, name, email, phone, address, created_at FROM CUSTOMER WHERE customer_id = ? LIMIT 1',
      [user.id],
    );

    if (!rows[0]) {
      throw new HttpError(404, 'Customer account not found.');
    }

    json(res, 200, { success: true, data: rows[0] });
  });

  router.put('/api/customers/profile', async (req, res) => {
    const user = requireAuth(req, ['customer']);
    const { name, phone, address } = req.body;

    await db.execute(
      `UPDATE CUSTOMER
       SET name = COALESCE(?, name),
           phone = COALESCE(?, phone),
           address = COALESCE(?, address)
       WHERE customer_id = ?`,
      [name?.trim() || null, phone?.trim() || null, address?.trim() || null, user.id],
    );

    json(res, 200, { success: true, message: 'Profile updated successfully.' });
  });

  router.get('/api/customers/dashboard', async (req, res) => {
    const user = requireAuth(req, ['customer']);
    const [[profile]] = await db.execute(
      'SELECT customer_id, name, email, phone, address, created_at FROM CUSTOMER WHERE customer_id = ?',
      [user.id],
    );
    const [[stats]] = await db.execute(
      `SELECT COUNT(*) AS total_bookings,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_bookings,
              SUM(CASE WHEN status IN ('pending', 'confirmed') THEN 1 ELSE 0 END) AS active_bookings
       FROM BOOKING
       WHERE customer_id = ?`,
      [user.id],
    );
    const [[payments]] = await db.execute(
      `SELECT COALESCE(SUM(amount), 0) AS total_spent
       FROM PAYMENT p
       JOIN BOOKING b ON b.booking_id = p.booking_id
       WHERE b.customer_id = ? AND p.payment_status = 'completed'`,
      [user.id],
    );
    const [reviews] = await db.execute(
      `SELECT r.booking_id, r.rating, r.comment, s.service_name, sp.name AS provider_name
       FROM REVIEW r
       JOIN BOOKING b ON b.booking_id = r.booking_id
       JOIN SERVICE s ON s.service_id = b.service_id
       JOIN SERVICE_PROVIDER sp ON sp.provider_id = b.provider_id
       WHERE b.customer_id = ?
       ORDER BY r.booking_id DESC
       LIMIT 5`,
      [user.id],
    );

    json(res, 200, {
      success: true,
      data: {
        profile,
        stats: {
          total_bookings: Number(stats.total_bookings || 0),
          completed_bookings: Number(stats.completed_bookings || 0),
          active_bookings: Number(stats.active_bookings || 0),
          total_spent: Number(payments.total_spent || 0),
        },
        reviews,
      },
    });
  });
};
