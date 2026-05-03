const jwt = require('jsonwebtoken');
const { HttpError } = require('./http');

const JWT_SECRET = process.env.JWT_SECRET || 'serveease-dev-secret';
const TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '7d';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function readBearerToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' ? token : null;
}

function requireAuth(req, roles = []) {
  const token = readBearerToken(req);

  if (!token) {
    throw new HttpError(401, 'Please sign in to continue.');
  }

  let user;
  try {
    user = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new HttpError(403, 'Your session is invalid or has expired.');
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    throw new HttpError(403, 'You do not have access to this action.');
  }

  return user;
}

module.exports = { signToken, requireAuth };
