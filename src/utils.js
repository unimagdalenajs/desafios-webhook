/**
 * Generate a response
 * @param {any} payload 
 * @param {number?} statusCode 
 */
exports.respond = function (payload, statusCode = 200) {
  return {
    statusCode,
    body: JSON.stringify({ payload })
  };
};

/**
 * Make body
 * @param {any} body
 */
exports.makeBody = function (body) {
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
};
