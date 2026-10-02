// art.js —— 《拣奶》原创手绘 SVG 美术层
// 全部角色/道具由代码画出来，不依赖任何图片素材。
// 奶蛙特征：黄色圆滚身体、青蛙眼(上翻瞳孔)、超宽咧嘴+两颗门牙、两条小短手。
(function (global) {
  'use strict';

  var uid = 0;
  function nid(p) { uid += 1; return p + uid; }

  // ---------- 真奶蛙贴图 ----------
  // 来源：github.com/Maple498/nai-wa-codex-pet 的 spritesheet.webp（CC BY 4.0）
  // 11 组动作由 sprites.js 内联；锚点统一在"脚底中心"。
  var SPR = global.NAIWA_SPRITES || {};
  var BASE_H = 200;      // 归一化高度：贴图会缩放到这个高度

  // 角色配色：给"她"一套粉色，玩家一眼能分清谁是谁
  // 用 SVG 原生滤镜（CSS filter 套在 SVG 元素上不可靠）
  var LOOKS = {
    pink: { hue: 300, sat: 0.72, bright: 1.05 },
    blue: { hue: 165, sat: 0.6, bright: 1.0 },
    gray: { hue: 0, sat: 0.15, bright: 0.96 }
  };
  var lookSeq = 0;

  function pickFrame(action, seed) {
    var arr = SPR[action] || SPR.idle || [];
    if (!arr.length) return null;
    var i = seed == null ? 0 : Math.abs(seed | 0) % arr.length;
    return arr[i];
  }

  // 真奶蛙：opt = {x,y(脚底),scale,action,frame?,look?,flip?,rot?}
  function naiwa(opt) {
    opt = opt || {};
    var f = pickFrame(opt.action || 'idle', opt.frame);
    if (!f) return '';
    var s = (opt.scale == null ? 1 : opt.scale) * (BASE_H / f.h);
    var w = f.w * s, h = f.h * s;
    var x = (opt.x || 0) - w / 2;
    var y = (opt.y || 0) - h;
    var t = 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ')';
    if (opt.rot) t += ' rotate(' + opt.rot + ' ' + (w / 2).toFixed(1) + ' ' + h.toFixed(1) + ')';
    if (opt.flip) t = 'translate(' + (x + w).toFixed(1) + ',' + y.toFixed(1) + ') scale(-1,1)' +
      (opt.rot ? ' rotate(' + opt.rot + ' ' + (w / 2).toFixed(1) + ' ' + h.toFixed(1) + ')' : '');

    var im = '<g transform="' + t + '">' +
      '<image href="' + f.src + '" x="0" y="0" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) +
      '" preserveAspectRatio="none"/></g>';

    var lk = LOOKS[opt.look];
    if (!lk) return '<g class="naiwa">' + im + '</g>';
    // 注：这里必须用 CSS filter（给 SVG <g> 加 CSS 滤镜是有效的），
    // 用 filter="url(#id)" 引 SVG 滤镜在这套嵌套结构里实测不生效。
    var css = 'hue-rotate(' + lk.hue + 'deg) saturate(' + lk.sat + ') brightness(' + lk.bright + ')';
    return '<g class="naiwa" style="filter:' + css + '">' + im + '</g>';
  }

  // ---------- 通用配角（抽象风，纯图形） ----------
  // kind: 'dragon'(奶龙) 'cow'(牛来) 'kangaroo'(肥嘟嘟) 'human'
  function buddy(kind, opt) {
    opt = opt || {};
    var x = opt.x || 0, y = opt.y || 0, s = opt.s == null ? 1 : opt.s;
    var body, extra = '';
    if (kind === 'dragon') { body = '#FFD84D'; }
    else if (kind === 'cow') { body = '#F2A03C'; }
    else if (kind === 'kangaroo') { body = '#FFC94D'; }
    else { body = '#F3C7A5'; }

    var head = '<ellipse cx="0" cy="-62" rx="46" ry="42" fill="' + body + '" stroke="#B4850F" stroke-width="3"/>';
    var torso = '<ellipse cx="0" cy="18" rx="42" ry="52" fill="' + body + '" stroke="#B4850F" stroke-width="3"/>';

    if (kind === 'dragon') {
      extra = '<path d="M-34 -96 q10 -26 26 -8 q-14 6 -26 8Z" fill="#F0B429" stroke="#B4850F" stroke-width="3"/>' +
              '<path d="M34 -96 q-10 -26 -26 -8 q14 6 26 8Z" fill="#F0B429" stroke="#B4850F" stroke-width="3"/>';
    } else if (kind === 'cow') {
      extra = '<ellipse cx="-38" cy="-92" rx="14" ry="10" fill="#8C5A2B"/><ellipse cx="38" cy="-92" rx="14" ry="10" fill="#8C5A2B"/>' +
              '<ellipse cx="0" cy="-30" rx="20" ry="14" fill="#FFE0B2" stroke="#B4850F" stroke-width="2"/>';
    } else if (kind === 'kangaroo') {
      extra = '<ellipse cx="-30" cy="-100" rx="12" ry="22" fill="' + body + '" stroke="#B4850F" stroke-width="3"/>' +
              '<ellipse cx="30" cy="-100" rx="12" ry="22" fill="' + body + '" stroke="#B4850F" stroke-width="3"/>';
    }

    return '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')">' +
      extra + torso + head +
      '<circle cx="-16" cy="-70" r="6" fill="#2B2B2B"/><circle cx="16" cy="-70" r="6" fill="#2B2B2B"/>' +
      '<path d="M-14 -46 q14 12 28 0" stroke="#2B2B2B" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '</g>';
  }

  // ---------- 场景道具（简洁扁平风） ----------
  function prop(kind, opt) {
    opt = opt || {};
    var x = opt.x || 0, y = opt.y || 0, s = opt.s == null ? 1 : opt.s, c = opt.color || '#C9B9A0';
    var g = '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')">';

    var shapes = {
      // 手机
      phone: '<rect x="-34" y="-64" width="68" height="128" rx="12" fill="#2B2B2B"/><rect x="-28" y="-56" width="56" height="112" rx="8" fill="' + (opt.color || '#7EC8F0') + '"/>' +
             '<rect x="-20" y="-44" width="40" height="8" rx="4" fill="#FFFFFF" opacity="0.85"/><rect x="-20" y="-28" width="30" height="8" rx="4" fill="#FFFFFF" opacity="0.7"/>' +
             '<circle cx="-20" cy="30" r="14" fill="#FFFFFF" opacity="0.9"/><path d="M-26 30 l6 -10 l6 10 z" fill="#E2708A"/>',
      // 奶茶杯
      cup: '<path d="M-30 -40 L30 -40 L22 56 L-22 56 Z" fill="#FFF6DC" stroke="#D8C79A" stroke-width="3"/>' +
           '<path d="M-27 -18 L27 -18 L21 54 L-21 54 Z" fill="#C98A5E" opacity="0.9"/>' +
           '<ellipse cx="0" cy="-40" rx="30" ry="9" fill="#F3E4C0" stroke="#D8C79A" stroke-width="3"/>' +
           '<path d="M4 -46 L20 -96" stroke="#E2708A" stroke-width="10" stroke-linecap="round"/>',
      // 垃圾桶
      trash: '<path d="M-28 -34 L28 -34 L22 54 L-22 54 Z" fill="' + c + '" stroke="#8C7B63" stroke-width="3"/>' +
             '<rect x="-36" y="-46" width="72" height="14" rx="5" fill="#A89678" stroke="#8C7B63" stroke-width="3"/>' +
             '<path d="M-10 -50 q10 -14 20 0" stroke="#8C7B63" stroke-width="4" fill="none"/>',
      // 沙发
      sofa: '<rect x="-90" y="-10" width="180" height="70" rx="16" fill="' + c + '" stroke="#8C7B63" stroke-width="3"/>' +
            '<rect x="-96" y="-46" width="192" height="44" rx="14" fill="' + (opt.color2 || '#B7A488') + '" stroke="#8C7B63" stroke-width="3"/>' +
            '<rect x="-104" y="-30" width="24" height="86" rx="10" fill="' + c + '" stroke="#8C7B63" stroke-width="3"/>' +
            '<rect x="80" y="-30" width="24" height="86" rx="10" fill="' + c + '" stroke="#8C7B63" stroke-width="3"/>',
      // 门
      door: '<rect x="-52" y="-120" width="104" height="220" rx="8" fill="' + c + '" stroke="#8C7B63" stroke-width="3"/>' +
            '<rect x="-40" y="-108" width="80" height="90" rx="6" fill="#E8DCC4" stroke="#8C7B63" stroke-width="2"/>' +
            '<circle cx="32" cy="10" r="7" fill="#E5C158" stroke="#8C7B63" stroke-width="2"/>',
      // 窗户
      window: '<rect x="-70" y="-70" width="140" height="140" rx="8" fill="#9FD8F5" stroke="#C0B7A0" stroke-width="8"/>' +
              '<path d="M0 -70 V70 M-70 0 H70" stroke="#C0B7A0" stroke-width="8"/>' +
              '<circle cx="-34" cy="-38" r="16" fill="#FFE9A8" opacity="0.9"/>',
      // 画框（墙上）
      frame: '<rect x="-46" y="-56" width="92" height="112" rx="4" fill="#E8DCC4" stroke="#A08556" stroke-width="8"/>' +
             '<path d="M-32 30 q16 -46 30 -14 q10 20 30 -8 v20 z" fill="#7EC8A0"/><circle cx="18" cy="-24" r="9" fill="#F5C518"/>',
      // 游戏机
      console: '<rect x="-46" y="-16" width="92" height="34" rx="12" fill="#5B5B6B" stroke="#3A3A48" stroke-width="3"/>' +
               '<circle cx="-20" cy="4" r="9" fill="#3A3A48"/><circle cx="20" cy="-2" r="4" fill="#E2708A"/><circle cx="32" cy="-2" r="4" fill="#7EC8A0"/>',
      // 吉他
      guitar: '<ellipse cx="0" cy="20" rx="34" ry="40" fill="#C98A5E" stroke="#8C5A2B" stroke-width="3"/>' +
              '<circle cx="0" cy="16" r="12" fill="#6B4226"/><rect x="-8" y="-100" width="16" height="80" fill="#8C5A2B"/>' +
              '<rect x="-12" y="-112" width="24" height="16" rx="4" fill="#5B3A1E"/>',
      // 耳机
      headset: '<path d="M-34 6 q0 -46 34 -46 q34 0 34 46" stroke="#3A3A48" stroke-width="9" fill="none"/>' +
               '<rect x="-50" y="0" width="22" height="40" rx="9" fill="#5B5B6B"/><rect x="28" y="0" width="22" height="40" rx="9" fill="#5B5B6B"/>',
      // 猫
      cat: '<ellipse cx="0" cy="16" rx="44" ry="30" fill="#8E8E9B"/><circle cx="0" cy="-16" r="30" fill="#8E8E9B"/>' +
           '<path d="M-26 -36 l-6 -26 l24 14 z M26 -36 l6 -26 l-24 14 z" fill="#8E8E9B"/>' +
           '<circle cx="-11" cy="-18" r="5" fill="#2B2B2B"/><circle cx="11" cy="-18" r="5" fill="#2B2B2B"/>' +
           '<path d="M-6 2 q6 6 12 0" stroke="#2B2B2B" stroke-width="3" fill="none"/><path d="M40 16 q26 -6 20 -34" stroke="#8E8E9B" stroke-width="9" fill="none"/>',
      // 票
      ticket: '<path d="M-44 -26 L44 -26 L44 -6 a10 10 0 0 0 0 20 L44 34 L-44 34 L-44 14 a10 10 0 0 0 0 -20 Z" fill="#F0A5B8" stroke="#C97E92" stroke-width="3"/>' +
              '<path d="M-16 -14 h30 M-16 2 h30 M-16 18 h18" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>',
      // 火锅
      pot: '<path d="M-64 -6 L64 -6 L52 62 L-52 62 Z" fill="#B9B9C4" stroke="#8A8A96" stroke-width="3"/>' +
           '<ellipse cx="0" cy="-6" rx="64" ry="18" fill="#D9534F" stroke="#8A8A96" stroke-width="3"/>' +
           '<ellipse cx="-24" cy="-8" rx="14" ry="4" fill="#F5C518"/><ellipse cx="18" cy="-4" rx="16" ry="4" fill="#7EC8A0"/>' +
           '<path d="M-70 -10 L-84 -14 M70 -10 L84 -14" stroke="#8A8A96" stroke-width="10" stroke-linecap="round"/>',
      // 日记/书
      book: '<rect x="-44" y="-30" width="88" height="60" rx="6" fill="' + (opt.color || '#7EC8A0') + '" stroke="#5B8C6E" stroke-width="3"/>' +
            '<rect x="-44" y="-30" width="14" height="60" rx="6" fill="#5B8C6E"/>',
      // 钱草（本作货币，钞票样子的草）
      moneyGrass: '<path d="M0 40 q-4 -34 0 -58" stroke="#5FA05F" stroke-width="6" fill="none"/>' +
                  '<g transform="rotate(-12 0 -30)"><rect x="-22" y="-42" width="44" height="24" rx="4" fill="#B8D98A" stroke="#5FA05F" stroke-width="3"/>' +
                  '<circle cx="0" cy="-30" r="7" fill="#F5C518" stroke="#5FA05F" stroke-width="2"/></g>' +
                  '<path d="M0 40 q-18 -8 -24 -26 q18 0 24 26Z" fill="#6FB56F"/>' +
                  '<path d="M0 40 q18 -8 24 -26 q-18 0 -24 26Z" fill="#6FB56F"/>',
      // 摩天轮
      wheel: '<circle cx="0" cy="-40" r="76" fill="none" stroke="#9B9BAA" stroke-width="6"/>' +
             '<circle cx="0" cy="-40" r="10" fill="#9B9BAA"/>' +
             '<g stroke="#9B9BAA" stroke-width="4">' +
             '<path d="M0 -116 V36 M-76 -40 H76 M-54 -94 L54 14 M54 -94 L-54 14"/></g>' +
             '<path d="M-30 36 L0 100 L30 36" stroke="#9B9BAA" stroke-width="8" fill="none"/>' +
             '<circle cx="0" cy="-116" r="9" fill="#F5C518"/><circle cx="-76" cy="-40" r="9" fill="#E2708A"/>' +
             '<circle cx="76" cy="-40" r="9" fill="#7EC8A0"/><circle cx="0" cy="36" r="9" fill="#7EC8F0"/>',
      // 快递箱
      box: '<path d="M-40 -20 L0 -40 L40 -20 L40 40 L0 60 L-40 40 Z" fill="#D9B98A" stroke="#A8834F" stroke-width="3"/>' +
           '<path d="M-40 -20 L0 0 L40 -20 M0 0 V60" stroke="#A8834F" stroke-width="3" fill="none"/>',
      // 洗衣机
      washer: '<rect x="-56" y="-70" width="112" height="150" rx="12" fill="#EDEDF2" stroke="#B5B5C0" stroke-width="3"/>' +
              '<circle cx="0" cy="14" r="38" fill="#9FD8F5" stroke="#B5B5C0" stroke-width="5"/>' +
              '<circle cx="0" cy="-48" r="8" fill="#B5B5C0"/><circle cx="24" cy="-48" r="8" fill="#B5B5C0"/>',
      // 密码盒
      safe: '<rect x="-60" y="-46" width="120" height="92" rx="10" fill="#6B6B7B" stroke="#43434F" stroke-width="3"/>' +
            '<rect x="-44" y="-30" width="88" height="30" rx="6" fill="#8FE3C0" stroke="#43434F" stroke-width="2"/>' +
            '<circle cx="0" cy="20" r="16" fill="#B9B9C4" stroke="#43434F" stroke-width="3"/>' +
            '<path d="M0 20 L0 6 M0 20 L12 26" stroke="#43434F" stroke-width="4" stroke-linecap="round"/>',
      // 项链
      necklace: '<path d="M-34 -26 q34 46 68 0" stroke="#E5C158" stroke-width="5" fill="none"/>' +
                '<path d="M0 14 l10 14 l-10 14 l-10 -14 z" fill="#7EC8F0" stroke="#E5C158" stroke-width="3"/>',
      // 蛋糕
      cake: '<rect x="-42" y="-8" width="84" height="56" rx="8" fill="#FFE3C0" stroke="#D9A87A" stroke-width="3"/>' +
            '<rect x="-42" y="-24" width="84" height="20" rx="6" fill="#F0A5B8" stroke="#D9A87A" stroke-width="3"/>' +
            '<rect x="-4" y="-52" width="8" height="28" fill="#E5C158"/><ellipse cx="0" cy="-56" rx="6" ry="9" fill="#FF9B4D"/>',
      // 红包
      redpacket: '<rect x="-40" y="-56" width="80" height="112" rx="10" fill="#E24B4B" stroke="#B03636" stroke-width="3"/>' +
                 '<circle cx="0" cy="-4" r="18" fill="#F5C518" stroke="#B03636" stroke-width="3"/>' +
                 '<rect x="-8" y="-24" width="16" height="20" fill="#F5C518"/>',
      // 锅铲/螺丝刀之类的小工具
      tool: '<rect x="-6" y="-60" width="12" height="76" rx="4" fill="#C98A5E"/><rect x="-10" y="16" width="20" height="30" rx="4" fill="#8A8A96"/>',
      // 床
      bed: '<rect x="-170" y="-40" width="340" height="120" rx="14" fill="' + (opt.color || '#C9A6A0') + '" stroke="#9E8079" stroke-width="3"/>' +
           '<rect x="-176" y="-96" width="120" height="64" rx="12" fill="#F3E4D8" stroke="#9E8079" stroke-width="3"/>' +
           '<rect x="-170" y="-64" width="340" height="30" rx="10" fill="#E4D3C6" opacity="0.9"/>',
      // 冰箱
      fridge: '<rect x="-78" y="-220" width="156" height="300" rx="14" fill="#EDF1F4" stroke="#B4BEC6" stroke-width="3"/>' +
              '<path d="M-78 -70 H78" stroke="#B4BEC6" stroke-width="3"/>' +
              '<rect x="52" y="-56" width="10" height="44" rx="5" fill="#B4BEC6"/>' +
              '<rect x="52" y="-190" width="10" height="44" rx="5" fill="#B4BEC6"/>' +
              '<rect x="-50" y="-200" width="60" height="42" rx="4" fill="#F5C51833" stroke="#E0B93A55"/>',
      // 床头柜 + 抽屉
      drawer: '<rect x="-70" y="-90" width="140" height="130" rx="10" fill="' + (opt.color || '#C9A87C') + '" stroke="#9E7F57" stroke-width="3"/>' +
              '<rect x="-58" y="-78" width="116" height="42" rx="6" fill="#B9905F" stroke="#9E7F57" stroke-width="2"/>' +
              '<rect x="-58" y="-26" width="116" height="42" rx="6" fill="#B9905F" stroke="#9E7F57" stroke-width="2"/>' +
              '<circle cx="0" cy="-57" r="5" fill="#E5C158"/><circle cx="0" cy="-5" r="5" fill="#E5C158"/>',
      // 奶蛙玩偶（掉了半只耳朵的那只，第二章的礼物）
      plush: '<ellipse cx="-30" cy="-96" rx="15" ry="13" fill="#E8B93C" stroke="#B4850F" stroke-width="3"/>' +
             '<ellipse cx="30" cy="-96" rx="15" ry="13" fill="#E8B93C" stroke="#B4850F" stroke-width="3"/>' +
             '<ellipse cx="0" cy="-6" rx="56" ry="64" fill="#F5C518" stroke="#B4850F" stroke-width="3"/>' +
             '<ellipse cx="0" cy="14" rx="34" ry="30" fill="#FFF0A8" opacity="0.85"/>' +
             '<circle cx="-19" cy="-40" r="13" fill="#FFFFFF" stroke="#B4850F" stroke-width="2"/>' +
             '<circle cx="19" cy="-40" r="13" fill="#FFFFFF" stroke="#B4850F" stroke-width="2"/>' +
             '<circle cx="-19" cy="-40" r="5" fill="#2B2B2B"/><circle cx="19" cy="-40" r="5" fill="#2B2B2B"/>' +
             '<path d="M-16 -14 q16 14 32 0" stroke="#8C5A2B" stroke-width="3" fill="none" stroke-linecap="round"/>' +
             '<ellipse cx="-52" cy="30" rx="17" ry="12" fill="#E8B93C" stroke="#B4850F" stroke-width="3" transform="rotate(-20 -52 30)"/>' +
             '<ellipse cx="52" cy="30" rx="17" ry="12" fill="#E8B93C" stroke="#B4850F" stroke-width="3" transform="rotate(20 52 30)"/>' +
             '<path d="M18 -104 q14 -10 22 4" stroke="#C0392B" stroke-width="2.5" fill="none"/>',
      // 桌子
      table: '<ellipse cx="0" cy="18" rx="120" ry="20" fill="#00000018"/>' +
             '<rect x="-130" y="-16" width="260" height="20" rx="10" fill="' + (opt.color || '#D9B285') + '" stroke="#B08E63" stroke-width="3"/>' +
             '<rect x="-104" y="2" width="14" height="70" rx="6" fill="#C49C6E"/>' +
             '<rect x="90" y="2" width="14" height="70" rx="6" fill="#C49C6E"/>',
      // 落地灯
      lamp: '<rect x="-5" y="-260" width="10" height="260" fill="#B9A488"/>' +
            '<ellipse cx="0" cy="6" rx="44" ry="12" fill="#B9A488"/>' +
            '<path d="M-56 -262 L0 -318 L56 -262 Z" fill="#F5D08A" stroke="#C9A85F" stroke-width="3"/>' +
            '<ellipse cx="0" cy="-258" rx="30" ry="10" fill="#FFE9A8" opacity="0.85"/>',
      // 地毯
      rug: '<ellipse cx="0" cy="0" rx="200" ry="46" fill="' + (opt.color || '#E3B7A0') + '" opacity="0.75"/>' +
           '<ellipse cx="0" cy="0" rx="150" ry="32" fill="none" stroke="#ffffff55" stroke-width="5"/>',
      // 挂钩/衣帽架（极简）
      coat: '<rect x="-4" y="-190" width="8" height="190" fill="#B9A488"/>' +
            '<path d="M-40 -190 h80" stroke="#B9A488" stroke-width="8" stroke-linecap="round"/>' +
            '<path d="M-40 -186 q-14 30 8 40" stroke="#9BB7C9" stroke-width="12" fill="none" stroke-linecap="round"/>',
      // 窗外景色（阳台用）
      view: '<rect x="-620" y="-300" width="1240" height="420" fill="#8FA8C8"/>' +
            '<rect x="-620" y="-300" width="1240" height="180" fill="#5F7BA8"/>' +
            '<circle cx="-380" cy="-180" r="34" fill="#FFE9A8"/>' +
            '<circle cx="120" cy="-140" r="22" fill="#FFE9A8" opacity="0.7"/>' +
            '<rect x="-620" y="60" width="1240" height="60" fill="#4E5A70"/>' +
            '<g fill="#3E4A5E">' +
            '<rect x="-520" y="-40" width="70" height="220"/><rect x="-420" y="-90" width="56" height="270"/>' +
            '<rect x="-330" y="-20" width="90" height="200"/><rect x="-200" y="-110" width="64" height="290"/>' +
            '<rect x="-100" y="-50" width="80" height="230"/><rect x="20" y="-130" width="70" height="310"/>' +
            '<rect x="130" y="-60" width="96" height="240"/><rect x="270" y="-100" width="60" height="280"/>' +
            '<rect x="370" y="-30" width="88" height="210"/><rect x="490" y="-80" width="66" height="260"/>' +
            '</g>' +
            '<g fill="#FFE9A8" opacity="0.75">' +
            '<rect x="-500" y="-10" width="10" height="10"/><rect x="-470" y="40" width="10" height="10"/>' +
            '<rect x="-400" y="-60" width="10" height="10"/><rect x="-360" y="20" width="10" height="10"/>' +
            '<rect x="-310" y="60" width="10" height="10"/><rect x="-180" y="-80" width="10" height="10"/>' +
            '<rect x="-140" y="10" width="10" height="10"/><rect x="-80" y="70" width="10" height="10"/>' +
            '<rect x="40" y="-100" width="10" height="10"/><rect x="80" y="30" width="10" height="10"/>' +
            '<rect x="150" y="-30" width="10" height="10"/><rect x="200" y="60" width="10" height="10"/>' +
            '<rect x="290" y="-70" width="10" height="10"/><rect x="330" y="40" width="10" height="10"/>' +
            '<rect x="390" y="0" width="10" height="10"/><rect x="510" y="-50" width="10" height="10"/>' +
            '</g>',
      // 灯泡
      bulb: '<circle cx="0" cy="-14" r="30" fill="#FFE9A8" stroke="#D9B85A" stroke-width="3"/>' +
            '<rect x="-12" y="14" width="24" height="20" rx="4" fill="#B5B5C0"/>' +
            '<path d="M-14 -18 q14 -16 28 0" stroke="#D9B85A" stroke-width="3" fill="none"/>',
      // 卡片底（给"朋友圈"之类的面板当背景）
      cardbg: '<rect x="-100" y="-88" width="200" height="176" rx="16" fill="' + (opt.color || '#FFFFFF') + '" opacity="' + (opt.opacity == null ? 0.92 : opt.opacity) + '" stroke="#00000022" stroke-width="2"/>' +
              '<circle cx="-72" cy="-60" r="14" fill="#F5C518"/><rect x="-50" y="-70" width="66" height="9" rx="4" fill="#00000033"/>' +
              '<rect x="-50" y="-54" width="44" height="7" rx="3" fill="#00000022"/>' +
              '<rect x="-78" y="-24" width="156" height="8" rx="4" fill="#00000026"/>' +
              '<rect x="-78" y="-4" width="120" height="8" rx="4" fill="#0000001f"/>' +
              '<rect x="-78" y="16" width="140" height="8" rx="4" fill="#0000001f"/>' +
              '<rect x="-78" y="48" width="52" height="20" rx="10" fill="#E2708A33"/>' +
              '<text x="0" y="-46" text-anchor="middle" font-size="34" font-family="system-ui,sans-serif">' + (opt.emoji || '') + '</text>' +
              '<text x="-78" y="40" font-size="15" fill="#3A3A48" font-family="system-ui,sans-serif">' + (opt.text || '') + '</text>',
    };
    return g + (shapes[kind] || '<rect x="-30" y="-30" width="60" height="60" rx="8" fill="' + c + '"/>') + '</g>';
  }

  // ---------- 场景背景骨架（暖调平涂，参考《拣爱》的柔和配色） ----------
  var SKY = {
    room: { wall: '#F7E9D6', wall2: '#EEDCC4', floor: '#E2C9A3', strip: '#D8BC93' },
    night: { wall: '#2B3350', wall2: '#232A44', floor: '#1E2033', strip: '#171A2B' },
    street: { wall: '#CFE9F5', wall2: '#BEDFF0', floor: '#C9C6C0', strip: '#B7B4AE' },
    cafe: { wall: '#F7E6CC', wall2: '#F0DABC', floor: '#DCBB8C', strip: '#CFAA78' },
    void: { wall: '#101018', wall2: '#0C0C13', floor: '#161620', strip: '#0E0E16' }
  };

  function background(theme) {
    var t = SKY[theme] || SKY.room;
    return '' +
      '<defs>' +
      '<linearGradient id="wallG" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + t.wall + '"/><stop offset="100%" stop-color="' + t.wall2 + '"/>' +
      '</linearGradient>' +
      '<linearGradient id="floorG" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + t.floor + '"/><stop offset="100%" stop-color="' + t.strip + '"/>' +
      '</linearGradient>' +
      '<radialGradient id="vig" cx="50%" cy="42%" r="72%">' +
      '<stop offset="60%" stop-color="#00000000"/><stop offset="100%" stop-color="#00000038"/>' +
      '</radialGradient>' +
      '</defs>' +
      '<rect x="0" y="0" width="1280" height="560" fill="url(#wallG)"/>' +
      '<rect x="0" y="560" width="1280" height="160" fill="url(#floorG)"/>' +
      '<path d="M0 560 H1280" stroke="#0000001f" stroke-width="5"/>' +
      '<path d="M0 566 H1280" stroke="#ffffff30" stroke-width="3"/>' +
      '<ellipse cx="640" cy="566" rx="620" ry="150" fill="#ffffff14"/>' +
      '<rect x="0" y="0" width="1280" height="720" fill="url(#vig)"/>';
  }

  // ---------- 结局印章 ----------
  function stamp(text, opt) {
    opt = opt || {};
    var col = opt.color || '#E24B4B';
    return '<g transform="translate(' + (opt.x || 0) + ',' + (opt.y || 0) + ') rotate(-14)">' +
      '<rect x="-110" y="-34" width="220" height="68" rx="12" fill="none" stroke="' + col + '" stroke-width="6"/>' +
      '<text x="0" y="12" text-anchor="middle" font-size="34" font-weight="700" fill="' + col + '" font-family="system-ui,sans-serif">' + text + '</text>' +
      '</g>';
  }

  global.ART = {
    naiwa: naiwa, buddy: buddy, prop: prop,
    background: background, stamp: stamp, SKY: SKY,
    SPR: SPR, BASE_H: BASE_H
  };
})(window);
