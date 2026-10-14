// Isolated upstream fixture, with no cookies, identities or authentication semantics of its own.
import http from 'node:http';

http.createServer(async (request, response) => {
  let body = '';
  for await (const chunk of request) body += chunk;
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ headers: request.headers, path: request.url, method: request.method, body }));
}).listen(8080, '0.0.0.0');
