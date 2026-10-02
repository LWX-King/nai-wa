#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
extract-voice-ref.py —— 从整集音频里自动挑出"奶蛙在说话"的片段

整集里混着 BGM、旁白、音效，直接测指纹会被稀释。
奶蛙的音色特征是：基频高（250Hz 以上）、能量集中在中高频。
所以做法是：
  1. 分帧算 f0（pyin）和 RMS
  2. 只保留 f0 落在目标区间、且响度够的帧
  3. 把连续满足条件的段拼起来，输出一段"干净的奶蛙声音"参考

用法：
    python tools/extract-voice-ref.py <输入音频> <输出音频> [f0下限] [f0上限]
例如：
    python tools/extract-voice-ref.py ep1.mp3 ref.mp3 240 700
"""
import sys
import numpy as np
import librosa
import soundfile as sf

SR = 22050


def main():
    if len(sys.argv) < 3:
        print(__doc__); return 1
    src, dst = sys.argv[1], sys.argv[2]
    lo = float(sys.argv[3]) if len(sys.argv) > 3 else 240.0
    hi = float(sys.argv[4]) if len(sys.argv) > 4 else 700.0

    y, _ = librosa.load(src, sr=SR, mono=True)
    hop = 256
    f0, vflag, vprob = librosa.pyin(y, fmin=60, fmax=1200, sr=SR,
                                    frame_length=2048, hop_length=hop)
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop)[0]
    times = librosa.frames_to_time(np.arange(len(f0)), sr=SR, hop_length=hop)

    ok = (~np.isnan(f0)) & (f0 >= lo) & (f0 <= hi) & (rms > np.percentile(rms, 60))
    print('总帧 %d，符合"奶蛙音区"的帧 %d（%.1f%%）' % (len(f0), ok.sum(), 100.0 * ok.sum() / len(f0)))

    # 找连续段（允许 0.12 秒的小空洞）
    gap = int(0.12 * SR / hop)
    segs, i, n = [], 0, len(ok)
    while i < n:
        if not ok[i]:
            i += 1; continue
        j = i; hole = 0
        while j < n and (ok[j] or hole < gap):
            hole = 0 if ok[j] else hole + 1
            j += 1
        segs.append((i, j - hole))
        i = j
    # 只保留 >= 0.35 秒的段，按时长排序
    segs = [(a, b) for a, b in segs if (b - a) * hop / SR >= 0.35]
    segs.sort(key=lambda s: (s[1] - s[0]), reverse=True)
    print('候选段 %d 个，总时长 %.1f 秒' % (len(segs), sum((b - a) * hop / SR for a, b in segs)))

    # 取前 N 长、但总长不超过 40 秒
    picked, total = [], 0.0
    for a, b in segs:
        d = (b - a) * hop / SR
        if total + d > 40:
            continue
        picked.append((a, b)); total += d
        if total >= 35:
            break
    picked.sort()
    # 拼接（带 0.15 秒淡入淡出，避免爆音）
    fade = int(0.015 * SR)
    out = []
    for a, b in picked:
        seg = y[a * hop: b * hop].copy()
        if len(seg) < fade * 2:
            continue
        seg[:fade] *= np.linspace(0, 1, fade)
        seg[-fade:] *= np.linspace(1, 0, fade)
        out.append(seg)
        out.append(np.zeros(int(0.18 * SR)))
    if not out:
        print('没挑出片段'); return 1
    sig = np.concatenate(out)
    sf.write(dst, sig, SR)
    print('输出 %s：%.1f 秒' % (dst, len(sig) / SR))
    return 0


if __name__ == '__main__':
    sys.exit(main())
