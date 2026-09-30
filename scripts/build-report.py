"""Génère le rapport depuis sa source Markdown et les preuves calculées."""
from pathlib import Path
import json,re,html,textwrap,sqlite3
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak,Preformatted,Image
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4
ROOT=Path(__file__).resolve().parents[1]
fontdir=Path(matplotlib.get_data_path())/'fonts/ttf'
# Le répertoire des polices peut être adapté à un autre environnement.
import os
fontdir=Path(os.environ.get('REPORT_FONT_DIR',str(fontdir)))
for name,file in [('DejaVu','DejaVuSans.ttf'),('DejaVu-Bold','DejaVuSans-Bold.ttf')]:pdfmetrics.registerFont(TTFont(name,str(fontdir/file)))
pdfmetrics.registerFontFamily('DejaVu',normal='DejaVu',bold='DejaVu-Bold',italic='DejaVu',boldItalic='DejaVu-Bold')
chartdir=ROOT/'evidence/charts';chartdir.mkdir(parents=True,exist_ok=True)
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'axes.spines.top':False,'axes.spines.right':False})
fig,ax=plt.subplots(figsize=(9.6,3.1),layout='constrained')
labels=['Haute définition + bloom','Autres configurations'];before=[100/298,700/897];after=[24800/419,600/426]
for offset,values,label,color in [(-.17,before,'Avant jeudi 18 h','#12324A'),(.17,after,'Après jeudi 18 h','#D86635')]:
 bars=ax.bar([i+offset for i in range(2)],values,.32,label=label,color=color)
 ax.bar_label(bars,labels=[f'{v:.2f} %'.replace('.',',') for v in values],padding=4)
ax.set_xticks([0,1],labels);ax.set_ylabel('Part de rapports overlay (%)');ax.set_ylim(0,72);ax.legend(loc='upper right',frameon=False)
ax.set_title('La hausse se concentre dans une configuration graphique',loc='left',weight='bold')
fig.savefig(chartdir/'cohortes.png',dpi=180);plt.close(fig)
db=sqlite3.connect(ROOT/'analysis/events.sqlite');rows=db.execute("SELECT local_time,duration_s,short_win FROM events WHERE event='game_completed' ORDER BY ts").fetchall()
from datetime import datetime
fig,ax=plt.subplots(figsize=(9.6,3.1),layout='constrained')
for flag,color,label in [(0,'#12324A','Autres parties'),(1,'#D86635','Vault 3-0, moins de 90 s')]:
 r=[x for x in rows if x[2]==flag];ax.scatter([datetime.fromisoformat(x[0]) for x in r],[x[1] for x in r],s=12,c=color,label=label,alpha=.7)
ax.axhline(90,c='#117C83',ls=':',label='Seuil de 90 s');ax.set_ylabel('Durée de partie (secondes)');ax.set_title('Deux groupes de victoires très courtes',loc='left',weight='bold')
import matplotlib.dates as mdates
from zoneinfo import ZoneInfo
ax.xaxis.set_major_formatter(mdates.DateFormatter('%d/%m',tz=ZoneInfo('Europe/Paris')));ax.legend(fontsize=8,loc='upper right',frameon=False)
fig.savefig(chartdir/'parties.png',dpi=180);plt.close(fig);db.close()
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyFR',fontName='DejaVu',fontSize=9.3,leading=13.3,spaceAfter=8,textColor=colors.HexColor('#243748')))
styles.add(ParagraphStyle(name='TitleFR',parent=styles['BodyFR'],fontName='DejaVu-Bold',fontSize=21,leading=25,spaceAfter=16,textColor=colors.HexColor('#12324A')))
styles.add(ParagraphStyle(name='H2FR',parent=styles['BodyFR'],fontName='DejaVu-Bold',fontSize=12.5,leading=17,spaceBefore=6,spaceAfter=9,textColor=colors.HexColor('#117C83')))
styles.add(ParagraphStyle(name='H3FR',parent=styles['BodyFR'],fontName='DejaVu-Bold',fontSize=10.7,leading=15,spaceBefore=7,spaceAfter=7,textColor=colors.HexColor('#117C83')))
styles.add(ParagraphStyle(name='CellFR',parent=styles['BodyFR'],fontSize=8,leading=11,spaceAfter=0))
styles.add(ParagraphStyle(name='CodeFR',fontName='Courier',fontSize=7.3,leading=10,spaceAfter=10,backColor=colors.HexColor('#F1F5F8'),borderPadding=8))
def inline(t):
 t=html.escape(t);t=re.sub(r'\*\*(.*?)\*\*',r'<b>\1</b>',t);t=re.sub(r'`([^`]+)`',r'<font name="Courier">\1</font>',t);return t
story=[];lines=(ROOT/'docs/rapport.md').read_text().splitlines();i=0
while i<len(lines):
 line=lines[i].strip()
 if not line:i+=1;continue
 if line=='<!-- page -->':story.append(PageBreak());i+=1;continue
 if line.startswith('```'):
  i+=1;code=[]
  while i<len(lines) and not lines[i].startswith('```'):code.extend(textwrap.wrap(lines[i],width=101,replace_whitespace=False,drop_whitespace=False) or ['']);i+=1
  story.append(Preformatted('\n'.join(code),styles['CodeFR']));i+=1;continue
 if line.startswith('|'):
  cells=[]
  while i<len(lines) and lines[i].strip().startswith('|'):
   parts=[x.strip() for x in lines[i].strip().strip('|').split('|')]
   if not all(re.fullmatch(r'[:\- ]+',p) for p in parts):cells.append([Paragraph(inline(p),styles['CellFR']) for p in parts])
   i+=1
  widths=([150,235,122] if len(cells[0])==3 else [150,90,115,152])
  if len(cells[0])==2:widths=[150,357]
  t=Table(cells,colWidths=widths,repeatRows=1,hAlign='LEFT')
  t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#E0EDF0')),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#F5F7F9')]),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]));story.extend([t,Spacer(1,10)]);continue
 if line.startswith('!['):
  m=re.match(r'!\[(.*?)\]\((.*?)\)',line);p=(ROOT/'docs'/m[2]).resolve()
  from PIL import Image as PILImage
  with PILImage.open(p) as im:w,h=im.size
  scale=min(507/w,(245 if 'screenshots' in str(p) else 175)/h)
  story.extend([Image(str(p),width=w*scale,height=h*scale),Spacer(1,6)]);i+=1;continue
 style='TitleFR' if line.startswith('# ') else 'H2FR' if line.startswith('## ') else 'H3FR' if line.startswith('### ') else 'BodyFR'
 story.append(Paragraph(inline(re.sub(r'^#{1,3} ','',line)),styles[style]));i+=1
out=ROOT/'output/pdf';out.mkdir(parents=True,exist_ok=True)
def decorate(canvas,doc):
 canvas.setStrokeColor(colors.HexColor('#117C83'));canvas.line(44,810,551,810)
 canvas.setFont('DejaVu',7.5);canvas.setFillColor(colors.HexColor('#637587'))
 canvas.drawString(44,820,'UE03 · OBSERVABILITÉ ET DÉTECTION DE COMPORTEMENTS')
 canvas.drawString(44,25,'8 octobre 2026 · Analyse de l’export et limites de la démonstration')
 canvas.drawRightString(551,25,str(doc.page))
doc=SimpleDocTemplate(str(out/'rapport-observabilite.pdf'),pagesize=A4,rightMargin=44,leftMargin=44,topMargin=47,bottomMargin=42,title='UE03 - Observabilité et détection de comportements',author='Wissem')
doc.build(story,onFirstPage=decorate,onLaterPages=decorate)
print(out/'rapport-observabilite.pdf')
