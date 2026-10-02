// selfcheck.js —— 把引擎最容易被改坏的两块逻辑拎出来跑断言：
//   1) 对白队列 + then 回调的推进（这里以前出过"then 重复触发把对白冲掉"的 bug）
//   2) 第一章结局判定
// 用法：node js/selfcheck.js   （纯逻辑，不需要浏览器）
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}

// ---------- 1. 结局判定（直接调用 chapter1.js 暴露的 judge） ----------
const ch1 = fs.readFileSync(path.join(__dirname, 'chapter1.js'), 'utf8');
const ch2 = fs.readFileSync(path.join(__dirname, 'chapter2.js'), 'utf8');
const ch3 = fs.readFileSync(path.join(__dirname, 'chapter3.js'), 'utf8');
const sandbox = {
  window: { CHAPTERS: {}, KIT: null }, console, setTimeout, clearTimeout, queueMicrotask,
  document: { querySelector: function () { return null; } }
};
vm.createContext(sandbox);
vm.runInContext(ch1, sandbox);
vm.runInContext('window.KIT=null;', sandbox);
sandbox.window.KIT = {
  E: null, S: {},
  // 真实引擎里 KIT.F 是 window.ENGINE.flags 的 getter；
  // 测试里用同一个对象反复改内容，别整个换掉（换了就不是同一个引用了）
  F: {},
  say: function () { }, draw: function () { }, wrong: function () { }, face: function () { },
  faces: function () { }, intro: function () { }, register: function (c) { sandbox.window.CHAPTERS[c.id] = c; return c; },
  b: function (w, t, then, st) { var o = { who: w, text: t }; if (then) o.then = then; return o; },
  nar: function (t, then) { return { who: '', text: t, style: 'nar', then: then }; }
};
function setFlags(o) {
  var f = sandbox.window.KIT.F;
  Object.keys(f).forEach(function (k) { delete f[k]; });
  Object.keys(o || {}).forEach(function (k) { f[k] = o[k]; });
  return f;
}
vm.runInContext(ch2, sandbox);
vm.runInContext(ch3, sandbox);

const c1 = sandbox.window.CHAPTERS.ch1;
const c2 = sandbox.window.CHAPTERS.ch2;
const c3 = sandbox.window.CHAPTERS.ch3;
ok('三章都已注册', !!c1 && !!c2 && !!c3);
ok('第一章 5 结局', c1.endings.length === 5, c1.endings.length);
ok('第二章 3 结局', c2.endings.length === 3, c2.endings.length);
ok('第三章 2 结局', c3.endings.length === 2, c3.endings.length);
ok('三章都暴露 judge', [c1, c2, c3].every(function (c) { return typeof c.judge === 'function'; }));
ok('三章都是可玩状态', [c1, c2, c3].every(function (c) { return c.status === 'playable'; }));
ok('结局 id 全局唯一', (function () {
  var all = [].concat(c1.endings, c2.endings, c3.endings).map(function (e) { return e.id; });
  return new Set(all).size === all.length;
})());

// 第一章判定
const judge = c1.judge;
ok('完美线 → good', judge({}, 0) === 'good', judge({}, 0));
ok('失误 1 次 → ok', judge({}, 1) === 'ok', judge({}, 1));
ok('失误 2 次 → ok', judge({}, 2) === 'ok', judge({}, 2));
ok('失误 5 次 → simp', judge({}, 5) === 'simp', judge({}, 5));
ok('收藏杯子 → trash', judge({ ending: 'trash' }, 0) === 'trash', judge({ ending: 'trash' }, 0));
ok('一路莽但被拣走 → owned', judge({ owned: 2 }, 6) === 'owned', judge({ owned: 2 }, 6));
ok('owned 优先于 simp', judge({ owned: 3 }, 99) === 'owned');

// 第二章判定
const j2 = c2.judge;
ok('同步3+陪完+没挂 → 很近，很远', j2.call(null, setFlags({ sync: 3, kept: 6, hungUp: false }), 0) === 'close_far',
  j2.call(null, setFlags({ sync: 3, kept: 6, hungUp: false }), 0));
ok('挂断电话 → 很远，记忆', j2.call(null, setFlags({ hungUp: true, kept: 2 }), 0) === 'far_memory',
  j2.call(null, setFlags({ hungUp: true, kept: 2 }), 0));
ok('陪完但没同步 → 很远，很近', j2.call(null, setFlags({ sync: 1, kept: 6, finalGift: 'cup' }), 0) === 'far_close',
  j2.call(null, setFlags({ sync: 1, kept: 6, finalGift: 'cup' }), 0));

// 第三章判定
const j3 = c3.judge;
ok('默认 → 结案', j3.call(null, setFlags({}), 0) === 'closed', j3.call(null, setFlags({}), 0));
ok('选择放手 → 感谢游玩', j3.call(null, setFlags({ ending: 'done' }), 0) === 'done',
  j3.call(null, setFlags({ ending: 'done' }), 0));

// ---------- 2. 对白队列推进（把 engine.js 的 say/next 逻辑最小复刻） ----------
// 这里复刻的是 engine.js 的推进协议：then 靠 microtask 触发、且只能触发一次
function makeQueue() {
  const q = { beats: [], batch: 0, busy: false, shown: [], fired: 0 };
  function next() {
    const my = q.batch;
    const b = q.beats.shift();
    if (!b) { q.busy = false; return; }
    q.busy = true;
    q.shown.push(b.text);
    if (typeof b.then === 'function' && !b._fired) {
      b._fired = true;
      queueMicrotask(() => {
        if (q.batch !== my) return;
        q.fired++;
        b.then();
      });
    }
  }
  q.say = (beats) => { q.batch++; q.beats = (beats || []).slice(); next(); };
  q.advance = () => next();
  return q;
}

const calls = [];
const q = makeQueue();
q.say([
  { text: 'A1' },
  { text: 'A2', then: () => { calls.push('A2'); q.say([{ text: 'B1' }, { text: 'B2', then: () => calls.push('B2') }]); } }
]);
q.advance();               // 显示 A2，排入 then
q.advance();               // 同一拍被重复推进（模拟"点击 + 定时器"同时触发）
q.advance();
setTimeout(() => {
  ok('then 只触发一次', calls.filter(c => c === 'A2').length === 1, JSON.stringify(calls));
  ok('新一批对白没有被冲掉', q.shown.includes('B1'), JSON.stringify(q.shown));
  q.advance();
  setTimeout(() => {
    ok('嵌套 then 也能触发', calls.includes('B2'), JSON.stringify(calls));
    ok('对白顺序正确', q.shown.join('>') === 'A1>A2>B1>B2', q.shown.join('>'));
    console.log('\n' + (fail === 0 ? '全部通过' : fail + ' 项失败') + '（' + pass + ' 通过 / ' + fail + ' 失败）');
    process.exit(fail === 0 ? 0 : 1);
  }, 10);
}, 10);
