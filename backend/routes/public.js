const db = require('../config/database');
const { HttpError, json } = require('../lib/http');

module.exports = (router) => {
  router.get('/api/public/home', async (_req, res) => {
    const [[providerCount]] = await db.execute(
      "SELECT COUNT(*) AS total FROM SERVICE_PROVIDER WHERE status = 'approved'",
    );
    const [[serviceCount]] = await db.execute('SELECT COUNT(*) AS total FROM SERVICE');
    const [[bookingCount]] = await db.execute('SELECT COUNT(*) AS total FROM BOOKING');
    const [[ratingSummary]] = await db.execute('SELECT ROUND(AVG(rating), 1) AS avg_rating FROM REVIEW');
    const [categories] = await db.execute(
      `SELECT sc.category_id, sc.category_name, sc.description,
              COUNT(s.service_id) AS service_count,
              MIN(s.price) AS min_price,
              MAX(s.price) AS max_price
       FROM SERVICE_CATEGORY sc
       LEFT JOIN SERVICE s ON s.category_id = sc.category_id
       GROUP BY sc.category_id
       ORDER BY service_count DESC, sc.category_name ASC`,
    );
    const [testimonials] = await db.execute(
      `SELECT r.booking_id, r.rating, r.comment,
              c.name AS customer_name,
              s.service_name,
              sp.name AS provider_name
       FROM REVIEW r
       JOIN BOOKING b ON b.booking_id = r.booking_id
       JOIN CUSTOMER c ON c.customer_id = b.customer_id
       JOIN SERVICE s ON s.service_id = b.service_id
       JOIN SERVICE_PROVIDER sp ON sp.provider_id = b.provider_id
       ORDER BY r.booking_id DESC
       LIMIT 3`,
    );

    json(res, 200, {
      success: true,
      data: {
        stats: {
          providers: Number(providerCount.total || 0),
          services: Number(serviceCount.total || 0),
          bookings: Number(bookingCount.total || 0),
          average_rating: Number(ratingSummary.avg_rating || 0),
        },
        categories,
        testimonials,
      },
    });
  });

  router.get('/api/public/categories', async (_req, res) => {
    const [rows] = await db.execute(
      'SELECT category_id, category_name, description FROM SERVICE_CATEGORY ORDER BY category_name',
    );
    json(res, 200, { success: true, data: rows });
  });

  router.get('/api/public/locations', async (_req, res) => {
    const [rows] = await db.execute(
      'SELECT location_id, city, area, pincode FROM LOCATION ORDER BY city, area',
    );
    json(res, 200, { success: true, data: rows });
  });

  router.get('/api/public/services', async (req, res) => {
    const filters = [];
    const params = [];

    if (req.query.category_id) {
      filters.push('sc.category_id = ?');
      params.push(req.query.category_id);
    }

    if (req.query.search) {
      filters.push('(LOWER(s.service_name) LIKE ? OR LOWER(sc.category_name) LIKE ? OR LOWER(sp.name) LIKE ?)');
      const search = `%${String(req.query.search).toLowerCase()}%`;
      params.push(search, search, search);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const [rows] = await db.execute(
      `SELECT s.service_id, s.service_name, s.description, s.price,
              sc.category_id, sc.category_name,
              sp.provider_id, sp.name AS provider_name, sp.experience_years,
              l.city, l.area, l.pincode,
              ROUND(AVG(r.rating), 1) AS avg_rating,
              COUNT(r.review_id) AS review_count
       FROM SERVICE s
       JOIN SERVICE_PROVIDER sp ON sp.provider_id = s.provider_id AND sp.status = 'approved'
       JOIN SERVICE_CATEGORY sc ON sc.category_id = s.category_id
       LEFT JOIN LOCATION l ON l.location_id = sp.location_id
       LEFT JOIN BOOKING b ON b.service_id = s.service_id
       LEFT JOIN REVIEW r ON r.booking_id = b.booking_id
       ${whereClause}
       GROUP BY s.service_id
       ORDER BY s.created_at DESC, s.service_name ASC`,
      params,
    );

    json(res, 200, { success: true, data: rows });
  });

  router.get('/api/public/services/:id', async (req, res) => {
    const serviceId = Number(req.params.id);
    const [serviceRows] = await db.execute(
      `SELECT s.service_id, s.service_name, s.description, s.price,
              sc.category_id, sc.category_name,
              sp.provider_id, sp.name AS provider_name,
              sp.phone AS provider_phone, sp.experience_years, sp.bio,
              l.city, l.area, l.pincode,
              ROUND(AVG(r.rating), 1) AS avg_rating,
              COUNT(r.review_id) AS review_count
       FROM SERVICE s
       JOIN SERVICE_PROVIDER sp ON sp.provider_id = s.provider_id AND sp.status = 'approved'
       JOIN SERVICE_CATEGORY sc ON sc.category_id = s.category_id
       LEFT JOIN LOCATION l ON l.location_id = sp.location_id
       LEFT JOIN BOOKING b ON b.service_id = s.service_id
       LEFT JOIN REVIEW r ON r.booking_id = b.booking_id
       WHERE s.service_id = ?
       GROUP BY s.service_id
       LIMIT 1`,
      [serviceId],
    );

    const service = serviceRows[0];
    if (!service) {
      throw new HttpError(404, 'Service not found.');
    }

    const [reviews] = await db.execute(
      `SELECT r.booking_id, r.rating, r.comment,
              c.name AS customer_name,
              DATE(b.scheduled_time) AS service_date
       FROM REVIEW r
       JOIN BOOKING b ON b.booking_id = r.booking_id
       JOIN CUSTOMER c ON c.customer_id = b.customer_id
       WHERE b.service_id = ?
       ORDER BY r.booking_id DESC
       LIMIT 6`,
      [serviceId],
    );
    const [slots] = await db.execute(
      `SELECT slot_id, service_id, available_date, start_time, end_time
       FROM AVAILABILITY_SLOT
       WHERE service_id = ? AND available_date >= CURDATE()
       ORDER BY available_date, start_time`,
      [serviceId],
    );
    const [relatedServices] = await db.execute(
      `SELECT service_id, service_name, price
       FROM SERVICE
       WHERE provider_id = ? AND service_id <> ?
       ORDER BY created_at DESC
       LIMIT 4`,
      [service.provider_id, serviceId],
    );

    json(res, 200, {
      success: true,
      data: { service, reviews, slots, relatedServices },
    });
  });

  router.get('/api/public/providers/:id', async (req, res) => {
    const providerId = Number(req.params.id);
    const [providerRows] = await db.execute(
      `SELECT sp.provider_id, sp.name, sp.email, sp.phone, sp.experience_years, sp.bio, sp.status,
              l.city, l.area, l.pincode,
              ROUND(AVG(r.rating), 1) AS avg_rating,
              COUNT(r.review_id) AS review_count
       FROM SERVICE_PROVIDER sp
       LEFT JOIN LOCATION l ON l.location_id = sp.location_id
       LEFT JOIN BOOKING b ON b.provider_id = sp.provider_id
       LEFT JOIN REVIEW r ON r.booking_id = b.booking_id
       WHERE sp.provider_id = ? AND sp.status = 'approved'
       GROUP BY sp.provider_id
       LIMIT 1`,
      [providerId],
    );

    const provider = providerRows[0];
    if (!provider) {
      throw new HttpError(404, 'Provider not found.');
    }

    const [services] = await db.execute(
      `SELECT s.service_id, s.service_name, s.description, s.price, sc.category_name
       FROM SERVICE s
       JOIN SERVICE_CATEGORY sc ON sc.category_id = s.category_id
       WHERE s.provider_id = ?
       ORDER BY s.created_at DESC`,
      [providerId],
    );
    const [reviews] = await db.execute(
      `SELECT r.booking_id, r.rating, r.comment,
              c.name AS customer_name,
              s.service_name
       FROM REVIEW r
       JOIN BOOKING b ON b.booking_id = r.booking_id
       JOIN CUSTOMER c ON c.customer_id = b.customer_id
       JOIN SERVICE s ON s.service_id = b.service_id
       WHERE b.provider_id = ?
       ORDER BY r.booking_id DESC
       LIMIT 8`,
      [providerId],
    );

    json(res, 200, {
      success: true,
      data: { provider, services, reviews },
    });
  });
};
