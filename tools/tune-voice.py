#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tune-voice.py —— 用客观指标挑变声参数（对多个听感维度一起打分）

不靠耳朵。渲染一组候选参数，和"目标素材"比对四个指标：
  · f0 中位         —— 音高
  · 谱质心          —— 亮度（这一项之前被我忽略了，结果一直调太亮）
  · 共振峰比        —— 音色"大小个子"感
  · 谱包络相关      —— 整体音色形状
按归一化误差加权求和，挑分最高的。

用法：
    python tools/tune-voice.py <目标素材> [--text "..."] [--quick]
"""
import os, subprocess, sys, tempfile
import numpy as np
import librosa

DEFAULT_TEXT = '哦齁齁齁，你终于来了。我是奶蛙，我关注你很久了。'
TMP = tempfile.mkdtemp(prefix='tunevoice-')
SR = 22050


def tts(text, path, voice='zh-CN-YunxiNeural', rate='+10%', pitch='+16Hz'):
    import asyncio, edge_tts
    asyncio.run(edge_tts.Communicate(text, voice=voice, rate=rate, pitch=pitch).save(path))


def fx(src, dst, p, f, bright=0.0, hp=140, crush=0.2):
    """bright 可以是负数（降亮）"""
    parts = ['rubberband=pitch=%.3f:formant=%.3f' % (p, f)]
    if hp:
        parts.append('highpass=f=%d' % hp)
    if abs(bright) > 0.05:
        parts.append('equalizer=f=2600:t=q:w=1.2:g=%.1f' % bright)
    if crush:
        parts.append('acrusher=bits=12:mix=%.2f' % crush)
    parts.append('loudnorm=I=-18:TP=-1.5:LRA=11')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src,
                    '-af', ','.join(parts), '-b:a', '112k', dst], check=True)


def analyse(path):
    y, _ = librosa.load(path, sr=SR, mono=True)
    y, _ = librosa.effects.trim(y, top_db=30)
    if len(y) < SR * 0.3:
        return None
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=256))
    logS = librosa.amplitude_to_db(S, ref=np.max)
    env = logS.mean(axis=1)
    freqs = librosa.fft_frequencies(sr=SR, n_fft=2048)
    f0, _, _ = librosa.pyin(y, fmin=70, fmax=1400, sr=SR,
                            frame_length=2048, hop_length=256)
    f0v = f0[~np.isnan(f0)]
    cent = float(np.median(librosa.feature.spectral_centroid(S=S, sr=SR)[0]))
    pk = []
    for i in range(2, len(env) - 2):
        if freqs[i] > 4000:
            break
        if env[i] > env[i-1] and env[i] >= env[i+1] and env[i] > -60:
            if not pk or freqs[i] - pk[-1] > 180:
                pk.append(freqs[i])
    return dict(env=env, freqs=freqs,
                f0=float(np.median(f0v)) if len(f0v) else 0.0,
                cent=cent, formants=pk[:5])


def score(cur, tgt):
    """返回 (综合分越小越好, 明细)"""
    e_f0 = abs(cur['f0'] - tgt['f0']) / max(60.0, tgt['f0'])
    e_c = abs(cur['cent'] - tgt['cent']) / max(200.0, tgt['cent'])
    n = min(len(cur['formants']), len(tgt['formants']))
    if n:
        rs = [tgt['formants'][i] / max(1.0, cur['formants'][i]) for i in range(n)]
        e_f = abs(float(np.median(rs)) - 1.0)
    else:
        e_f = 1.0
    L = min(len(cur['env']), len(tgt['env']))
    corr = float(np.corrcoef(cur['env'][:L], tgt['env'][:L])[0, 1])
    e_env = 1.0 - corr
    # 权重：f0 和亮度最影响"像不像"，共振峰次之，包络兜底
    total = e_f0 * 2.2 + e_c * 1.8 + e_f * 1.6 + e_env * 1.4
    return total, dict(e_f0=e_f0, e_cent=e_c, e_form=e_f, corr=corr)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        print(__doc__); return 1
    target = args[0]
    text = DEFAULT_TEXT
    for a in sys.argv:
        if a.startswith('--text='):
            text = a.split('=', 1)[1]
    quick = '--quick' in sys.argv

    tgt = analyse(target)
    if not tgt:
        print('目标素材太短'); return 1
    print('目标 %s' % os.path.basename(target))
    print('  f0=%.0fHz  谱质心=%.0fHz  共振峰=%s'
          % (tgt['f0'], tgt['cent'], [int(x) for x in tgt['formants']]))

    raw = os.path.join(TMP, 'raw.mp3')
    print('生成基线…')
    tts(text, raw)
    base = analyse(raw)
    print('  基线 f0=%.0fHz 质心=%.0fHz' % (base['f0'], base['cent']))
    # 基线 f0 已知（TTS 的 pitch 参数固定），用它把 pitch 倍数换成目标
    print('  需要的 f0 倍数 ≈ %.2f' % (tgt['f0'] / max(1.0, base['f0'])))

    pitches = [1.6, 1.75, 1.85, 2.0] if not quick else [1.8, 2.0]
    forms = [0.95, 1.1, 1.25, 1.4, 1.55] if not quick else [1.25, 1.4]
    brights = [-6.0, -4.0, -2.0, 0.0] if not quick else [-4.0, -2.0]

    rows = []
    for p in pitches:
        for f in forms:
            for b in brights:
                out = os.path.join(TMP, 'c_%.2f_%.2f_%.1f.mp3' % (p, f, b))
                try:
                    fx(raw, out, p, f, b)
                except Exception:
                    continue
                cur = analyse(out)
                if not cur:
                    continue
                s, d = score(cur, tgt)
                rows.append((s, p, f, b, cur, d))
    rows.sort(key=lambda r: r[0])
    print('\n%-6s %-8s %-7s %-8s %-9s %-8s %-7s %s'
          % ('pitch', 'formant', 'bright', 'f0', '质心', '共振峰比', '包络相关', '综合误差'))
    print('-' * 84)
    for s, p, f, b, cur, d in rows[:10]:
        n = min(len(cur['formants']), len(tgt['formants']))
        fr = float(np.median([tgt['formants'][i] / max(1.0, cur['formants'][i])
                              for i in range(n)])) if n else 0
        print('%-6.2f %-8.2f %-7.1f %-8.0f %-9.0f %-8.2f %-7.3f %.4f'
              % (p, f, b, cur['f0'], cur['cent'], fr, d['corr'], s))
    if rows:
        s, p, f, b, cur, d = rows[0]
        print('\n推荐：pitch=%.2f formant=%.2f bright=%.1f'
              % (p, f, b))
        print('命令： python tools/build-voice.py --set me=pitch_shift=%.2f,formant=%.2f'
              % (p, f))
        print('（bright 要手改 tools/build-voice.py 里的 bright 字段为 %.1f）' % b)
    print('\n候选音频留在：' + TMP)
    return 0


if __name__ == '__main__':
    sys.exit(main())
