"""Build offline vocabulary SVGs from KotobaPath's original drawings.

Run from any directory with Python 3.8+ and Node.js. The vocabulary is read
in the same script order as the website. Word IDs remain stable.
"""
from html import escape
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets' / 'word-pictures'
DATA = ROOT / 'data'
VISUAL_FILE = DATA / 'word-visuals.js'
PALETTES = {
    'nature': ('#eaf7e9', '#1e604b', '#95d6a6', '#f5bf58'),
    'object': ('#e8f2ff', '#244d80', '#9dc5fa', '#ffcc73'),
    'action': ('#fff0e0', '#813a29', '#ffbb92', '#f5ca64'),
    'relation': ('#f2ebff', '#553783', '#c9b4f4', '#a9dcd1'),
    'time': ('#e7f5f4', '#246468', '#9ed8d5', '#f5c261'),
    'quality': ('#fff3df', '#704915', '#f2c679', '#edab96'),
}
NATURE = set('cat dog bird fish rabbit horse cow pig bug paw apple fruit carrot sun sunrise moon star cloud rain snow wind water fire mountain wave tree leaf flower world sand island rock grain globe'.split())
TIME = set('clock watch calendar time sandclock clockfast look-back future past-future frequency habit'.split())
RELATION = set('equal compare puzzle question check cross repeat switch link split merge point every none cause condition contrast choice purpose example emphasis opinion feeling trust freedom conflict failure absence surplus border facts abstract agreement evidence responsibility permission ban network discussion'.split())
QUALITY = set('meter scale fast slow slowly new old wide narrow circle square color'.split())
ACTION = set('walk run jump sit swim work talk greet shake help clean wash pot hammer progress stop enter exit up down arrow carry give take break build pack cut push pull turn open close extend shrink effort improve decide feedback independent separation read stretch plate search'.split())
def lemma(text):
    return re.sub(r'\[[^]]*\]', '', text)


def load_motifs():
    motifs = {}
    for line in (ROOT / 'tools/word-picture-motifs.txt').read_text(encoding='utf-8').splitlines():
        if line and not line.startswith('#'):
            key, _, paths = line.split('|')
            motifs[key] = paths
    motifs.update({
        'stand': 'O32 12 6;M32 20v20m0-14-11 14m11-14 11 14m-11 0-9 15m9-15 9 15m-24 2h30',
        'left': 'M52 32H11m15-15L11 32l15 15m27-30v30',
        'right': 'M12 32h41M38 17l15 15-15 15m-27-30v30',
    })
    return motifs


def sense_for(word):
    gloss = re.sub(r'（[^（）]*）|\([^()]*\)', '', word['meaning'])
    return next((s.strip() for s in re.split('[；;，,／]', gloss) if s.strip()), word['meaning'])


def palette(key):
    for name, keys in (('nature', NATURE), ('action', ACTION), ('relation', RELATION),
                       ('time', TIME), ('quality', QUALITY)):
        if key in keys:
            return PALETTES[name]
    return PALETTES['object']


def draw_motif(parts, pale, highlight):
    for i, shape in enumerate(parts.split(';')):
        fill = (pale if i % 3 == 0 else highlight) if i < 4 else 'none'
        if shape[0] == 'O':
            x, y, rx, *ry = shape[1:].split()
            yield f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry[0] if ry else rx}" fill="{fill}"/>'
        elif shape[0] == 'R':
            x, y, width, height, radius = shape[1:].split()
            yield f'<rect x="{x}" y="{y}" width="{width}" height="{height}" rx="{radius}" fill="{fill}"/>'
        else:
            yield f'<path d="{shape}" fill="{fill if shape.lower().endswith("z") else "none"}"/> '


def draw_picture(word, sense, design, motifs, scenes):
    if design.startswith('v110-'):
        bg, ink, pale, highlight = PALETTES[design.split('-', 2)[1]]
    else:
        bg, ink, pale, highlight = palette(design)
    if design.startswith('number-'):
        number = int(design[7:])
        if 1 <= number <= 10:
            art = []
            for n in range(number):
                columns = min(5, number)
                row, col = divmod(n, columns)
                x = 32 + (col - (min(columns, number - row * columns)-1)/2) * 11
                y = 31 if number <= 5 else 23 + 15 * row
                art.append(f'<circle cx="{x}" cy="{y}" r="4" fill="{pale}"/>')
            art = ''.join(art)
        else:
            art = (f'<text x="32" y="38" text-anchor="middle" stroke="none" '
                   f'fill="{ink}" font-size="14" font-weight="800">{number:,}</text>')
    elif design.startswith('swatch-'):
        color = design[7:]
        assert re.fullmatch(r'#[a-fA-F0-9]{6}', color)
        art = f'<circle cx="32" cy="32" r="23" fill="{color}"/><path d="M19 28q4-9 13-9" opacity=".55"/>'
    elif design in scenes:
        elements = []
        for item in scenes[design].split():
            motif, placement = item.split('@')
            x, y, size = map(int, placement.split(','))
            shapes = ''.join(draw_motif(motifs[motif], pale, highlight))
            elements.append(f'<g transform="translate({x} {y}) scale({size / 64:g})">{shapes}</g>')
        art = ''.join(elements)
    else:
        art = ''.join(draw_motif(motifs[design], pale, highlight))
    title = escape(word['word'] + ' · ' + sense)
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="200" viewBox="0 0 256 200" '
        'font-family="system-ui,sans-serif" role="img">'
        f'<title>{title}</title><rect x="1" y="1" width="254" height="198" rx="24" fill="{bg}"/>'
        f'<g transform="translate(52 20) scale(2.375)" stroke="{ink}" stroke-width="2.45" '
        f'stroke-linecap="round" stroke-linejoin="round" fill="none">{art}</g></svg>\n'
    )
    return svg, art


def main():
    runtime = """const {ctx}=require('./tests/runtime.cjs')();
    console.log(JSON.stringify(ctx.window.VOCAB));"""
    words = json.loads(subprocess.check_output(['node', '-e', runtime], cwd=ROOT))
    by_term = {}
    for word in words:
        by_term.setdefault(lemma(word['word']), []).append(word)
    motifs = load_motifs()
    scenes = dict(line.split("\t") for line in
                  (DATA / "authoring/word-picture-scenes.tsv").read_text(encoding="utf-8").splitlines()
                  if line and not line.startswith("#"))
    ASSETS.mkdir(parents=True, exist_ok=True)
    output, drawings = {}, {}
    signatures = set()
    selection = DATA / 'authoring/word-picture-selection.tsv'
    for line in selection.read_text(encoding='utf-8').splitlines():
        if not line or line.startswith('#'):
            continue
        label, design, *illustrated_sense = line.split('\t')
        term, reading, gloss = (label.split('|') + ['', ''])[:3]
        matches = [w for w in by_term.get(term, [])
                   if (not reading or reading == w['reading']) and (not gloss or gloss in w['meaning'])]
        assert len(matches) == 1, (label, [(w['word'], w['reading'], w['meaning']) for w in matches])
        word = matches[0]
        wid = word['id']
        sense = illustrated_sense[0] if illustrated_sense else sense_for(word)
        assert re.fullmatch('[a-zA-Z0-9-]+', wid)
        svg, art = draw_picture(word, sense, design, motifs, scenes)
        assert wid not in output and art not in signatures, (label, design)
        output[wid] = {'sense': sense}
        drawings[wid + '.svg'] = svg
        signatures.add(art)
    for filename, svg in drawings.items():
        (ASSETS / filename).write_text(svg, encoding='utf-8')
    for stale in ASSETS.iterdir():
        if stale.suffix in {'.svg', '.webp'} and stale.name not in drawings:
            stale.unlink()
    VISUAL_FILE.write_text('/* KotobaPath original vocabulary illustrations. */\n'
                           'window.WORD_VISUALS=' + json.dumps(output, ensure_ascii=False, separators=(',', ':')) + ';\n',
                           encoding='utf-8')
    print(len(output), 'distinct vocabulary illustrations')


if __name__ == '__main__':
    main()
