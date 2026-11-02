export function sendJson(res, status, body) {
  res.status(status).json(body);
}

export function sendError(res, status, error, message) {
  res.status(status).json({ error, message });
}

export function baseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] ?? 'http';
  return `${proto}://${req.headers.host}`;
}
