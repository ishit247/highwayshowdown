// Tiny local web server for the games (no installs needed, just Node).  Run:  node serve.js
// Then open http://localhost:8123/car-game.html  (installing it as an app only works from http://localhost or https).
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = +process.env.PORT || 8123, ROOT = __dirname;
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json', '.webmanifest':'application/manifest+json',
                '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.css':'text/css', '.md':'text/markdown; charset=utf-8' };

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/car-game.html';
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(PORT, () => console.log('Highway Showdown is running at http://localhost:' + PORT + '/car-game.html   (Ctrl+C to stop)'));
