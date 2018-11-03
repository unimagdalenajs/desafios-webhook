const createHandler = require('./src/handler');

const http = require('http');
const port = process.env.PORT || 3000;

http.createServer(function (req, res) {
  createHandler(req, res, function (err) {
    res.statusCode = 404
    res.end('no such location');
  });
}).listen(port);

console.log(`Corriendo en puerto ${port}`);
