const ipHits = new Map();

function getClientIp(req) {
  return req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
}

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy-Report-Only',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
      "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
      "img-src 'self' data: https:",
      "frame-src 'self' https://www.google.com https://www.youtube.com",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  );

  const forwardedProto = req.headers['x-forwarded-proto'];
  if (req.secure || forwardedProto === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }

  next();
}

function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const max = options.max || 100;
  const message = options.message || 'Demasiadas solicitudes. Intente nuevamente más tarde.';

  return function rateLimiter(req, res, next) {
    const now = Date.now();
    const key = `${options.name || 'global'}:${getClientIp(req)}`;
    const current = ipHits.get(key);

    if (!current || current.resetAt <= now) {
      ipHits.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    current.count += 1;

    if (current.count > max) {
      const retryAfter = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: message });
    }

    return next();
  };
}

const apiRateLimiter = createRateLimiter({
  name: 'api',
  windowMs: 15 * 60 * 1000,
  max: 300,
});

const loginRateLimiter = createRateLimiter({
  name: 'login',
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Demasiados intentos de inicio de sesión. Intente nuevamente en unos minutos.',
});

const contactRateLimiter = createRateLimiter({
  name: 'contact',
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Demasiados mensajes enviados. Intente nuevamente en unos minutos.',
});

module.exports = {
  apiRateLimiter,
  contactRateLimiter,
  loginRateLimiter,
  securityHeaders,
};
