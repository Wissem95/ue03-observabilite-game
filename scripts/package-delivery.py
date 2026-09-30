"""Prépare le ZIP de remise et vérifie les fichiers après compression."""
from pathlib import Path
import argparse
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--nom')
parser.add_argument('--prenom', default='Wissem')
parser.add_argument('--matiere', default='UE03')
args = parser.parse_args()
name = f'{args.nom}_{args.prenom}_{args.matiere}' if args.nom else 'UE03_Observabilite'
if any(char in name for char in '/\\') or name in {'.', '..'}:
    raise SystemExit('Nom d’archive invalide')

files = {
    'LIEN_GIT.txt': ROOT / 'LIEN_GIT.txt',
    'rapport.pdf': ROOT / 'output/pdf/rapport-observabilite.pdf',
    'demonstration.mp4': ROOT / 'output/video/demonstration.mp4',
}
for path in sorted((ROOT / 'observability/grafana/dashboards').glob('*.json')):
    files['dashboards/' + path.name] = path
for path in sorted((ROOT / 'evidence/screenshots').glob('*.png')):
    files['captures/' + path.name] = path

assert len([path for path in files if path.startswith('dashboards/')]) == 3
assert len([path for path in files if path.startswith('captures/')]) == 5
for path in files.values():
    if not path.is_file():
        raise SystemExit('Livrable absent : ' + str(path))
archive = ROOT / 'output' / (name + '.zip')
archive.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for member, path in files.items():
        z.write(path, name + '/' + member)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert len(z.namelist()) == len(files)
    for member, path in files.items():
        assert z.read(name + '/' + member) == path.read_bytes(), member
print(json.dumps({
    'archive': str(archive),
    'files': len(files),
    'contents': list(files),
    'bytes': archive.stat().st_size,
    'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
    'integrity': 'verified',
}, indent=2, ensure_ascii=False))
