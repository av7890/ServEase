const db = require('../config/database');
const { requireAuth } = require('../lib/auth');
const { HttpError, json } = require('../lib/http');

module.exports = (router) => {
  router.get('/api/admin/dashboard', async (req, res) => {
    requireAuth(req, ['admin']);

    const [[customers]] = await db.execute('SELECT COUNT(*) AS total FROM CUSTOMER');
    const [[providers]] = await db.execute('SELECT COUNT(*) AS total FROM SERVICE_PROVIDER');
    const [[pending]] = await db.execute("SELECT COUNT(*) AS total FROM SERVICE_PROVIDER WHERE status = 'pending'");
    const [[bookings]] = await db.execute('SELECT COUNT(*) AS total FROM BOOKING');
    const [[revenue]] = await db.execute(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM PAYMENT WHERE payment_status = 'completed'",
    );
    const [recentBookings] = await db.execute(
      `SELECT b.booking_id, b.status, b.scheduled_time, c.name AS customer_name, sp.name AS provider_name, s.service_name
       FROM BOOKING b
       JOIN CUSTOMER c ON c.customer_id = b.customer_id
       JOIN SERVICE_PROVIDER sp ON sp.provider_id = b.provider_id
       JOIN SERVICE s ON s.service_id = b.service_id
       ORDER BY b.booking_id DESC
       LIMIT 6`,
    );

    json(res, 200, {
      success: true,
      data: {
        stats: {
          total_customers: Number(customers.total || 0),
          total_providers: Number(providers.total || 0),
          pending_providers: Number(pending.total || 0),
          total_bookings: Number(bookings.total || 0),
          total_revenue: Number(revenue.total || 0),
        },
        recentBookings,
      },
    });
  });

  router.get('/api/admin/providers', async (req, res) => {
    requireAuth(req, ['admin']);
    const status = req.query.status;
    const params = [];
    let sql = `
      SELECT sp.provider_id, sp.name, sp.email, sp.phone, sp.experience_years, sp.status, sp.bio, sp.created_at,
             l.city, l.area, l.pincode
      FROM SERVICE_PROVIDER sp
      LEFT JOIN LOCATION l ON l.location_id = sp.location_id
    `;

    if (status) {
      sql += ' WHERE sp.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY sp.created_at DESC';
    const [rows] = await db.execute(sql, params);
    json(res, 200, { success: true, data: rows });
  });

  router.patch('/api/admin/providers/:id/approve', async (req, res) => {
    const admin = requireAuth(req, ['admin']);
    const [result] = await db.execute(
      `UPDATE SERVICE_PROVIDER
       SET status = 'approved', approved_by = ?
       WHERE provider_id = ? AND status = 'pending'`,
      [admin.id, req.params.id],
    );

    if (result.affectedRows === 0) {
      throw new HttpError(404, 'Pending provider not found.');
    }

    json(res, 200, { success: true, message: 'Provider approved successfully.' });
  });

  router.patch('/api/admin/providers/:id/suspend', async (req, res) => {
    requireAuth(req, ['admin']);
    const [result] = await db.execute(
      "UPDATE SERVICE_PROVIDER SET status = 'suspended' WHERE provider_id = ?",
      [req.params.id],
    );

    if (result.affectedRows === 0) {
      throw new HttpError(404, 'Provider not found.');
    }

    json(res, 200, { success: true, message: 'Provider suspended successfully.' });
  });

  router.patch('/api/admin/providers/:id/reinstate', async (req, res) => {
    requireAuth(req, ['admin']);
    const [result] = await db.execute(
      "UPDATE SERVICE_PROVIDER SET status = 'approved' WHERE provider_id = ?",
      [req.params.id],
    );

    if (result.affectedRows === 0) {
      throw new HttpError(404, 'Provider not found.');
    }

    json(res, 200, { success: true, message: 'Provider reinstated successfully.' });
  });

  router.get('/api/admin/customers', async (req, res) => {
    requireAuth(req, ['admin']);
    const [rows] = await db.execute(
      `SELECT c.customer_id, c.name, c.email, c.phone, c.address, c.created_at,
              COUNT(b.booking_id) AS total_bookings
       FROM CUSTOMER c
       LEFT JOIN BOOKING b ON b.customer_id = c.customer_id
       GROUP BY c.customer_id
       ORDER BY c.created_at DESC`,
    );

    json(res, 200, { success: true, data: rows });
  });

  router.get('/api/admin/bookings', async (req, res) => {
    requireAuth(req, ['admin']);
    const [rows] = await db.execute(
      `SELECT b.booking_id, b.booking_date, b.scheduled_time, b.status, b.notes,
              c.name AS customer_name, sp.name AS provider_name,
              s.service_name, s.price,
              p.payment_id, p.amount, p.method, p.payment_status
       FROM BOOKING b
       JOIN CUSTOMER c ON c.customer_id = b.customer_id
       JOIN SERVICE_PROVIDER sp ON sp.provider_id = b.provider_id
       JOIN SERVICE s ON s.service_id = b.service_id
       LEFT JOIN PAYMENT p ON p.booking_id = b.booking_id
       ORDER BY b.booking_id DESC`,
    );

    json(res, 200, { success: true, data: rows });
  });

  router.get('/api/admin/reviews', async (req, res) => {
    requireAuth(req, ['admin']);
    const [rows] = await db.execute(
      `SELECT r.booking_id, r.review_id, r.rating, r.comment,
              c.name AS customer_name,
              sp.name AS provider_name,
              s.service_name
       FROM REVIEW r
       JOIN BOOKING b ON b.booking_id = r.booking_id
       JOIN CUSTOMER c ON c.customer_id = b.customer_id
       JOIN SERVICE_PROVIDER sp ON sp.provider_id = b.provider_id
       JOIN SERVICE s ON s.service_id = b.service_id
       ORDER BY r.booking_id DESC`,
    );

    json(res, 200, { success: true, data: rows });
  });
};
