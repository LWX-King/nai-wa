#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
voiceprint.py —— 声学指纹分析：测基频(f0)、共振峰、谱包络，
用来把 TTS 的"音色"调到和目标素材接近。

用法：python voiceprint.py <音频1> [音频2 ...]
"""
import sys
import numpy as np
import librosa

def profile(path, sr=22050, dur=None):
    y, _ = librosa.load(path, sr=sr, mono=True, duration=dur)
    if len(y) < sr * 0.4:
        return None
    # 去掉静音段
    y, _ = librosa.effects.trim(y, top_db=30)
    if len(y) < sr * 0.3:
        return None
    # 基频（pyin 比 yin 稳）
    f0, vflag, vprob = librosa.pyin(y, fmin=60, fmax=1200, sr=sr,
                                    frame_length=2048, hop_length=256)
    f0v = f0[~np.isnan(f0)]
    # 谱质心 / 带宽（亮度）
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=256))
    cent = librosa.feature.spectral_centroid(S=S, sr=sr)[0]
    rolloff = librosa.feature.spectral_rolloff(S=S, sr=sr, roll_percent=0.85)[0]
    # 谱包络（对数平均谱）→ 用来比较"音色形状"
    logS = librosa.amplitude_to_db(S, ref=np.max)
    env = logS.mean(axis=1)
    freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
    # 找包络上的共振峰（局部极大，低频段）
    peaks = []
    for i in range(2, len(env) - 2):
        if freqs[i] > 4000:
            break
        if env[i] > env[i-1] and env[i] >= env[i+1] and env[i] > -60:
            if not peaks or freqs[i] - peaks[-1] > 180:
                peaks.append(freqs[i])
    return dict(
        path=path,
        dur=round(len(y) / sr, 2),
        f0_med=round(float(np.median(f0v)), 1) if len(f0v) else None,
        f0_p10=round(float(np.percentile(f0v, 10)), 1) if len(f0v) else None,
        f0_p90=round(float(np.percentile(f0v, 90)), 1) if len(f0v) else None,
        centroid=round(float(np.median(cent)), 0),
        rolloff85=round(float(np.median(rolloff)), 0),
        formants=[int(p) for p in peaks[:5]],
        env=env, freqs=freqs
    )

def main():
    if len(sys.argv) < 2:
        print(__doc__); return 1
    rows = []
    for p in sys.argv[1:]:
        r = profile(p)
        if not r:
            print('  %s → 太短，跳过' % p); continue
        rows.append(r)
    print('%-42s %7s %7s %7s %8s %9s  %s' %
          ('文件', 'f0中位', 'f0低', 'f0高', '谱质心', '85%滚降', '共振峰(Hz)'))
    print('-' * 118)
    for r in rows:
        print('%-42s %7s %7s %7s %8s %9s  %s' % (
            r['path'].split('\\')[-1][:40], r['f0_med'], r['f0_p10'], r['f0_p90'],
            r['centroid'], r['rolloff85'], r['formants']))
    # 输出包络比值（如果给了两个文件，算第二个相对第一个要移动多少）
    if len(rows) == 2:
        a, b = rows
        print('\n相对关系（%s → %s）：' % (a['path'].split('\\')[-1], b['path'].split('\\')[-1]))
        if a['f0_med'] and b['f0_med']:
            print('  基频比      = %.3f  （想匹配就把源乘以这个数）' % (b['f0_med'] / a['f0_med']))
        print('  谱质心比    = %.3f' % (b['centroid'] / max(1, a['centroid'])))
        print('  85%%滚降比   = %.3f' % (b['rolloff85'] / max(1, a['rolloff85'])))
        if a['formants'] and b['formants']:
            n = min(len(a['formants']), len(b['formants']))
            rs = [b['formants'][i] / max(1, a['formants'][i]) for i in range(n)]
            print('  共振峰比    = %s  中位 %.3f' %
                  (['%.2f' % x for x in rs], float(np.median(rs))))
        # 谱包络相关性（音色形状像不像）
        L = min(len(a['env']), len(b['env']))
        c = np.corrcoef(a['env'][:L], b['env'][:L])[0, 1]
        print('  谱包络相关  = %.3f  （1 = 音色形状几乎一样）' % c)
    return 0

if __name__ == '__main__':
    sys.exit(main())
