const db = require('../config/database');
const { signToken, requireAuth } = require('../lib/auth');
const { HttpError, json } = require('../lib/http');
const { hashPassword, verifyPassword } = require('../lib/passwords');

const ROLE_CONFIG = {
  customer: {
    table: 'CUSTOMER',
    idField: 'customer_id',
    nameField: 'name',
  },
  provider: {
    table: 'SERVICE_PROVIDER',
    idField: 'provider_id',
    nameField: 'name',
  },
  admin: {
    table: 'ADMIN',
    idField: 'admin_id',
    nameField: 'username',
  },
};

function validateRole(role) {
  if (!ROLE_CONFIG[role]) {
    throw new HttpError(400, 'Role must be customer, provider, or admin.');
  }
}

async function fetchUserByEmail(role, email) {
  const config = ROLE_CONFIG[role];
  const [rows] = await db.execute(`SELECT * FROM ${config.table} WHERE email = ? LIMIT 1`, [email]);
  return rows[0] || null;
}

async function respondWithSession(res, role, userRecord) {
  const config = ROLE_CONFIG[role];
  const id = userRecord[config.idField];
  const name = userRecord[config.nameField];
  const token = signToken({
    id,
    role,
    email: userRecord.email,
    name,
  });

  json(res, 200, {
    success: true,
    message: 'Login successful.',
    token,
    role,
    id,
    name,
    status: userRecord.status,
  });
}

module.exports = (router) => {
  router.post('/api/auth/register/customer', async (req, res) => {
    const { name, email, phone, password, address } = req.body;

    if (!name || !email || !phone || !password || !address) {
      throw new HttpError(400, 'Name, email, phone, password, and address are required.');
    }

    const existingUser = await fetchUserByEmail('customer', email.trim().toLowerCase());
    if (existingUser) {
      throw new HttpError(409, 'That email address is already registered.');
    }

    const [result] = await db.execute(
      'INSERT INTO CUSTOMER (name, email, phone, password, address) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), phone.trim(), hashPassword(password), address.trim()],
    );

    const token = signToken({
      id: result.insertId,
      role: 'customer',
      email: email.trim().toLowerCase(),
      name: name.trim(),
    });

    json(res, 201, {
      success: true,
      message: 'Customer account created successfully.',
      token,
      role: 'customer',
      id: result.insertId,
      name: name.trim(),
    });
  });

  router.post('/api/auth/register/provider', async (req, res) => {
    const { name, email, phone, password, experience_years, location_id, bio } = req.body;

    if (!name || !email || !phone || !password) {
      throw new HttpError(400, 'Name, email, phone, and password are required.');
    }

    const existingUser = await fetchUserByEmail('provider', email.trim().toLowerCase());
    if (existingUser) {
      throw new HttpError(409, 'That email address is already registered.');
    }

    const [result] = await db.execute(
      `INSERT INTO SERVICE_PROVIDER
        (name, email, phone, password, experience_years, location_id, bio, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        phone.trim(),
        hashPassword(password),
        Number(experience_years) || 0,
        location_id || null,
        bio?.trim() || null,
      ],
    );

    json(res, 201, {
      success: true,
      message: 'Provider registration submitted. An administrator must approve the account before bookings can go live.',
      role: 'provider',
      id: result.insertId,
      status: 'pending',
    });
  });

  router.post('/api/auth/login', async (req, res) => {
    const { role, email, password } = req.body;
    validateRole(role);

    if (!email || !password) {
      throw new HttpError(400, 'Email and password are required.');
    }

    const user = await fetchUserByEmail(role, email.trim().toLowerCase());
    if (!user || !verifyPassword(password, user.password)) {
      throw new HttpError(401, 'Invalid email, password, or role.');
    }

    if (role === 'provider' && user.status === 'suspended') {
      throw new HttpError(403, 'This provider account is suspended.');
    }

    await respondWithSession(res, role, user);
  });

  router.post('/api/auth/reset-password', async (req, res) => {
    const { role, email, phone, newPassword } = req.body;
    validateRole(role);

    if (!email || !newPassword) {
      throw new HttpError(400, 'Email and new password are required.');
    }

    const user = await fetchUserByEmail(role, email.trim().toLowerCase());
    if (!user) {
      throw new HttpError(404, 'No account was found for those details.');
    }

    if (role !== 'admin' && (!phone || user.phone !== phone.trim())) {
      throw new HttpError(400, 'Phone number verification failed.');
    }

    await db.execute(
      `UPDATE ${ROLE_CONFIG[role].table} SET password = ? WHERE ${ROLE_CONFIG[role].idField} = ?`,
      [hashPassword(newPassword), user[ROLE_CONFIG[role].idField]],
    );

    json(res, 200, { success: true, message: 'Password reset successfully. You can sign in now.' });
  });

  router.post('/api/auth/change-password', async (req, res) => {
    const user = requireAuth(req);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new HttpError(400, 'Current password and new password are required.');
    }

    const config = ROLE_CONFIG[user.role];
    const [rows] = await db.execute(
      `SELECT ${config.idField}, password FROM ${config.table} WHERE ${config.idField} = ? LIMIT 1`,
      [user.id],
    );

    const record = rows[0];
    if (!record || !verifyPassword(currentPassword, record.password)) {
      throw new HttpError(400, 'Current password is incorrect.');
    }

    await db.execute(
      `UPDATE ${config.table} SET password = ? WHERE ${config.idField} = ?`,
      [hashPassword(newPassword), user.id],
    );

    json(res, 200, { success: true, message: 'Password updated successfully.' });
  });
};
