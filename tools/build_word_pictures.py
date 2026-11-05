"""Build offline vocabulary SVGs from KotobaPath's original drawings.

Run from any directory with Python 3.8+ and Node.js. The vocabulary is read
in the same script order as the website. Word IDs remain stable.
"""
from collections import Counter
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
    'word': ('#edf2fa', '#334d70', '#b7c9e4', '#afded3'),
}
NATURE = set('cat dog bird fish rabbit horse cow pig bug paw apple fruit carrot sun sunrise moon star cloud rain snow wind water fire mountain wave tree leaf flower world sand island rock grain globe'.split())
TIME = set('clock watch calendar time sandclock clockfast look-back future past-future frequency habit'.split())
RELATION = set('equal compare puzzle question check cross repeat switch link split merge point every none cause condition contrast choice purpose example emphasis opinion feeling trust freedom conflict failure absence surplus border facts abstract agreement evidence responsibility permission ban network discussion'.split())
QUALITY = set('meter scale fast slow slowly new old wide narrow circle square color'.split())
ACTION = set('walk run jump sit swim work talk greet shake help clean wash pot hammer progress stop enter exit up down arrow carry give take break build pack cut push pull turn open close extend shrink effort improve decide feedback independent separation read stretch plate search'.split())
COLORS = {
    '白': '#ffffff', '黒': '#252f41', '赤': '#e25d55', '青': '#467ecc',
    '白い': '#ffffff', '黒い': '#252f41', '赤い': '#e25d55', '青い': '#467ecc', '黄色い': '#f4cb55',
    '黄色': '#f4cb55', '緑': '#69ab76', '紫': '#9e76bf', '茶色': '#9a6846',
    '灰色': '#9ca7b5', 'オレンジ色': '#f3a654', 'ピンク': '#ee99ae',
}
NUMERALS = dict(zip('一 二 三 四 五 六 七 八 九 十 百 千 万 億 兆 零 ゼロ'.split(),
                    (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100, 1000, 10000, 10**8, 10**12, 0, 0)))
# Exact Japanese aliases protect common words with an unusually phrased gloss.
ALIASES = {}
for group in '''
cat 猫 ねこ
dog 犬 いぬ
bird 鳥 とり
fish 魚 さかな
cow 牛 うし
pig 豚 ぶた
rice ご飯 御飯 米
bread パン
fruit 果物
cup コップ カップ お茶 飲む
bottle 牛乳
plate 食べる 食事
school 学校 小学校 中学校 高校 大学
book 本 図書館
letter 手紙
house 家 うち
shop 店 買う 買い物 デパート コンビニ
wallet 財布
money お金 金
ticket チケット 切符
hat 帽子
shoe 靴
shirt 服
sock 靴下
train 電車 汽車
car 車 自動車
bus バス
plane 飛行機
bike 自転車
ship 船
umbrella 傘
rain 雨
snow 雪
wind 風
water 水
fire 火
mountain 山
wave 海 川 河 湖
tree 木 森 林
flower 花
leaf 葉
moon 月
sun 太陽
star 星
bag 鞄 かばん 荷物
door 戸 扉 ドア 門
window 窓
table 机 テーブル
chair 椅子
greet 挨拶 こんにちは おはよう こんばんは さようなら どうも いらっしゃいませ ありがとう
run 走る
walk 歩く 散歩
swim 泳ぐ
jump 跳ぶ 飛び跳ねる
sleep 寝る 眠る
sit 座る
stand 立つ
talk 話す
write 書く
read 読む
headphone 聞く 聴く
eye 見る 見える 目
mouth 口
ear 耳
hand 手
foot 足
smile 笑う
sad 泣く
key 鍵
clock 時計 今
calendar 日 年 週 今日 昨日 明日 今週 来週 先週 今年 去年 来年 日曜日 月曜日 火曜日 水曜日 木曜日 金曜日 土曜日
contrast しかし けれども それでも ただし ところが でも
cause だから したがって そのため
condition もし もしも
choice または あるいは それとも
example 例えば たとえば
emphasis とても 大変 非常に
none 全然 ぜんぜん
slow ゆっくり 遅い
fast 速い 早く
clock 早い
homeward 帰る
bed ベッド
air-conditioner エアコン
large 大きい
small 小さい
short 短い
distance 遠い
tall 高い
thermo 暑い 寒い
spicy 辛い
taste 美味しい おいしい
frequency 時々 いつも たまに しばしば
enter 入る 入れる
exit 出る 出す
open 開く 開ける
close 閉じる 閉める
give あげる くれる
take もらう
wide 広い
narrow 狭い
down 下
up 上
left 左
right 右
point ここ そこ あそこ
question どこ 何 どう なぜ どうして
progress 続ける 続く
'''.strip().splitlines():
    key, *words = group.split()
    ALIASES.update((word, 'pencil' if key == 'write' else key) for word in words)

EXTRA = {
    'stand': 'O32 12 6;M32 20v20m0-14-11 14m11-14 11 14m-11 0-9 15m9-15 9 15m-24 2h30',
    'left': 'M52 32H11m15-15L11 32l15 15m27-30v30',
    'right': 'M12 32h41M38 17l15 15-15 15m-27-30v30',
    'action-diagram': 'O9 30 6;M17 30h31m-9-8 9 8-9 8;R49 25 10 10 2;M10 49h44',
    'quality-diagram': 'O12 34 5;O30 31 8;O51 27 12;M6 51h52',
    'modifier-diagram': 'R7 22 16 16 3;R40 17 17 26 4;M24 30h14m-6-6 6 6-6 6M11 45h7m28 5h5',
    'connector-diagram': 'R5 22 16 19 3;R43 22 16 19 3;M21 31h22;O32 31 4;M32 20v-8',
    'affix-diagram': 'R10 24 30 17 3;R44 24 11 17 3;M15 32h19m13 0h5M39 15v7m0 21v7',
    'phrase-diagram': 'R6 22 12 17 3;R24 22 15 17 3;R45 22 13 17 3;M10 44v6h44v-6m-36-14h6m15 0h6',
    'name-diagram': 'M10 20h29l15 13-15 14H10z;O44 33 2;M16 29h17m-17 8h14',
    'noun-diagram': 'R12 17 40 31 6;M18 25h27m-27 7h21m-21 7h14M22 52h20',
    'speech-diagram': 'M7 15h50v28H30L18 52v-9H7z;M32 22v9m0 5v1m-13-11h2m22 0h2',
}
WORD_FAMILIES = {
    'hospital': '病院 薬 医療 入院 看護 診断',
    'shop': '店 販売 売り 注文 商売 営業',
    'train': '電車 鉄道 列車 新幹線',
    'book': '書籍 読書 図書 書物',
    'bookstore': '書店 本屋',
    'work': '勤務 出勤 退職 就職 職業 職場 労働',
    'factory': '工場 生産 製造 工業',
    'music': '音楽 歌曲 演奏 楽器',
    'calendar': '曜日 年間 年度 毎週 週間 月間 年月',
    'clock': '時間 時刻 時間帯',
    'money': '料金 金額 現金 賃金',
    'network': '組織 制度 機構 構造 体系',
    'agreement': '契約 協定 署名',
    'road': '道路 通り 街道',
    'rain': '雨天 雨水 降雨 豪雨',
    'wave': '河川 湖水 海流 海水',
    'plant': '植物 草木',
    'sports': '競技 大会 選手',
    'discussion': '討論 会議 協議',
    'letter': '郵便 封筒 手紙',
    'camera': '撮影 写真',
}
WORD_FAMILIES = {('leaf' if key == 'plant' else 'sport' if key == 'sports' else key): value.split()
                 for key, value in WORD_FAMILIES.items()}


def load_motifs():
    motifs, keywords = {}, {}
    for line in (ROOT / 'tools/word-picture-motifs.txt').read_text(encoding='utf-8').splitlines():
        if not line or line.startswith('#'):
            continue
        key, terms, paths = line.split('|')
        motifs[key] = paths
        keywords[key] = terms.split()
    return {**motifs, **EXTRA}, keywords


def glosses(meaning):
    clean = re.sub(r'（[^（）]*）|\([^()]*\)|\[[^\]]*\]|【[^】]*】', '', meaning)
    parts = [x.strip(' 。·、―「」“”~～…') for x in re.split('[；;，,／/。]', clean)]
    return [x for x in parts if x] or [meaning.strip()]


def choose(word, senses, keywords, preferred):
    term = word['word']
    if number_value(term) is not None:
        return 'number', senses[0], 'illustration'
    if re.fullmatch('[一二三四五六七八九十]+(?:日|月)', term):
        return 'calendar-number', senses[0], 'illustration'
    if '〜' in term or '～' in term:
        return 'affix-diagram', preferred or senses[0], 'diagram'
    if term in COLORS and (not preferred or preferred == senses[0]):
        return 'swatch', senses[0], 'illustration'
    if term in ALIASES:
        return ALIASES[term], senses[0], 'illustration'
    # Previous supplemental examples remain tied to the sense they illustrate.
    candidates = [preferred] if preferred else senses[:3]
    best = None
    for order, sense in enumerate(candidates):
        comparable = re.sub(r'^[⓪①②③④⑤⑥⑦⑧⑨・]+', '', sense)
        for key, terms in keywords.items():
            for keyword in terms:
                exact = comparable == keyword
                if exact or (len(keyword) >= 2 and keyword in comparable):
                    score = (int(exact), len(keyword) / max(len(sense), 1), -order)
                    if best is None or score > best[0]:
                        best = score, key, sense
    if best:
        return best[1], best[2], 'illustration'
    for key, roots in WORD_FAMILIES.items():
        if any(root in term for root in roots):
            return key, candidates[0], 'illustration'
    pos = word['pos']
    if pos in {'接', '助'} or pos.startswith('助'):
        key = 'connector'
    elif pos.startswith(('接頭', '接尾', '造')):
        key = 'affix'
    elif pos.startswith(('副', '連体')):
        key = 'modifier'
    elif pos.startswith(('ナ形', 'イ形', '形動')):
        key = 'quality'
    elif pos.startswith(('他動', '自動', '自他動')):
        key = 'action'
    elif pos.startswith('感'):
        key = 'speech'
    elif pos in {'名', '代'}:
        key = 'noun'
    elif pos.startswith('名・') and '動' in pos:
        key = 'action'
    elif pos.startswith('名・') and '形' in pos:
        key = 'quality'
    else:
        key = 'phrase'
    return key + '-diagram', candidates[0], 'diagram'


def palette(key):
    for name, keys in (('nature', NATURE), ('action', ACTION), ('relation', RELATION),
                       ('time', TIME), ('quality', QUALITY)):
        if key in keys or key == name + '-diagram':
            return PALETTES[name]
    if key.endswith('-diagram'):
        return PALETTES['word']
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


def number_value(term):
    if term.endswith('つ'):
        term = term[:-1]
    if term in NUMERALS:
        return NUMERALS[term]
    if re.fullmatch('[二三四五六七八九]?十[一二三四五六七八九]?', term):
        tens, ones = term.split('十')
        return 10 * NUMERALS.get(tens, 1) + NUMERALS.get(ones, 0)
    return None


def draw_picture(word, sense, key, kind, motifs):
    bg, ink, pale, highlight = palette(key)
    short = re.sub(r'\s+', ' ', sense)
    # Full gloss remains visible as HTML beside the image.
    label = short if len(short) <= 22 else short[:21] + '…'
    lines = [label] if len(label) <= 12 else [label[:11], label[11:]]
    if key == 'number':
        number = number_value(word['word'])
        if 0 < number <= 10:
            art = []
            for n in range(number):
                columns = min(5, number)
                row, col = divmod(n, columns)
                x = 32 + (col - (min(columns, number - row * columns)-1)/2) * 11
                y = 31 if number <= 5 else 23 + 15 * row
                art.append(f'<circle cx="{x}" cy="{y}" r="4" fill="{pale}"/>')
            art = ''.join(art)
        else:
            text = f'{number:,}' if number < 100000 else word['word']
            art = f'<text x="32" y="38" text-anchor="middle" stroke="none" fill="{ink}" font-size="18" font-weight="800">{escape(text)}</text>'
    elif key == 'calendar-number':
        number = number_value(word['word'][:-1])
        art = ('<rect x="9" y="13" width="46" height="44" rx="5" fill="#fff"/>'
               f'<path d="M10 25h44M20 8v10m24-10v10" fill="none"/>'
               f'<text x="32" y="47" stroke="none" fill="{ink}" text-anchor="middle" '
               f'font-size="20" font-weight="800">{number}</text>')
    elif key == 'swatch':
        art = f'<circle cx="32" cy="32" r="23" fill="{COLORS[word["word"]]}"/><path d="M19 28q4-9 13-9" opacity=".55"/>'
    else:
        art = ''.join(draw_motif(motifs[key], pale, highlight))
    if kind == 'diagram':
        layout = 'translate(82 11) scale(1.43)'
        caption = f'<rect x="14" y="114" width="228" height="76" rx="18" fill="#fff" opacity=".87"/>'
        font_size = 18 if len(lines) == 2 else 21
        for i, line in enumerate(lines):
            y = (146 + 23*i) if len(lines) == 2 else 160
            caption += f'<text x="128" y="{y}" fill="{ink}" font-size="{font_size}" font-weight="700" text-anchor="middle">{escape(line)}</text>'
    else:
        layout = 'translate(52 16) scale(2.375)'
        caption = f'<path d="M68 177h120" stroke="{pale}" stroke-width="3" stroke-linecap="round"/>'
    title = escape(word['word'] + ' · ' + sense)
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="200" viewBox="0 0 256 200" '
        'font-family="system-ui,Noto Sans CJK SC,Microsoft YaHei,sans-serif" role="img">'
        f'<title>{title}</title><rect x="1" y="1" width="254" height="198" rx="24" fill="{bg}"/>'
        f'<circle cx="32" cy="34" r="5" fill="{pale}"/><path d="M225 36v16m-8-8h16" stroke="{pale}" stroke-width="3" stroke-linecap="round"/>'
        f'<g transform="{layout}" stroke="{ink}" stroke-width="2.45" stroke-linecap="round" stroke-linejoin="round" fill="none">{art}</g>'
        f'{caption}</svg>\n'
    )


def main():
    runtime = r"""const {ctx}=require('./tests/runtime.cjs')();
    console.log(JSON.stringify(ctx.window.VOCAB));"""
    words = json.loads(subprocess.check_output(['node', '-e', runtime], cwd=ROOT))
    script = VISUAL_FILE.read_text(encoding='utf-8')
    previous = json.loads(script.split('window.WORD_VISUALS=', 1)[1].strip().rstrip(';'))
    motifs, keywords = load_motifs()
    ASSETS.mkdir(parents=True, exist_ok=True)
    output = {}
    counts = Counter()
    for word in words:
        wid = word['id']
        assert re.fullmatch('[a-zA-Z0-9-]+', wid)
        old = previous.get(wid, {})
        examples = old.get('examples', [])
        preferred = old.get('exampleSense', old.get('sense')) if examples else None
        key, sense, kind = choose(word, glosses(word['meaning']), keywords, preferred)
        (ASSETS / (wid + '.svg')).write_text(draw_picture(word, sense, key, kind, motifs), encoding='utf-8')
        record = {'sense': sense, 'kind': kind}
        if examples:
            record.update(examples=examples)
            if preferred and preferred != sense:
                record['exampleSense'] = preferred
        output[wid] = record
        counts[kind] += 1
    assert len(output) == len(words)
    VISUAL_FILE.write_text('/* KotobaPath original vocabulary artwork. See licenses/WORD-VISUALS.md. */\n'
                           'window.WORD_VISUALS=' + json.dumps(output, ensure_ascii=False, separators=(',', ':')) + ';\n',
                           encoding='utf-8')
    for old_picture in ASSETS.glob('*.webp'):
        old_picture.unlink()
    print(len(words), 'SVGs', dict(counts))


if __name__ == '__main__':
    main()
