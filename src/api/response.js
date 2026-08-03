/**
 * Read a service response without attempting to JSON.parse an SPA document.
 * A successful HTML response is a routing/configuration failure, not order
 * data, and gets a sanitized diagnostic instead of "Unexpected token '<'".
 */
export async function readServiceResponse(res, serviceName = 'Service') {
  const contentType = String(res.headers?.get?.('content-type') || '').toLowerCase();
  const body = await res.text();
  let data = null;

  if (contentType.includes('application/json')) {
    try {
      data = body ? JSON.parse(body) : null;
    } catch {
      throw serviceResponseError(
        res.status,
        'INVALID_JSON',
        `${serviceName} returned invalid JSON. Check the configured backend origin.`,
      );
    }
  } else if (res.ok) {
    throw serviceResponseError(
      res.status,
      'UPSTREAM_NOT_JSON',
      `${serviceName} returned ${contentType || 'an unknown content type'} instead of JSON. Check the configured backend origin and proxy route.`,
    );
  }

  if (!res.ok) {
    const errorData = data && typeof data === 'object' ? data : {};
    const error = new Error(
      errorData.message || errorData.error || `${serviceName} request failed (${res.status})`,
    );
    error.status = res.status;
    error.code = errorData.error || errorData.code || 'HTTP_ERROR';
    error.message = errorData.message || error.message;
    throw error;
  }

  return data;
}

function serviceResponseError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

