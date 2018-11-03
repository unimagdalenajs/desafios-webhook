/**
 * Generate a response
 * @param {any} payload 
 * @param {number?} statusCode 
 */
export function respond(payload, statusCode = 200) {
  return {
    statusCode,
    body: JSON.stringify({ payload })
  };
}

/**
 * Make body
 * @param {any} body
 */
export function makeBody(body) {
  const parsed = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    mode: 'cors',
    cache: 'default',
  };
  if (body) {
    parsed.body = JSON.stringify(body);
  }
  return parsed;
}
