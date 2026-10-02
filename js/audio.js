// audio.js —— 音乐与配音
// BGM 用 <audio> 循环播；配音用 WebAudio 逐块顺序播，播的时候把 BGM 压下去。
(function () {
  'use strict';

  var A = {};
  var bgmEl = null;
  var bgmName = null;
  var ac = null;                 // AudioContext（首次用户操作后创建）
  var voiceGain = null;
  var duckTimer = null;
  var current = null;            // 正在播的对白（用于打断）
  var lastVia = '';              // 上一次实际走通的播放方式
  var lastErr = '';              // 上一次的失败原因
  var lastEntry = null;
  var BASE_VOL = 0.34;
  var DUCK_VOL = 0.10;
  var VOICE_VOL = 0.95;
  var muted = false;

  function readPref(k, d) {
    try { var v = localStorage.getItem('jn.audio.' + k); return v == null ? d : v === '1'; }
    catch (e) { return d; }
  }
  function writePref(k, v) { try { localStorage.setItem('jn.audio.' + k, v ? '1' : '0'); } catch (e) { } }

  var musicOn = readPref('music', true);
  var voiceOn = readPref('voice', true);

  function ctx() {
    if (!ac) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ac = new C();
      voiceGain = ac.createGain();
      voiceGain.gain.value = 0.9;
      voiceGain.connect(ac.destination);
    }
    if (ac.state === 'suspended') {
      ac.resume().catch(function () { blockHint(); });
    }
    return ac;
  }

  var blocked = 0;   // 浏览器不肯恢复音频的次数

  // 被浏览器挡住时，给玩家一个明确提示（不然就是"莫名其妙没声音"）
  var hintShown = false;
  function blockHint() {
    blocked++;
    if (hintShown) return;
    hintShown = true;
    try {
      var el = document.getElementById('toast');
      if (el) {
        el.textContent = '浏览器拦住了声音 —— 点一下画面任意位置即可开启';
        el.classList.add('show', 'loud');
        setTimeout(function () { el.classList.remove('show'); }, 4200);
      }
      var b = document.getElementById('btn-music');
      if (b) b.classList.add('warn');
    } catch (e) { }
  }
  // 诊断用：控制台里 AUDIO.dbg() 看音频链路状态
  A.dbg = function () {
    return {
      ctxState: ac ? ac.state : '未创建',
      blocked: blocked,
      musicOn: musicOn, voiceOn: voiceOn, muted: muted,
      bgm: bgmName, bgmVolume: bgmEl ? +bgmEl.volume.toFixed(2) : null,
      bgmPaused: bgmEl ? bgmEl.paused : null,
      speaking: !!current,
      voiceVia: lastVia || '还没播过',
      lastError: lastErr || '无',
      manifest: window.VOICE_MANIFEST ? Object.keys(window.VOICE_MANIFEST).length : 0
    };
  };

  // 自检：一步一步把音频链路走一遍，返回人能看懂的报告
  A.check = function () {
    var lines = [];
    var d = A.dbg();
    lines.push(['浏览器 AudioContext', d.ctxState + (d.ctxState === 'running' ? '  ✓' : '  ← 出声的前提，必须是 running')]);
    lines.push(['被浏览器拦了几次', String(d.blocked) + (d.blocked ? '  ← 说明有交互没被算作用户手势' : '')]);
    lines.push(['配音开关 / 音乐开关', (voiceOn ? '配音开' : '配音关') + ' / ' + (musicOn ? '音乐开' : '音乐关')]);
    lines.push(['配音索引条数', String(d.manifest) + (d.manifest ? '  ✓' : '  ← voice-manifest.js 没加载')]);
    lines.push(['BGM 当前', (d.bgm || '无') + (d.bgmPaused === false ? '（正在播）' : d.bgm ? '（暂停中）' : '')]);
    var fileOk = function (n) { return n ? '  ✓ ' + n : '  ← 没找到对应的音频'; };
    // 逐条试三条代表性台词
    var tests = [
      ['旁白', '', '奶茶店。空气里飘着珍珠的味道，也飘着一股不知道怎么开口的尴尬。'],
      ['奶蛙', '奶蛙', '（我该上去说话吗。直接上去说"你好我是奶蛙"是不是太直了。）'],
      ['她', '奶蛙（她）', '……你也喜欢这幅画？']
    ];
    tests.forEach(function (t) {
      var key = A.keyOf(t[1], t[2]);
      var hit = window.VOICE_MANIFEST && window.VOICE_MANIFEST[key];
      lines.push(['配音 · ' + t[0], fileOk(hit ? hit.files.join(',') : null)]);
    });
    var real = A.speak(tests[1][1], tests[1][2]);
    lines.push(['实际播放方式', lastVia || '（还没播）']);
    lines.push(['播放请求', real ? '已发出 ✓' : '没能播放 ← 看上面哪一行是 ✗']);
    lines.push(['上次报错', lastErr || '无']);
    return lines;
  };
  // 文本 -> 索引 key（和 build-voice.py 一致）
  A.keyOf = function (who, text) {
    var t = normalizeText(text);
    if (!t) return null;
    return md5(speakerOf(who) + '|' + t);
  };

  // ---------------- BGM ----------------
  function playBgm(name) {
    if (!name || bgmName === name) return;
    bgmName = name;
    if (bgmEl) { try { bgmEl.pause(); } catch (e) { } bgmEl = null; }
    var el = new Audio('audio/bgm/' + name + '.mp3');
    el.loop = true;
    el.volume = 0;
    el.preload = 'auto';
    bgmEl = el;
    if (!musicOn) return;
    el.play().then(function () {
      // 淡入
      var v = 0;
      var t = setInterval(function () {
        v += 0.03;
        if (v >= BASE_VOL) { v = BASE_VOL; clearInterval(t); }
        if (bgmEl === el) el.volume = muted ? 0 : v;
      }, 40);
    }).catch(function () { blockHint(); });
  }

  function stopBgm() {
    if (bgmEl) { try { bgmEl.pause(); } catch (e) { } }
    bgmEl = null; bgmName = null;
  }

  function duck(on) {
    if (!bgmEl) return;
    clearTimeout(duckTimer);
    var target = on ? DUCK_VOL : (musicOn && !muted ? BASE_VOL : 0);
    var from = bgmEl.volume, steps = 8, i = 0;
    var t = setInterval(function () {
      i++;
      if (!bgmEl) { clearInterval(t); return; }
      bgmEl.volume = from + (target - from) * (i / steps);
      if (i >= steps) clearInterval(t);
    }, 30);
  }

  // ---------------- 配音 ----------------
  function stopVoice() {
    if (current) {
      current.stopped = true;
      if (current.source) { try { current.source.stop(); } catch (e) { } }
      if (current.file) { try { current.file.pause(); } catch (e) { } }
    }
    current = null;
    duck(false);
  }

  var cache = {};
  function buf(url) {
    if (cache[url]) return cache[url];
    var c = ctx();
    if (!c) return null;
    cache[url] = fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.arrayBuffer();
    }).then(function (ab) {
      return new Promise(function (res, rej) { c.decodeAudioData(ab, res, rej); });
    }).catch(function (e) {
      lastErr = '解码失败 ' + url.split('/').pop() + '（' + (e && e.message ? e.message : e) + '）';
      return null;
    });
    return cache[url];
  }

  // 播放一条对白。返回 true 表示"确实有配音在放"
  // 注意：这里对文本的清洗规则必须和 tools/build-voice.py 的 clean() 一致，
  // 否则 hash 对不上就找不到音频。
  //
  // 播放方式：默认走 <audio> 元素（和 BGM 同一条路，兼容性最好 ——
  // 有些机器/浏览器上 WebAudio 这条路由不出声，而 <audio> 是正常的）。
  // 如果播放失败，自动回退到 WebAudio。
  A.speak = function (who, text) {
    if (!voiceOn || muted) return false;
    var t = normalizeText(text);
    if (!t) return false;
    var key = md5(speakerOf(who) + '|' + t);

    // 纯笑声句：直接放真实奶蛙笑声
    if (window.LAUGH && window.LAUGH[key]) {
      stopVoice();
      var tk = { file: null, source: null, stopped: false, i: 0 };
      current = tk;
      lastVia = '真实笑声';
      duck(true);
      var le = new Audio('audio/voice/_laugh.mp3');
      le.volume = VOICE_VOL;
      tk.file = le;
      le.addEventListener('ended', function () {
        tk.file = null;
        if (current === tk) { current = null; duck(false); }
      });
      le.addEventListener('error', function () {
        lastErr = '笑声素材播放失败';
        tk.file = null;
        if (current === tk) { current = null; duck(false); }
      });
      var lp = le.play();
      if (lp && lp.catch) lp.catch(function (e) {
        lastErr = '笑声被拒 ' + (e && e.name);
        if (/NotAllowed/i.test(String(e && e.name))) blockHint();
        tk.file = null;
        if (current === tk) { current = null; duck(false); }
      });
      return true;
    }
    // 台词本身就是"哈哈哈"这种纯笑声时，也走真实笑声（别去念那三个字）
    if (LAUGH_TEXT.test(t)) {
      stopVoice();
      lastVia = '真实笑声';
      return A.laugh();
    }

    var man = window.VOICE_MANIFEST;
    if (!man) return false;
    var entry = man[key];
    if (!entry || !entry.files || !entry.files.length) return false;

    stopVoice();
    var token = { file: null, source: null, stopped: false, i: 0, lastErr: '' };
    current = token;
    lastEntry = entry;
    duck(true);

    var files = entry.files;
    var via;

    function finishOk() {
      token.file = null;
      token.source = null;
      if (current === token) current = null;
      duck(false);
    }

    function playNextEl() {
      if (token.stopped) return;
      if (token.i >= files.length) { finishOk(); return; }
      var url = 'audio/voice/' + files[token.i];
      var el = new Audio(url);
      el.volume = VOICE_VOL;
      el.preload = 'auto';
      token.file = el;
      lastVia = 'audio元素';
      el.addEventListener('ended', function () {
        if (token.stopped) return;
        token.i += 1;
        playNextEl();
      });
      el.addEventListener('error', function () {
        if (token.stopped) return;
        token.lastErr = 'audio 元素报错 ' + (el.error ? el.error.code : '?');
        playNextWa(0);          // 回退到 WebAudio 重放整条
      });
      var pr = el.play();
      if (pr && pr.catch) pr.catch(function (e) {
        if (token.stopped) return;
        token.lastErr = 'audio 元素被拒 ' + (e && e.name);
        if (/NotAllowed/i.test(String(e && e.name))) blockHint();
        playNextWa(0);
      });
    }

    function playNextWa(i) {
      if (token.stopped) return;
      if (i >= files.length) { finishOk(); return; }
      var c = ctx();
      if (!c) { finishOk(); return; }
      lastVia = 'WebAudio';
      buf('audio/voice/' + files[i]).then(function (ab) {
        if (token.stopped) return;
        if (!ab) {
          token.lastErr = '音频解码失败 ' + files[i];
          lastErr = token.lastErr;
          finishOk();
          return;
        }
        var src = c.createBufferSource();
        src.buffer = ab;
        src.connect(voiceGain);
        token.source = src;
        token.file = null;
        src.onended = function () { if (!token.stopped) playNextWa(i + 1); };
        try { src.start(); } catch (e) { token.lastErr = 'start 失败 ' + e.message; finishOk(); }
      });
    }

    via = 'audio元素';
    playNextEl();
    return true;
  };

  // 文本 -> 说话人（和后端 build-voice.py 的判定必须一致）
  function speakerOf(who) {
    var w = String(who || '').trim();
    if (!w) return 'nar';
    if (w.indexOf('奶蛙（她）') === 0 || w.indexOf('奶蛙(她)') === 0) return 'her';
    if (w.indexOf('奶蛙') === 0) return 'me';
    return 'other';
  }

  // 文本清洗（对齐 build-voice.py 的 clean()）
  function normalizeText(text) {
    var t = String(text == null ? '' : text).trim();
    if (!t) return '';
    t = t.replace(/（）/g, '').replace(/\(\)/g, '').replace(/　/g, ' ');
    if (/^[—\-─=·。…\s]+$/.test(t)) return '';
    t = t.replace(/——+/g, '，').replace(/—/g, '，');
    t = t.replace(/\s+/g, ' ');
    t = t.replace(/^[，、；：\s]+/, '').replace(/[，、；：\s]+$/, '');
    return t;
  }

  // "整句就是一声笑"的判定 —— 必须和 build-voice.py 的 LAUGH_RE 一致。
  // 像"（别动。别说话。别哦齁齁齁。）"这种带正经内容的句子不能算，
  // 否则那句台词会被笑声整个吃掉。
  var LAUGH_TEXT = /^(?:[（(【\s]*)(?:哦?齁+|哈+|嘿+|噗+|呵+)(?:[）)】\s。！？…，、]*)$/;

  // md5（和 Python 侧 hashlib.md5 输出一致）
  function md5(s) {
    function rl(n, c) { return (n << c) | (n >>> (32 - c)); }
    function au(x, y) { var l = (x & 0xFFFF) + (y & 0xFFFF); return (((x >> 16) + (y >> 16) + (l >> 16)) << 16) | (l & 0xFFFF); }
    function cmn(q, a, b, x, s, t) { return au(rl(au(au(a, q), au(x, t)), s), b); }
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }
    function blk(s) {
      var t = [], i;
      for (i = 0; i < 64; i += 4) t[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
      return t;
    }
    var utf8 = unescape(encodeURIComponent(s));
    var n = ((utf8.length + 8) >> 6) + 1;
    var arr = new Array(n * 16); for (var i = 0; i < arr.length; i++) arr[i] = 0;
    for (i = 0; i < utf8.length; i++) arr[i >> 2] |= utf8.charCodeAt(i) << ((i % 4) * 8);
    arr[utf8.length >> 2] |= 0x80 << ((utf8.length % 4) * 8);
    arr[n * 16 - 2] = utf8.length * 8;
    var a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    for (i = 0; i < arr.length; i += 16) {
      var oa = a, ob = b, oc = c, od = d;
      a = ff(a, b, c, d, arr[i], 7, -680876936); d = ff(d, a, b, c, arr[i + 1], 12, -389564586);
      c = ff(c, d, a, b, arr[i + 2], 17, 606105819); b = ff(b, c, d, a, arr[i + 3], 22, -1044525330);
      a = ff(a, b, c, d, arr[i + 4], 7, -176418897); d = ff(d, a, b, c, arr[i + 5], 12, 1200080426);
      c = ff(c, d, a, b, arr[i + 6], 17, -1473231341); b = ff(b, c, d, a, arr[i + 7], 22, -45705983);
      a = ff(a, b, c, d, arr[i + 8], 7, 1770035416); d = ff(d, a, b, c, arr[i + 9], 12, -1958414417);
      c = ff(c, d, a, b, arr[i + 10], 17, -42063); b = ff(b, c, d, a, arr[i + 11], 22, -1990404162);
      a = ff(a, b, c, d, arr[i + 12], 7, 1804603682); d = ff(d, a, b, c, arr[i + 13], 12, -40341101);
      c = ff(c, d, a, b, arr[i + 14], 17, -1502002290); b = ff(b, c, d, a, arr[i + 15], 22, 1236535329);
      a = gg(a, b, c, d, arr[i + 1], 5, -165796510); d = gg(d, a, b, c, arr[i + 6], 9, -1069501632);
      c = gg(c, d, a, b, arr[i + 11], 14, 643717713); b = gg(b, c, d, a, arr[i], 20, -373897302);
      a = gg(a, b, c, d, arr[i + 5], 5, -701558691); d = gg(d, a, b, c, arr[i + 10], 9, 38016083);
      c = gg(c, d, a, b, arr[i + 15], 14, -660478335); b = gg(b, c, d, a, arr[i + 4], 20, -405537848);
      a = gg(a, b, c, d, arr[i + 9], 5, 568446438); d = gg(d, a, b, c, arr[i + 14], 9, -1019803690);
      c = gg(c, d, a, b, arr[i + 3], 14, -187363961); b = gg(b, c, d, a, arr[i + 8], 20, 1163531501);
      a = gg(a, b, c, d, arr[i + 13], 5, -1444681467); d = gg(d, a, b, c, arr[i + 2], 9, -51403784);
      c = gg(c, d, a, b, arr[i + 7], 14, 1735328473); b = gg(b, c, d, a, arr[i + 12], 20, -1926607734);
      a = hh(a, b, c, d, arr[i + 5], 4, -378558); d = hh(d, a, b, c, arr[i + 8], 11, -2022574463);
      c = hh(c, d, a, b, arr[i + 11], 16, 1839030562); b = hh(b, c, d, a, arr[i + 14], 23, -35309556);
      a = hh(a, b, c, d, arr[i + 1], 4, -1530992060); d = hh(d, a, b, c, arr[i + 4], 11, 1272893353);
      c = hh(c, d, a, b, arr[i + 7], 16, -155497632); b = hh(b, c, d, a, arr[i + 10], 23, -1094730640);
      a = hh(a, b, c, d, arr[i + 13], 4, 681279174); d = hh(d, a, b, c, arr[i], 11, -358537222);
      c = hh(c, d, a, b, arr[i + 3], 16, -722521979); b = hh(b, c, d, a, arr[i + 6], 23, 76029189);
      a = hh(a, b, c, d, arr[i + 9], 4, -640364487); d = hh(d, a, b, c, arr[i + 12], 11, -421815835);
      c = hh(c, d, a, b, arr[i + 15], 16, 530742520); b = hh(b, c, d, a, arr[i + 2], 23, -995338651);
      a = ii(a, b, c, d, arr[i], 6, -198630844); d = ii(d, a, b, c, arr[i + 7], 10, 1126891415);
      c = ii(c, d, a, b, arr[i + 14], 15, -1416354905); b = ii(b, c, d, a, arr[i + 5], 21, -57434055);
      a = ii(a, b, c, d, arr[i + 12], 6, 1700485571); d = ii(d, a, b, c, arr[i + 3], 10, -1894986606);
      c = ii(c, d, a, b, arr[i + 10], 15, -1051523); b = ii(b, c, d, a, arr[i + 1], 21, -2054922799);
      a = ii(a, b, c, d, arr[i + 8], 6, 1873313359); d = ii(d, a, b, c, arr[i + 15], 10, -30611744);
      c = ii(c, d, a, b, arr[i + 6], 15, -1560198380); b = ii(b, c, d, a, arr[i + 13], 21, 1309151649);
      a = ii(a, b, c, d, arr[i + 4], 6, -145523070); d = ii(d, a, b, c, arr[i + 11], 10, -1120210379);
      c = ii(c, d, a, b, arr[i + 2], 15, 718787259); b = ii(b, c, d, a, arr[i + 9], 21, -343485551);
      a = au(a, oa); b = au(b, ob); c = au(c, oc); d = au(d, od);
    }
    function hex(n) { var s = '', j; for (j = 0; j < 4; j++) s += ('0' + ((n >> (j * 8)) & 255).toString(16)).slice(-2); return s; }
    return (hex(a) + hex(b) + hex(c) + hex(d)).slice(0, 16);
  }

  // 音效：直接播一个文件（笑声等）
  A.sfx = function (name, vol) {
    if (muted) return;
    try {
      var el = new Audio('audio/voice/' + name);
      el.volume = vol == null ? 0.85 : vol;
      el.play().catch(function () { });
      return true;
    } catch (e) { return false; }
  };
  // 奶蛙的笑声（真实素材）
  A.laugh = function () { return A.sfx('_laugh.mp3', 0.9); };

  A.toggleMusic = function () {
    musicOn = !musicOn; writePref('music', musicOn);
    if (!musicOn) { if (bgmEl) bgmEl.volume = 0; }
    else if (bgmName) { var n = bgmName; bgmName = null; playBgm(n); }
    return musicOn;
  };
  A.toggleVoice = function () {
    voiceOn = !voiceOn; writePref('voice', voiceOn);
    if (!voiceOn) stopVoice();
    return voiceOn;
  };
  A.musicOn = function () { return musicOn; };
  A.voiceOn = function () { return voiceOn; };
  A.playBgm = playBgm;
  A.stopBgm = stopBgm;
  A.stopVoice = stopVoice;
  A.duck = duck;
  // 给引擎用：进入章节时挑对应的 BGM
  A.chapterBgm = function (no) {
    if (no === 2) playBgm('ch2');
    else if (no === 3) playBgm('ch3');
    else playBgm('ch1');
  };
  A.unlock = function () {
    var c = ctx();
    if (c && c.state === 'suspended') c.resume().catch(function () { blocked++; });
    if (bgmName && (!bgmEl || bgmEl.paused)) {
      var n = bgmName; bgmName = null; playBgm(n);
    }
  };

  window.AUDIO = A;
})();
