// chapter3.js —— 第三章《爱情╯侦探》
// 一间屋子，三条线索，一个密码。玩家要在客厅 / 卧室 / 阳台之间来回跑，
// 把三个数字凑齐，用密码锁打开茶几上的盒子。
// 两条结局：结案（查到底） / 感谢游玩（在盒子前选择不看）。
(function () {
  'use strict';
  var K = window.KIT;
  var scenes = {};
  var CODE = '314';

  function clueCount() {
    var f = K.F, n = 0;
    if (f.clue1) n++;
    if (f.clue2) n++;
    if (f.clue3) n++;
    return n;
  }

  function gotClue(which, num, line) {
    var f = K.F;
    f['clue' + which] = num;
    K.E.toast('线索 ' + clueCount() + '/3　记下：' + num);
    K.face('me', 'shock', 0);
    if (clueCount() === 3) {
      setTimeout(function () {
        K.say([
          K.nar('三张纸条，三个数字。你按顺序把它们排在茶几上。'),
          K.b('奶蛙', '（' + f.clue1 + '　' + f.clue2 + '　' + f.clue3 + '）'),
          K.b('奶蛙', '（……等一下。这个数字我见过。）'),
          { who: '', style: 'nar', text: '（茶几上那个盒子，一直在等你。）', then: function () { K.draw(scenes.living); } }
        ]);
      }, 500);
    }
    return line;
  }

  // ============ 场景1：客厅 ============
  scenes.living = {
    id: 'living', title: '第三章 · 客厅', theme: 'room',
    props: [
      { kind: 'window', x: 260, y: 200, scale: 1.15 },
      { kind: 'door', x: 150, y: 430, scale: 1.15, color: '#C9A87C' },
      { kind: 'sofa', x: 980, y: 540, scale: 1.0 },
      { kind: 'fridge', x: 640, y: 560, scale: 0.92 },
      { kind: 'table', x: 640, y: 668, scale: 0.72, color: '#B98F63' },
      { kind: 'safe', x: 640, y: 620, scale: 0.85 },
      { kind: 'box', x: 250, y: 660, scale: 0.8 },
      { kind: 'coat', x: 980, y: 520, scale: 0.85 },
      { kind: 'lamp', x: 1160, y: 640, scale: 0.85 }
    ],
    chars: [
      { id: 'me', x: 350, y: 700, scale: 1.02, action: 'idle' }
    ],
    enter: function () {
      K.F._scene = 'living';
      K.E.toast('茶几上有个盒子，但你还不知道密码');
      return [
        K.nar('屋子不大。冰箱在中间，沙发靠窗，茶几上摆着一个铁盒子。'),
        K.b('奶蛙', '（她走了三天。钥匙留给我，让我来"收拾一下"。）'),
        K.b('奶蛙', '（收拾什么？她又没说。所以只能挨个翻。）'),
        K.nar('—— 盒子上是个密码锁，三位数。屋子里应该有三条线索。')
      ];
    },
    hotspots: [
      // 线索1：冰箱里盘子背面的便利贴
      {
        id: 'fridge', x: 640, y: 470, r: 100, fx: 'shine',
        if: function (f) { return !f.clue1; },
        beats: function () {
          return [
            K.nar('你拉开冰箱。里面几乎是空的——只有一只盘子，倒扣着。'),
            K.b('奶蛙', '（盘子底下有张便利贴。字是她的。）'),
            K.nar('"584"。后面画了一只很小的奶蛙。'),
            { who: '', style: 'nar', text: '（她把数字写得很轻，像是怕被人看见。）', then: function () { gotClue(1, '584'); } }
          ];
        }
      },
      {
        id: 'fridgeAgain', x: 640, y: 470, r: 100,
        if: function (f) { return !!f.clue1; },
        beats: [
          K.b('奶蛙', '（冰箱里再没有别的了。只有那只盘子。）'),
          K.b('奶蛙', '（她连一只盘子都要倒扣着放。）')
        ]
      },
      // 密码盒
      {
        id: 'safe', x: 640, y: 648, r: 95, fx: 'shine',
        beats: function () {
          if (clueCount() < 3) {
            return [
              K.nar('铁盒子。三位密码锁，锈了一点。'),
              K.b('奶蛙', '（还差 ' + (3 - clueCount()) + ' 条线索。别乱试，这锁试错会卡住。）')
            ];
          }
          setTimeout(function () {
            K.E.minigameCode({
              title: '铁盒子 · 三位密码',
              hint: '按线索的先后顺序输',
              code: CODE,
              onWrong: function () { K.E.toast('咔。不对。'); },
              onOpen: function () { openBox(); }
            });
          }, 300);
          return [K.b('奶蛙', '（线索都齐了。584、201、314——用哪一个？）')];
        }
      },
      // 快递箱
      {
        id: 'parcel', x: 250, y: 660, r: 80,
        beats: [
          K.nar('门口堆着一个没拆的快递，收件人是她，寄件地址是一个你没见过的城市。'),
          K.b('奶蛙', '（日期是上个月。）'),
          K.b('奶蛙', '（……我没拆。不是我的东西。）')
        ]
      },
      // 沙发上的东西
      {
        id: 'sofaThing', x: 980, y: 500, r: 110,
        beats: [
          K.nar('沙发上搭着一件外套，口袋里有张电影票根。'),
          K.b('奶蛙', '（两张连座。日期是我们认识的那天。）'),
          K.b('奶蛙', '（她一个人去看了。买了两个人的位置。）')
        ]
      },
      // 落地灯
      {
        id: 'lamp', x: 1160, y: 640, r: 80,
        beats: [K.b('奶蛙', '（灯还开着。她说最怕回来的时候屋子是黑的。）')]
      },
      // 去卧室
      {
        id: 'toBedroom', x: 150, y: 300, r: 120, fx: 'pop',
        beats: [
          { who: '', style: 'nar', text: '（卧室的门虚掩着。）', then: function () { K.draw(scenes.bedroom); } }
        ]
      }
    ],
    onEmpty: function () { K.E.toast('（别对着空气推理。）'); }
  };

  // ============ 场景2：卧室 ============
  scenes.bedroom = {
    id: 'bedroom', title: '第三章 · 卧室', theme: 'room',
    props: [
      { kind: 'window', x: 300, y: 200, scale: 1.1 },
      { kind: 'door', x: 130, y: 430, scale: 1.15, color: '#C9A87C' },
      { kind: 'bed', x: 880, y: 560, scale: 1.0 },
      { kind: 'drawer', x: 480, y: 590, scale: 1.0 },
      { kind: 'coat', x: 1180, y: 620, scale: 0.95 },
      { kind: 'rug', x: 640, y: 690, scale: 1.5, color: '#C9A6A0' }
    ],
    chars: [
      { id: 'me', x: 250, y: 700, scale: 1.0, action: 'idle2' }
    ],
    enter: function () {
      K.F._scene = 'bedroom';
      return [
        K.nar('卧室。床没叠，被子掀开一角，像有人刚起来又走掉。'),
        K.b('奶蛙', '（床头柜有个上锁的小盒子。）')
      ];
    },
    hotspots: [
      // 线索2：上锁的盒子（用拖拽小游戏开）
      {
        id: 'lockbox', x: 480, y: 560, r: 85, fx: 'shine',
        if: function (f) { return !f.clue2; },
        beats: function () {
          setTimeout(function () {
            K.E.minigameDrag({
              title: '床头柜的盒子',
              hint: '把钥匙拖到锁上',
              from: { x: 200, y: 200, svg: window.ART.prop('tool', {}) },
              to: { x: 980, y: 430, svg: window.ART.prop('safe', {}) },
              onWin: function () {
                K.say([
                  K.nar('钥匙转了两圈。盒子里没有首饰，只有一张对折的纸。'),
                  K.b('奶蛙', '（上面写着"201"。还有一行小字：别告诉奶蛙。）'),
                  { who: '', style: 'nar', text: '（……哪个奶蛙？）', then: function () { gotClue(2, '201'); } }
                ]);
              },
              onFail: function () { K.E.toast('（钥匙没对上锁孔。）'); }
            });
          }, 250);
          return [K.b('奶蛙', '（锁着。钥匙应该在附近。）')];
        }
      },
      {
        id: 'lockboxDone', x: 480, y: 560, r: 85,
        if: function (f) { return !!f.clue2; },
        beats: [
          K.nar('盒子开着，里面空了。'),
          K.b('奶蛙', '（"别告诉奶蛙"。她到底是写给谁的。）')
        ]
      },
      // 床
      {
        id: 'bed', x: 880, y: 520, r: 140,
        beats: [
          K.nar('枕头边有本书，夹着一张登机牌——伦敦，单程。'),
          K.b('奶蛙', '（日期是下周三。）'),
          K.b('奶蛙', '（她没跟我说。三天前她只说"我出去一下"。）')
        ]
      },
      // 衣柜
      {
        id: 'coat', x: 1180, y: 600, r: 90,
        beats: [
          K.nar('衣架上挂着一件大衣，口袋里摸出一张珠宝店的单据。'),
          K.b('奶蛙', '（一枚戒指。取货日期也是下周三。）')
        ]
      },
      // 回客厅
      {
        id: 'toLiving', x: 130, y: 300, r: 120,
        beats: [
          { who: '', style: 'nar', text: '（回客厅。）', then: function () { K.draw(scenes.living); } }
        ]
      },
      // 去阳台
      {
        id: 'toBalcony', x: 640, y: 300, r: 110,
        beats: [
          { who: '', style: 'nar', text: '（阳台的推拉门开着，有风。）', then: function () { K.draw(scenes.balcony); } }
        ]
      }
    ],
    onEmpty: function () { K.E.toast('（再翻翻。）'); }
  };

  // ============ 场景3：阳台 ============
  scenes.balcony = {
    id: 'balcony', title: '第三章 · 阳台', theme: 'street',
    props: [
      { kind: 'view', x: 640, y: 300, scale: 1.0 },
      { kind: 'washer', x: 420, y: 600, scale: 1.0 },
      { kind: 'washer', x: 640, y: 610, scale: 1.0 },
      { kind: 'washer', x: 300, y: 610, scale: 0.9 },
      { kind: 'cat', x: 980, y: 620, scale: 0.9 },
      { kind: 'moneyGrass', x: 210, y: 660, scale: 1.0 }
    ],
    chars: [
      { id: 'me', x: 820, y: 700, scale: 1.0, action: 'idle' }
    ],
    enter: function () {
      K.F._scene = 'balcony';
      return [
        K.nar('阳台上有两台洗衣机，一台洗着她的衣服，一台空的。'),
        K.b('奶蛙', '（她说洗衣机会"吃掉"东西。所以纸条别乱放。）')
      ];
    },
    hotspots: [
      // 线索3：洗衣机里的纸条（找相同小游戏）
      {
        id: 'washer', x: 420, y: 560, r: 95, fx: 'shine',
        if: function (f) { return !f.clue3; },
        beats: function () {
          setTimeout(function () {
            var mk = function (emoji, label) {
              return '<g><text x="0" y="26" text-anchor="middle" font-size="66" font-family="system-ui">' + emoji + '</text>' +
                '<text x="0" y="62" text-anchor="middle" font-size="15" fill="#ffffffcc" font-family="system-ui">' + label + '</text></g>';
            };
            // 三样"她留下的东西"：鞋带、糖纸、纸条 —— 要把三样都挑出来
            K.E.minigameMatch({
              title: '把口袋里的东西全掏出来',
              hint: '点出所有不是衣服的东西',
              need: 4,
              items: [
                { svg: mk('👕', '衣服') }, { svg: mk('📄', '纸条') },
                { svg: mk('👖', '裤子') }, { svg: mk('🍬', '糖纸') },
                { svg: mk('🧦', '袜子') }, { svg: mk('🔑', '钥匙') },
                { svg: mk('🎫', '票根') }, { svg: mk('🧣', '围巾') },
                { svg: mk('💳', '公交卡') }
              ],
              onWin: function () {
                K.say([
                  K.nar('你掏出一把东西：糖纸、钥匙、票根，还有两张湿透的纸条。'),
                  K.b('奶蛙', '（一张上写着"314"。另一张只写了一句话。）'),
                  K.b('奶蛙（她）', '（"如果我先走，你不要找。"）'),
                  { who: '', style: 'nar', text: '（字被水泡开了，后半句看不清。）', then: function () { gotClue(3, '314'); } }
                ]);
              }
            });
          }, 250);
          return [K.b('奶蛙', '（滚筒里好像卡着东西。掏一掏。）')];
        }
      },
      {
        id: 'washerDone', x: 420, y: 560, r: 95,
        if: function (f) { return !!f.clue3; },
        beats: [K.b('奶蛙', '（都掏干净了。）')]
      },
      // 猫
      {
        id: 'cat', x: 980, y: 620, r: 95,
        beats: [
          K.nar('猫趴在她那件没晾完的毛衣上，一动不动。'),
          K.b('奶蛙', '（这猫以前只睡我腿上。现在它选了毛衣。）'),
          K.b('奶蛙', '（它也知道人要走。）')
        ]
      },
      // 窗外
      {
        id: 'view', x: 640, y: 300, r: 140,
        beats: [
          K.nar('窗外是城市。远处有座摩天轮，转得很慢。'),
          K.b('奶蛙', '（第一章那天晚上，我们也是看着摩天轮。）')
        ]
      },
      // 回客厅
      {
        id: 'back', x: 200, y: 300, r: 120,
        beats: [
          { who: '', style: 'nar', text: '（回客厅。）', then: function () { K.draw(scenes.living); } }
        ]
      }
    ],
    onEmpty: function () { K.E.toast('（阳台上风有点大。）'); }
  };

  // ============ 开盒 ============
  function openBox() {
    var f = K.F;
    K.face('me', 'shock', 0);
    K.say([
      K.nar('盒子开了。里面是一沓照片和一张卡。'),
      K.b('奶蛙', '（第一张是我们俩在第一家奶茶店门口。她偷拍的，我闭着眼。）'),
      K.b('奶蛙', '（第二张…是她一个人。手上戴着戒指。）'),
      K.b('奶蛙', '（第三张背面写着日期：下周周三。）'),
      K.nar('卡片上只有一行字："别找我了。"'),
      K.b('奶蛙', '（……所以那三个数字。）'),
      K.b('奶蛙', '（584 = 我把你写进便利贴。201 = 别告诉奶蛙。314 = 圆周率。）'),
      K.b('奶蛙', '（314。永远转下去，永远不闭合。）'),
      { who: '', style: 'nar', text: '（她连密码都在跟你告别。）', then: function () { K.draw(scenes.final); } }
    ]);
  }

  // ============ 场景4：结算 ============
  scenes.final = {
    id: 'final', title: '第三章 · 结案', theme: 'night',
    props: [
      { kind: 'window', x: 640, y: 200, scale: 1.6 },
      { kind: 'wheel', x: 640, y: 258, scale: 0.44 },
      { kind: 'rug', x: 640, y: 665, scale: 1.5, color: '#5A6280' }
    ],
    chars: [
      { id: 'me', x: 470, y: 692, scale: 1.06, action: 'cry', frame: 1 }
    ],
    enter: function () {
      K.F._scene = 'final';
      return [
        K.nar('你把照片收进盒子，扣上。窗外的摩天轮还在转。'),
        K.b('奶蛙', '（我可以当没看见。她说了"别找我了"。）'),
        K.b('奶蛙', '（也可以现在就去机场。）'),
        K.nar('—— 这是最后一个选择。点哪里，就是哪个结局。')
      ];
    },
    hotspots: [
      {
        id: 'goAirport', x: 400, y: 620, r: 130, fx: 'shine',
        beats: [
          K.nar('你抓起钥匙。门锁在你身后响了两次。'),
          K.b('奶蛙', '（下周三的登机牌，我记着呢。）'),
          { who: '', style: 'nar', text: '（你要去问一句"为什么"。）', then: function () { setTimeout(function () { K.E.finish('closed'); }, 400); } }
        ]
      },
      {
        id: 'letGo', x: 880, y: 620, r: 130,
        beats: [
          K.nar('你把盒子放回茶几，摆正，像什么都没发生过。'),
          K.b('奶蛙', '（她是侦探题的答案，不是侦探题。）'),
          K.b('奶蛙', '（我查完了。就这样吧。）'),
          { who: '', style: 'nar', text: '（门外的快递你也没拆。她说过不是你的东西。）', then: function () { setTimeout(function () { K.E.finish('done'); }, 400); } }
        ]
      }
    ],
    onEmpty: function () { K.E.toast('（追出去，还是留下。）'); }
  };

  function judge() {
    return K.F.ending === 'done' ? 'done' : 'closed';
  }

  // ---------------------------------------------------------------- 注册
  K.register({
    id: 'ch3', no: 3,
    title: '爱情╯侦探',
    subtitle: '一间屋子 · 三条线索 · 一个密码',
    style: '房间解谜 · 双结局',
    status: 'playable',
    plannedEndings: [],
    judge: judge,
    endings: [
      {
        id: 'closed', name: '结案', rank: 'TE',
        desc: '你查完了整间屋子，撬开了密码盒，然后抓起钥匙冲去机场。你要一个"为什么"。不管她给不给你——这案子你结了。'
      },
      {
        id: 'done', name: '感谢游玩', rank: '??',
        desc: '你什么都查清楚了，然后把盒子摆正，像什么都没发生。有些答案拿到手的那一刻，就已经过期了。'
      }
    ],
    start: function () {
      window.CHAPTERS.ch3._scenes = scenes;
      K.intro(window.CHAPTERS.ch3,
        ['这一章是纯解谜。',
          '屋子里有<b>三条线索</b>，分别在冰箱、床头柜、洗衣机里。',
          '凑齐三个数字，回客厅开茶几上的<b>密码盒</b>。',
          '注意：线索是有顺序的。'],
        function () { K.draw(scenes.living); });
    }
  });
})();
