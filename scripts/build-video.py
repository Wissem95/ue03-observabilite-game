"""Ajoute les commentaires à l'enregistrement du projet, sans piste audio."""
from pathlib import Path
import json
import subprocess
import textwrap

import matplotlib
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / 'tmp/video/montage'
OUT = ROOT / 'output/video'
TMP.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
manifest = json.loads((ROOT / 'evidence/video/sequence.json').read_text())
source = ROOT / 'evidence/video' / manifest['source']
if not source.is_file():
    raise SystemExit('Enregistrement source absent : ' + str(source))
font_path = Path(matplotlib.get_data_path()) / 'fonts/ttf/DejaVuSans.ttf'
font = ImageFont.truetype(str(font_path), 28)
clips = []
transcript = ['# Commentaires de la démonstration', '',
              'Nouvelle capture du 8 octobre : Grafana, Prometheus et les exécutions GitHub Actions du dépôt ue03-telemetrie. '
              'Les pauses entre les prises ont été retirées. Les commentaires sont ajoutés au montage. '
              'La vidéo ne contient aucune piste audio.', '']
for index, segment in enumerate(manifest['segments']):
    caption = Image.new('RGBA', (1600, 120), (15, 20, 26, 235))
    draw = ImageDraw.Draw(caption)
    lines = textwrap.wrap(segment['text'], 98)
    assert len(lines) <= 2, 'Commentaire trop long : ' + segment['text']
    y = (120 - len(lines) * 38) // 2
    for line in lines:
        assert draw.textlength(line, font=font) <= 1500
        draw.text((50, y), line, font=font, fill='white')
        y += 38
    png = TMP / f'commentaire-{index:02d}.png'
    caption.save(png)
    clip = TMP / f'extrait-{index:02d}.mp4'
    duration = segment['end'] - segment['start']
    subprocess.run([
        'ffmpeg', '-y', '-v', 'error', '-ss', str(segment['start']), '-i', str(source),
        '-loop', '1', '-framerate', '15', '-i', str(png),
        '-filter_complex', '[0:v]scale=1600:900[screen];[screen][1:v]overlay=0:780',
        '-t', str(duration), '-an', '-r', '15', '-c:v', 'libx264', '-crf', '18',
        '-preset', 'veryfast', '-pix_fmt', 'yuv420p', str(clip),
    ], check=True)
    clips.append(clip)
    transcript.extend([f"## {segment['start']:.0f} s", segment['text'], ''])
concat = TMP / 'concat.txt'
concat.write_text(''.join("file '" + str(path) + "'\n" for path in clips))
video = OUT / 'demonstration.mp4'
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(concat),
                '-an', '-c:v', 'copy', '-movflags', '+faststart', str(video)], check=True)
probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
                     'format=duration:stream=codec_type,width,height', '-of', 'json', str(video)]))
assert float(probe['format']['duration']) <= 240, 'Vidéo trop longue'
assert all(stream['codec_type'] != 'audio' for stream in probe['streams']), 'Piste audio inattendue'
(ROOT / 'docs/demonstration-transcription.md').write_text('\n'.join(transcript))
print(json.dumps({'duration_seconds': float(probe['format']['duration']),
                  'audio_streams': 0, 'output': str(video)}, indent=2))
