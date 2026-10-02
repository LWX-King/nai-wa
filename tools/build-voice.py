#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build-voice.py —— 给《拣奶》的台词配音（edge-tts + 变声）

流程：
  1. 从 js/chapter*.js 里按对象扫出 `who` + `text`，因此知道每句是谁说的
  2. edge-tts 生成干声
  3. 按角色做"变声器"处理（ffmpeg rubberband）—— 奶蛙用高音 + 移共振峰，
     做出那种变声器的魔性味道
  4. 笑声台词（哦齁齁齁 / 哈哈哈）直接换成真实奶蛙笑声素材
  5. 文件名 = 处理参数 + 文本的 md5（内容寻址，改台词只补新的；改参数会重生成）

用法：
    python tools/build-voice.py                     # 增量生成
    python tools/build-voice.py --list              # 只列计划（并打印各角色参数）
    python tools/build-voice.py --dry-sample        # 只做几条样本供试听
    python tools/build-voice.py --force             # 全部重生成
    python tools/build-voice.py --set me=pitch_shift=1.62,formant=1.35   # 临时改参数
"""
import asyncio, glob, hashlib, io, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
JS_DIR = os.path.join(ROOT, 'js')
OUT_DIR = os.path.join(ROOT, 'audio', 'voice')
SAMPLE_DIR = os.path.join(ROOT, 'audio', '_sample')
MANIFEST = os.path.join(JS_DIR, 'voice-manifest.js')
LAUGH_SRC = os.path.join(HERE, 'laugh-source.mp3')      # 真实奶蛙笑声（可选）
LAUGH_OUT = '_laugh.mp3'
# 注意：笑声素材是 MIT 许可的公开仓库文件，可以随项目一起分发。
# 但 tools/voice-ref-*.wav 是《奶蛙：一百分的家》的原声片段，只用于本地调参，
# 已在 .gitignore 里排除，不要上传。

# ---------- 音色 / 变声参数 ----------
# pitch_shift : 音高倍数（>1 更高）
# formant     : 共振峰倍数（>1 更"小个子"；这个才是"变声器感"的关键）
# tempo       : 语速倍数（1 = 不变）
VOICES = {
    # 男主奶蛙。参数是对着《奶蛙：一百分的家》里的原声自动调出来的
    # （tools/extract-voice-ref.py 抠出奶蛙音区 → tools/tune-voice.py 搜参数）：
    #   目标 f0≈374Hz、谱质心≈1449Hz、85%滚降≈2422Hz
    #   注意：奶蛙的音色**比 TTS 还暗**，所以这里要 lowpass 压高频，不是提亮
    'me': dict(
        voice='zh-CN-YunxiNeural', rate='+10%', pitch='+16Hz',
        pitch_shift=1.75, formant=1.02, tempo=1.0,
        hp=150, bright=0.0, lp=2400, crush_bits=12, crush_mix=0.18, tremolo=0
    ),
    # 女主奶蛙：不是梗里的变声器音，做得比男主自然，只提一点
    'her': dict(
        voice='zh-CN-XiaoyiNeural', rate='+2%', pitch='+30Hz',
        pitch_shift=1.14, formant=1.10, tempo=1.0,
        hp=120, bright=2.5, crush_bits=14, crush_mix=0.10, tremolo=0
    ),
    # 旁白：不动，保持干净
    'nar': dict(
        voice='zh-CN-YunxiNeural', rate='-8%', pitch='-18Hz',
        pitch_shift=1.0, formant=1.0, tempo=1.0,
        hp=0, bright=0, crush_bits=16, crush_mix=0, tremolo=0
    ),
    # 配角（店员等）
    'other': dict(
        voice='zh-CN-YunjianNeural', rate='+4%', pitch='+6Hz',
        pitch_shift=1.10, formant=1.06, tempo=1.0,
        hp=100, bright=2, crush_bits=14, crush_mix=0.08, tremolo=0
    ),
}

MAX_CHUNK = 34
SKIP_LONG_NAR = 52

# 认为"这句就是一声笑"的判定 —— 只在整句基本就是笑声时才替换成真实笑声素材。
# 反过来，像"（别动。别说话。别哦齁齁齁。）"这种带正经内容的句子必须照常念，
# 否则台词会被笑声吃掉。
LAUGH_RE = re.compile(r'^(?:[（(【\s]*)(?:哦?齁+|哈+|嘿+|噗+|呵+)(?:[）)】\s。！？…，、]*)$')


def md5(s):
    return hashlib.md5(s.encode('utf-8')).hexdigest()[:16]


def split_chunks(text):
    text = text.strip()
    if len(text) <= MAX_CHUNK:
        return [text] if text else []
    parts = re.split(r'(?<=[。！？…，、；：])', text)
    chunks, cur = [], ''
    for p in parts:
        if not p:
            continue
        if len(cur) + len(p) <= MAX_CHUNK:
            cur += p
        else:
            if cur:
                chunks.append(cur)
            while len(p) > MAX_CHUNK:
                chunks.append(p[:MAX_CHUNK]); p = p[MAX_CHUNK:]
            cur = p
    if cur:
        chunks.append(cur)
    return [c.strip() for c in chunks if c.strip()]


def speaker_of(who):
    w = (who or '').strip()
    if not w:
        return 'nar'
    if w.startswith('奶蛙（她）') or w.startswith('奶蛙(她)'):
        return 'her'
    if w.startswith('奶蛙'):
        return 'me'
    return 'other'


BOTH_RE = re.compile(
    r"who:\s*'((?:[^'\\]|\\.)*)'\s*,\s*(?:style:\s*'(?:[^'\\]|\\.)*'\s*,\s*)?text:\s*'((?:[^'\\]|\\.)*)'",
    re.S)


def unesc(s):
    return s.replace("\\'", "'").replace('\\n', ' ').strip()


def collect():
    out = []
    for f in sorted(glob.glob(os.path.join(JS_DIR, 'chapter*.js'))):
        src = io.open(f, encoding='utf-8').read()
        for m in BOTH_RE.finditer(src):
            out.append((unesc(m.group(1)), unesc(m.group(2))))
    return out


def clean(text):
    t = text.strip()
    if not t:
        return '', True
    t = t.replace('（）', '').replace('()', '').replace('　', ' ')
    if re.fullmatch(r'[—\-─=·。…\s]+', t):
        return '', True
    t = re.sub(r'——+', '，', t).replace('—', '，')
    t = re.sub(r'\s+', ' ', t)
    t = re.sub(r'^[，、；：\s]+', '', t)
    t = re.sub(r'[，、；：\s]+$', '', t)
    return ('', True) if not t else (t, False)


# ---------- 变声 ----------
def fx_chain(cfg):
    """拼 ffmpeg 滤镜链：
    变调/移共振峰 → 高通 → 提亮或压暗 → 低通 → 轻失真 → 颤音 → 统一响度"""
    parts = []
    ps = cfg.get('pitch_shift', 1.0)
    fm = cfg.get('formant', 1.0)
    if abs(ps - 1.0) > 0.001 or abs(fm - 1.0) > 0.001:
        rb = 'rubberband=pitch=%.3f' % ps
        if abs(fm - 1.0) > 0.001:
            rb += ':formant=%.3f' % fm
        parts.append(rb)
    if cfg.get('hp'):
        parts.append('highpass=f=%d' % cfg['hp'])
    if cfg.get('bright'):
        parts.append('equalizer=f=2600:t=q:w=1.2:g=%.1f' % cfg['bright'])
    if cfg.get('lp'):
        parts.append('lowpass=f=%d' % cfg['lp'])
    if cfg.get('crush_mix'):
        parts.append('acrusher=bits=%d:mix=%.2f' % (cfg.get('crush_bits', 12), cfg['crush_mix']))
    if cfg.get('tempo') and abs(cfg['tempo'] - 1.0) > 0.001:
        parts.append('atempo=%.3f' % cfg['tempo'])
    if cfg.get('tremolo'):
        parts.append('vibrato=f=6:d=%.2f' % cfg['tremolo'])
    parts.append('loudnorm=I=-18:TP=-1.5:LRA=11')
    return ','.join(parts)


def ffmpeg_fx(src, dst, cfg):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src,
                    '-af', fx_chain(cfg), '-b:a', '112k', dst], check=True)


def param_key(cfg):
    """把影响听感的参数编进文件名 → 改参数就会自动重新生成"""
    return 'p%s-f%s-t%s-c%s' % (
        cfg.get('pitch_shift', 1.0), cfg.get('formant', 1.0),
        cfg.get('tempo', 1.0), cfg.get('crush_mix', 0))


# ---------- 笑声素材 ----------
def prep_laugh():
    """把真实笑声素材转成统一格式，并裁出一段干净的笑"""
    if not os.path.exists(LAUGH_SRC):
        return False
    dst = os.path.join(OUT_DIR, LAUGH_OUT)
    if os.path.exists(dst) and os.path.getsize(dst) > 2000:
        return True
    os.makedirs(OUT_DIR, exist_ok=True)
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error', '-i', LAUGH_SRC,
        '-af', 'silenceremove=start_periods=1:start_threshold=-38dB:start_silence=0.05,'
               'atrim=0:3.2,loudnorm=I=-14:TP=-1.0:LRA=9',
        '-ar', '48000', '-b:a', '112k', dst
    ], check=True)
    return os.path.exists(dst)


# ---------- TTS ----------
async def syn_raw(text, cfg, path):
    import edge_tts
    await edge_tts.Communicate(text, voice=cfg['voice'],
                               rate=cfg['rate'], pitch=cfg['pitch']).save(path)


async def syn_retry(text, cfg, path, tries=4):
    last = None
    for k in range(tries):
        try:
            await syn_raw(text, cfg, path)
            if os.path.exists(path) and os.path.getsize(path) > 1200:
                return True
            last = 'empty'
        except Exception as e:
            last = str(e)
        await asyncio.sleep(0.8 * (2 ** k))
    raise RuntimeError(str(last))


def apply_overrides(voices):
    for a in sys.argv:
        if not a.startswith('--set'):
            continue
        spec = a.split('=', 1)[1] if '=' in a else ''
        for piece in spec.split(';'):
            if '=' not in piece:
                continue
            who, kv = piece.split('=', 1)
            who = who.strip()
            if who not in voices:
                continue
            for pair in kv.split(','):
                if '=' not in pair:
                    continue
                k, v = pair.split('=', 1)
                try:
                    voices[who][k.strip()] = float(v)
                except ValueError:
                    pass
    return voices


async def main():
    force = '--force' in sys.argv
    dry = '--list' in sys.argv
    sample = '--dry-sample' in sys.argv
    voices = apply_overrides({k: dict(v) for k, v in VOICES.items()})
    os.makedirs(OUT_DIR, exist_ok=True)

    raw = collect()
    planned, seen, skipped, noaudi = {}, set(), 0, 0
    for who, text in raw:
        t, skip = clean(text)
        if skip:
            skipped += 1; continue
        spk = speaker_of(who)
        if spk == 'nar' and len(t) > SKIP_LONG_NAR:
            noaudi += 1; continue
        key = md5(spk + '|' + t)
        if key in seen:
            continue
        seen.add(key)
        planned[key] = (t, spk)

    laugh_keys = {k: v for k, v in planned.items() if LAUGH_RE.search(v[0])}
    print('台词总 %d 条 → 需配音 %d 条（跳过 %d，旁白过长略过 %d，其中笑声台词 %d 条）'
          % (len(raw), len(planned), skipped, noaudi, len(laugh_keys)))

    if dry:
        for k, (t, spk) in list(planned.items())[:30]:
            print('  [%-5s] %-34s %s' % (spk, t[:32], k))
        print('  ... 共 %d 条' % len(planned))
        print('\n各角色变声参数：')
        for k, v in voices.items():
            print('  %-6s pitch=%.2f formant=%.2f bright=%.1f crush=%.2f'
                  % (k, v['pitch_shift'], v['formant'], v.get('bright', 0), v.get('crush_mix', 0)))
        return 0

    has_laugh = prep_laugh()
    print('笑声素材：' + ('已就绪 → ' + LAUGH_OUT if has_laugh else '缺失（跳过笑声替换）'))

    if sample:
        os.makedirs(SAMPLE_DIR, exist_ok=True)
        picks = [(k, v) for k, v in planned.items() if v[1] == 'me'][:3]
        picks += [(k, v) for k, v in list(laugh_keys.items())[:2]]
        for k, (t, spk) in picks:
            tmp = os.path.join(SAMPLE_DIR, 'raw_%s_%s.mp3' % (spk, k))
            await syn_retry(split_chunks(t)[0], voices[spk], tmp)
            out = os.path.join(SAMPLE_DIR, '%s_%s.mp3' % (spk, k))
            ffmpeg_fx(tmp, out, voices[spk])
            os.remove(tmp)
            print('  样本: %s  [%s] %s' % (os.path.basename(out), spk, t[:18]))
        print('样本目录：' + SAMPLE_DIR)
        return 0

    sem = asyncio.Semaphore(2)
    metas, failed = {}, []
    done = [0]

    async def one(key, text, spk):
        cfg = voices[spk]
        # 纯笑声句 → 直接换成真实笑声
        if has_laugh and key in laugh_keys:
            metas[key] = {'spk': spk, 'files': [LAUGH_OUT]}
            done[0] += 1
            return
        pk = param_key(cfg)
        files = []
        for ck in split_chunks(text):
            name = '%s_%s.mp3' % (md5(ck), pk)
            p = os.path.join(OUT_DIR, name)
            async with sem:
                if force or not os.path.exists(p):
                    tmp = p + '.raw.mp3'
                    try:
                        await syn_retry(ck, cfg, tmp)
                        ffmpeg_fx(tmp, p, cfg)
                    except Exception as e:
                        failed.append((ck, str(e)))
                        continue
                    finally:
                        if os.path.exists(tmp):
                            os.remove(tmp)
            if os.path.exists(p):
                files.append(name)
        if files:
            metas[key] = {'spk': spk, 'files': files}
        done[0] += 1
        if done[0] % 25 == 0:
            print('  ... %d/%d' % (done[0], len(planned)))

    await asyncio.gather(*[one(k, t, s) for k, (t, s) in planned.items()])

    lines = [
        '// voice-manifest.js —— 配音索引（由 tools/build-voice.py 生成，别手改）',
        '// key = md5(说话人 + "|" + 台词)，value = 音频块列表（顺序播放）',
        '// LAUGH 里的是"整句就是一声笑"的台词，直接播真实奶蛙笑声素材',
        '(function () {',
        '  window.LAUGH = {',
    ]
    for k in laugh_keys:
        lines.append('    %s: 1,' % json.dumps(k))
    lines += ['  };', '  window.VOICE_MANIFEST = {']
    for k, v in metas.items():
        lines.append('    %s: { spk: %s, files: %s },'
                     % (json.dumps(k), json.dumps(v['spk']), json.dumps(v['files'])))
    lines += ['  };', '})();']
    io.open(MANIFEST, 'w', encoding='utf-8', newline='').write('\n'.join(lines) + '\n')

    blocks = [f for f in os.listdir(OUT_DIR) if f.endswith('.mp3')]
    total = sum(os.path.getsize(os.path.join(OUT_DIR, f)) for f in blocks)
    print('配音 %d 条 / %d 个音频块，共 %.1f MB；其中纯笑声 %d 条用真素材；索引已写入 %s'
          % (len(metas), len(blocks), total / 1048576, len(laugh_keys), MANIFEST))
    if failed:
        print('失败 %d 条：' % len(failed))
        for ck, e in failed[:5]:
            print('   %s -> %s' % (ck[:20], e))
    return 0


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
