const crypto = require('crypto');

const ITERATIONS = 120000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString('hex');

  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`;
}

function verifyPassword(password, storedPassword) {
  if (!storedPassword || !storedPassword.startsWith('pbkdf2$')) {
    return false;
  }

  const [, iterationsText, salt, originalHash] = storedPassword.split('$');
  const iterations = Number(iterationsText);

  if (!iterations || !salt || !originalHash) {
    return false;
  }

  const derivedHash = crypto
    .pbkdf2Sync(password, salt, iterations, KEY_LENGTH, DIGEST)
    .toString('hex');

  return crypto.timingSafeEqual(
    Buffer.from(originalHash, 'hex'),
    Buffer.from(derivedHash, 'hex'),
  );
}

module.exports = { hashPassword, verifyPassword };
