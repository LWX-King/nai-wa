#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build-bgm.py —— 程序合成三首循环 BGM（不依赖任何外部素材 / 在线服务）

合成的都是"简单但不廉价"的东西：正弦+三角波音色、软包络、轻混响、
以及一个真正的循环长度（首尾相接不会突兀）。

用法：
    python tools/build-bgm.py            # 生成 audio/bgm/*.mp3
    python tools/build-bgm.py --wav      # 只出 wav，不转 mp3
"""
import math, os, struct, subprocess, sys, wave

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'audio', 'bgm')
SR = 22050

# ---------- 基础乐理 ----------
NAMES = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}


def hz(name):
    """'C4' -> 261.63"""
    if name is None:
        return 0.0
    p = NAMES[name[:-1]]
    octv = int(name[-1])
    midi = 12 * (octv + 1) + p          # C4 = 60
    return 440.0 * (2 ** ((midi - 69) / 12.0))


# ---------- 音色 ----------
def env(n, a, d, s_lvl, r):
    """简易 ADSR 包络数组"""
    total = n
    ai = max(1, int(a * SR)); di = max(1, int(d * SR)); ri = max(1, int(r * SR))
    si = max(0, total - ai - di - ri)
    out = []
    for i in range(ai):
        out.append(i / ai)
    for i in range(di):
        out.append(1 + (s_lvl - 1) * (i / di))
    for i in range(si):
        out.append(s_lvl)
    for i in range(ri):
        out.append(s_lvl * (1 - i / ri))
    if len(out) < total:
        out += [0.0] * (total - len(out))
    return out[:total]


def tone(f, dur, kind='sine', amp=1.0, a=0.01, d=0.1, s=0.7, r=0.2, detune=0.0):
    """生成一个音（可叠两个轻微失谐的振荡器，声音厚一点）"""
    n = int(dur * SR)
    e = env(n, a, d, s, r)
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        if kind == 'sine':
            v = math.sin(2 * math.pi * f * t)
            if detune:
                v = 0.6 * v + 0.4 * math.sin(2 * math.pi * f * (1 + detune) * t)
        elif kind == 'tri':
            x = (f * t) % 1.0
            v = 4 * abs(x - 0.5) - 1
        elif kind == 'soft':            # 略带谐波的"电钢"
            v = (math.sin(2 * math.pi * f * t)
                 + 0.32 * math.sin(2 * math.pi * f * 2 * t)
                 + 0.12 * math.sin(2 * math.pi * f * 3 * t))
        elif kind == 'pad':             # 垫底：宽、慢
            v = (math.sin(2 * math.pi * f * t)
                 + 0.5 * math.sin(2 * math.pi * f * 1.005 * t)
                 + 0.25 * math.sin(2 * math.pi * f * 0.5 * t))
        else:
            v = math.sin(2 * math.pi * f * t)
        out[i] = v * e[i] * amp
    return out


def mix(buf, sig, at):
    """把 sig 叠加到 buf 的第 at 个采样点"""
    end = min(len(buf), at + len(sig))
    for i in range(at, end):
        buf[i] += sig[i - at]


def reverb(buf, decay=0.30, delay=0.085, wet=0.22, taps=5):
    """极简梳状混响：几个衰减抽头，够撑起"房间感" """
    out = list(buf)
    d = int(delay * SR)
    for k in range(1, taps + 1):
        g = wet * (decay ** k)
        off = d * k
        if off >= len(buf):
            break
        for i in range(len(buf) - off):
            out[i + off] += buf[i] * g
    return out


def normalize(buf, peak=0.82):
    m = max(1e-9, max(abs(x) for x in buf))
    k = peak / m
    return [x * k for x in buf]


def write_wav(path, buf):
    with wave.open(path, 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        frames = b''.join(struct.pack('<h', int(max(-1.0, min(1.0, x)) * 32767)) for x in buf)
        w.writeframes(frames)


# ---------- 三首曲子 ----------
def track_ch1():
    """第一章：暖、俏皮、有点憨。C–G–Am–F 循环，加一条五声音阶小旋律。"""
    bpm = 92
    beat = 60.0 / bpm
    bar = beat * 4
    bars = 8
    total = int(bar * bars * SR) + SR
    buf = [0.0] * total

    chords = [('C4', ['C3', 'E3', 'G3']), ('G3', ['G2', 'B3', 'D4']),
              ('A3', ['A2', 'C4', 'E4']), ('F3', ['F2', 'A3', 'C4'])]
    melody = ['E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C5', None,
              'D5', 'E5', 'G5', 'E5', 'D5', 'C5', 'A4', None,
              'C5', 'E5', 'G5', 'A5', 'G5', 'E5', 'D5', None,
              'C5', 'D5', 'E5', 'D5', 'C5', 'A4', 'G4', None]

    for b in range(bars):
        root, notes = chords[b % 4]
        t0 = b * bar
        # 低音
        mix(buf, tone(hz(root) / 2, beat * 1.6, 'sine', 0.30, 0.02, 0.2, 0.6, 0.5), int(t0 * SR))
        # 垫和弦（跨整小节）
        for nt in notes:
            mix(buf, tone(hz(nt), bar * 0.96, 'pad', 0.10, 0.35, 0.3, 0.8, 0.6), int(t0 * SR))
        # 分解和弦的"叮"
        for k, nt in enumerate(notes + notes[:1]):
            at = int((t0 + k * beat / 2 * 0.5) * SR)
            mix(buf, tone(hz(nt) * 2, 0.45, 'soft', 0.09, 0.005, 0.25, 0.3, 0.35), at)

    # 主旋律
    step = bar * 2 / 16
    for i, nt in enumerate(melody):
        if not nt:
            continue
        at = int((i * step) * SR)
        mix(buf, tone(hz(nt), step * 1.5, 'soft', 0.16, 0.01, 0.3, 0.45, 0.45), at)

    return normalize(reverb(buf, decay=0.28, wet=0.20), 0.72)


def track_ch2():
    """第二章：怀旧、疏离、有距离感。Am–F–C–G，慢，大量留白 + 高音铃。"""
    bpm = 66
    beat = 60.0 / bpm
    bar = beat * 4
    bars = 8
    total = int(bar * bars * SR) + SR * 2
    buf = [0.0] * total

    chords = [('A3', ['A2', 'E3', 'C4']), ('F3', ['F2', 'C4', 'A3']),
              ('C4', ['C3', 'G3', 'E4']), ('G3', ['G2', 'D4', 'B3'])]
    bells = [('E5', 0.0), ('A5', 1.5), ('C6', 3.5), ('B5', 5.0), ('A5', 6.5),
             ('G5', 8.0), ('E5', 9.5), ('D5', 11.5), ('C5', 13.0), ('E5', 14.5),
             ('A5', 16.0), ('G5', 18.0), ('F5', 19.5), ('E5', 21.0), ('C5', 22.5),
             ('D5', 24.0), ('G5', 25.5), ('B5', 27.5), ('A5', 29.0), ('G5', 30.5)]

    for b in range(bars):
        root, notes = chords[b % 4]
        t0 = b * bar
        # 低音：每小节两下，像心跳
        mix(buf, tone(hz(root) / 2, beat * 2.2, 'sine', 0.26, 0.05, 0.4, 0.5, 0.9), int(t0 * SR))
        mix(buf, tone(hz(root) / 2, beat * 1.6, 'sine', 0.18, 0.05, 0.4, 0.5, 0.7), int((t0 + beat * 2) * SR))
        for nt in notes:
            mix(buf, tone(hz(nt), bar * 1.05, 'pad', 0.085, 0.7, 0.4, 0.85, 1.0), int(t0 * SR))
        # 稀疏的钢琴单音
        for k in (0, 2.5):
            mix(buf, tone(hz(notes[1]) * 2, 1.2, 'soft', 0.07, 0.01, 0.5, 0.25, 0.7), int((t0 + k * beat) * SR))

    for nt, beats in bells:
        mix(buf, tone(hz(nt), 1.6, 'sine', 0.10, 0.005, 0.7, 0.10, 0.9, detune=0.004), int(beats * beat * SR))

    return normalize(reverb(buf, decay=0.42, delay=0.11, wet=0.32, taps=6), 0.66)


def track_ch3():
    """第三章：悬疑、克制的都市夜。低音持续 + 稀疏拨奏 + 一点不安的二度。"""
    bpm = 78
    beat = 60.0 / bpm
    bar = beat * 4
    bars = 8
    total = int(bar * bars * SR) + SR * 2
    buf = [0.0] * total

    # 持续低音 A2，每两小节换一次到 G2/F2
    for b in range(bars):
        t0 = b * bar
        bass = 'A2' if b % 4 < 2 else ('G2' if b % 4 == 2 else 'F2')
        for nt in (bass, bass):
            mix(buf, tone(hz(nt), bar * 1.02, 'pad', 0.20, 0.5, 0.4, 0.9, 0.9), int(t0 * SR))
        # 不安的二度叠音
        mix(buf, tone(hz(bass) * 1.0, bar * 0.9, 'sine', 0.05, 0.4, 0.4, 0.7, 0.8), int(t0 * SR))
    # 拨奏（马蹄式）
    pluck = ['A4', 'E5', 'A4', 'C5', 'A4', 'E5', 'B4', 'A4',
             'G4', 'D5', 'G4', 'B4', 'G4', 'D5', 'A4', 'G4',
             'F4', 'C5', 'F4', 'A4', 'F4', 'C5', 'G4', 'F4',
             'E4', 'B4', 'E4', 'G4', 'E4', 'B4', 'F4', 'E4']
    step = bar * 2 / 8
    for i, nt in enumerate(pluck):
        at = int(i * step * SR)
        mix(buf, tone(hz(nt), 0.55, 'tri', 0.13, 0.004, 0.16, 0.18, 0.32), at)
    # 偶发的高音点（提示"有东西"）
    for beats in (3.0, 11.5, 19.0, 27.5):
        mix(buf, tone(hz('D6'), 2.4, 'sine', 0.055, 0.02, 1.2, 0.08, 1.2, detune=0.006), int(beats * beat * SR))

    return normalize(reverb(buf, decay=0.38, delay=0.10, wet=0.28, taps=6), 0.62)


TRACKS = {'ch1': track_ch1, 'ch2': track_ch2, 'ch3': track_ch3}


def main():
    os.makedirs(OUT, exist_ok=True)
    wav_only = '--wav' in sys.argv
    for name, fn in TRACKS.items():
        wav = os.path.join(OUT, name + '.wav')
        mp3 = os.path.join(OUT, name + '.mp3')
        print('  合成 %s ...' % name, end='', flush=True)
        buf = fn()
        write_wav(wav, buf)
        print(' %.1f 秒' % (len(buf) / SR), end='', flush=True)
        if not wav_only:
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav,
                            '-codec:a', 'libmp3lame', '-b:a', '128k', mp3], check=True)
            os.remove(wav)
            print(' -> %s (%.0f KB)' % (os.path.basename(mp3), os.path.getsize(mp3) / 1024))
        else:
            print(' -> %s' % os.path.basename(wav))
    return 0


if __name__ == '__main__':
    sys.exit(main())
