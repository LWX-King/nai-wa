// chapter1.js —— 第一章《爱情╯奶茶》（完整可玩）
// 玩法照抄《拣爱》第一章：不是点选项，而是"发现场景里该做的事"。
// 约定：每个 scene.enter() 只返回对白，不切场景；切场景一律用
//      draw(scenes.X) —— 先 drawScene 再 say，避免新场景对白被旧队列冲掉。
(function () {
  'use strict';
  var E, F; // ENGINE / flags

  function say(b) { E.say(b); }
  function draw(scene) { E.drawScene(scene); say(scene.enter()); }
  function wrong(msg) { E.markWrong(F._scene || 'ch1', msg); F.perfect = false; }
  // 让某个角色当场换动作/表情（不改场景，只更新那一格）
  function face(who, action, frame) {
    var el = document.querySelector('#layer-scene .char[data-c="' + who + '"]');
    if (!el) return;
    var c = null, sc = E.state.scene;
    for (var i = 0; i < (sc.chars || []).length; i++) if (sc.chars[i].id === who) c = sc.chars[i];
    if (!c) return;
    var prev = el.innerHTML;
    el.innerHTML = window.ART.naiwa({
      scale: c.scale || 1, action: action, frame: frame, look: c.look, flip: c.flip, rot: c.rot
    });
    if (!el.innerHTML) el.innerHTML = prev;      // 没有这个动作就回滚
  }

  function judgeEnding(flags, gross) {
    if (flags.ending === 'trash') return 'trash';
    if ((flags.owned || 0) >= 2) return 'owned';
    if (gross === 0) return 'good';
    if (gross <= 2) return 'ok';
    return 'simp';
  }

  var scenes = {};

  // ============ 场景1：奶茶店 ============
  scenes.shop = {
    id: 'shop', title: '第一章 · 爱情╯奶茶', theme: 'cafe',
    props: [
      { kind: 'frame', x: 1120, y: 210, scale: 1.0 },
      { kind: 'table', x: 720, y: 470, scale: 0.92, color: '#D9B285' },
      { kind: 'cup', x: 690, y: 452, scale: 0.7, color: '#F7D9B8' },
      { kind: 'cup', x: 762, y: 452, scale: 0.7, color: '#B8E3D9' },
      { kind: 'lamp', x: 250, y: 640, scale: 1.0 },
      { kind: 'moneyGrass', x: 430, y: 655, scale: 1.0 }
    ],
    chars: [
      { id: 'me', x: 400, y: 650, scale: 1.0, action: 'idle' },
      { id: 'her', x: 990, y: 662, scale: 0.96, action: 'idle', look: 'pink' }
    ],
    enter: function () {
      F._scene = 'shop';
      F.perfect = true;
      E.toast('提示：先别急着说话，看看墙上');
      return [
        { who: '', style: 'nar', text: '奶茶店。空气里飘着珍珠的味道，也飘着一股不知道怎么开口的尴尬。' },
        { who: '', style: 'nar', text: '三米之外，坐着那只你刷了三个月朋友圈的奶蛙。' },
        { who: '奶蛙', text: '（我该上去说话吗。直接上去说"你好我是奶蛙"是不是太直了。）' },
        { who: '', text: '—— 这是你唯一一次机会，决定你是"哦齁齁齁的好男人"还是"钢铁直蛙"。' }
      ];
    },
    hotspots: [
      // ① 正确的第一步：看墙上那幅画
      {
        id: 'frame', x: 1120, y: 210, r: 95, fx: 'shine',
        beats: [
          { who: '奶蛙', text: '（墙上挂着一幅画……画的是两只奶蛙在海边大笑。）' },
          { who: '奶蛙', text: '（等等。她手机壳上就是这幅画。她微信头像是这幅画。她朋友圈封面也是这幅画。）' },
          { who: '奶蛙', text: '（她喜欢海。她说过"想去看海"。）' },
          { who: '奶蛙', text: '看画三秒，胜过寒暄三年。', then: function () { F.sawPainting = true; face('her', 'wave', 1); } },
          { who: '', style: 'nar', text: '你走到她桌边，没有说你好，你说：这片海挺像那幅画的。' },
          { who: '奶蛙（她）', text: '……你也喜欢这幅画？' },
          { who: '', style: 'nar', text: '她笑了。' },
          { who: '奶蛙', text: '（成了。哦齁齁齁。）', then: function () { face('me', 'laugh', 2); } },
          { who: '', style: 'nar', text: '—— 你拿到了她的微信。', then: function () { draw(scenes.chat); } }
        ]
      },
      // ② 反面：直接莽上去
      {
        id: 'rush', x: 880, y: 480, r: 110,
        beats: [
          { who: '奶蛙', text: '你、你好！我是奶蛙！我关注你很久了！' },
          { who: '奶蛙（她）', text: '……哦。' },
          { who: '', style: 'nar', text: '她低头继续戳奶茶，戳了整整四十秒。' },
          { who: '奶蛙', text: '（她说"哦"。她只说了一个"哦"。）', then: function () { wrong('上来就莽'); F.rushed = true; face('her', 'shake', 1); } },
          { who: '', style: 'nar', text: '别急，还有机会——去看墙上那幅画。' }
        ]
      },
      // ③ 点自己：内心戏
      {
        id: 'self', x: 420, y: 470, r: 90, repeat: function () { E.toast('（冷静，你是奶蛙，你见过大风大浪。）'); },
        beats: [
          { who: '奶蛙', text: '（深呼吸。你是一只见过世面的奶蛙。）' },
          { who: '奶蛙', text: '（你甚至能在电梯里对陌生奶蛙笑出声。）' },
          { who: '奶蛙', text: '（……那是在电梯里，电梯会开门。这里不会。）' }
        ]
      },
      // ④ 点她那杯奶茶：打听口味（正确路线的一环）
      {
        id: 'cupHer', x: 760, y: 560, r: 70, fx: 'shine',
        beats: [
          { who: '奶蛙', text: '（她桌上那杯是薄荷奶绿。三分糖。她喝了一半就放下了。）' },
          { who: '奶蛙', text: '（记下来。奶蛙的脑子可以装不下原子弹，但必须装得下这个。）', then: function () { F.knowDrink = true; } }
        ]
      },
      // ⑤ 点钱草：本作货币梗
      {
        id: 'grass', x: 320, y: 620, r: 70,
        beats: [
          { who: '奶蛙', text: '（地上长了两株钱草。这就是我的全部家当。）' },
          { who: '奶蛙', text: '（约会一次要花掉一株半。爱是奢侈品，奶茶是刚需。）' }
        ]
      },
      // ⑥ 点自己那杯
      {
        id: 'cupMine', x: 640, y: 560, r: 70,
        beats: [{ who: '奶蛙', text: '（我先点了杯"随便"。这就是问题所在。）' }]
      }
    ],
    onEmpty: function () { E.toast('（点了空气。空气也尴尬。）'); }
  };

  // ============ 场景2：微信朋友圈 ============
  function makePost(id, x, y, emoji, text, flag) {
    return {
      id: id, x: x, y: y, w: 200, h: 180, fx: 'pop',
      beats: [
        { who: '', style: 'nar', text: '【朋友圈】' + emoji + '　' + text },
        { who: '奶蛙', text: '（点赞。评论：哦齁齁齁。完美。）', then: function () { F[flag] = true; F.liked = (F.liked || 0) + 1; } }
      ]
    };
  }

  scenes.chat = {
    id: 'chat', title: '第一章 · 微信', theme: 'night',
    props: [
      { kind: 'rug', x: 1060, y: 650, scale: 1.0, color: '#8FA8C8' },
      { kind: 'cardbg', x: 430, y: 300, emoji: '🌊', text: '海边的风好大' },
      { kind: 'cardbg', x: 690, y: 300, emoji: '🧋', text: '薄荷奶绿三分糖' },
      { kind: 'cardbg', x: 430, y: 530, emoji: '🎬', text: '《猫咪的一生》三刷' },
      { kind: 'cardbg', x: 690, y: 530, emoji: '💤', text: '凌晨三点还没睡' }
    ],
    chars: [{ id: 'me', x: 1070, y: 670, scale: 1.0, action: 'lie', flip: true }],
    enter: function () {
      F._scene = 'chat';
      return [
        { who: '', style: 'nar', text: '当晚。你躺在垫子上，手机屏幕照得你整只奶蛙发黄。' },
        { who: '', style: 'nar', text: '她通过了你的好友申请。' },
        { who: '奶蛙（她）', text: '今天那幅画，我也很喜欢。' },
        { who: '奶蛙', text: '（回什么？回"我也是"？（太短）回"哈哈哈"？（太敷衍））' },
        { who: '', style: 'nar', text: '—— 先别回。她的朋友圈有 4 条动态，你还没看。' }
      ];
    },
    hotspots: [
      makePost('post0', 430, 300, '🌊', '海边的风好大', 'p0'),
      makePost('post1', 690, 300, '🧋', '薄荷奶绿三分糖', 'p1'),
      makePost('post2', 430, 530, '🎬', '《猫咪的一生》三刷', 'p2'),
      makePost('post3', 690, 530, '💤', '凌晨三点还没睡', 'p3'),
      // 错误回复
      {
        id: 'replyLazy', x: 950, y: 250, w: 320, h: 90,
        beats: [
          { who: '奶蛙', text: '哈哈哈', then: function () { wrong('回了个"哈哈哈"'); } },
          { who: '奶蛙（她）', text: '……嗯。' },
          { who: '', style: 'nar', text: '聊天框安静了。安静得像半夜的冰箱。' },
          { who: '奶蛙', text: '（再说点什么。说什么都行，先看她的朋友圈。）' }
        ]
      },
      // 正确回复（需要看全朋友圈）
      {
        id: 'replyGood', x: 950, y: 400, w: 320, h: 90,
        if: function (f) { return f.p0 && f.p1 && f.p2 && f.p3; },
        fx: 'shine',
        beats: function () {
          return [
            { who: '奶蛙', text: '三刷《猫咪的一生》还哭到变形的是你吧。那部片我也哭了，我妈都没认出来我。' },
            { who: '奶蛙（她）', text: '哈哈哈哈哈哈你妈认不出你？' },
            { who: '奶蛙（她）', text: '那你明天有空吗。那家奶茶店，我请你喝薄荷奶绿三分糖。' },
            { who: '奶蛙', text: '（朋 友 圈 是 情 报 库 啊 各 位。）', then: function () { F.invited = true; } },
            { who: '', style: 'nar', text: '—— 明天的约会，成了。', then: function () { draw(scenes.date); } }
          ];
        }
      },
      // 还没看全就想回
      {
        id: 'replyHalf', x: 950, y: 400, w: 320, h: 90,
        if: function (f) { return !(f.p0 && f.p1 && f.p2 && f.p3); },
        beats: [
          { who: '奶蛙', text: '（回什么好呢……）' },
          { who: '', style: 'nar', text: '你什么都想不出来。你连她喜欢什么都不知道。' }
        ]
      }
    ],
    onEmpty: function () { E.toast('（别戳屏幕了，戳她的朋友圈。）'); }
  };

  // ============ 场景3：点单（应援小游戏 + 选奶茶） ============
  scenes.date = {
    id: 'date', title: '第一章 · 点单', theme: 'cafe',
    props: [
      { kind: 'table', x: 990, y: 530, scale: 0.84, color: '#D9B285' },
      { kind: 'cup', x: 962, y: 510, scale: 0.68, color: '#B8E3D9' },
      { kind: 'cup', x: 1026, y: 510, scale: 0.68, color: '#F7D9B8' }
    ],
    chars: [
      { id: 'me', x: 400, y: 665, scale: 1.0, action: 'idle2' },
      { id: 'her', x: 740, y: 672, scale: 0.98, action: 'idle', look: 'pink' }
    ],
    enter: function () {
      F._scene = 'date';
      return [
        { who: '', style: 'nar', text: '第二天，奶茶店。她真的来了。' },
        { who: '奶蛙（她）', text: '你说你请我？那我要考考你，我喝什么。' },
        { who: '奶蛙', text: '（送分题。薄荷奶绿三分糖，我记着呢。）' },
        { who: '', style: 'nar', text: '店员是个嗓门极大的奶蛙，正在给全店应援。你得配合喊单。' },
        { who: '店员', text: '来——跟 我 一 起 喊——！', then: function () { startRhythm(); } }
      ];
    },
    hotspots: []
  };

  function startRhythm() {
    E.minigameRhythm({
      title: '喊单节奏', hint: '亮起来就点，五拍全中', rounds: 5,
      onWin: function () { pickDrink(); },
      onFail: function () {
        wrong('喊单喊废了');
        F.rhythmFailed = true;
        E.toast('喊单失败，全店都看着你');
        say([{ who: '店员', text: '……算了。你要点什么。', then: function () { pickDrink(); } }]);
      }
    });
  }

  function pickDrink() {
    E.say([
      { who: '店员', text: '要哪杯？' },
      { who: '奶蛙', text: '（点她爱喝的。别手抖。）' }
    ]);
    E.state.scene.hotspots = [
      {
        id: 'pickRight', x: 900, y: 540, r: 100, fx: 'shine',
        beats: [
          { who: '奶蛙', text: '薄荷奶绿，三分糖，谢谢。' },
          { who: '奶蛙（她）', text: '……你怎么知道。' },
          { who: '奶蛙', text: '朋友圈第四条。' },
          { who: '奶蛙（她）', text: '你连这个都看。' },
          { who: '', style: 'nar', text: '她的耳朵变成了粉色。奶蛙的耳朵变成粉色，是重大事件。', then: function () { F.drinkRight = true; draw(scenes.movie); } }
        ]
      },
      {
        id: 'pickWrong', x: 1060, y: 540, r: 100,
        beats: [
          { who: '奶蛙', text: '珍珠全糖多加奶盖，两杯！' },
          { who: '奶蛙（她）', text: '（看了一眼你的杯子）……你确定？', then: function () { face('her', 'idle2'); } },
          { who: '奶蛙', text: '（不确定。）', then: function () { wrong('点错奶茶'); draw(scenes.movie); } }
        ]
      }
    ];
    E.toast('选一杯给她');
  }

  // ============ 场景4：电影院 ============
  scenes.movie = {
    id: 'movie', title: '第一章 · 电影', theme: 'night',
    props: [
      { kind: 'frame', x: 380, y: 240, scale: 1.5, color: '#8E8E9B' },
      { kind: 'frame', x: 900, y: 240, scale: 1.5, color: '#F0A5B8' },
      { kind: 'rug', x: 640, y: 660, scale: 1.6, color: '#6E6E86' }
    ],
    chars: [
      { id: 'me', x: 440, y: 655, scale: 1.0, action: 'idle' },
      { id: 'her', x: 870, y: 658, scale: 0.98, action: 'idle', look: 'pink' }
    ],
    enter: function () {
      F._scene = 'movie';
      return [
        { who: '', style: 'nar', text: '影院。两块海报，一部是她三刷过的《猫咪的一生》，一部是《机甲奶蛙 7》。' },
        { who: '奶蛙', text: '（选哪部？这是个陷阱题。）' }
      ];
    },
    hotspots: [
      {
        id: 'cat', x: 420, y: 250, r: 130, fx: 'shine',
        beats: [
          { who: '奶蛙', text: '看《猫咪的一生》吧，我听哭声说很好看。' },
          { who: '奶蛙（她）', text: '……你居然选这个。' },
          { who: '', style: 'nar', text: '电影放到第三十分钟，她哭了。你递纸，她没接，她把头靠过来了。', then: function () { face('her', 'cry', 0); } },
          { who: '奶蛙', text: '（别动。别说话。别哦齁齁齁。）', then: function () { F.movieRight = true; draw(scenes.hotpot); } }
        ]
      },
      {
        id: 'mech', x: 900, y: 250, r: 130,
        beats: [
          { who: '奶蛙', text: '看《机甲奶蛙 7》！开场十分钟炸了六个星球！' },
          { who: '奶蛙（她）', text: '……好。' },
          { who: '', style: 'nar', text: '开场十分钟炸了六个星球。她看了十分钟手机。', then: function () { face('her', 'idle2'); } },
          { who: '奶蛙', text: '（我好像选错了。我确实选错了。）', then: function () { wrong('选错电影'); draw(scenes.hotpot); } }
        ]
      }
    ]
  };

  // ============ 场景5：火锅 ============
  scenes.hotpot = {
    id: 'hotpot', title: '第一章 · 火锅', theme: 'cafe',
    props: [
      { kind: 'table', x: 640, y: 596, scale: 1.05, color: '#C9A87C' },
      { kind: 'pot', x: 640, y: 562, scale: 1.0 },
      { kind: 'cup', x: 920, y: 572, scale: 0.8, color: '#F7D9B8' }
    ],
    chars: [
      { id: 'me', x: 300, y: 705, scale: 1.02, action: 'laugh', frame: 2 },
      { id: 'her', x: 990, y: 705, scale: 1.0, action: 'wave', frame: 1, look: 'pink', flip: true }
    ],
    enter: function () {
      F._scene = 'hotpot';
      return [
        { who: '', style: 'nar', text: '火锅店。她一直在夹菜给你，你一直在夹菜给自己。' },
        { who: '奶蛙（她）', text: '你最近有在健身吗，感觉你……圆了。' },
        { who: '奶蛙', text: '（这是夸我还是损我。这是夸我还是损我。）' },
        { who: '', style: 'nar', text: '她放下筷子看着你。这时候该说的话，不在选项里。' }
      ];
    },
    hotspots: [
      {
        id: 'kiss', x: 700, y: 470, r: 120, fx: 'heart',
        beats: [
          { who: '', style: 'nar', text: '你没说话。你把脸凑过去了。' },
          { who: '', style: 'nar', text: '—— "啪"。她用菜单挡住了你的嘴。', then: function () { face('me', 'shock', 0); face('her', 'laugh', 3); } },
          { who: '奶蛙（她）', text: '在火锅店？你脑子里在想什么？' },
          { who: '奶蛙', text: '（想亲你。）', then: function () { wrong('火锅店想亲'); F.hotpotKiss = true; } },
          { who: '奶蛙（她）', text: '……不过，胆子挺肥嘟嘟的。' },
          { who: '', style: 'nar', text: '她笑了。你活下来了。', then: function () { draw(scenes.fight); } }
        ]
      },
      {
        id: 'wipe', x: 1010, y: 560, r: 90, fx: 'shine',
        beats: [
          { who: '', style: 'nar', text: '你把纸巾递过去，顺手擦掉了她手背上溅到的汤。' },
          { who: '奶蛙（她）', text: '……' },
          { who: '奶蛙（她）', text: '你还挺细心的。' },
          { who: '奶蛙', text: '（什么也没说。什么也没做。就是擦了擦。）', then: function () { F.wipe = true; } },
          { who: '', style: 'nar', text: '这顿饭吃得很安静，但那种安静是舒服的。', then: function () { draw(scenes.fight); } }
        ]
      }
    ]
  };

  // ============ 场景6：家里（吵架 / 收垃圾） ============
  scenes.fight = {
    id: 'fight', title: '第一章 · 家里', theme: 'room',
    props: [
      { kind: 'sofa', x: 970, y: 545, scale: 1.0 },
      { kind: 'rug', x: 620, y: 665, scale: 1.5, color: '#D9A98F' },
      { kind: 'trash', x: 200, y: 645, scale: 1.15 },
      { kind: 'window', x: 300, y: 200, scale: 1.1 },
      { kind: 'cup', x: 700, y: 672, scale: 0.58, color: '#B8E3D9' },
      { kind: 'cup', x: 762, y: 680, scale: 0.58, color: '#F7D9B8' },
      { kind: 'lamp', x: 1140, y: 645, scale: 0.9 }
    ],
    chars: [
      { id: 'me', x: 500, y: 700, scale: 1.0, action: 'shock', frame: 0 },
      { id: 'her', x: 950, y: 692, scale: 1.0, action: 'shock', frame: 1, look: 'pink', flip: true }
    ],
    enter: function () {
      F._scene = 'fight';
      return [
        { who: '', style: 'nar', text: '三个月后。家里。茶几上堆着她喝空的奶茶杯，一共十九个。' },
        { who: '奶蛙（她）', text: '你从来都不扔。你从来都不扔！' },
        { who: '奶蛙（她）', text: '你只会说"我下次扔"。下次是哪次？', then: function () { face('her', 'shock', 1); } },
        { who: '奶蛙', text: '（她现在很生气。这时候说话就完了。）' },
        { who: '', style: 'nar', text: '她还在说。你没有说话。' }
      ];
    },
    hotspots: [
      {
        id: 'talkBack', x: 980, y: 460, r: 120,
        beats: [
          { who: '奶蛙', text: '我这不是忙吗！你也没扔过啊！' },
          { who: '奶蛙（她）', text: '……' },
          { who: '', style: 'nar', text: '她转身进了房间，门关上了。你赢了这场架。你输了这个人。' },
          { who: '奶蛙', text: '（我赢了什么？）', then: function () { wrong('吵架接话'); } },
          { who: '', style: 'nar', text: '（还有机会。做点什么。）' }
        ]
      },
      {
        id: 'clean', x: 300, y: 610, r: 100, fx: 'shine',
        beats: [
          { who: '', style: 'nar', text: '你一句话都没说。你拎起了垃圾袋。' },
          { who: '', style: 'nar', text: '一个，两个，……十九个。' },
          { who: '奶蛙（她）', text: '……' },
          { who: '', style: 'nar', text: '她还在说，声音越来越小，最后停了。' },
          { who: '奶蛙（她）', text: '……你以前怎么不这样。', then: function () { face('her', 'cry', 1); } },
          { who: '奶蛙', text: '（因为以前我以为，吵架赢的人是不用扔垃圾的。）' },
          { who: '', style: 'nar', text: '她笑了。眼睛还是红的。', then: function () { face('her', 'laugh', 1); F.cleaned = true; draw(scenes.confess); } }
        ]
      },
      {
        id: 'leave', x: 200, y: 220, r: 100,
        beats: [
          { who: '', style: 'nar', text: '你打开窗，跳了出去。（你是奶蛙，你做不到这件事。）' },
          { who: '', style: 'nar', text: '你只是站在窗边，看着外面的摩天轮。' },
          { who: '奶蛙', text: '（出去冷静一下？还是留下来收拾？）', then: function () { wrong('想跑'); } },
          { who: '', style: 'nar', text: '（留下来。收垃圾。）' }
        ]
      },
      {
        id: 'cups', x: 700, y: 640, r: 90,
        beats: [
          { who: '', style: 'nar', text: '十九个奶茶杯，十九个"下次一定"。' },
          { who: '奶蛙', text: '（这些杯子能换一株半钱草。）' }
        ]
      },
      // 摆烂线：把杯子收进怀里做收藏
      {
        id: 'collect', x: 130, y: 640, r: 80,
        beats: [
          { who: '', style: 'nar', text: '你没有扔。你把十九个杯子摆成了一个心形。' },
          { who: '', style: 'nar', text: '你拍下来发到朋友圈，配文："我们的纪念。"' },
          { who: '奶蛙（她）', text: '……' },
          { who: '奶蛙（她）', text: '你收藏杯子，我收藏回忆。我们都有光明的未来。' },
          { who: '', style: 'nar', text: '她拿起包走了。门没摔，但你知道那是最后一次。', then: function () { face('me', 'cry', 2); F.ending = 'trash'; E.finish('trash'); } }
        ]
      }
    ],
    onEmpty: function () { E.toast('（站着不动也是一种选择，但不是好选择。）'); }
  };

  // ============ 场景7：结算 ============
  scenes.confess = {
    id: 'confess', title: '第一章 · 结局', theme: 'night',
    props: [
      { kind: 'window', x: 640, y: 208, scale: 1.7 },
      { kind: 'wheel', x: 640, y: 266, scale: 0.46 },
      { kind: 'rug', x: 640, y: 665, scale: 1.6, color: '#8FA8C8' }
    ],
    chars: [
      { id: 'me', x: 470, y: 692, scale: 1.06, action: 'idle' },
      { id: 'her', x: 850, y: 692, scale: 1.0, action: 'idle', look: 'pink' }
    ],
    enter: function () {
      F._scene = 'confess';
      F.owned = (F.rushed ? 1 : 0) + (F.hotpotKiss ? 1 : 0) + (F.rhythmFailed ? 1 : 0);
      return [
        { who: '', style: 'nar', text: '收拾完，两个人靠着窗坐着。窗外有个摩天轮。' },
        { who: '奶蛙（她）', text: '我们在一起吧。' },
        { who: '奶蛙', text: '……好。' },
        { who: '', style: 'nar', text: '（就这么简单？就这么简单。）' },
        { who: '奶蛙（她）', text: '不过我先说一件事。' },
        { who: '奶蛙（她）', text: '我还有一只奶蛙。' },
        { who: '奶蛙', text: '……啊？' },
        { who: '奶蛙（她）', text: '哦齁齁齁。', then: function () { face('her', 'laugh', 4); face('me', 'shock', 0); } },
        { who: '', style: 'nar', text: '—— 全剧终？不一定。结局由你这一路做过的事决定。' }
      ];
    },
    hotspots: [
      {
        id: 'end', x: 640, y: 640, r: 170, fx: 'shine',
        beats: [
          {
            who: '', style: 'nar', text: '（结算中……）', then: function () {
              E.finish(judgeEnding(F, E.state.gross));
            }
          }
        ]
      }
    ],
    onEmpty: function () { E.toast('（点下面那块空地结算。）'); }
  };

  // ---------------------------------------------------------------- 注册
  window.CHAPTERS = window.CHAPTERS || {};
  window.CHAPTERS.ch1 = {
    id: 'ch1', no: 1,
    title: '爱情╯奶茶',
    subtitle: '互动叙事 · 三结局判定',
    style: '抽象搞笑 · 五结局',
    status: 'playable',
    plannedEndings: [],
    // 暴露给自检脚本（js/selfcheck.js）复用，别再抄一份规则
    judge: judgeEnding,
    endings: [
      { id: 'good', name: '绝种好奶蛙', rank: 'HE', desc: '你什么都没说，你什么都做了。她最后说她还有一只奶蛙——但至少，她先跟你在一起了。哦齁齁齁。' },
      { id: 'ok', name: '一般奶蛙', rank: 'BE', desc: '你犯了几次傻，但你还愿意去捡那十九个杯子。人生就是这样，及格万岁。' },
      { id: 'simp', name: '钢铁直蛙', rank: 'BE', desc: '你什么都没发现。你连她喝什么都猜错了。你最后站在窗边，觉得是自己运气不好。' },
      { id: 'trash', name: '奶茶杯收藏家', rank: '??', desc: '十九个杯子你一个都没扔，因为你打算拿它们做装置艺术。她走了，作品留下了。' },
      { id: 'owned', name: '被拣走的奶蛙', rank: '??', desc: '你一路莽撞、抢拍、在火锅店想亲她……她居然还是喜欢你。这是什么，这是玄学。' }
    ],
    start: function () {
      E = window.ENGINE; F = E.flags;
      window.CHAPTERS.ch1._scenes = scenes;
      E.showIntro('第 一 章', '爱情╯奶茶',
        ['这一章的规则：', '选项不重要，<b>你在场景里做了什么</b>才重要。', '点错、抢拍、接话都会累积「直男值」。', '直男值 0 = 最好的结局。'],
        function () { draw(scenes.shop); });
    }
  };
})();
