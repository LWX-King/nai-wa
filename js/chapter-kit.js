// chapter-kit.js —— 三章共用的脚手架
// 把"取引擎、切场景、换表情、记直男值、章节注册"这些重复的事收在一处，
// 各章只写自己的场景与剧本。
(function () {
  'use strict';

  var K = {};
  Object.defineProperty(K, 'E', { get: function () { return window.ENGINE; } });
  Object.defineProperty(K, 'F', { get: function () { return window.ENGINE.flags; } });
  Object.defineProperty(K, 'S', { get: function () { return window.ENGINE.state; } });

  K.say = function (beats) { window.ENGINE.say(beats); };

  // 切场景：先 drawScene 再 say，避免新场景对白被旧队列冲掉
  K.draw = function (scene) {
    window.ENGINE.drawScene(scene);
    if (scene.enter) K.say(scene.enter());
  };

  // 记一次失误（直男值 +1）
  K.wrong = function (msg) {
    window.ENGINE.markWrong(window.ENGINE.flags._scene || 'x', msg);
    window.ENGINE.flags.perfect = false;
  };

  // 当场换表情
  K.face = function (who, action, frame) {
    var el = document.querySelector('#layer-scene .char[data-c="' + who + '"]');
    if (!el) return;
    var c = null, chars = window.ENGINE.state.scene.chars || [];
    for (var i = 0; i < chars.length; i++) if (chars[i].id === who) c = chars[i];
    if (!c) return;
    var html = window.ART.naiwa({
      scale: c.scale || 1, action: action, frame: frame, look: c.look, flip: c.flip, rot: c.rot
    });
    if (html) el.innerHTML = html;
    // 做"笑"的动作时配真实笑声（除非这句台词本身已经是笑声，那就在播笑声了）
    if (window.AUDIO && (action === 'laugh') && (!K.S || !K.S.laughing)) {
      window.AUDIO.laugh();
    }
  };

  // 两个角色一起换
  K.faces = function (list) {
    (list || []).forEach(function (it) { K.face(it[0], it[1], it[2]); });
  };

  // 造一个"对话小节"：只返回 beats，方便拼
  K.b = function (who, text, then, style) {
    var o = { who: who || '', text: text };
    if (style) o.style = style;
    if (then) o.then = then;
    return o;
  };
  K.nar = function (text, then) { return K.b('', text, then, 'nar'); };

  // 标准开场：标题卡 + 规则提示
  K.intro = function (ch, lines, cb) {
    window.ENGINE.showIntro('第 ' + ch.no + ' 章', ch.title, lines, cb);
  };

  // 注册章节
  K.register = function (ch) {
    window.CHAPTERS = window.CHAPTERS || {};
    window.CHAPTERS[ch.id] = ch;
    return ch;
  };

  window.KIT = K;
})();
