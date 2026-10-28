# Pixela - yerel sunucu. Windows'ta .js dosyalarinin dogru turde gitmesini saglar.
import http.server, os, socketserver, webbrowser

os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
        '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
        '.json': 'application/json', '.svg': 'image/svg+xml', '.mp4': 'video/mp4',
        '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2',
    }

    def guess_type(self, path):
        ext = os.path.splitext(path)[1].lower()
        return self.extensions_map.get(ext) or super().guess_type(path)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

for port in range(8000, 8011):
    try:
        httpd = socketserver.ThreadingTCPServer(('127.0.0.1', port), Handler)
        break
    except OSError:
        continue
else:
    raise SystemExit('8000-8010 portlari dolu.')

url = f'http://localhost:{port}/'
print(f'\n  PIXELA calisiyor:  {url}\n  Kapatmak icin bu pencereyi kapat (veya Ctrl+C).\n')
webbrowser.open(url)
httpd.serve_forever()
