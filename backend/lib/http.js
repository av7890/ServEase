const MAX_BODY_SIZE = 1024 * 1024;

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

function createCorsHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    ...extra,
  };
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, createCorsHeaders({
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  }));
  res.end(body);
}

function noContent(res) {
  res.writeHead(204, createCorsHeaders());
  res.end();
}

async function parseJsonBody(req) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return {};
  }

  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk.toString();
      if (raw.length > MAX_BODY_SIZE) {
        reject(new HttpError(413, 'Request body is too large.'));
      }
    });

    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new HttpError(400, 'Request body must be valid JSON.'));
      }
    });

    req.on('error', () => {
      reject(new HttpError(400, 'Unable to read request body.'));
    });
  });
}

function handleError(res, error) {
  if (error instanceof HttpError) {
    json(res, error.status, {
      success: false,
      message: error.message,
      details: error.details,
    });
    return;
  }

  console.error(error);
  json(res, 500, { success: false, message: 'Server error.' });
}

module.exports = {
  HttpError,
  createCorsHeaders,
  json,
  noContent,
  parseJsonBody,
  handleError,
};
