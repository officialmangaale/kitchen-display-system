const ABSOLUTE_HTTP_URL = /^https?:\/\//i;

/**
 * Validate a service origin without ever falling back to the browser origin.
 * Frontend builds must provide the backend origin explicitly; a missing value
 * is a configuration error, not a reason to call the SPA host.
 */
export function getConfiguredServiceBase(value, label) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    throw configurationError(`${label} is not configured. Set the matching VITE_*_BASE_URL value.`);
  }
  if (!ABSOLUTE_HTTP_URL.test(raw)) {
    throw configurationError(`${label} must be an absolute http(s) URL.`);
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw configurationError(`${label} is not a valid URL.`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw configurationError(`${label} must use http or https.`);
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw configurationError(`${label} must not contain credentials, query parameters, or a fragment.`);
  }

  const path = parsed.pathname.replace(/\/+$/, '');
  return `${parsed.origin}${path}`;
}

export function configurationError(message) {
  const error = new Error(message);
  error.code = 'CONFIGURATION_ERROR';
  return error;
}

