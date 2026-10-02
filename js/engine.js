// engine.js —— 《拣奶》核心引擎
// 结构照抄《拣爱》：每个场景里藏着"要做的事"，光点对白选项 = 直男；把场景里该做的做了 = 好结局。
(function () {
  'use strict';

  var ART = window.ART;
  var W = 1280, H = 720;

  // ---------------- 存档 ----------------
  var SAVE_KEY = 'jianNai.save.v1';
  var save = { endings: {}, cleared: {} };
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    if (raw) save = JSON.parse(raw);
  } catch (e) { /* 无 localStorage 也不影响玩 */ }
  if (!save.endings) save.endings = {};
  if (!save.cleared) save.cleared = {};
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { }
  }

  // ---------------- 运行时状态 ----------------
  var S = {
    chapter: null,      // 章节对象
    scene: null,        // 当前场景
    beats: [],          // 待播的对白队列
    flags: {},          // 局面标志
    gross: 0,           // 直男值（失误次数）
    wrong: {},          // 场景 -> 失误次数
    seen: {},           // 已经点过的热点：key -> true
    busy: false,        // 对白播放中，锁输入
    ending: null,
    unlockedThisRun: [],
    minigame: null
  };
  window.GAME = { state: S, save: save, persist: persist };

  // ---------------- DOM ----------------
  var stage, layerBg, layerScene, layerUi, layerFx;
  var dlgWrap, dlgWho, dlgText, dlgHint, hudGross, hudTitle;
  var endingPanel, chapterPanel, introPanel, toastEl;
  var typeTimer = null, typeFull = '', typeIdx = 0;

  function $(id) { return document.getElementById(id); }

  function boot() {
    stage = $('stage');
    layerBg = $('layer-bg');
    layerScene = $('layer-scene');
    layerUi = $('layer-ui');
    layerFx = $('layer-fx');
    dlgWrap = $('dialogue'); dlgWho = $('dlg-who'); dlgText = $('dlg-text'); dlgHint = $('dlg-hint');
    hudGross = $('hud-gross'); hudTitle = $('hud-title');
    endingPanel = $('ending-panel'); chapterPanel = $('chapter-panel'); introPanel = $('intro-panel');
    toastEl = $('toast');

    dlgWrap.addEventListener('click', function () { advance(); });
    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    // 音频解锁：浏览器要求"先有真实点击/按键"才允许出声。
    // 用捕获阶段、绑在 document 上，这样不管点哪儿、按哪个键都能解锁。
    document.addEventListener('pointerdown', function () {
      if (window.AUDIO) window.AUDIO.unlock();
    }, true);
    document.addEventListener('keydown', function () {
      if (window.AUDIO) window.AUDIO.unlock();
    }, true);
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance(); }
    });

    buildChapterBoard();
    hoverProbe();

    // ?audio 直接进音频自检页，省得点来点去
    if (/[?&]audio/.test(location.search)) {
      setTimeout(function () { window.UI.audioCheck(); }, 300);
    }
  }

  // 指针 -> SVG 坐标
  function toSvg(e) {
    var r = stage.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width * W,
      y: (e.clientY - r.top) / r.height * H
    };
  }

  // ---------------- 对白 ----------------
  function say(beats) {
    batch += 1;
    S.beats = (beats || []).slice();
    next();
  }
  var batch = 0; // 对白批次：新的一批会作废旧批次的推进回调
  function next() {
    var my = batch;
    var b = S.beats.shift();
    if (!b) {
      S.busy = false;
      dlgWrap.classList.remove('show');
      dlgHint.textContent = '';
      // 对白刚结束时给 140ms 输入冷却：
      // 不然手快的玩家点完最后一句会立刻点场景，那一下会被"推进对白"吃掉，
      // 表现为"我明明点了那个东西却没反应"。
      S.lockUntil = Date.now() + 140;
      return;
    }
    S.busy = true;
    dlgWrap.classList.add('show');
    // b: {who, text, style, fx, then}
    var who = b.who || '';
    dlgWho.textContent = who;
    dlgWho.className = 'dlg-who ' + (b.style === 'nar' ? 'nar' : (who === '奶蛙' ? 'me' : (who ? 'her' : 'nar')));
    dlgHint.textContent = '点击继续 ▸';
    if (b.fx) flash(b.fx);
    typeText(b.text || '');
    // 配音：有就把 BGM 压下去，没有就静静显示文字
    if (window.AUDIO) {
      try {
        // S.laughing 用来避免"笑声台词已经在放笑声、动作又叠一次"
        S.laughing = false;
        var played = window.AUDIO.speak(who, b.text || '');
        var man = window.VOICE_MANIFEST;
        if (played && man && window.AUDIO.keyOf) {
          var e = man[window.AUDIO.keyOf(who, b.text || '')];
          if (e && e.laugh) S.laughing = true;
        }
      } catch (e) { }
    }
    if (typeof b.then === 'function' && !b._fired) {
      b._fired = true;
      queueMicrotask(function () {
        if (batch !== my) return;   // 已经进入新的一批对白
        try { b.then(); } catch (err) { console.error('[beat.then]', err); }
      });
    }
    // b._fired 必须在同步阶段写入，且 then 走微任务：
    // 打字机定时器与点击可能同时触发 advance()，同步触发 then 会把新排入的对白整批冲掉。
  }
  function typeText(t) {
    clearInterval(typeTimer);
    typeFull = t; typeIdx = 0;
    dlgText.textContent = '';
    typeTimer = setInterval(function () {
      typeIdx += 1;
      dlgText.textContent = typeFull.slice(0, typeIdx);
      if (typeIdx >= typeFull.length) { clearInterval(typeTimer); }
    }, 22);
  }
  function advance() {
    if (S.ending) return;
    if (S.minigame) return;
    if (typeIdx < typeFull.length) { clearInterval(typeTimer); typeIdx = typeFull.length; dlgText.textContent = typeFull; return; }
    next();
  }

  function flash(kind) {
    var el = document.createElement('div');
    el.className = 'fx ' + kind;
    layerFx.appendChild(el);
    setTimeout(function () { el.remove(); }, 900);
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
  }

  // ---------------- 直男值 ----------------
  function markWrong(key, msg) {
    key = key || (S.scene && S.scene.id) || '?';
    S.wrong[key] = (S.wrong[key] || 0) + 1;
    S.gross += 1;
    updateHud();
    if (msg !== false) toast('直男值 +1　' + (msg || ''));
  }
  function updateHud() {
    hudGross.textContent = S.gross;
    hudGross.className = S.gross >= 6 ? 'bad' : (S.gross >= 3 ? 'warn' : '');
  }

  // ---------------- 场景渲染 ----------------
  function drawScene(scene) {
    S.scene = scene;
    S.flags = S.flags || {};
    layerBg.innerHTML = ART.background(scene.theme || 'room');
    var parts = [];
    (scene.props || []).forEach(function (p) {
      parts.push('<g class="prop" data-p="' + (p.id || '') + '" transform="translate(' + (p.x || 0) + ',' + (p.y || 0) + ')' +
        (p.rot ? ' rotate(' + p.rot + ')' : '') + (p.scale ? ' scale(' + p.scale + ')' : '') + '">' +
        ART.prop(p.kind, { color: p.color, color2: p.color2, emoji: p.emoji, text: p.text, opacity: p.opacity }) + '</g>');
    });
    (scene.chars || []).forEach(function (c) {
      var inner = (c.kind === 'frog' || !c.kind)
        ? ART.naiwa({
            scale: c.scale || 1, action: c.action || 'idle', frame: c.frame,
            look: c.look, flip: c.flip, rot: c.rot
          })
        : ART.buddy(c.kind, { s: c.scale || 1 });
      parts.push('<g class="char" data-c="' + (c.id || '') + '" transform="translate(' + (c.x || 0) + ',' + (c.y || 0) + ')' +
        (c.flip ? ' scale(-1,1)' : '') + '">' + inner + '</g>');
    });
    layerScene.innerHTML = parts.join('');
    var t = scene.title || (S.chapter && S.chapter.title) || '';
    hudTitle.textContent = t;
    refreshHotspotVisuals();
    if (scene.enter) scene.enter();
  }

  // 隐藏热点可视化：可调试时按 D 键显示
  var debugHotspots = false;
  function refreshHotspotVisuals() {
    var sc = S.scene; if (!sc) return;
    layerUi.innerHTML = '';
    if (!debugHotspots) return;
    (sc.hotspots || []).forEach(function (h) {
      if (!visible(h)) return;
      var r = h.r || 44;
      layerUi.insertAdjacentHTML('beforeend',
        '<circle cx="' + h.x + '" cy="' + h.y + '" r="' + r + '" fill="#ff000022" stroke="#ff0000" stroke-dasharray="6 6"/>');
    });
  }
  window.addEventListener('keydown', function (e) { if (e.key === 'd' || e.key === 'D') { debugHotspots = !debugHotspots; refreshHotspotVisuals(); } });

  function visible(h) {
    if (typeof h.if === 'function') { try { return !!h.if(S.flags); } catch (e) { return false; } }
    if (h.if && typeof h.if === 'object') { return h.if.every(function (k) { return !!S.flags[k]; }); }
    return true;
  }

  // ---------------- 指针交互 ----------------
  var drag = null;
  function onPointerDown(e) {
    if (S.ending || S.minigame) return;
    if (!S.busy && S.lockUntil && Date.now() < S.lockUntil) return;   // 对白刚结束的输入冷却
    var p = toSvg(e);
    // 1) 拖拽目标优先
    var sc = S.scene; if (!sc) return;
    var dh = pick(sc.hotspots, p, function (h) { return h.drag; });
    if (dh) {
      drag = { h: dh, x: p.x, y: p.y };
      e.preventDefault();
      return;
    }
    if (S.busy) { advance(); return; }
    // 2) 普通热点
    var hit = pick(sc.hotspots, p, function (h) { return !h.drag; });
    if (hit) { runHotspot(hit); return; }
    // 3) 点空
    if (sc.onEmpty) sc.onEmpty();
  }
  function onPointerMove(e) {
    if (!drag) return;
    var p = toSvg(e);
    if (Math.abs(p.x - drag.x) > 90 || Math.abs(p.y - drag.y) > 90) {
      var h = drag.h; drag = null;
      if (h.drop) h.drop(S.flags); else { if (h.onDrop) h.onDrop(S.flags); }
    }
  }
  function onPointerUp() {
    if (!drag) return;
    var h = drag.h; drag = null;
    if (h.onDrop) h.onDrop(S.flags); else if (h.tap) h.tap(S.flags);
  }
  function pick(list, p, filter) {
    if (!list) return null;
    for (var i = 0; i < list.length; i++) {
      var h = list[i];
      if (filter && !filter(h)) continue;
      if (!visible(h)) continue;
      var r = h.r || 44;
      var dx = p.x - h.x, dy = p.y - h.y;
      if (h.w && h.h) {
        if (Math.abs(dx) <= h.w / 2 && Math.abs(dy) <= h.h / 2) return h;
      } else if (dx * dx + dy * dy <= r * r) return h;
    }
    return null;
  }

  function runHotspot(h) {
    var key = (S.scene.id || '') + ':' + (h.id || (h.x + '_' + h.y));
    var first = !S.seen[key];
    S.seen[key] = true;
    if (h.once && !first) {
      if (h.repeat) h.repeat(S.flags);
      return;
    }
    if (h.fx) flash(h.fx);
    if (h.markWrong) markWrong(h.markWrong === true ? S.scene.id : h.markWrong, h.wrongMsg);
    if (h.set) h.set(S.flags);
    if (h.beats) {
      var bs = typeof h.beats === 'function' ? h.beats(S.flags) : h.beats;
      say(bs);
    }
    if (h.tap && !h.drag) h.tap(S.flags);
    if (h.correct && !S.recordedCorrect) { /* 兼容 */ }
  }

  // 悬停光标提示 + 高亮（让"可点的地方"有反馈，别让玩家瞎点）
  var hovered = null;
  function hoverProbe() {
    window.addEventListener('mousemove', function (e) {
      if (S.ending || S.minigame || !S.scene) return;
      var p = toSvg(e);
      var h = pick(S.scene.hotspots, p, null);
      stage.style.cursor = h ? 'pointer' : 'default';
      if (h !== hovered) {
        var g = hovered && hovered._el;
        if (g) g.classList.remove('hot');
        hovered = h || null;
        if (h) {
          if (!h._el) {
            // 记住热点对应的 SVG 元素（按最近的道具/角色找）
            h._el = null;
            var best = null, bd = 1e9;
            layerScene.querySelectorAll('.prop,.naiwa').forEach(function (el) {
              var r = el.getBoundingClientRect();
              var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
              var sr = stage.getBoundingClientRect();
              var hx = sr.left + h.x / 1280 * sr.width, hy = sr.top + h.y / 720 * sr.height;
              var d = Math.hypot(cx - hx, cy - hy);
              if (d < bd) { bd = d; best = el; }
            });
            if (best && bd < 220) h._el = best;
          }
          if (h._el) h._el.classList.add('hot');
        }
      }
    });
  }

  // ---------------- 一章的开始/结束 ----------------
  function startChapter(chId) {
    var ch = window.CHAPTERS[chId];
    if (!ch) return false;
    if (ch.status !== 'playable') { showWip(ch); return false; }
    S.chapter = ch;
    S.flags = {}; S.gross = 0; S.wrong = {}; S.seen = {}; S.ending = null;
    S.unlockedThisRun = [];
    chapterPanel.classList.remove('show');
    endingPanel.classList.remove('show');
    updateHud();
    if (window.AUDIO) window.AUDIO.chapterBgm(ch.no);
    ch.start();
    return true;
  }

  function showWip(ch) {
    chapterPanel.innerHTML =
      '<div class="panel-card">' +
      '<h2>' + ch.title + '</h2>' +
      '<p class="sub">' + (ch.subtitle || '') + '</p>' +
      '<p class="wip">🚧 ' + (ch.wipText || '这一章还在锅里炖着，先把第一章端上来。') + '</p>' +
      '<p class="wip-sub">已规划的结局：' + (ch.plannedEndings || []).map(function (e) { return e.name; }).join('　·　') + '</p>' +
      '<button class="btn" onclick="UI.openChapters()">返回章节目录</button>' +
      '</div>';
    chapterPanel.classList.add('show');
  }

  // 判定结局：第一章规则
  function judge(chapter1Rule) {
    // chapter1Rule(flags, gross, wrong) -> endingId
    return chapter1Rule(S.flags, S.gross, S.wrong);
  }

  function finish(endId) {
    var ch = S.chapter;
    var ed = (ch.endings || []).filter(function (e) { return e.id === endId; })[0]
      || { id: endId, name: '未知结局', rank: '?', desc: '' };
    S.ending = ed;
    S.busy = false;
    dlgWrap.classList.remove('show');

    var isNew = !save.endings[ed.id];
    save.endings[ed.id] = { name: ed.name, rank: ed.rank, at: Date.now() };
    var total = (ch.endings || []).length;
    var got = (ch.endings || []).filter(function (e) { return save.endings[e.id]; }).length;
    if (got >= total) save.cleared[ch.id] = true;
    persist();

    endingPanel.innerHTML =
      '<div class="panel-card ending rank-' + ed.rank + '">' +
      '<div class="ed-kicker">第' + (ch.no || 1) + '章 · ' + ch.title + '</div>' +
      '<h2>' + ed.name + (isNew ? '<span class="new">NEW</span>' : '') + '</h2>' +
      '<p class="ed-desc">' + (ed.desc || '') + '</p>' +
      '<div class="ed-stat">本次直男值 <b>' + S.gross + '</b>　·　本章结局收集 ' + got + '/' + total + '</div>' +
      '<div class="ed-actions">' +
      '<button class="btn" onclick="UI.restartChapter()">重玩本章</button>' +
      '<button class="btn ghost" onclick="UI.openChapters()">章节 / 结局册</button>' +
      '</div>' +
      '<p class="ed-tip">提示：结局不看你怎么选，看你在场景里做了什么。</p>' +
      '</div>';
    endingPanel.classList.add('show');
  }

  // ---------------- 章节选择板 ----------------
  function buildChapterBoard() {
    var html = '<div class="panel-card"><div class="board-head"><h1>拣 奶</h1><p class="tag">奶蛙互动叙事 · 三章结构</p></div><div class="board-grid">';
    Object.keys(window.CHAPTERS).forEach(function (k) {
      var ch = window.CHAPTERS[k];
      var endHtml = (ch.endings || []).map(function (e) {
        var got = save.endings[e.id];
        return '<li class="' + (got ? 'got' : '') + '"><i></i>' + (got ? e.name + ' <em>' + e.rank + '</em>' : '？？？') + '</li>';
      }).join('');
      var planned = (ch.plannedEndings || []).map(function (e) { return '<li class="lock"><i></i>' + e.name + '</li>'; }).join('');
      var got = (ch.endings || []).filter(function (e) { return save.endings[e.id]; }).length;
      var total = (ch.endings || []).length;
      html += '<div class="ch-card ' + (ch.status === 'playable' ? '' : 'wip') + '">' +
        '<div class="ch-no">第 ' + ch.no + ' 章</div>' +
        '<h3>' + ch.title + '</h3>' +
        '<p class="ch-sub">' + (ch.subtitle || '') + '</p>' +
        '<p class="ch-style">' + (ch.style || '') + '</p>' +
        '<ul class="ed-list">' + endHtml + planned + '</ul>' +
        (ch.status === 'playable'
          ? '<button class="btn" onclick="UI.start(' + ch.no + ')">开始' + (got ? '（' + got + '/' + total + '）' : '') + '</button>'
          : '<button class="btn ghost" onclick="UI.start(' + ch.no + ')">看看这个坑</button>') +
        '</div>';
    });
    html += '</div><p class="board-foot">原创手绘 SVG 美术 · 无任何外部素材依赖 · 键盘 <b>D</b> 可显示隐藏热点（调试用）' +
      ' · <a href="?audio" style="color:#f5c518">音频没声音？点这里自检</a></p></div>';
    chapterPanel.innerHTML = html;
  }

  // ---------------- 对外 UI API ----------------
  window.UI = {
    start: function (no) {
      var key = Object.keys(window.CHAPTERS).filter(function (k) { return window.CHAPTERS[k].no === no; })[0];
      startChapter(key);
    },
    toggleMusic: function () {
      if (!window.AUDIO) return;
      var on = window.AUDIO.toggleMusic();
      var b = $('btn-music');
      if (b) { b.textContent = on ? '♪ 音乐' : '♪ 音乐（关）'; b.classList.toggle('off', !on); }
      toast(on ? '音乐已开' : '音乐已关');
    },
    toggleVoice: function () {
      if (!window.AUDIO) return;
      var on = window.AUDIO.toggleVoice();
      var b = $('btn-voice');
      if (b) { b.textContent = on ? '🎙 配音' : '🎙 配音（关）'; b.classList.toggle('off', !on); }
      toast(on ? '配音已开' : '配音已关');
    },
    // 音频自检：把整条链路走一遍，把结果摊开给人看
    audioCheck: function () {
      var A = window.AUDIO;
      var rows = A && A.check ? A.check() : [['音频模块', '没加载']];
      chapterPanel.innerHTML = '<div class="panel-card"><div class="board-head">' +
        '<h1 style="font-size:30px;letter-spacing:6px">音频自检</h1>' +
        '<p class="tag">每一行都是链路的一步，看到 ✗ 或 ← 就知道断在哪</p></div>' +
        '<div class="audiocheck">' +
        rows.map(function (r) {
          var bad = /✗|←/.test(r[1]);
          return '<div class="ac-row' + (bad ? ' bad' : '') + '"><b>' + r[0] + '</b><span>' + r[1] + '</span></div>';
        }).join('') +
        '</div>' +
        '<p class="code-tip" style="text-align:left;margin-top:16px">' +
        '说明：浏览器要求"先有真实点击/按键"才允许出声。所以请<b>先点一下画面</b>再来自检。<br>' +
        '如果 <b>AudioContext</b> 那行不是 running：点一下画面任意位置，然后重新自检。<br>' +
        '如果 <b>配音 · 旁白</b> 是 ✗：说明 voice-manifest.js 没加载或 audio/voice 目录缺失。</p>' +
        '<div class="ed-actions"><button class="btn" onclick="UI.audioCheck()">重新自检</button>' +
        '<button class="btn ghost" onclick="UI.openChapters()">返回章节目录</button></div>' +
        '</div>';
      chapterPanel.classList.add('show');
    },
    openChapters: function () {
      S.ending = null;
      endingPanel.classList.remove('show');
      buildChapterBoard();
      chapterPanel.classList.add('show');
    },
    restartChapter: function () {
      var key = S.chapter && S.chapter.id;
      endingPanel.classList.remove('show');
      if (key) startChapter(key);
    },
    showIntro: function (title, sub, lines, cb) {
      introPanel.innerHTML = '<div class="panel-card intro"><h2>' + title + '</h2><p class="sub">' + sub + '</p>' +
        '<div class="intro-lines">' + lines.map(function (l) { return '<p>' + l + '</p>'; }).join('') + '</div>' +
        '<button class="btn" id="intro-go">开始</button></div>';
      introPanel.classList.add('show');
      $('intro-go').onclick = function () { introPanel.classList.remove('show'); cb(); };
    }
  };

  // ---------------- 小游戏：一致点（滑动/点击找相同） ----------------
  // cfg: {title, hint, items:[{svg}], need:n, onWin, onLose}
  function minigameMatch(cfg) {
    S.minigame = true;
    dlgWrap.classList.remove('show');
    var picked = {};
    var need = cfg.need || 3;
    var cellW = 240, cellH = 240;
    var cols = 3, rows = Math.ceil(cfg.items.length / cols);
    var boardW = cols * cellW, boardH = rows * cellH;
    var ox = (W - boardW) / 2, oy = (H - boardH) / 2 - 10;
    var html = '<div class="mg-wrap"><div class="mg-head">' + cfg.title + '<span>' + cfg.hint + '</span>' +
      '<b id="mg-count">0 / ' + need + '</b></div>' +
      '<svg viewBox="0 0 ' + boardW + ' ' + boardH + '" class="mg-board">';
    cfg.items.forEach(function (it, i) {
      var cx = (i % cols) * cellW + cellW / 2;
      var cy = Math.floor(i / cols) * cellH + cellH / 2;
      html += '<g class="mg-cell" data-i="' + i + '" transform="translate(' + cx + ',' + cy + ')">' +
        '<rect x="-108" y="-108" width="216" height="216" rx="18" fill="#ffffff18" stroke="#ffffff44"/>' +
        '<g transform="scale(0.95)">' + it.svg + '</g></g>';
    });
    html += '</svg></div>';
    layerUi.innerHTML = html;
    var cnt = $('mg-count');
    layerUi.querySelectorAll('.mg-cell').forEach(function (g) {
      g.addEventListener('click', function () {
        if (S.minigame !== true) return;
        var i = +g.dataset.i;
        if (picked[i]) return;
        picked[i] = true;
        g.classList.add('on');
        var n = Object.keys(picked).length;
        cnt.textContent = n + ' / ' + need;
        if (n >= need) {
          S.minigame = null;
          layerUi.innerHTML = '';
          refreshHotspotVisuals();
          cfg.onWin(picked);
        }
      });
    });
  }

  // ---------------- 小游戏：拖拽（把 A 拖到 B） ----------------
  // cfg: {title, hint, from:{x,y,svg}, to:{x,y,svg}, onWin, onFail}
  function minigameDrag(cfg) {
    S.minigame = true;
    dlgWrap.classList.remove('show');
    var html = '<div class="mg-wrap"><div class="mg-head">' + cfg.title + '<span>' + cfg.hint + '</span></div>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" class="mg-board mg-drag">' +
      '<g class="mg-zone" transform="translate(' + cfg.to.x + ',' + cfg.to.y + ')">' +
      '<circle r="120" fill="#ffffff14" stroke="#ffffff66" stroke-dasharray="10 8" stroke-width="3"/>' + cfg.to.svg + '</g>' +
      '<g class="mg-draggable" transform="translate(' + cfg.from.x + ',' + cfg.from.y + ')">' + cfg.from.svg + '</g>' +
      '</svg></div>';
    layerUi.innerHTML = html;
    var svg = layerUi.querySelector('.mg-drag');
    var node = layerUi.querySelector('.mg-draggable');
    var dragging = false, cur = { x: cfg.from.x, y: cfg.from.y };
    function ev2svg(e) {
      var r = svg.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
    }
    node.addEventListener('pointerdown', function (e) { dragging = true; node.setPointerCapture(e.pointerId); e.preventDefault(); });
    node.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var p = ev2svg(e); cur = p;
      node.setAttribute('transform', 'translate(' + p.x + ',' + p.y + ')');
    });
    node.addEventListener('pointerup', function (e) {
      if (!dragging) return; dragging = false;
      var d = Math.hypot(cur.x - cfg.to.x, cur.y - cfg.to.y);
      if (d < 130) {
        S.minigame = null; layerUi.innerHTML = ''; refreshHotspotVisuals();
        cfg.onWin();
      } else {
        node.setAttribute('transform', 'translate(' + cfg.from.x + ',' + cfg.from.y + ')');
        cfg.onFail && cfg.onFail();
      }
    });
  }

  // ---------------- 小游戏：节奏/连点（应援打 call） ----------------
  // cfg:{title,hint,rounds,onWin,onFail}
  function minigameRhythm(cfg) {
    S.minigame = true;
    dlgWrap.classList.remove('show');
    var rounds = cfg.rounds || 5, hit = 0, idx = 0, state = 'wait';
    layerUi.innerHTML = '<div class="mg-wrap mg-rhythm"><div class="mg-head">' + cfg.title +
      '<span>' + cfg.hint + '</span><b id="rg-score">0 / ' + rounds + '</b></div>' +
      '<div class="rg-arena"><div class="rg-target" id="rg-target">按我</div><div class="rg-bar"><i id="rg-fill"></i></div></div>' +
      '<p class="rg-tip" id="rg-tip">等它亮起来再按，抢拍就废了</p></div>';
    var target = $('rg-target'), fill = $('rg-fill'), score = $('rg-score'), tip = $('rg-tip');
    var t0 = 0, raf = 0, deadline = 0, DUR = 900;
    function loop(ts) {
      if (!t0) t0 = ts;
      var t = ts - t0;
      if (t > DUR) { miss(ts); return; }
      fill.style.width = (t / DUR * 100) + '%';
      raf = requestAnimationFrame(loop);
    }
    // 兜底：rAF 在后台标签页/部分环境会被节流甚至不触发，用定时器保证拍子会过期
    function miss() {
      state = 'wait';
      target.classList.remove('go');
      fill.style.width = '0%';
      tip.textContent = '慢了……（这一拍不算，再来）';
      arm();
    }
    function arm() {
      idx += 1;
      if (idx > rounds) { end(true); return; }
      state = 'go';
      target.classList.add('go');
      t0 = 0;
      deadline = Date.now() + DUR;
      raf = requestAnimationFrame(loop);
      clearTimeout(arm._fallback);
      arm._fallback = setTimeout(function () { if (state === 'go') miss(); }, DUR + 60);
    }
    function end(win) {
      cancelAnimationFrame(raf);
      clearTimeout(arm._fallback);
      S.minigame = null; layerUi.innerHTML = ''; refreshHotspotVisuals();
      win ? cfg.onWin() : cfg.onFail();
    }
    target.addEventListener('click', function () {
      if (state !== 'go') { tip.textContent = '抢拍了！观众：哦齁齁齁（嘲笑）'; return; }
      state = 'wait';
      cancelAnimationFrame(raf);
      clearTimeout(arm._fallback);
      target.classList.remove('go');
      hit += 1; score.textContent = hit + ' / ' + rounds;
      setTimeout(arm, 320);
    });
    setTimeout(arm, 600);
  }

  // ---------------- 小游戏：三位密码锁（第三章用） ----------------
  // cfg: {title, hint, code:'314', onOpen, onWrong}
  function minigameCode(cfg) {
    S.minigame = true;
    dlgWrap.classList.remove('show');
    var code = String(cfg.code);
    var digits = [0, 0, 0];
    var html = '<div class="mg-wrap mg-code"><div class="mg-head">' + cfg.title +
      '<span>' + cfg.hint + '</span></div><div class="code-row">';
    for (var i = 0; i < 3; i++) {
      html += '<div class="code-slot" data-i="' + i + '">' +
        '<div class="code-up" data-d="1">▲</div>' +
        '<div class="code-num">0</div>' +
        '<div class="code-dn" data-d="-1">▼</div></div>';
    }
    html += '</div><p class="code-tip" id="code-tip">线索里的三个数字，按顺序转出来</p>' +
      '<button class="btn" id="code-go">开 锁</button></div>';
    layerUi.innerHTML = html;

    function paint() {
      layerUi.querySelectorAll('.code-slot').forEach(function (el, i) {
        el.querySelector('.code-num').textContent = digits[i];
        el.classList.toggle('has', digits[i] !== 0);
      });
    }
    layerUi.querySelectorAll('.code-up,.code-dn').forEach(function (b) {
      b.addEventListener('click', function () {
        var slot = b.closest('.code-slot');
        var i = +slot.dataset.i, d = +b.dataset.d;
        digits[i] = (digits[i] + d + 10) % 10;
        paint();
      });
    });
    paint();
    $('code-go').addEventListener('click', function () {
      if (digits.join('') === code) {
        S.minigame = null; layerUi.innerHTML = ''; refreshHotspotVisuals();
        cfg.onOpen();
      } else {
        var tip = $('code-tip');
        tip.textContent = '咔。纹丝不动。（' + digits.join('') + ' 不对）';
        tip.classList.add('bad');
        setTimeout(function () { if (tip) tip.classList.remove('bad'); }, 600);
        if (cfg.onWrong) cfg.onWrong(digits.join(''));
      }
    });
  }

  window.ENGINE = {
    boot: boot, say: say, drawScene: drawScene, markWrong: markWrong, judge: judge,
    finish: finish, toast: toast, flash: flash, state: S, markWrong: markWrong,
    showIntro: function (t, s, l, cb) { window.UI.showIntro(t, s, l, cb); },
    minigameMatch: minigameMatch, minigameDrag: minigameDrag,
    minigameRhythm: minigameRhythm, minigameCode: minigameCode,
    startChapter: startChapter,
    get flags() { return S.flags; },
    get gross() { return S.gross; },
    get wrong() { return S.wrong; }
  };

  document.addEventListener('DOMContentLoaded', function () {
    try { boot(); } catch (err) { showFatal(err); }
    window.addEventListener('error', function (e) { showFatal(e.error || e.message); });
  });

  function showFatal(err) {
    var el = document.getElementById('chapter-panel');
    if (!el) return;
    el.innerHTML = '<div class="panel-card"><h2>出错了</h2><p class="sub">把下面这行发给作者</p><pre class="err">' +
      String(err && err.stack || err).replace(/</g, '&lt;') + '</pre></div>';
    el.classList.add('show');
  }

  // 调试助手：控制台里 GAME.dev.scene('confess') 可直接跳场景
  window.GAME = window.GAME || {};
  window.GAME.dev = {
    // 精确可达性校验：把画面按网格铺开，像素级判断每个热点
    // "有没有任何一块可点区域是只属于它的"。
    // 光看中心点不够——中心被别人盖住但边上还有一块可点，玩家仍然点得到。
    audit: function (chapterId) {
      var STEP = 8;
      var ids = chapterId ? [chapterId] : Object.keys(window.CHAPTERS);
      var reports = [];
      var checked = 0;
      ids.forEach(function (cid) {
        var ch = window.CHAPTERS[cid];
        var sc = ch && ch._scenes;
        if (!sc) return;              // 还没打开过这一章，跳过（不是错误）
        checked++;
        Object.keys(sc).forEach(function (sid) {
          var scene = sc[sid];
          var hs = (scene.hotspots || []).filter(function (h) {
            if (typeof h.if === 'function') { try { if (!h.if({})) return false; } catch (e) { } }
            return true;
          });
          if (!hs.length) return;
          // 每个网格点归谁：取列表里第一个命中的
          var owner = [];
          for (var y = 0; y < 720; y += STEP) {
            for (var x = 0; x < 1280; x += STEP) {
              var h = pick(hs, { x: x, y: y }, null);
              owner.push(h ? hs.indexOf(h) : -1);
            }
          }
          var W = Math.ceil(1280 / STEP);
          var total = {};
          for (var i = 0; i < owner.length; i++) {
            if (owner[i] < 0) continue;
            total[owner[i]] = (total[owner[i]] || 0) + 1;
          }
          // 洪水填充：从中心出发能连到多大一块
          hs.forEach(function (h, idx) {
            var cx = Math.round(h.x / STEP), cy = Math.round(h.y / STEP);
            var seen = {}, stack = [[cx, cy]], reach = 0;
            var inb = function (a, b) { return a >= 0 && b >= 0 && a < W && b < Math.ceil(720 / STEP); };
            if (!inb(cx, cy) || owner[cy * W + cx] !== idx) {
              // 中心点不是自己的，找一个属于自己的起点
              var found = null;
              for (var k = 0; k < owner.length; k++) if (owner[k] === idx) { found = k; break; }
              if (found == null) { reports.push({ chapter: cid, scene: sid, hotspot: h.id, problem: '完全点不到' }); return; }
              stack = [[found % W, Math.floor(found / W)]];
            }
            while (stack.length) {
              var p = stack.pop(), kk = p[1] * W + p[0];
              if (!inb(p[0], p[1]) || seen[kk] || owner[kk] !== idx) continue;
              seen[kk] = 1; reach++;
              stack.push([p[0] + 1, p[1]]); stack.push([p[0] - 1, p[1]]);
              stack.push([p[0], p[1] + 1]); stack.push([p[0], p[1] - 1]);
            }
            var area = total[idx] || 0;
            var gridTotal = reach;
            // 只有"属于自己的像素"里，连通的这一块占比过低 = 被切碎了
            if (area > 0 && gridTotal / area < 0.55) {
              reports.push({
                chapter: cid, scene: sid, hotspot: h.id,
                problem: '可点区域被切碎', reach: gridTotal, area: area
              });
            }
          });
        });
      });
      return reports;
    },
    // 看清一次点击到底命中了什么（排查"我明明点了却没反应"）
    probe: function (x, y) {
      if (!S.scene) return null;
      var h = pick(S.scene.hotspots, { x: x, y: y }, null);
      return {
        hit: h ? (h.id || '?') : null,
        busy: S.busy,
        minigame: !!S.minigame,
        ending: S.ending ? S.ending.id : null,
        lockMs: S.lockUntil ? Math.max(0, S.lockUntil - Date.now()) : 0
      };
    },
    scene: function (name) {
      var ch = window.CHAPTERS[S.chapter && S.chapter.id];
      if (ch && ch._scenes && ch._scenes[name]) drawScene(ch._scenes[name]);
      else console.warn('没有这个场景:', name);
    },
    flags: function () { return S.flags; },
    set: function (k, v) { S.flags[k] = v; },
    skip: function () { while (S.beats.length) next(); S.busy = false; dlgWrap.classList.remove('show'); }
  };
})();
