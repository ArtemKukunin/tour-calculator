"""Build dist/index.html: page template + pricing core + published data."""
import json, pathlib
root = pathlib.Path(__file__).parent
head = (root / 'src/skeleton-head.txt').read_text().strip()
core = (root / 'src/core.js').read_text()
pub_file = root / 'published.json'
pub = pub_file.read_text().strip() if pub_file.exists() else 'null'
json.loads(pub)  # fail early on broken data
html = (root / 'src/page.html').read_text() \
    .replace('/*CORE*/', core) \
    .replace('/*HEAD*/', head.replace('\\', '\\\\').replace("'", "\\'")) \
    .replace('/*PUB*/', pub)
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist/index.html').write_text(html)
print('dist/index.html', len(html), 'bytes')
