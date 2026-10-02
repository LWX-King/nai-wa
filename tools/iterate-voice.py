#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
iterate.py —— 定量校正迭代：量一次 → 按比值修参数 → 再量
"""
import os, re, subprocess, sys, tempfile
import numpy as np
import librosa

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib import import_module
# 复用 voiceprint 的分析（直接内联，避免路径问题）
SR = 22050
TMP = tempfile.mkdtemp(prefix='iter-')


def analyse(path):
    y, _ = librosa.load(path, sr=SR, mono=True)
    y, _ = librosa.effects.trim(y, top_db=30)
    if len(y) < SR * 0.3:
        return None
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=256))
    logS = librosa.amplitude_to_db(S, ref=np.max)
    env = logS.mean(axis=1)
    freqs = librosa.fft_frequencies(sr=SR, n_fft=2048)
    f0, _, _ = librosa.pyin(y, fmin=70, fmax=1400, sr=SR, frame_length=2048, hop_length=256)
    f0v = f0[~np.isnan(f0)]
    cent = float(np.median(librosa.feature.spectral_centroid(S=S, sr=SR)[0]))
    roll = float(np.median(librosa.feature.spectral_rolloff(S=S, sr=SR, roll_percent=0.85)[0]))
    pk = []
    for i in range(2, len(env) - 2):
        if freqs[i] > 4000:
            break
        if env[i] > env[i-1] and env[i] >= env[i+1] and env[i] > -60:
            if not pk or freqs[i] - pk[-1] > 180:
                pk.append(freqs[i])
    return dict(f0=float(np.median(f0v)) if len(f0v) else 0.0,
                cent=cent, roll=roll, formants=pk[:5], env=env)


def render(raw, dst, p, f, lp, hp=150, crush=0.18):
    af = ('rubberband=pitch=%.3f:formant=%.3f,highpass=f=%d,lowpass=f=%d,'
          'acrusher=bits=12:mix=%.2f,loudnorm=I=-18:TP=-1.5:LRA=11') % (p, f, hp, lp, crush)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', af,
                    '-b:a', '112k', dst], check=True)


def main():
    raw = sys.argv[1]
    target = sys.argv[2]
    tgt = analyse(target)
    print('目标: f0=%.0f  质心=%.0f  滚降=%.0f  共振峰=%s'
          % (tgt['f0'], tgt['cent'], tgt['roll'], [int(x) for x in tgt['formants']]))

    p, f, lp = 1.78, 1.30, 2900
    for it in range(4):
        out = os.path.join(TMP, 'it%d.mp3' % it)
        render(raw, out, p, f, lp)
        cur = analyse(out)
        n = min(len(cur['formants']), len(tgt['formants']))
        rs = [tgt['formants'][i] / max(1.0, cur['formants'][i]) for i in range(n)]
        fr = float(np.median(rs)) if n else 1.0
        L = min(len(cur['env']), len(tgt['env']))
        corr = float(np.corrcoef(cur['env'][:L], tgt['env'][:L])[0, 1])
        print('\n第%d轮 pitch=%.2f formant=%.2f lp=%d' % (it + 1, p, f, lp))
        print('  f0=%.0f(目标%.0f)  质心=%.0f(目标%.0f)  滚降=%.0f(目标%.0f)  共振峰比=%.2f  包络相关=%.3f'
              % (cur['f0'], tgt['f0'], cur['cent'], tgt['cent'], cur['roll'], tgt['roll'], fr, corr))
        # 按比值校正
        if cur['f0'] > 0 and tgt['f0'] > 0:
            p = round(p * (tgt['f0'] / cur['f0']), 3)
        if cur['cent'] > 0:
            lp = int(round(lp * (tgt['cent'] / cur['cent'])))
            lp = max(1500, min(8000, lp))
        f = round(max(0.9, min(1.6, f * fr)), 3)
        if abs(cur['f0'] - tgt['f0']) < 12 and abs(cur['cent'] - tgt['cent']) < 90:
            print('  → 已收敛')
            break
    print('\n最终建议： pitch_shift=%.3f  formant=%.3f  lp=%d' % (p, f, lp))
    print('把 tools/build-voice.py 里 me 的 pitch_shift / formant / lp 改成这三个值')
    return 0


if __name__ == '__main__':
    sys.exit(main())
