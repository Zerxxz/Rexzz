import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const port = Number(process.env.PORT ?? 4173);
const root = process.env.SERVE_ROOT ?? 'dist';
const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
]);

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
  const safePath = normalize(url.pathname).replace(/^\.\.(\/|\\|$)/, '');
  const filePath = join(root, safePath === '/' ? 'index.html' : safePath);

  try {
    const body = await readFile(filePath);
    response.writeHead(200, { 'content-type': types.get(extname(filePath)) ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    const body = await readFile(join(root, 'index.html'));
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(body);
  }
}).listen(port, '0.0.0.0', () => {
  console.log(`ProofPilot running at http://localhost:${port}`);
});
