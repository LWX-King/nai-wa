# 素材来源与许可

## 奶蛙贴图（游戏内实际使用的角色美术）

- **来源**：<https://github.com/Maple498/nai-wa-codex-pet> 的 `spritesheet.webp`
- **许可**：**Creative Commons Attribution 4.0 International（CC BY 4.0）**
  <https://creativecommons.org/licenses/by/4.0/deed.zh-hans>
- **原始内容**：11 组动作 × 最多 8 帧，共 74 帧；待机 / 左右跑 / 挥手 / 大笑 /
  震惊 / 破防大哭 / 躺平 / 鞠躬 / 低头等
- **本项目对其所做的处理**：按 8×11 网格切帧、裁掉透明边、128 色调色板量化、
  内联为 data URI 打包进 `js/sprites.js`

按 CC BY 4.0 要求保留的署名：

> "奶蛙 Codex Pet" 像素动画，来源于
> [nai-wa-codex-pet](https://github.com/Maple498/nai-wa-codex-pet)，
> 采用 CC BY 4.0 授权；本项目对其做了切帧、调色板量化与内联打包。

**关于"奶蛙"网络流行形象原型**：该形象原型不属于上游仓库所能确认或授予的权利范围。
上游仓库仅就维护者实际创作的像素重绘、动画编排与透明图集制作授予上述许可。
如需商用，请自行评估所在地区的相关风险。

## 奶蛙笑声素材（游戏里"哦齁齁齁/哈哈哈"用的）

- **来源**：<https://github.com/WencueCryforme/NaiWa-Universe>
  里的 `dist/sound/奶蛙爆笑合集/奶蛙爆笑.mp3`
- **仓库许可**：MIT License
- **本项目所做的处理**：去掉开头静音、裁出前 3.2 秒、统一响度，
  输出为 `audio/voice/_laugh.mp3`（3.2 秒）；原始素材保留在 `tools/laugh-source.mp3`

另有两个备选（`tools/laugh-alt-1.m4a`、`laugh-alt-2.wav`）来自：
- <https://github.com/Diyeego/naiwa-pet>（仓库无 LICENSE 文件）
- <https://github.com/liaosongjie/Codex-Voice-Input>（MIT）

**关于"奶蛙"网络流行形象与声音原型**：该形象与那种变声器音色源于网友二创，
不属于上述仓库所能确认或授予的权利范围。上游仓库仅就维护者自己整理/制作的
素材文件授予上述许可。个人玩、发视频没问题；**要商用请自行评估风险**。

## 配音是怎么来的

台词用 `edge-tts`（微软 Edge 的免费 TTS）合成干声，再用 ffmpeg `rubberband`
做变声处理（提音高 + 移共振峰 + 高通 + 提亮 + 轻失真），
做出奶蛙那种"变声器感"。参数与流程见 `tools/build-voice.py` 顶部的 `VOICES` 表。

## 其他美术

场景、道具、背景、UI 全部为本项目用 SVG / CSS 代码绘制，不依赖任何外部图片。
BGM 是 `tools/build-bgm.py` 程序合成的。

## 关于《拣爱》

本项目在**玩法结构**上参考了《拣爱》（LoveChoice, Akaba Studio）：
场景内隐藏热点、拖拽交互、小游戏、多结局判定。玩法规则本身不受版权保护，
本项目未使用《拣爱》的任何美术、音频或代码资源。

## 音色参考素材（仅用于调参，不进入游戏）

- **来源**：B站作品《奶蛙：一百分的家》（UP 主 轩月27）
  - 第一集 <https://www.bilibili.com/video/BV1U7bN6TEMc/>
  - 第二集 <https://www.bilibili.com/video/BV1RFYz6HELP/>
- **用途**：**只用来做声学分析**，量出奶蛙音色的基频/共振峰/亮度，
  再拿这些指标去校准 TTS 的变声参数（`tools/extract-voice-ref.py`、
  `tools/iterate-voice.py`）
- **游戏里不含这些音频**。`tools/voice-ref-ep1.wav` / `voice-ref-ep2.wav`
  是从整集里自动抠出的分析用片段，可以随时删掉（删了不影响游戏运行）
- 该作品的版权属于原 UP 主，本项目仅作个人学习与调参参考