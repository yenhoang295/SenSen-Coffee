// Chèn theme.css và nav.js vào mọi trang web/*.html. Chạy lại bao nhiêu lần cũng an toàn.
// Dùng: node scripts/apply-theme.mjs   (chạy trong thư mục web)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSS = '<link rel="stylesheet" href="css/theme.css">';
const JS = '<script type="module" src="js/nav.js"></script>';

for (const name of readdirSync(root).filter(n => n.endsWith('.html'))) {
  const file = join(root, name);
  let html = readFileSync(file, 'utf8');
  const before = html;
  if (!html.includes('css/theme.css')) {
    html = html.includes('css/style.css">')
      ? html.replace(/(<link[^>]*css\/style\.css"[^>]*>)/, `$1\n  ${CSS}`)
      : html.replace('</head>', `  ${CSS}\n</head>`);
  }
  if (!html.includes('js/nav.js')) html = html.replace('</body>', `  ${JS}\n</body>`);
  if (html !== before) { writeFileSync(file, html); console.log('Đã cập nhật', name); }
  else console.log('Giữ nguyên ', name);
}
