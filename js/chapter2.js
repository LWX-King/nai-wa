// chapter2.js —— 第二章《爱情╯距离》
// 异地恋 + 时差八小时。这一章的时间会自己往前走：
// 点场景里的年份物件（手机 / 收音机 / 笔电）就会推进年代，每个年代有各自的细节。
// 结局看三件事：有没有把消息读完、有没有挂过电话、有没有让两边"同步"。
(function () {
  'use strict';
  var K = window.KIT;
  var scenes = {};
  var YEARS = ['2008', '2010', '2012'];

  function F() { return K.F; }
  function setYear(y) { K.F.year = y; }

  // ============ 场景1：站台 ============
  scenes.station = {
    id: 'station', title: '第二章 · 站台', theme: 'street',
    props: [
      { kind: 'frame', x: 250, y: 190, scale: 1.15, color: '#7E8B99' },
      { kind: 'window', x: 1030, y: 205, scale: 1.15 },
      { kind: 'cup', x: 470, y: 566, scale: 0.85, color: '#F7D9B8' },
      { kind: 'box', x: 720, y: 596, scale: 0.9 },
      { kind: 'phone', x: 1030, y: 560, scale: 1.05, color: '#9AA6B2' },
      { kind: 'plush', x: 720, y: 700, scale: 0.65 },
      { kind: 'rug', x: 640, y: 668, scale: 1.5, color: '#A9B4C2' }
    ],
    chars: [
      { id: 'me', x: 300, y: 672, scale: 1.0, action: 'idle' },
      { id: 'her', x: 900, y: 672, scale: 0.98, action: 'wave', frame: 1, look: 'pink', flip: true }
    ],
    enter: function () {
      F()._scene = 'station';
      K.E.toast('提示：先看看她手里和脚边的东西');
      return [
        K.nar('2008 年秋天。城际候车厅，广播在念一个你听不清的地名。'),
        K.nar('她考上了伦敦的学校。八小时时差，飞十一个小时。'),
        K.b('奶蛙（她）', '你别送了，我自己能行。'),
        K.b('奶蛙', '（她说这句话的时候，行李箱轮子还在往我这边滑。）'),
        K.nar('—— 你手里还有一样东西，能塞进她包里。')
      ];
    },
    hotspots: [
      // 礼物：三选一，影响结局
      {
        id: 'gift_tea', x: 470, y: 566, r: 62, fx: 'shine',
        beats: function () {
          F().gift = 'tea';
          return [
            K.nar('你把那杯还温着的奶茶塞进她侧兜。'),
            K.b('奶蛙（她）', '……你连这个都带过来了。'),
            K.b('奶蛙', '（她那边没有三分糖的薄荷奶绿。这个我知道。）'),
            { who: '', style: 'nar', text: '（她把杯子护在怀里，像护一个很轻的证据。）', then: function () { K.draw(scenes.flat); } }
          ];
        }
      },
      {
        id: 'gift_plush', x: 720, y: 596, r: 70,
        beats: function () {
          F().gift = 'plush';
          return [
            K.nar('你把那只掉了半只耳朵的奶蛙玩偶塞进她包侧袋。'),
            K.b('奶蛙（她）', '这不是你小时候那只吗。'),
            K.b('奶蛙', '（是。所以它知道怎么替我陪着你。）'),
            { who: '', style: 'nar', text: '（她笑了一下，又很快把脸转开。）', then: function () { K.draw(scenes.flat); } }
          ];
        }
      },
      {
        id: 'gift_note', x: 1030, y: 205, r: 95,
        beats: function () {
          F().gift = 'note';
          return [
            K.nar('你在窗玻璃上写了个字，然后擦掉——她只看见你抬手的动作。'),
            K.b('奶蛙（她）', '你写了什么？'),
            K.b('奶蛙', '（写了"等你"。三个笔画，擦得比写得快。）'),
            K.b('奶蛙（她）', '……我走了。'),
            { who: '', style: 'nar', text: '（你什么都没给。你只是看着她过闸。）', then: function () { F().gift = 'none'; K.draw(scenes.flat); } }
          ];
        }
      },
      // 别的可点
      {
        id: 'phone', x: 1030, y: 560, r: 70,
        beats: [
          K.b('奶蛙', '（手机里她的备注还是"奶蛙（她）"。我改过三次，都改回来了。）')
        ]
      },
      {
        id: 'board', x: 250, y: 190, r: 90,
        beats: [
          K.nar('列车时刻表上，目的地那一栏是空的——这班车去哪儿，你没敢细看。'),
          K.b('奶蛙', '（反正不是伦敦。）')
        ]
      }
    ],
    onEmpty: function () { K.E.toast('（你只是站着。站台上风很大。）'); }
  };

  // ============ 场景2：两间房（同一时刻） ============
  scenes.flat = {
    id: 'flat', title: '第二章 · 八小时', theme: 'night',
    props: [
      { kind: 'window', x: 300, y: 190, scale: 1.0 },
      { kind: 'lamp', x: 520, y: 620, scale: 0.85 },
      { kind: 'cup', x: 640, y: 566, scale: 0.8, color: '#B8E3D9' },
      { kind: 'frame', x: 980, y: 200, scale: 1.0, color: '#8E8B99' },
      { kind: 'phone', x: 1160, y: 560, scale: 1.1, color: '#7EC8F0' },
      { kind: 'rug', x: 300, y: 666, scale: 1.1, color: '#5A6280' },
      { kind: 'rug', x: 980, y: 666, scale: 1.1, color: '#7A6280' }
    ],
    chars: [
      { id: 'me', x: 250, y: 690, scale: 0.98, action: 'idle' },
      { id: 'her', x: 880, y: 690, scale: 0.96, action: 'lie', look: 'pink', flip: true }
    ],
    enter: function () {
      F()._scene = 'flat';
      setYear('2008');
      F().sync = F().sync || 0;
      K.E.toast('点两边同时存在的东西，把它们对齐');
      return [
        K.nar('同一个时刻。左边是你的晚上八点，右边是她的中午十二点。'),
        K.b('奶蛙', '（我这边刚下班，她那边刚上课。我们之间隔着一个白天。）'),
        K.nar('—— 找到那些"你们各有一份"的东西，点它们。')
      ];
    },
    hotspots: [
      // 三组"同步"：两边各点一次才算一对
      {
        id: 'cupL', x: 640, y: 566, r: 70,
        beats: [
          K.b('奶蛙', '（我桌上有一杯奶茶。）'),
          { who: '', style: 'nar', text: '（她那边的桌上，也有一杯——只是没有奶盖。）', then: function () { F().halfL = true; checkSync(); } }
        ]
      },
      {
        id: 'cupR', x: 1160, y: 560, r: 70,
        beats: [
          K.b('奶蛙（她）', '我这边买不到薄荷味。'),
          K.b('奶蛙', '（那就喝原味。原味也不错。）', function () { F().halfR = true; checkSync(); })
        ]
      },
      {
        id: 'winL', x: 300, y: 190, r: 100,
        beats: [
          K.nar('你窗外有一盏路灯，一直在闪。'),
          { who: '', style: 'nar', text: '（她那边的窗户，正对着泰晤士河的方向。）', then: function () { F().halfL = true; checkSync(); } }
        ]
      },
      {
        id: 'winR', x: 980, y: 200, r: 100,
        beats: [
          K.nar('她窗外是灰的。中午十二点的灰。'),
          { who: '', style: 'nar', text: '（你这边是深蓝的。晚上八点的深蓝。）', then: function () { F().halfR = true; checkSync(); } }
        ]
      },
      {
        id: 'lampL', x: 520, y: 620, r: 80,
        beats: [
          K.b('奶蛙', '（我开灯了。）'),
          { who: '', style: 'nar', text: '（开关的声音，两边几乎同时响。）', then: function () { F().halfL = true; checkSync(); } }
        ]
      },
      {
        id: 'rugR', x: 980, y: 666, r: 90,
        beats: [
          K.b('奶蛙（她）', '我把你送的那只玩偶放在地毯上了。'),
          K.b('奶蛙', '（好。）', function () { F().halfR = true; checkSync(); })
        ]
      }
    ],
    onEmpty: function () { K.E.toast('（两边都看一遍，才叫同步。）'); }
  };

  function checkSync() {
    var f = F();
    if (f.halfL && f.halfR) {
      f.sync = (f.sync || 0) + 1;
      f.halfL = f.halfR = false;
      K.E.toast('同步 +1（' + f.sync + '/3）');
      K.face('her', 'wave', 1);
      if (f.sync >= 3 && !f.syncDone) {
        f.syncDone = true;
        setTimeout(function () {
          K.say([
            K.nar('三个瞬间对齐了。你忽然觉得，八小时其实没那么厚。'),
            K.b('奶蛙', '（我们同时在过同一个日子。只是顺序不一样。）'),
            { who: '', style: 'nar', text: '—— 时间开始往前走。', then: function () { K.draw(scenes.years); } }
          ]);
        }, 500);
      }
    } else {
      K.E.toast('（再找一边，凑成一对）');
    }
  }

  // ============ 场景3：年历（2008 / 2010 / 2012） ============
  scenes.years = {
    id: 'years', title: '第二章 · 年历', theme: 'night',
    props: [
      { kind: 'window', x: 640, y: 190, scale: 1.5 },
      { kind: 'phone', x: 380, y: 560, scale: 1.0, color: '#9AA6B2' },
      { kind: 'book', x: 640, y: 570, scale: 1.1, color: '#B8A98C' },
      { kind: 'cup', x: 900, y: 566, scale: 0.85, color: '#F7D9B8' },
      { kind: 'rug', x: 640, y: 666, scale: 1.4, color: '#4E5670' }
    ],
    chars: [
      { id: 'me', x: 300, y: 690, scale: 1.0, action: 'idle' },
      { id: 'her', x: 980, y: 690, scale: 0.96, action: 'idle2', look: 'pink' }
    ],
    enter: function () {
      F()._scene = 'years';
      F().yearsSeen = F().yearsSeen || {};
      return [
        K.nar('四年时间，像三格胶片。你只需要把它们一格一格点过去。'),
        K.b('奶蛙', '（点我桌上的旧手机、收音机、还有那台笔电。）')
      ];
    },
    hotspots: [
      {
        id: 'y2008', x: 380, y: 560, r: 80, fx: 'shine',
        if: function (f) { return !f.yearsSeen || !f.yearsSeen['2008']; },
        beats: function () {
          return [
            K.nar('【2008】你用的还是那台翻盖机，一条短信一毛钱。'),
            K.b('奶蛙', '（我算过，一个月的短信费够买两张电影票。）'),
            K.b('奶蛙（她）', '（她回信的时间永远是伦敦时间早上七点。）'),
            K.nar('你那边凌晨三点。你把她七点发来的话，读了三遍。'),
            { who: '', style: 'nar', text: '（那年的新闻里，所有人都在说同一件事。你们一个字都没聊。）', then: function () { seen('2008'); } }
          ];
        }
      },
      {
        id: 'y2010', x: 640, y: 570, r: 80, fx: 'shine',
        if: function (f) { return !f.yearsSeen || !f.yearsSeen['2010']; },
        beats: function () {
          return [
            K.nar('【2010】你换了台收音机，每天深夜听一档粤语电台节目。'),
            K.b('奶蛙', '（主持人说：喜欢一个人，就要先学会喜欢自己那台收音机的杂音。）'),
            K.b('奶蛙（她）', '你那边几点？'),
            K.b('奶蛙', '（凌晨两点。我说了一点。）'),
            { who: '', style: 'nar', text: '（她说"那你早点睡"，然后自己那边正好是上午十点。）', then: function () { seen('2010'); } }
          ];
        }
      },
      {
        id: 'y2012', x: 900, y: 566, r: 80, fx: 'shine',
        if: function (f) { return !f.yearsSeen || !f.yearsSeen['2012']; },
        beats: function () {
          return [
            K.nar('【2012】你换了笔电，视频通话里她的房间比记忆中亮。'),
            K.b('奶蛙（她）', '下课了。我这边下雨。'),
            K.b('奶蛙', '（我这边也是。不过你那边是中午。）'),
            K.b('奶蛙（她）', '……你有没有想过，我们其实从没在同一场雨里待过。'),
            { who: '', style: 'nar', text: '（她说这句话的时候，画面卡了一下。）', then: function () { seen('2012'); } }
          ];
        }
      },
      // 一直能点的：时间线本身
      {
        id: 'timeline', x: 640, y: 190, r: 130,
        beats: function () {
          var seenCount = Object.keys(F().yearsSeen || {}).length;
          return [
            K.nar('窗外的天色被你按了三次：深蓝、灰白、又深蓝。'),
            K.b('奶蛙', '（已经翻过 ' + seenCount + ' / 3 格了。）')
          ];
        }
      }
    ],
    onEmpty: function () { K.E.toast('（三个年代，一个一个点。）'); }
  };

  function seen(y) {
    var f = F();
    f.yearsSeen = f.yearsSeen || {};
    f.yearsSeen[y] = true;
    setYear(y);
    var n = Object.keys(f.yearsSeen).length;
    if (n >= 3) {
      f.allYears = true;
      setTimeout(function () {
        K.say([
          K.nar('四年，三格，都点完了。'),
          K.b('奶蛙', '（我知道我们隔着一个白天。我一直知道。）'),
          { who: '', style: 'nar', text: '—— 然后，电话响了。', then: function () { K.draw(scenes.call); } }
        ]);
      }, 500);
    }
  }

  // ============ 场景4：那通电话（不能挂） ============
  scenes.call = {
    id: 'call', title: '第二章 · 通宵电话', theme: 'night',
    props: [
      { kind: 'window', x: 640, y: 170, scale: 1.35 },
      { kind: 'frame', x: 190, y: 190, scale: 0.85, color: '#8E8B99' },
      { kind: 'bulb', x: 640, y: 420, scale: 1.0 },
      { kind: 'phone', x: 300, y: 545, scale: 1.1, color: '#F0A5B8' },
      { kind: 'book', x: 1010, y: 566, scale: 1.0, color: '#8FA8C8' },
      { kind: 'phone', x: 830, y: 640, scale: 0.95, color: '#7EC8F0' },
      { kind: 'cup', x: 430, y: 640, scale: 0.8, color: '#B8E3D9' },
      { kind: 'box', x: 1180, y: 645, scale: 0.7 },
      { kind: 'rug', x: 640, y: 690, scale: 1.5, color: '#3E4660' }
    ],
    chars: [
      { id: 'me', x: 250, y: 700, scale: 1.0, action: 'idle2' },
      { id: 'her', x: 1060, y: 700, scale: 0.96, action: 'cry', frame: 1, look: 'pink', flip: true }
    ],
    enter: function () {
      F()._scene = 'call';
      F().kept = F().kept || 0;
      K.E.toast('千万别挂。两边都要点');
      return [
        K.nar('她打来的时候，你那边凌晨两点，她那边下午六点。'),
        K.b('奶蛙（她）', '……我刚从图书馆出来，手机只剩百分之三。'),
        K.b('奶蛙', '（不能挂。挂了就再也接不上了。）'),
        K.nar('—— 两边各有几样东西，点它们，陪她把这段路走完。'),
        K.b('奶蛙（她）', '你别挂啊。')
      ];
    },
    hotspots: [
      // 挂电话 = 大失误
      {
        id: 'hangup', x: 300, y: 555, r: 70,
        beats: function () {
          K.wrong('挂了电话');
          F().hungUp = true;
          return [
            { who: '', style: 'nar', text: '你按了那个红色的键。', then: function () { K.face('me', 'shock', 0); } },
            K.nar('嘟——屏幕暗下去。你重拨，占线。再拨，还是占线。'),
            K.b('奶蛙', '（我为什么要点它。我为什么要点它。）'),
            K.b('奶蛙（她）', '（三分钟后她发来一条：算了，你睡吧。）')
          ];
        }
      },
      // 陪你走夜路的点（6 个，两边各 3）—— 半径刻意收小，避免互相盖住
      {
        id: 'p1', x: 190, y: 190, r: 72,
        beats: [
          K.b('奶蛙', '（我这边窗外有月亮。）'),
          { who: '', style: 'nar', text: '（她那边天是灰的，但她说她抬头了。）', then: keepGoing }
        ]
      },
      {
        id: 'p2', x: 1010, y: 566, r: 66,
        beats: [
          K.b('奶蛙（她）', '我在看路灯。一排一排的。'),
          { who: '', style: 'nar', text: '（你也数了一遍你那边的路灯。二十七盏。）', then: keepGoing }
        ]
      },
      {
        id: 'p3', x: 640, y: 170, r: 72,
        beats: [
          K.nar('她在电话那头打了一个哈欠，然后立刻说"我不困"。'),
          { who: '', style: 'nar', text: '（你也没拆穿。）', then: keepGoing }
        ]
      },
      {
        id: 'p4', x: 640, y: 420, r: 70,
        beats: [
          K.b('奶蛙（她）', '到楼下了。'),
          K.b('奶蛙', '（好。我看着你上去。）'),
          { who: '', style: 'nar', text: '（其实你什么都看不见。但你确实一直在看。）', then: keepGoing }
        ]
      },
      {
        id: 'p5', x: 430, y: 640, r: 68,
        beats: [
          K.b('奶蛙', '（我这边天快亮了。）'),
          K.b('奶蛙（她）', '那你去睡吧。'),
          K.b('奶蛙', '（不困。真的。）', keepGoing)
        ]
      },
      {
        id: 'p6', x: 830, y: 640, r: 68,
        beats: [
          K.nar('通话时长跳到了 01:47:22。'),
          K.b('奶蛙', '（一个多小时。她手机电量撑住了。）', keepGoing)
        ]
      }
    ],
    onEmpty: function () { K.E.toast('（两边都点点，陪她走完这段路。）'); }
  };

  function keepGoing() {
    var f = F();
    f.kept = (f.kept || 0) + 1;
    if (f.kept === 3) K.face('her', 'wave', 2);
    if (f.kept === 6) {
      K.face('her', 'laugh', 1);
      setTimeout(function () {
        K.say([
          K.nar('她说到了。挂电话前，她说了句很小声的话。'),
          K.b('奶蛙（她）', '……谢谢你没挂。'),
          K.b('奶蛙', '（这句我记了四年。）'),
          { who: '', style: 'nar', text: '—— 2012 年冬。她要回来了。', then: function () { K.draw(scenes.reunion); } }
        ]);
      }, 500);
    } else if (f.kept < 6) {
      K.E.toast('陪她走完（' + f.kept + '/6）');
    }
  }

  // ============ 场景5：重逢 ============
  scenes.reunion = {
    id: 'reunion', title: '第二章 · 重逢', theme: 'street',
    props: [
      { kind: 'frame', x: 250, y: 190, scale: 1.2, color: '#8E9AA6' },
      { kind: 'window', x: 1040, y: 200, scale: 1.2 },
      { kind: 'wheel', x: 640, y: 250, scale: 0.34 },
      { kind: 'box', x: 720, y: 600, scale: 0.95 },
      { kind: 'cup', x: 470, y: 570, scale: 0.85, color: '#B8E3D9' },
      { kind: 'rug', x: 640, y: 668, scale: 1.5, color: '#B8B2A6' }
    ],
    chars: [
      { id: 'me', x: 300, y: 690, scale: 1.02, action: 'idle' },
      { id: 'her', x: 950, y: 690, scale: 1.0, action: 'idle', look: 'pink', flip: true }
    ],
    enter: function () {
      F()._scene = 'reunion';
      return [
        K.nar('2012 年 12 月。出口，人潮。她推着行李出来，比四年前瘦了一点。'),
        K.b('奶蛙（她）', '……你等了多久？'),
        K.b('奶蛙', '（四年。或者，三个小时。看你怎么算。）'),
        K.nar('—— 你手里还有一样东西可以给她。这次别写错。')
      ];
    },
    hotspots: [
      {
        id: 'give_cup', x: 470, y: 570, r: 70, fx: 'shine',
        beats: function () {
          return [
            K.nar('你递过去一杯薄荷奶绿，三分糖，还温着。'),
            K.b('奶蛙（她）', '……你居然还记得。'),
            K.b('奶蛙', '（我一直记得。这是我唯一记得牢的事。）'),
            { who: '', style: 'nar', text: '（她低头喝了一口，眼睛红了。）', then: function () { K.face('her', 'cry', 0); F().finalGift = 'cup'; } }
          ];
        }
      },
      {
        id: 'give_plush', x: 720, y: 600, r: 75,
        beats: function () {
          return [
            K.nar('你把那只掉了半只耳朵的玩偶举起来。'),
            K.b('奶蛙（她）', '它还在？'),
            K.b('奶蛙', '（一直在。它睡我枕头边四年。）'),
            { who: '', style: 'nar', text: '（她笑出了声，那种憋不住的、很难看的笑。）', then: function () { K.face('her', 'laugh', 3); F().finalGift = 'plush'; } }
          ];
        }
      },
      {
        id: 'say_nothing', x: 250, y: 190, r: 95,
        beats: function () {
          K.wrong('什么也没拿');
          return [
            K.nar('你两手空空。'),
            K.b('奶蛙', '（我准备了很多话，一句都没带。）'),
            { who: '', style: 'nar', text: '（她看了看你的手，说：走吧。）', then: function () { F().finalGift = 'none'; } }
          ];
        }
      },
      {
        id: 'end', x: 640, y: 668, r: 150, fx: 'shine',
        beats: [
          { who: '', style: 'nar', text: '（八小时时差，最后是这么算的……）', then: function () { setTimeout(function () { K.E.finish(judge()); }, 400); } }
        ]
      }
    ],
    onEmpty: function () { K.E.toast('（把该给她的给她，再结算。）'); }
  };

  // ============ 结局判定 ============
  // 很近，很远：什么都做了，但错过了那通该接的电话 / 从没在同一场雨里
  function judge() {
    var f = K.F;
    var sync = f.sync || 0;
    var kept = f.kept || 0;
    if (f.hungUp && kept < 6) return 'far_memory';       // 很远，记忆
    if (sync >= 3 && kept >= 6 && !f.hungUp) return 'close_far';   // 很近，很远
    if (kept >= 6 && (f.finalGift === 'cup' || f.finalGift === 'plush')) return 'far_close'; // 很远，很近
    if (f.gift === 'note' || f.finalGift === 'none') return 'far_memory';
    return 'far_close';
  }

  // ---------------------------------------------------------------- 注册
  K.register({
    id: 'ch2', no: 2,
    title: '爱情╯距离',
    subtitle: '异地恋 · 时差八小时',
    style: '年代推进 · 三结局',
    status: 'playable',
    plannedEndings: [],
    judge: judge,
    endings: [
      {
        id: 'close_far', name: '很近，很远', rank: 'TE',
        desc: '你每一步都做对了：同步了三个瞬间，陪她走完了那通电话，重逢时手里有东西。你们在一起了。只是直到最后，你们仍然各自活在自己的八小时里——明明那么近，却又那么远。'
      },
      {
        id: 'far_close', name: '很远，很近', rank: 'HE',
        desc: '你不完美，你错过了一些瞬间。但重逢那天，你把东西递到她面前，她低头笑了一下。距离没有变短，可你们确实同时站在原地。'
      },
      {
        id: 'far_memory', name: '很远，记忆', rank: 'BE',
        desc: '你挂断了那通只剩百分之三电量的电话。后来她发消息说"算了，你睡吧"。往后的每一次，你都在回想那个红色的键。'
      }
    ],
    start: function () {
      window.CHAPTERS.ch2._scenes = scenes;
      window.KIT.intro(window.CHAPTERS.ch2,
        ['这一章的时间会自己往前走。',
          '场景里的<b>旧手机 / 收音机 / 笔电</b>就是年历，点它们翻年代。',
          '她打电话来的时候<b>千万别挂</b>——那是这一章唯一不可逆的事。'],
        function () { K.draw(scenes.station); });
    }
  });
})();
