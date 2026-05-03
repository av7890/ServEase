require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { Router, normalizePath } = require('./lib/router');
const { json, noContent, parseJsonBody, handleError } = require('./lib/http');

const registerPublicRoutes = require('./routes/public');
const registerAuthRoutes = require('./routes/auth');
const registerBookingRoutes = require('./routes/booking');
const registerCustomerRoutes = require('./routes/customer');
const registerProviderRoutes = require('./routes/provider');
const registerAdminRoutes = require('./routes/admin');

const PORT = Number(process.env.PORT || 3000);
const DIST_CANDIDATES = [
  path.join(__dirname, '..', 'frontend', 'dist', 'frontend', 'browser'),
  path.join(__dirname, '..', 'frontend', 'dist', 'frontend'),
];

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

function findDistDirectory() {
  return DIST_CANDIDATES.find((candidate) => fs.existsSync(candidate)) || DIST_CANDIDATES[0];
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (error, data) => {
    if (error) {
      serveIndex(res);
      return;
    }

    res.writeHead(200, { 'Content-Type': mime, 'Content-Length': data.length });
    res.end(data);
  });
}

function serveIndex(res) {
  const indexPath = path.join(findDistDirectory(), 'index.html');
  fs.readFile(indexPath, (error, data) => {
    if (error) {
      json(res, 500, {
        success: false,
        message: 'Angular build not found. Run "cd frontend && npm run build".',
      });
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
}

const router = new Router();
registerPublicRoutes(router);
registerAuthRoutes(router);
registerBookingRoutes(router);
registerCustomerRoutes(router);
registerProviderRoutes(router);
registerAdminRoutes(router);

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = normalizePath(requestUrl.pathname);
  const method = req.method.toUpperCase();

  if (method === 'OPTIONS') {
    noContent(res);
    return;
  }

  if (pathname === '/api/health') {
    json(res, 200, {
      success: true,
      data: {
        status: 'ok',
        service: 'ServeEase API',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  if (pathname.startsWith('/api/')) {
    const matchedRoute = router.match(method, pathname);
    if (!matchedRoute) {
      json(res, 404, { success: false, message: 'API endpoint not found.' });
      return;
    }

    try {
      req.body = await parseJsonBody(req);
      req.query = Object.fromEntries(requestUrl.searchParams.entries());
      req.params = matchedRoute.params;
      await matchedRoute.handler(req, res);
    } catch (error) {
      handleError(res, error);
    }
    return;
  }

  if (pathname === '/' || !path.extname(pathname)) {
    serveIndex(res);
    return;
  }

  serveFile(res, path.join(findDistDirectory(), pathname));
});

server.listen(PORT, () => {
  console.log(`ServEase server running at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
