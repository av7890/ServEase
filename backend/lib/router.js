function normalizePath(pathname) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function tokenize(pathname) {
  const normalized = normalizePath(pathname);
  return normalized === '/' ? [] : normalized.slice(1).split('/');
}

class Router {
  constructor() {
    this.routes = [];
  }

  register(method, path, handler) {
    this.routes.push({
      method: method.toUpperCase(),
      path,
      tokens: tokenize(path),
      handler,
    });
  }

  get(path, handler) {
    this.register('GET', path, handler);
  }

  post(path, handler) {
    this.register('POST', path, handler);
  }

  put(path, handler) {
    this.register('PUT', path, handler);
  }

  patch(path, handler) {
    this.register('PATCH', path, handler);
  }

  delete(path, handler) {
    this.register('DELETE', path, handler);
  }

  match(method, pathname) {
    const requestMethod = method.toUpperCase();
    const requestTokens = tokenize(pathname);

    for (const route of this.routes) {
      if (route.method !== requestMethod || route.tokens.length !== requestTokens.length) {
        continue;
      }

      const params = {};
      let matched = true;

      route.tokens.forEach((token, index) => {
        if (!matched) {
          return;
        }

        if (token.startsWith(':')) {
          params[token.slice(1)] = decodeURIComponent(requestTokens[index]);
          return;
        }

        if (token !== requestTokens[index]) {
          matched = false;
        }
      });

      if (matched) {
        return { handler: route.handler, params };
      }
    }

    return null;
  }
}

module.exports = { Router, normalizePath };
