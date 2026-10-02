#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build-sprites.py —— 从奶蛙 sprite sheet 重新生成 js/sprites.js

游戏运行时并不需要这个脚本（js/sprites.js 已经把贴图内联好了）。
只有你想换素材、加动作时才用它。

依赖：ffmpeg（解 WebP）、Pillow（量化）

用法：
    python tools/build-sprites.py <spritesheet.webp 路径>
    例如：python tools/build-sprites.py C:\\下载\\spritesheet.webp

流程：webp --ffmpeg--> RGBA 原始像素 --> 按 8x11 切帧并裁透明边
      --> 128 色调色板量化 --> 内联 data URI --> 写出 js/sprites.js
"""
import base64, io, json, os, subprocess, sys, tempfile

COLS, ROWS = 8, 11          # 上游 sprite sheet 的网格
SRC_ACTIONS = {             # 动作名 -> (行号, 取第几帧)
    'idle':  (0, [0, 5]),
    'idle2': (0, [1]),
    'walk':  (1, [0, 2, 4, 6]),
    'walkL': (2, [0, 2, 4, 6]),
    'wave':  (3, [1, 2, 3]),
    'laugh': (4, [0, 1, 2, 3, 4]),
    'shock': (5, [0, 2]),
    'cry':   (5, [3, 4, 5]),
    'lie':   (5, [6, 7]),
    'bow':   (8, [4, 5]),
    'shake': (9, [0, 2, 4]),
}

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_JS = os.path.join(HERE, '..', 'js', 'sprites.js')


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    webp = sys.argv[1]
    if not os.path.exists(webp):
        print('找不到文件：' + webp)
        return 1

    try:
        from PIL import Image
    except ImportError:
        print('需要 Pillow：python -m pip install Pillow')
        return 1

    tmp = tempfile.mkdtemp(prefix='naiwa-build-')
    raw = os.path.join(tmp, 'sheet.raw')
    # 用 ffmpeg 解成无压缩 RGBA，避免 Pillow 的 webp 解码差异
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', webp,
                    '-f', 'rawvideo', '-pix_fmt', 'rgba', raw], check=True)
    with open(raw, 'rb') as f:
        data = f.read()

    # 反推尺寸
    from PIL import Image as I
    im = I.open(webp)
    W, H = im.size
    im.close()
    assert len(data) >= W * H * 4, 'raw 数据尺寸不符：%d' % len(data)
    CW, CH = W // COLS, H // ROWS

    def slice_frame(row, col):
        """返回 (base64 png, w, h)；空格子返回 None"""
        minx, miny, maxx, maxy = CW, CH, -1, -1
        px = []
        for y in range(CH):
            sy = row * CH + y
            line = []
            base = (sy * W + col * CW) * 4
            for x in range(CW):
                i = base + x * 4
                p = (data[i], data[i + 1], data[i + 2], data[i + 3])
                line.append(p)
                if p[3] > 16:
                    minx = min(minx, x); maxx = max(maxx, x)
                    miny = min(miny, y); maxy = max(maxy, y)
            px.append(line)
        if maxx < 0:
            return None
        tw, th = maxx - minx + 1, maxy - miny + 1
        trimmed = [px[y][minx:maxx + 1] for y in range(miny, maxy + 1)]
        img = I.new('RGBA', (tw, th))
        img.putdata([c for row_ in trimmed for c in row_])
        q = img.quantize(colors=128, method=I.FASTOCTREE)
        buf = io.BytesIO()
        q.save(buf, 'PNG', optimize=True)
        return base64.b64encode(buf.getvalue()).decode('ascii'), tw, th

    built = {}
    for name, (row, frames) in SRC_ACTIONS.items():
        arr = []
        for c in frames:
            r = slice_frame(row, c)
            if r:
                arr.append({'src': 'data:image/png;base64,' + r[0], 'w': r[1], 'h': r[2]})
        if arr:
            built[name] = arr

    lines = [
        '// sprites.js —— 真奶蛙贴图（由 tools/build-sprites.py 自动生成，别手改）',
        '// 来源：github.com/Maple498/nai-wa-codex-pet 的 spritesheet.webp',
        '// 许可：CC BY 4.0（维持署名即可自由使用、修改、商用）——详见 LICENSES.md',
        '// 说明：内联成 data URI，为的是 file:// 双击直接打开也能显示。',
        '// 锚点在"脚底中心"（渲染时按 h 偏移）。',
        '(function () {',
        '  window.NAIWA_SPRITES = {',
    ]
    for name, arr in built.items():
        lines.append('    %s: [' % json.dumps(name))
        for f in arr:
            lines.append('      { w: %d, h: %d, src: %s },' % (f['w'], f['h'], json.dumps(f['src'])))
        lines.append('    ],')
    lines += ['  };', '})();']

    with io.open(OUT_JS, 'w', encoding='utf-8', newline='') as f:
        f.write('\n'.join(lines) + '\n')
    print('已写出 %s（%d 组动作，%d KB）'
          % (OUT_JS, len(built), os.path.getsize(OUT_JS) // 1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())
