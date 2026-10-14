/**
 * 工具：从 index.html 生成酒馆助手脚本版
 *
 *   node 工具-构建脚本版.js
 *
 * 产物：TOY-LINK_装置模拟器.js
 *   - 酒馆助手脚本，粘贴进脚本库（全局 / 预设 / 角色卡均可）即用
 *   - 界面用 Shadow DOM 注入酒馆页面，与酒馆自身样式完全隔离
 *   - 右下角悬浮球开合，同时注册脚本按钮「TOY·LINK 控制器」
 *
 * index.html 是界面唯一真源，改完界面重跑本脚本即可。
 *
 * ── 两个必须处理的酒馆助手环境特性（改本文件前先读） ──
 * 1. 脚本运行在 iframe 里（官方 README：用 iframe 隔离执行外部脚本）。
 *    因此 `document` 是那个隐藏 iframe 的 document，
 *    `document.body.appendChild(...)` 出来的东西没人看得见。
 *    必须挂到酒馆页面本体：优先用酒馆页面 jQuery 的 `$('body')`
 *    （官方模板推荐写法），其次同源的 `window.parent.document`。
 * 2. 脚本按钮的点击事件通道是 `eventOn(getButtonEvent(名称), fn)`，
 *    不是 `eventOnButton`（那条是脚本设置里的「按键绑定」）。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const SRC = path.join(DIR, 'index.html');
const OUT = path.join(DIR, 'TOY-LINK_装置模拟器.js');   // 本地用：固定名，方便直接打开

const src = fs.readFileSync(SRC, 'utf8');

const verM = src.match(/var VERSION = '([^']+)'/);
const VERSION = verM ? verM[1] : '0.0.0';
if (!verM) console.warn('警告：index.html 里没找到 VERSION，版本号回落为 ' + VERSION);

// 发版用的路径 —— 依赖 VERSION，必须放在它后面
const DIST = path.join(DIR, 'dist');
const OUT_VERSIONED = path.join(DIST, 'TOY-LINK-' + VERSION + '.js');
const POINTER_FILE = path.join(DIR, 'version.txt');

/* ---------- 抽取 style ---------- */
const styleM = src.match(/<style>([\s\S]*?)<\/style>/);
if (!styleM) throw new Error('未找到 <style> 区块');
const css = styleM[1];

/* ---------- 抽取 shell ---------- */
const shellStart = src.indexOf('<div id="shell">');
const scriptAt = src.indexOf('<script>', shellStart);
if (shellStart < 0 || scriptAt < 0) throw new Error('未找到 shell 区块');
let shell = src.slice(shellStart, scriptAt).trim();
if (!/<\/div>\s*$/.test(shell)) throw new Error('shell 区块结尾异常');

/* ---------- 抽取主脚本 ---------- */
let js = src.slice(scriptAt + '<script>'.length, src.lastIndexOf('</script>')).trim();
if (js.indexOf('</script>') !== -1) throw new Error('脚本内含 </script>，需要转义');

/* ---------- 作用域与页面改写 ---------- */
const RULES = [
  // shadow root 内的查询
  ['document.querySelectorAll(', 'ROOT.querySelectorAll('],
  ['document.querySelector(', 'ROOT.querySelector('],
  // 事件：脚本 iframe 收不到酒馆页面的 resize / touch，双绑
  ['window.addEventListener(', 'ONWIN('],
  ['window.removeEventListener(', 'OFFWIN('],
  ['document.addEventListener(', 'ONDOC('],
  // 挂载临时节点
  ['document.body.appendChild(ta);', 'MOUNT(ta);'],
  // 装置状态交给外层悬浮球读（主脚本自己包在闭包里，外面看不见 S）
  ['  var S = {', '  var S = TK_S = {'],   // index.html 里只有这一处
  // 振动与音频走酒馆页面，绕开 iframe 的权限策略
  ["('vibrate' in navigator)", "('vibrate' in NAV)"],
  ['navigator.vibrate(', 'NAV.vibrate('],
  ['window.AudioContext || window.webkitAudioContext', 'WIN.AudioContext || WIN.webkitAudioContext']
];

RULES.forEach(function (r) {
  js = js.split(r[0]).join(r[1]);
});

// 改写结果自检：这几处必须命中，否则说明 index.html 被改动过
const MUST = [
  ['ROOT.querySelector(s);', '$ 定义替换'],
  ['ROOT.querySelector(\'.dock\')', 'dock 绑定替换'],
  ['ONWIN(\'resize\'', 'resize 绑定替换'],
  ['ONDOC(\'visibilitychange\'', 'visibilitychange 替换'],
  ["'vibrate' in NAV", '振动能力检测替换'],
  ['NAV.vibrate(0)', '振动停止调用替换'],
  ['var S = TK_S = {', '装置状态交给悬浮球']
];
MUST.forEach(function (m) {
  if (js.indexOf(m[0]) === -1) throw new Error('改写失败（' + m[1] + '）：找不到 "' + m[0] + '"');
});

/* ---------- 在顶栏插入收起按钮 ---------- */
const headerBefore = shell;
shell = shell.replace(
  '</header>',
  '  <button class="bar-btn" id="btn-close" type="button" aria-label="收起">✕</button>\n  </header>'
);
if (shell === headerBefore) throw new Error('顶栏插入失败');

/* ---------- 在底栏插入「收起」页签 ----------
 * 顶栏的 ✕ 在右上角，手机全屏时会被系统状态栏盖住（2026-10-12 玩家反馈：满屏、退不出来、只能删脚本）。
 * 面板展开时悬浮球又是藏着的，所以必须有一个永远点得到的出口：底栏最右边。
 * 它没有 data-go，index.html 的页签点击处理会直接放过它，收起动作在下面的运行时里绑。 */
if (shell.split('</nav>').length !== 2) throw new Error('底栏插入失败：</nav> 不是恰好一个');
shell = shell.replace(
  '</nav>',
  '  <button class="tab" id="tab-hide" type="button" aria-label="收起面板"><b>⌄</b>收起</button>\n  </nav>'
);

/* ---------- 宿主样式 ---------- */
const EXTRA_CSS = [
  '/* ==== 注入宿主样式（脚本版专有） ====',
  '   变量在这里重新声明一遍，不依赖从酒馆页面继承，',
  '   免得宿主环境的样式差异把面板配色带偏。 */',
  ':host{',
  '  position:fixed;inset:0;z-index:2147483000;display:block;',
  '  --bg:#120a13;--bg-glow-1:rgba(150,62,156,.22);--bg-glow-2:rgba(214,189,150,.06);',
  '  --card:rgba(238,222,242,.045);--card-2:rgba(238,222,242,.07);',
  '  --line:rgba(232,214,236,.10);--line-2:rgba(232,214,236,.18);',
  '  --hot:#c06cc2;--hot-2:#e2b6df;--hot-deep:#76207a;--cyan:#d6bd96;--amber:#eba866;',
  '  --cyan-a08:rgba(214,189,150,.08);--cyan-a40:rgba(214,189,150,.40);--cyan-a75:rgba(214,189,150,.75);',
  '  --hot-a12:rgba(192,108,194,.12);--hot-a20:rgba(192,108,194,.20);--hot-a28:rgba(192,108,194,.28);',
  '  --hot-a35:rgba(192,108,194,.35);--hot-a45:rgba(192,108,194,.45);--hot-a55:rgba(192,108,194,.55);',
  '  --hot-a75:rgba(192,108,194,.75);',
  '  --text:#f4ece3;--dim:#b9a5ad;--dim-2:#958290;',
  '  --r:16px;--safe-t:env(safe-area-inset-top,0px);--safe-b:env(safe-area-inset-bottom,0px);',   // 全屏/PWA 下顶栏和底栏让开刘海与手势条（普通浏览器里是 0，不影响）
  '  --font:"PingFang SC","HarmonyOS Sans SC","Hiragino Sans GB","Source Han Sans SC","Microsoft YaHei",system-ui,-apple-system,sans-serif;',
  '}',
  '#btn-close{display:none}'
].join('\n');

const HEADER = [
  '/* ============================================================',
  ' * TOY·LINK 装置模拟器 v' + VERSION + ' · 酒馆助手脚本',
  ' *',
  ' * 由 index.html 自动构建，请勿直接手改本文件；改 index.html 后重跑：',
  ' *   node 工具-构建脚本版.js',
  ' *',
  ' * 安装：酒馆助手 → 脚本库（全局 / 预设 / 角色卡任选）→ 新建脚本 → 全文粘贴',
  ' * 使用：右下角悬浮球开合，或点脚本按钮「TOY·LINK 控制器」',
  ' * ============================================================ */',
  ''
].join('\n');

const BALL_ID = '__toylink_ball__';
const HOST_ID = '__toylink_host__';
const BTN_NAME = 'TOY·LINK 控制器';

/* ---------- 悬浮球：紫色小 lelo ----------
 * 下面两个函数只在构建时被 toString() 抄进产物，node 里不执行。
 * 运行时引用的 DOC / WIN / S / MOUNT 都是 TOYLINK_BOOT 里的变量。
 *
 * 外形照 LELO TIANI：C 形、梅紫哑光硅胶、香槟金环、奶白底盘，不画任何高光反光（Fan 10-11 定的样子）。
 *
 * 运行中的动态效果故意不做「抖」——抖久了看着烦，也和真机马达的手感对不上。改成三样：
 *   1. 大豆荚的颜色跟着实时包络 S.env「温起来」（梅紫→梅红），金环上的小灯一起亮：脉冲一闪一闪，潮汐慢慢涨落，心跳两下一组
 *   2. 包络每到一个波峰，从豆荚头部放一圈声波；最快 ~4 圈/秒，高频模式也不会闪成一片
 *   3. 球外面一圈晕光表示当前强度（粉紫=你拿遥控器，红=TA 拿着），临界爆发时连放三圈
 * 包络先过一道低通（起 60ms、落 160ms）再画，暴雨/乱流这种高频模式看起来是在「涌」而不是在闪。
 * 系统开了「减少动态效果」：只留光晕和指示灯，不放声波、不缩放。
 */

// 弹簧缓动：照抄苹果 SwiftUI 的 Spring(duration: 0.5, bounce: 0.3)，采样成 CSS linear()
function springCurve(duration, bounce) {
  var w = 2 * Math.PI / duration, z = 1 - bounce, wd = w * Math.sqrt(Math.max(0, 1 - z * z));
  function x(t) {
    if (z >= 1) return 1 - Math.exp(-w * t) * (1 + w * t);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
  }
  var T = 0;
  for (var t = 0; t <= 3; t += 0.004) if (Math.abs(1 - x(t)) > 0.002) T = t;
  var pts = [];
  for (var i = 0; i <= 40; i++) pts.push(i === 40 ? 1 : Math.round(x(T * i / 40) * 10000) / 10000);
  return { ms: Math.round(T * 1000), lin: 'linear(' + pts.join(', ') + ')' };
}

function TOY_BALL_SVG(u) {
  // TIANI 那种 C 形：上面一只大豆荚、香槟金环、下面一条细臂弯回来。哑光，不画高光
  var POD = 'M0 -5 C6 -6.4 12 -8.6 19.5 -8.5 C27.5 -8.4 32 -4.6 32 0 C32 4.6 27.5 8.4 19.5 8.5 C12 8.6 6 6.4 0 5 Z';
  var ARM = 'M19.4 33 C13.6 35.6 9.6 41.6 12.6 47.4 C15.8 53.6 28 53.4 36.4 47.2 C40.4 44.2 43.2 40.8 44.6 37.6';
  return '' +
  '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
  '<defs>' +
    '<radialGradient id="' + u + 'Disc" cx="40%" cy="30%" r="78%"><stop offset="0" stop-color="#fbf6f0"/><stop offset=".7" stop-color="#f1e7dc"/><stop offset="1" stop-color="#e4d6c8"/></radialGradient>' +
    '<linearGradient id="' + u + 'Plum" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8e2f8f"/><stop offset=".55" stop-color="#76207a"/><stop offset="1" stop-color="#561462"/></linearGradient>' +
    '<linearGradient id="' + u + 'PlumArm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7f2682"/><stop offset=".6" stop-color="#6a1b70"/><stop offset="1" stop-color="#4f1159"/></linearGradient>' +
    '<linearGradient id="' + u + 'Warm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c25bbf"/><stop offset="1" stop-color="#9a3a9c"/></linearGradient>' +
    '<linearGradient id="' + u + 'Gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6d3b8"/><stop offset=".5" stop-color="#cdb391"/><stop offset="1" stop-color="#a98d6b"/></linearGradient>' +
    '<clipPath id="' + u + 'DiscClip"><circle cx="32" cy="32" r="29.4"/></clipPath>' +
    '<filter id="' + u + 'Sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.8" flood-color="#3a0d40" flood-opacity=".28"/></filter>' +
  '</defs>' +
  '<g class="tk-disc"><circle cx="32" cy="32" r="30" fill="url(#' + u + 'Disc)"/>' +
  '<circle cx="32" cy="32" r="29.5" fill="none" stroke="#6b1f6f" stroke-opacity=".14" stroke-width="1"/></g>' +
  // 声波层：圆心在大豆荚的头（缩放后落在 50.66, 20.72）
  '<g class="tk-waves" clip-path="url(#' + u + 'DiscClip)"></g>' +
  '<g transform="translate(32 32.5) scale(.86) translate(-32 -31.5)">' +
  '<g class="tk-toy" filter="url(#' + u + 'Sh)">' +
    '<path d="' + ARM + '" fill="none" stroke="url(#' + u + 'PlumArm)" stroke-width="8.8" stroke-linecap="round"/>' +
    '<g transform="translate(24 31) rotate(-24)">' +
      '<path d="' + POD + '" fill="url(#' + u + 'Plum)"/>' +
      // 运行时豆荚「温起来」：叠一层亮一点的梅红，透明度跟强度走（不是反光，是颜色变暖）
      '<path class="tk-glow" d="' + POD + '" fill="url(#' + u + 'Warm)" opacity="0"/>' +
      // 香槟金环：哑光拉丝，只有一道很淡的分界
      '<path d="M-5.6 -4.9 Q-6.5 0 -5.6 4.9 L0.7 5.3 Q1.7 0 0.7 -5.3 Z" fill="url(#' + u + 'Gold)"/>' +
      '<path d="M0.7 -5.3 Q1.7 0 0.7 5.3" fill="none" stroke="#8a6f50" stroke-opacity=".35" stroke-width=".5"/>' +
      '<circle class="tk-led" cx="-2.4" cy="0" r=".85" fill="#6e2470" opacity=".25"/>' +
    '</g>' +
  '</g>' +
  '</g>' +
  '</svg>';
}

function TOY_BALL_RUNTIME() {
  var TK_EDGE = 8, TK_POS_KEY = 'toylink_ball_pos', TK_PREF_KEY = 'toylink_ball_pref';
  /* 球的偏好（1.11.1）：大小 / 隐藏只用脚本按钮 / 贴边半藏。
   * 存 localStorage 而不是聊天变量：这是「这台设备怎么看」，换聊天不该变。 */
  var tkPref = { size: 58, hidden: false, tuck: true, fade: 0.45 };   // fade：奶白底盘的透明度（1 实心 / .45 半透 / 0 透明），中间的装置本体永远原色
  try {
    var tkPj = JSON.parse(localStorage.getItem(TK_PREF_KEY) || '{}');
    if (tkPj.size === 44 || tkPj.size === 58 || tkPj.size === 72) tkPref.size = tkPj.size;
    if (typeof tkPj.hidden === 'boolean') tkPref.hidden = tkPj.hidden;
    if (typeof tkPj.tuck === 'boolean') tkPref.tuck = tkPj.tuck;
    if (tkPj.fade === 1 || tkPj.fade === 0.45 || tkPj.fade === 0) tkPref.fade = tkPj.fade;
  } catch (e) { /* noop */ }
  var TK_SIZE = tkPref.size;
  function tkSavePref() { try { localStorage.setItem(TK_PREF_KEY, JSON.stringify(tkPref)); } catch (e) { /* noop */ } }
  function tkNarrow() { var w = WIN.innerWidth || DOC.documentElement.clientWidth || 360; return w > 0 && w < 500; }
  var TK_HEAD_X = 50.66, TK_HEAD_Y = 20.72;   // 头部在底盘坐标系里的位置（SVG 里那串变换算出来的）
  var TK = { pos: null, raf: 0, timer: 0, v: 0, prevEnv: 0, rising: false, lastWave: -1e9, waves: [], peak: -1, burst: 0, lastTs: 0, rgb: '', drag: null };
  TK.rm = false;
  try { TK.rm = !!(WIN.matchMedia && WIN.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* noop */ }
  var tkLin = false;
  try { tkLin = !!(WIN.CSS && WIN.CSS.supports('transition-timing-function', 'linear(0, 1)')); } catch (e) { /* noop */ }
  TK.ease = tkLin ? TK_SPRING_LIN : 'cubic-bezier(.34,1.5,.64,1)';
  TK.ms = tkLin ? TK_SPRING_MS : 500;
  var tkSPR = TK.ms + 'ms ' + TK.ease;

  var tkStyle = DOC.createElement('style');
  tkStyle.id = BALL_ID + '_css';
  var tkB = '#' + BALL_ID;
  tkStyle.textContent = [
    tkB + '{position:fixed;left:-200px;top:-200px;width:var(--tk-size,58px);height:var(--tk-size,58px);z-index:2147483000;display:none;cursor:pointer;',
    '  user-select:none;-webkit-user-select:none;touch-action:none;-webkit-tap-highlight-color:transparent;border-radius:50%;',
    '  filter:drop-shadow(0 6px 14px rgba(20,4,28,.5));transition:transform ' + tkSPR + ',filter .3s;--lv:0;--tk-rgb:196,110,214}',
    // 透明度只作用在底盘上；装置本体（lelo）永远实心（Fan 10-11）
    tkB + ' .tk-disc{opacity:var(--tk-disc,1);transition:opacity .3s}',
    tkB + '.tk-nodisc{filter:drop-shadow(0 4px 8px rgba(20,4,28,.45))}',
    tkB + ' svg{display:block;width:100%;height:100%;overflow:visible;position:relative}',
    // 球外一圈晕光，亮度 = 当前强度
    tkB + '::before{content:"";position:absolute;inset:-13px;border-radius:50%;pointer-events:none;',
    '  background:radial-gradient(circle,rgba(var(--tk-rgb),.8) 0%,rgba(var(--tk-rgb),.34) 46%,rgba(var(--tk-rgb),0) 70%);',
    '  opacity:var(--lv);transform:scale(calc(.78 + var(--lv) * .32))}',
    tkB + ' .tk-toy{transform-box:fill-box;transform-origin:50% 80%}',
    '@media (hover:hover){' + tkB + ':hover{transform:scale(1.06)}}',
    // 按下一缩、拖起一浮（iOS 拎图标那样），松手弹回；放手后弹簧吸到最近的左右边
    tkB + '.tk-press{transform:scale(.88);transition:transform .12s ease-out}',
    tkB + '.tk-lift{transform:scale(1.12);filter:drop-shadow(0 16px 26px rgba(18,4,36,.65));cursor:grabbing}',
    tkB + '.tk-snap{transition:left ' + tkSPR + ',top ' + tkSPR + ',transform ' + tkSPR + ',filter .3s}',
    // 贴边半藏（手机）：靠边几秒没人碰 → 半个身子藏进边里 + 半透明；点它 / 装置运行会出来
    tkB + '.tk-tuck-r{transform:translateX(52%);transition:transform .45s ease}',
    tkB + '.tk-tuck-l{transform:translateX(-52%);transition:transform .45s ease}',
    tkB + '.tk-tuck-r .tk-disc,' + tkB + '.tk-tuck-l .tk-disc{opacity:calc(var(--tk-disc,1) * .5)}',   // 贴边时只再压底盘，本体不变
    '@media (prefers-reduced-motion:reduce){' + tkB + ',' + tkB + '.tk-snap{transition:none}}'
  ].join('\n');
  try { (DOC.head || DOC.body).appendChild(tkStyle); } catch (e) { /* noop */ }

  var ball = DOC.createElement('div');
  ball.id = BALL_ID;
  ball.style.setProperty('--tk-size', TK_SIZE + 'px');
  function tkApplyDisc() {
    ball.style.setProperty('--tk-disc', String(tkPref.fade));
    ball.classList.toggle('tk-nodisc', tkPref.fade === 0);
  }
  tkApplyDisc();
  ball.setAttribute('role', 'button');
  ball.setAttribute('aria-label', 'TOY·LINK 控制器');
  ball.title = 'TOY·LINK 控制器 v' + TK_VERSION + '（可拖动）';
  ball.innerHTML = TOY_BALL_SVG('tkb');
  MOUNT(ball);
  var tkGlow = ball.querySelector('.tk-glow'), tkLed = ball.querySelector('.tk-led'), tkToy = ball.querySelector('.tk-toy'), tkWaveG = ball.querySelector('.tk-waves');
  var tkRings = [];
  for (var tkI = 0; tkI < 6; tkI++) {
    var tkC = DOC.createElementNS('http://www.w3.org/2000/svg', 'circle');
    tkC.setAttribute('cx', TK_HEAD_X); tkC.setAttribute('cy', TK_HEAD_Y); tkC.setAttribute('fill', 'none'); tkC.setAttribute('opacity', '0');
    tkWaveG.appendChild(tkC); tkRings.push(tkC);
  }

  /* ---------- 位置：记左右哪边 + 高度，换屏宽也贴着同一边 ---------- */
  try {
    var tkSp = (localStorage.getItem(TK_POS_KEY) || '').split(',');
    if ((tkSp[0] === 'l' || tkSp[0] === 'r') && isFinite(parseFloat(tkSp[1]))) TK.pos = { side: tkSp[0], y: parseFloat(tkSp[1]) };
  } catch (e) { /* noop */ }
  function tkVp() {
    return { w: WIN.innerWidth || DOC.documentElement.clientWidth || 360, h: WIN.innerHeight || DOC.documentElement.clientHeight || 640 };
  }
  function tkClampY(y, vp) { return Math.min(Math.max(TK_EDGE, y), Math.max(TK_EDGE, vp.h - TK_SIZE - TK_EDGE)); }
  function tkPlace() {
    if (TK.drag) return;
    var vp = tkVp();
    var side = TK.pos ? TK.pos.side : 'r';
    var y = TK.pos ? TK.pos.y : vp.h - TK_SIZE - 104;
    ball.style.left = (side === 'l' ? TK_EDGE : vp.w - TK_SIZE - TK_EDGE) + 'px';
    ball.style.top = tkClampY(y, vp) + 'px';   // 只夹显示位置，不改存档：键盘弹起再收回，球会回到原处
  }

  /* ---------- 拖动 / 点按 ---------- */
  var tkSnapTimer = 0;
  function tkBind(onTap) {
    ball.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      var r = ball.getBoundingClientRect();
      TK.drag = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false };
      clearTimeout(tkSnapTimer);
      tkUntuck();
      ball.classList.remove('tk-snap');
      ball.classList.add('tk-press');
      try { ball.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      e.preventDefault();
    });
    ball.addEventListener('pointermove', function (e) {
      var d = TK.drag; if (!d) return;
      var dx = e.clientX - d.sx, dy = e.clientY - d.sy;
      if (!d.moved && dx * dx + dy * dy > 36) { d.moved = true; ball.classList.remove('tk-press'); ball.classList.add('tk-lift'); }
      if (!d.moved) return;
      var vp = tkVp();
      ball.style.left = Math.min(Math.max(2, d.ox + dx), vp.w - TK_SIZE - 2) + 'px';
      ball.style.top = Math.min(Math.max(2, d.oy + dy), vp.h - TK_SIZE - 2) + 'px';
    });
    function end(e, cancelled) {
      var d = TK.drag; if (!d) return;
      TK.drag = null;
      ball.classList.remove('tk-press', 'tk-lift');
      try { ball.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
      if (!d.moved) { if (!cancelled) onTap(); return; }
      // 吸边：像 iPhone 的小白点，弹簧落到离得近的那一边
      var r = ball.getBoundingClientRect(), vp = tkVp();
      TK.pos = { side: (r.left + TK_SIZE / 2 < vp.w / 2) ? 'l' : 'r', y: tkClampY(r.top, vp) };
      try { localStorage.setItem(TK_POS_KEY, TK.pos.side + ',' + Math.round(TK.pos.y)); } catch (err) { /* noop */ }
      ball.classList.add('tk-snap');
      void ball.offsetWidth;
      tkPlace();
      tkSnapTimer = setTimeout(function () { ball.classList.remove('tk-snap'); }, TK.ms + 60);
      tkTuckSoon(3000);
    }
    ball.addEventListener('pointerup', function (e) { end(e, false); });
    ball.addEventListener('pointercancel', function (e) { end(e, true); });
    ball.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); });   // 点按交给 pointerup
    ONWIN('resize', tkPlace);
  }

  /* ---------- 显示 / 收起 ---------- */
  /* ---------- 贴边半藏 ---------- */
  var tkTuckTimer = 0;
  function tkTuckNow() {
    if (!tkPref.tuck || !tkNarrow() || TK.drag || ball.style.display === 'none') return;
    if (TK_S && TK_S.on) return;   // 装置在跑，球要让人看见
    var side = TK.pos ? TK.pos.side : 'r';
    ball.classList.remove('tk-tuck-l', 'tk-tuck-r');
    ball.classList.add('tk-tuck-' + side);
  }
  function tkUntuck() {
    if (tkTuckTimer) { clearTimeout(tkTuckTimer); tkTuckTimer = 0; }
    ball.classList.remove('tk-tuck-l', 'tk-tuck-r');
  }
  function tkTuckSoon(ms) {
    if (tkTuckTimer) clearTimeout(tkTuckTimer);
    if (!tkPref.tuck) return;
    tkTuckTimer = setTimeout(function () { tkTuckTimer = 0; tkTuckNow(); }, ms || 3000);
  }

  /* ---------- 显示 / 收起 ---------- */
  function tkVisible(show) {
    if (show && tkPref.hidden && TK_API.btnOk) show = false;   // 玩家选了「只用脚本按钮」
    ball.style.display = show ? 'grid' : 'none';
    if (!show) { tkStop(); tkUntuck(); return; }
    tkUntuck();
    tkPlace();
    tkTuckSoon(3000);
    if (!TK.rm && ball.animate) {
      try { ball.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: TK.ms, easing: TK.ease }); } catch (e) { /* noop */ }
    }
    tkKick();
  }

  /* ---------- 运行中的动态 ---------- */
  function tkBusy() { return !!(TK_S && TK_S.on) || TK.v > 0.004 || TK.waves.length > 0 || TK.burst > 0.01; }
  function tkKick() {
    if (TK.raf || ball.style.display === 'none') return;
    if (!tkBusy()) return;
    tkUntuck();
    ball.classList.add('tk-live');
    TK.lastTs = 0;
    TK.raf = WIN.requestAnimationFrame(tkFrame);   // 走酒馆页面的 rAF：脚本 iframe 是隐藏的，它的 rAF 可能被浏览器停掉
  }
  function tkWave(strength, at) {
    TK.waves.push({ t: at, s: strength });
    if (TK.waves.length > tkRings.length) TK.waves.shift();
    TK.lastWave = Math.max(TK.lastWave, at);
  }
  function tkFrame(ts) {
    TK.raf = 0;
    if (!TK_S) { tkRest(); return; }
    var dt = TK.lastTs ? Math.min(0.1, (ts - TK.lastTs) / 1000) : 0.016;
    TK.lastTs = ts;
    var env = TK_S.on ? Math.min(1, Math.max(0, +TK_S.env || 0)) : 0;
    TK.v += (env - TK.v) * (1 - Math.exp(-dt / (env > TK.v ? 0.06 : 0.16)));

    if (TK_S.on && !TK.rm) {
      // 波峰：刚才在涨、现在开始落 → 放一圈；平台期（临界那种顶着不动）每 0.75 秒补一圈
      if (env > TK.prevEnv + 0.002) TK.rising = true;
      else if (env < TK.prevEnv - 0.002 && TK.rising) {
        TK.rising = false;
        if (TK.prevEnv > 0.15 && ts - TK.lastWave > 260) tkWave(TK.prevEnv, ts);
      }
      if (env > 0.5 && ts - TK.lastWave > 750) tkWave(env, ts);
    }
    TK.prevEnv = env;
    // 临界爆发：TK_S.peak 涨了 → 连放三圈 + 晕光冲一下
    if (TK.peak < 0 || TK_S.peak < TK.peak) TK.peak = TK_S.peak;
    else if (TK_S.peak > TK.peak) {
      TK.peak = TK_S.peak; TK.burst = 1;
      if (!TK.rm) { tkWave(1, ts); tkWave(1, ts + 150); tkWave(1, ts + 300); }
    }
    TK.burst *= Math.exp(-dt / 0.5);

    var userT = (TK_S.target === 'user');
    var rgb = userT ? '200,40,80' : '122,32,128';   // 声波：画在奶白盘上，要深
    if (tkPref.fade < 1) rgb = userT ? '255,120,150' : '220,150,235';   // 底盘透了，底下是深色酒馆，声波要亮
    var halo = userT ? '255,96,128' : '196,110,214';   // 晕光：在深色酒馆上，要亮
    if (halo !== TK.rgb) { TK.rgb = halo; ball.style.setProperty('--tk-rgb', halo); }
    var lv = Math.min(1.2, TK.v * 0.85 + TK.burst * 0.6);
    ball.style.setProperty('--lv', lv.toFixed(3));
    tkGlow.setAttribute('opacity', Math.min(.85, TK.v * 0.8 + TK.burst * 0.4).toFixed(3));
    tkLed.setAttribute('opacity', (0.25 + Math.min(1, TK.v + TK.burst) * 0.75).toFixed(3));
    tkLed.setAttribute('fill', (TK.v + TK.burst) > 0.05 ? '#fff4e6' : '#6e2470');
    if (!TK.rm) tkToy.style.transform = 'scale(' + (1 + TK.v * 0.03).toFixed(4) + ')';

    var keep = [];
    for (var i = 0; i < tkRings.length; i++) {
      var w = TK.waves[i], ring = tkRings[i];
      if (!w) { ring.setAttribute('opacity', '0'); continue; }
      var age = (ts - w.t) / 1100;
      if (age >= 1) { ring.setAttribute('opacity', '0'); continue; }
      keep.push(w);
      if (age < 0) { ring.setAttribute('opacity', '0'); continue; }
      ring.setAttribute('r', (4 + age * 32).toFixed(2));
      ring.setAttribute('stroke', 'rgb(' + rgb + ')');
      ring.setAttribute('stroke-width', (1.8 - age * 1.1).toFixed(2));
      ring.setAttribute('opacity', (w.s * 0.6 * Math.pow(1 - age, 1.6)).toFixed(3));
    }
    TK.waves = keep;

    if (tkBusy()) TK.raf = WIN.requestAnimationFrame(tkFrame);
    else tkRest();
  }
  function tkRest() {
    ball.classList.remove('tk-live');
    tkTuckSoon(3000);
    TK.v = 0; TK.burst = 0; TK.waves = []; TK.rising = false;
    ball.style.setProperty('--lv', '0');
    tkGlow.setAttribute('opacity', '0');
    tkLed.setAttribute('opacity', '.25'); tkLed.setAttribute('fill', '#6e2470');
    tkToy.style.transform = '';
    for (var i = 0; i < tkRings.length; i++) tkRings[i].setAttribute('opacity', '0');
  }
  function tkStop() {
    if (TK.raf) { try { WIN.cancelAnimationFrame(TK.raf); } catch (e) { /* noop */ } TK.raf = 0; }
  }
  TK.timer = setInterval(tkKick, 400);   // 装置在面板里被启动后，球这边 0.4 秒内跟上
  /* 面板设置页通过它读写球的偏好（index.html 里 typeof TK_API 判断有没有球） */
  var TK_API = {
    btnOk: false,   // 脚本按钮注册成功后由 BOOT 置 true；没按钮就不许隐藏球
    get: function () { return { size: tkPref.size, hidden: tkPref.hidden, tuck: tkPref.tuck, fade: tkPref.fade, btnOk: TK_API.btnOk }; },
    set: function (k, v) {
      if (k === 'size' && (v === 44 || v === 58 || v === 72)) {
        tkPref.size = TK_SIZE = v; ball.style.setProperty('--tk-size', v + 'px'); tkPlace();
      } else if (k === 'hidden') {
        tkPref.hidden = !!v;
        // 面板开着时球本来就收着；关面板时 tkVisible 会按新偏好决定出不出来
      } else if (k === 'fade' && (v === 1 || v === 0.45 || v === 0)) {
        tkPref.fade = v; tkApplyDisc();
      } else if (k === 'tuck') {
        tkPref.tuck = !!v; if (v) tkTuckSoon(600); else tkUntuck();
      } else return;
      tkSavePref();
    }
  };
  function tkDispose() {
    tkStop();
    clearInterval(TK.timer);
    clearTimeout(tkSnapTimer);
    clearTimeout(tkTuckTimer);
    try { tkStyle.remove(); } catch (e) { /* noop */ }
  }
}

const TK_SPRING = springCurve(0.5, 0.3);   // SwiftUI .bouncy
function fnBody(f) { const t = f.toString(); return t.slice(t.indexOf('{') + 1, t.lastIndexOf('}')); }

const body = [
  'function TOYLINK_BOOT() {',
  '  "use strict";',
  '',
  '  /* 自更新放在最前面。',
  '   * 它原来在函数末尾，结果是：中间任何一处抛错（一个拼错的函数名就够了）',
  '   * 都会让更新检查永远跑不到 —— 脚本库停在坏版本上，用户刷新多少次都好不了，',
  '   * 而且自更新本来存在的意义就是"修好下一版"，它自己却先被卡死了。',
  '   * 放到最前之后，只要脚本还能执行到第一行，就能把新版写回脚本库。 */',
  '  try { selfUpdate(); } catch (e) { /* 更新失败不能拖累启动 */ }',
  '',
  '  /* 说明：面板的"开合 / 收起"绑定不在这里，而在 host 建好并挂载之后那一小段',
  '     （搜「最先绑定的两件事」）。这里只放自更新 —— 它不需要 DOM，',
  '     所以可以排在最前；而查询按钮必须等 DOM 真的存在，否则拿到的是 null。 */',
  '',
  '  /* 已经跑着一个实例。',
  '   * 版本相同：是重复点脚本按钮，切换面板即可。',
  '   * 版本不同：说明先执行的是旧版 —— 这正是换新脚本后最常见的困惑，',
  '   *   用户换了地址、也刷新了，界面却一点没变，因为旧实例还在，新版一进门就退出。',
  '   *   这里把旧实例拆掉，让新版接管。 */',
  '  if (window.__TOYLINK__ && document.getElementById("' + HOST_ID + '")) {',
  '    if (window.__TOYLINK__.version === "' + VERSION + '") {',
  '      window.__TOYLINK__.toggle();',
  '      return;',
  '    }',
  '    try { console.log("[TOY·LINK] 发现旧版 " + window.__TOYLINK__.version + "，拆掉它换成 ' + VERSION + '"); } catch (e) {}',
  '    try { if (window.__TOYLINK__.stop) window.__TOYLINK__.stop(); } catch (e) { /* 旧版可能没有 stop */ }',
  '    try {',
  '      var oldHost = document.getElementById("' + HOST_ID + '"); if (oldHost) oldHost.remove();',
  '      var oldBall = document.getElementById("' + BALL_ID + '"); if (oldBall) oldBall.remove();',
  '      var oldCss = document.getElementById("' + BALL_ID + '_css"); if (oldCss) oldCss.remove();',
  '      window.__TOYLINK__ = null;',
  '    } catch (e) { /* noop */ }',
  '  }',
  '',
  '  /* ==================== 定位酒馆页面 ====================',
  '   * 本脚本运行在酒馆助手的 iframe 里，document 是该 iframe 的 document。',
  '   * 界面必须挂到真正的酒馆页面上，否则谁也看不见。',
  '   * 顺序：酒馆页面 jQuery 的 $("body") → 同源的 window.parent → 自身（退化）。',
  '   */',
  '  function resolvePage() {',
  '    try {',
  '      if (typeof $ === "function") {',
  '        var b = $("body");',
  '        if (b && b.length && b[0] && b[0].ownerDocument && b[0].ownerDocument !== document) {',
  '          return { doc: b[0].ownerDocument, win: b[0].ownerDocument.defaultView || window, via: "jquery" };',
  '        }',
  '      }',
  '    } catch (e) { /* noop */ }',
  '    try {',
  '      var p = window.parent;',
  '      if (p && p !== window && p.document && p.document.body) {',
  '        return { doc: p.document, win: p, via: "parent" };',
  '      }',
  '    } catch (e) { /* 跨域则放弃 */ }',
  '    return { doc: document, win: window, via: "self" };',
  '  }',
  '',
  '  var PAGE = resolvePage();',
  '  var DOC = PAGE.doc, WIN = PAGE.win;',
  '',
  '  // 事件双绑：无论界面挂在哪一层，都能收到 resize / 触控',
  '  var WINS = [window], DOCS = [document];',
  '  if (WIN !== window && WINS.indexOf(WIN) < 0) WINS.push(WIN);',
  '  if (DOC !== document && DOCS.indexOf(DOC) < 0) DOCS.push(DOC);',
  '  function eachWin(fn) { for (var i = 0; i < WINS.length; i++) { try { fn(WINS[i]); } catch (e) { /* noop */ } } }',
  '  function eachDoc(fn) { for (var i = 0; i < DOCS.length; i++) { try { fn(DOCS[i]); } catch (e) { /* noop */ } } }',
  '  function ONWIN(t, f, o) { eachWin(function (w) { w.addEventListener(t, f, o); }); }',
  '  function OFFWIN(t, f, o) { eachWin(function (w) { w.removeEventListener(t, f, o); }); }',
  '  function ONDOC(t, f, o) { eachDoc(function (d) { d.addEventListener(t, f, o); }); }',
  '  function MOUNT(el) {',
  '    try { DOC.body.appendChild(el); } catch (e) { document.body.appendChild(el); }',
  '  }',
  '  function BYID(id) {',
  '    try { return DOC.getElementById(id) || document.getElementById(id); } catch (e) { return document.getElementById(id); }',
  '  }',
  '  var NAV = (WIN.navigator) || navigator;',
  '',
  '  var CSS = ' + JSON.stringify(EXTRA_CSS + '\n' + css) + ';',
  '  var HTML = ' + JSON.stringify(shell) + ';',
  '',
  '  /* ==================== 建面板 ==================== */',
  '  var host = DOC.createElement("div");',
  '  host.id = "' + HOST_ID + '";',
  '  // 关键样式走内联，确保不受酒馆页面样式表与容器布局的影响。',
  '  // pointer-events:none 让整层不吞事件，只有面板本体（shell）自己接收操作，',
  '  // 这样酒馆的聊天、输入框、侧边栏全都照常可用。',
  '  host.style.cssText = "position:fixed;inset:0;z-index:2147483000;display:block;pointer-events:none;";',
  '  var root = host.attachShadow({ mode: "open" });',
  '  var styleEl = DOC.createElement("style");',
  '  styleEl.textContent = CSS;',
  '  root.appendChild(styleEl);',
  '  var holder = DOC.createElement("div");',
  '  holder.innerHTML = HTML;',
  '  while (holder.firstChild) root.appendChild(holder.firstChild);',
  '  MOUNT(host);',
  '',
  '  var shellEl = root.querySelector("#shell");',
  '  if (shellEl) {',
  '    shellEl.style.position = "fixed";',
  '    shellEl.style.pointerEvents = "auto";',
  '  }',
  '',
  '  /* ---------- 最先绑定的两件事：开合 / 收起 ----------',
  '   * 位置很讲究：必须在 host 挂载之后（DOM 真的存在了，查得到按钮），',
  '   * 又必须在后面所有"可能出错"的初始化之前。',
  '   * 起因：曾有一个函数名写错，让 boot 在半途抛错 —— 面板已经画出来了，',
  '   * 但收起按钮、悬浮球、脚本按钮的事件全没绑上，用户被一个关不掉的死面板',
  '   * 挡住整个酒馆界面，手机上连控制台都不好开。',
  '   * 所以把"能把它收起来"做成最先稳定下来的能力：后面不管哪步出错，',
  '   * 用户至少点得到顶栏 ✕、底栏「收起」，或者在面板上往下甩一下。 */',
  '  var opened = true;',
  '  try { if (WIN.__toylink_opened === false) opened = false; } catch (e) { /* noop */ }',
  '  function apply() {',
  '    host.style.display = opened ? "block" : "none";',
  '    tkVisible(!opened);   // 面板展开时收起悬浮球，别挡视线；收起时弹出来',
  '    try { WIN.__toylink_opened = opened; } catch (e) { /* noop */ }',
  '  }',
  '  function open() { opened = true; apply(); setTimeout(layout, 0); }',
  '  function collapse() { opened = false; apply(); }',
  '  function toggle() { opened = !opened; apply(); if (opened) setTimeout(layout, 0); }',
  '  var closeBtn = root.querySelector("#btn-close");   // 注意用 root：ROOT 这个名字要到下面才赋值',
  '  if (closeBtn) {',
  '    closeBtn.style.display = "grid";',
  '    closeBtn.addEventListener("click", collapse);',
  '  }',
  '  var hideTab = root.querySelector("#tab-hide");   // 底栏「收起」：顶栏被手机状态栏盖住时唯一点得到的出口',
  '  if (hideTab) hideTab.addEventListener("click", function (e) { e.stopPropagation(); collapse(); });',
  '  /* 手指一划就关：手机上最顺手的一招，同样绑在这里，所以它永远有效。 */',
  '  try {',
  '    var swipeY = 0;',
  '    root.addEventListener("touchstart", function (e) {',
  '      swipeY = (e.touches && e.touches[0]) ? e.touches[0].clientY : 0;',
  '    }, { passive: true });',
  '    root.addEventListener("touchend", function (e) {',
  '      var y = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientY : 0;',
  '      if (y - swipeY > 120) collapse();   // 从面板上往下甩一大截 = 收起',
  '    }, { passive: true });',
  '  } catch (e) { /* noop */ }',
  '',
  '  /* ==================== 悬浮球：紫色小 lelo（源码见构建脚本里的 TOY_BALL_RUNTIME） ==================== */',
  '  var BALL_ID = "' + BALL_ID + '", TK_VERSION = "' + VERSION + '";',
  '  var TK_S = null;   // 主脚本跑起来后指向它的装置状态 S',
  '  var TK_SPRING_LIN = ' + JSON.stringify(TK_SPRING.lin) + ', TK_SPRING_MS = ' + TK_SPRING.ms + ';',
  '  ' + TOY_BALL_SVG.toString(),
  fnBody(TOY_BALL_RUNTIME),
  '',
  '  var ROOT = root;',
  '',
  '  /* ==================== 以下逻辑与 index.html 同源 ==================== */',
  js,
  '  /* ==================== 同源逻辑结束 ==================== */',
  '',
  '  /* ---------- 定位：悬浮窗 / 全屏 ----------',
  '   * 全部用内联样式算，不走 CSS 媒体查询。',
  '   * 默认悬浮窗：固定在视口一角、可拖动，酒馆其他地方照常点击与输入。',
  '   */',
  '  var sizeBtn = ROOT.querySelector("#btn-size");',
  '  var FIT_KEY = "toylink_fit_mode", POS_KEY = "toylink_win_pos";',
  '',
  '  /* 视口尺寸。这里必须层层兜底 —— 脚本跑在酒馆助手的 iframe 里，',
  '     而 iframe 有可能是隐藏的（resolvePage 回落到 self 时）。隐藏 iframe 的',
  '     innerWidth/clientWidth 都是 0，拿 0 去算布局会把面板定成 left=0;width=0：',
  '     贴在左上角、内容一个点不到。宁可回落到一个保守的默认值，也不要 0。 */',
  '  function viewport() {',
  '    function pick() {',
  '      for (var i = 0; i < arguments.length; i++) {',
  '        var v = arguments[i];',
  '        if (typeof v === "number" && isFinite(v) && v > 0) return v;',
  '      }',
  '      return 0;',
  '    }',
  '    var w = pick(WIN.innerWidth, DOC.documentElement && DOC.documentElement.clientWidth,',
  '      (typeof window !== "undefined" ? window.innerWidth : 0),',
  '      (typeof window !== "undefined" && window.document.documentElement)',
  '        ? window.document.documentElement.clientWidth : 0)',
  '      || 360;',
  '    var h = pick(WIN.innerHeight, DOC.documentElement && DOC.documentElement.clientHeight,',
  '      (typeof window !== "undefined" ? window.innerHeight : 0),',
  '      (typeof window !== "undefined" && window.document.documentElement)',
  '        ? window.document.documentElement.clientHeight : 0)',
  '      || 640;',
  '    return { w: w, h: h };',
  '  }',
  '  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }',
  '  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* noop */ } }',
  '',
  '  var savedPos = (function () {',
  '    var s = lsGet(POS_KEY);',
  '    if (!s) return null;',
  '    var a = s.split(",");',
  '    if (a.length !== 2) return null;',
  '    var x = parseFloat(a[0]), y = parseFloat(a[1]);',
  '    if (!isFinite(x) || !isFinite(y)) return null;',
  '    /* 明显不可用的旧记录直接丢掉：面板宽 280-368，x 落在 0-10 之间一定是当年',
  '       用一个错的视口宽度算出来的（比如隐藏 iframe 的 0），留着就会永远贴左边。 */',
  '    if (x < 12 && y < 12) return null;',
  '    return { left: x, top: y };',
  '  })();',
  '',
  '  var layingOut = false;   // layout 末尾会广播 resize，而 layout 自己也挂在 resize 上：不设闸就无限递归（控制台成串的 Maximum call stack）',
  '  function layout() {',
  '    if (!shellEl || layingOut) return;',
  '    layingOut = true;',
  '    try { layoutInner(); } finally { layingOut = false; }',
  '  }',
  '  function layoutInner() {',
  '    var vp = viewport();',
  '    // 窄屏第一次打开默认全屏，之后听用户的',
  '    if (lsGet(FIT_KEY) === null && vp.w < 860) shellEl.classList.add("fit");',
  '    /* 视口小到放不下一个窗口时，宁可全屏也不摆一个宽度接近 0 的窗口 ——',
  '       那样面板会贴在左边、里面的按钮全点不到，等于把整个界面废掉。',
  '       顺带把那个决定记进 FIT_KEY，免得每次 resize 都在两个坏状态之间跳。',
  '       注意 lsGet 返回 null 表示"用户从没设过"，那种情况下也要落进 fit 分支。 */',
  '    var fitRec = lsGet(FIT_KEY);',
  '    var tooSmall = (vp.w < 300 || vp.h < 320);',
  '    if (tooSmall && fitRec !== "1") { shellEl.classList.add("fit"); lsSet(FIT_KEY, "1"); }',
  '    var full = shellEl.classList.contains("fit");',
  '    shellEl.style.position = "fixed";',
  '    shellEl.style.pointerEvents = "auto";',
  '    if (full) {',
  '      shellEl.style.left = "0px"; shellEl.style.top = "0px";',
  '      shellEl.style.right = "auto"; shellEl.style.bottom = "auto";',
  '      shellEl.style.width = vp.w + "px";',
  '      shellEl.style.height = vp.h + "px";',
  '      shellEl.style.maxHeight = "none";',
  '      shellEl.style.borderRadius = "0px";',
  '      shellEl.style.border = "0";',
  '      shellEl.style.boxShadow = "none";',
  '    } else {',
  '      var w = Math.max(280, Math.min(368, vp.w - 20));',
  '      var h = Math.max(300, Math.min(Math.round(vp.h * 0.78), vp.h - 120, 640));',
  '      shellEl.style.width = w + "px";',
  '      shellEl.style.height = h + "px";',
  '      shellEl.style.maxHeight = h + "px";',
  '      shellEl.style.borderRadius = "20px";',
  '      shellEl.style.border = "1px solid rgba(232,214,236,.10)";',
  '      shellEl.style.boxShadow = "0 24px 70px rgba(0,0,0,.72)";',
  '      /* 上一次拖到的位置只有在"当前视口下真的放得下"时才认。',
  '         以前是一票否决：savedPos 存在就永远用它，于是窗口变宽之后',
  '         面板还钉在当年那个左边的坐标上，看起来就是"贴在左边"。 */',
  '      var maxL = vp.w - w - 4, maxT = vp.h - h - 4;',
  '      var useSaved = !!savedPos && maxL >= 0 && maxT >= 0;',
  '      var L, T;',
  '      if (useSaved) {',
  '        L = Math.min(Math.max(4, savedPos.left), maxL);',
  '        T = Math.min(Math.max(4, savedPos.top), maxT);',
  '        // 纠偏后的位置与记录差得多，说明那条记录已经过期，就地修掉',
  '        if (Math.abs(L - savedPos.left) > 24 || Math.abs(T - savedPos.top) > 24) {',
  '          savedPos = { left: L, top: T };',
  '          lsSet(POS_KEY, L + "," + T);',
  '        }',
  '      } else {',
  '        L = Math.max(8, vp.w - w - 18);',
  '        T = Math.max(8, vp.h - h - 88);',
  '      }',
  '      shellEl.style.left = L + "px";',
  '      shellEl.style.top = T + "px";',
  '      shellEl.style.right = "auto";',
  '      shellEl.style.bottom = "auto";',
  '    }',
  '    try { WIN.dispatchEvent(new Event("resize")); } catch (e) { /* noop */ }',
  '  }',
  '',
  '  /* ---------- 拖动窗身 ---------- */',
  '  var bar = ROOT.querySelector(".bar");',
  '  if (bar) {',
  '    bar.style.cursor = "grab";',
  '    bar.style.touchAction = "none";',
  '    var dg = { on: false, ox: 0, oy: 0 };',
  '    bar.addEventListener("pointerdown", function (e) {',
  '      if (!shellEl || shellEl.classList.contains("fit")) return;',
  '      if (e.target && e.target.closest && e.target.closest("button")) return;',
  '      var r = shellEl.getBoundingClientRect();',
  '      dg.on = true; dg.ox = e.clientX - r.left; dg.oy = e.clientY - r.top;',
  '      bar.style.cursor = "grabbing";',
  '      try { bar.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }',
  '    });',
  '    bar.addEventListener("pointermove", function (e) {',
  '      if (!dg.on) return;',
  '      var vp = viewport();',
  '      var w = shellEl.offsetWidth, h = shellEl.offsetHeight;',
  '      var L = Math.min(Math.max(4, e.clientX - dg.ox), Math.max(4, vp.w - w - 4));',
  '      var T = Math.min(Math.max(4, e.clientY - dg.oy), Math.max(4, vp.h - h - 4));',
  '      shellEl.style.left = L + "px";',
  '      shellEl.style.top = T + "px";',
  '      savedPos = { left: L, top: T };',
  '      lsSet(POS_KEY, Math.round(L) + "," + Math.round(T));',
  '    });',
  '    var dgEnd = function () {',
  '      if (!dg.on) return;',
  '      dg.on = false;',
  '      bar.style.cursor = "grab";',
  '    };',
  '    bar.addEventListener("pointerup", dgEnd);',
  '    bar.addEventListener("pointercancel", dgEnd);',
  '  }',
  '',
  '  layout();',
  '  ONWIN("resize", layout);',
  '  ONWIN("orientationchange", function () { setTimeout(layout, 120); });',
  '  if (sizeBtn) sizeBtn.addEventListener("click", function () { setTimeout(layout, 0); });',
  '  var fitSw = ROOT.querySelector("#s-fit");   // 设置页的「全屏」开关和 ⤢ 是同一个动作，尺寸同样要重算',
  '  if (fitSw) fitSw.addEventListener("click", function () { setTimeout(layout, 0); });',
  '',
  '  /* ---------- 自助复位 ----------',
  '   * 面板贴在角落、或者位置怎么都不对时，在浏览器控制台敲这一行即可：',
  '   *     __TOYLINK__.resetLayout()',
  '   * 它会清掉记下来的窗口位置和全屏偏好，然后按当前视口重算一次。',
  '   * 之所以要留这个口子：位置是存在 localStorage 里的，一旦存进一个坏值，',
  '   * 光刷新页面是出不来的 —— 用户会被锁在一个自己修不好的状态里。 */',
  '  TK_API.resetLayout = function () {',
  '    try { localStorage.removeItem(POS_KEY); } catch (e) { /* noop */ }',
  '    try { localStorage.removeItem(FIT_KEY); } catch (e) { /* noop */ }',
  '    savedPos = null;',
  '    var vp = viewport();',
  '    if (vp.w < 300 || vp.h < 320) shellEl.classList.add("fit");',
  '    else shellEl.classList.remove("fit");',
  '    layout();',
  '    console.log("[TOY·LINK] 已复位布局：view " + vp.w + "x" + vp.h',
  '      + " | fit=" + shellEl.classList.contains("fit")',
  '      + " | left=" + (shellEl.style.left || "auto"));',
  '    return "已复位";',
  '  };',
  '',
  '  /* ---------- 开合 ---------- */',
  '  // 同一次会话里记住上次的收起状态，避免切聊天就又弹一脸',
  '  /* 这几样（opened / apply / open / collapse / toggle / 收起按钮）已经在函数开头',
  '     定义并绑定过了 —— 那里是"必须最先跑通"的一段，别在这里重复定义：',
  '     重复声明会让后面这份覆盖前面那份，等于把最早的保险拆掉。 */',
  '  tkBind(toggle);   // 点按开合，拖动吸边',
  '',
  '  // 装置运行时的动态由悬浮球自己的循环直接读 S（见 TOY_BALL_RUNTIME），这里不用再轮询面板',
  '',
  '  window.__TOYLINK__ = {',
  '    version: "' + VERSION + '",',
  '    host: host, root: root, ball: ball, page: PAGE,',
  '    resetLayout: TK_API.resetLayout,   // 面板位置不对劲时，控制台敲 __TOYLINK__.resetLayout()',
  '    open: open, collapse: collapse, toggle: toggle,',
  '    stop: function () {',
  '      try { if (NAV.vibrate) NAV.vibrate(0); } catch (e) { /* noop */ }',
  '      try { tkDispose(); } catch (e) { /* noop */ }',
  '      var h = BYID("' + HOST_ID + '"); if (h) h.remove();',
  '      var b = BYID("' + BALL_ID + '"); if (b) b.remove();',
  '      window.__TOYLINK__ = null;',
  '    }',
  '  };',
  '',
  '  /* ---------- 脚本按钮 ----------',
  '   * 点击事件的通道是 getButtonEvent(name) 返回的事件类型，',
  '   * 不能用 eventOnButton（那是脚本设置里的按键绑定）。',
  '   */',
  '  function pickApi(name) {',
  '    try { if (typeof window[name] === "function") return window[name]; } catch (e) { /* noop */ }',
  '    try {',
  '      if (typeof TavernHelper !== "undefined" && TavernHelper && typeof TavernHelper[name] === "function") {',
  '        return TavernHelper[name].bind(TavernHelper);',
  '      }',
  '    } catch (e) { /* noop */ }',
  '    try {',
  '      var p = window.parent;',
  '      if (p && p !== window && p.TavernHelper && typeof p.TavernHelper[name] === "function") {',
  '        return p.TavernHelper[name].bind(p.TavernHelper);',
  '      }',
  '    } catch (e) { /* noop */ }',
  '    return null;',
  '  }',
  '',
  '  try {',
  '    var rsb = pickApi("replaceScriptButtons");',
  '    if (rsb) { rsb([{ name: "' + BTN_NAME + '", visible: true }]); TK_API.btnOk = true; }',
  '',
  '    var eon = pickApi("eventOn");',
  '    var gbe = pickApi("getButtonEvent");',
  '    if (eon && gbe) {',
  '      eon(gbe("' + BTN_NAME + '"), function () { open(); });',
  '    } else {',
  '      // 极老版本没有 getButtonEvent 时留个念想',
  '      var eob = pickApi("eventOnButton");',
  '      if (eob) eob("' + BTN_NAME + '", function () { open(); });',
  '    }',
  '  } catch (e) {',
  '    console.log("[TOY·LINK] 脚本按钮注册失败：", e);',
  '  }',
  '  if (!TK_API.btnOk) tkPref.hidden = false;   // 没按钮的环境里，球是唯一的门，不许藏',
  '',
  '  /* ---------- 卸载清理 ---------- */',
  '  var bye = function () {',
  '    try { if (NAV.vibrate) NAV.vibrate(0); } catch (e) { /* noop */ }',
  '    if (window.__TOYLINK__ && window.__TOYLINK__.stop) window.__TOYLINK__.stop();',
  '  };',
  '  ONWIN("pagehide", bye);',
  '',
  '  apply();',
  '  console.log("[TOY·LINK] 已挂载到 " + (PAGE.via === "self" ? "脚本自身 iframe（未找到酒馆页面，界面可能不可见）" : "酒馆页面 via " + PAGE.via));',
  '  setTimeout(function () {',
  '    try {',
  '      var hb = host.getBoundingClientRect();',
  '      var sb = ROOT.querySelector("#shell").getBoundingClientRect();',
  '      var dr = ROOT.querySelector("#v-device").getBoundingClientRect();',
  '      var rg = ROOT.querySelector(".ring").getBoundingClientRect();',
  '      console.log("[TOY·LINK] 尺寸 host " + Math.round(hb.width) + "x" + Math.round(hb.height)',
  '        + " | shell " + Math.round(sb.width) + "x" + Math.round(sb.height)',
  '        + " | stage " + Math.round(dr.width) + "x" + Math.round(dr.height)',
  '        + " | ring " + Math.round(rg.width) + "x" + Math.round(rg.height)',
  '        + " | dpr " + (WIN.devicePixelRatio || 1));',
  '      /* 这一行是给"面板贴在左边 / 点不到"这类问题准备的：',
  '         view 用的是算出来那个视口，shell 是最终落到页面上的大小。',
  '         两个数对不上、或者 shell 宽度接近 0，看这行就知道卡在哪一步。 */',
  '      var vpv = viewport();',
  '      console.log("[TOY·LINK] 布局 view " + vpv.w + "x" + vpv.h',
  '        + " | fit=" + shellEl.classList.contains("fit")',
  '        + " | left=" + (shellEl.style.left || "auto")',
  '        + " | 定位来源=" + (shellEl.style.left ? "内联（layout 算出来的）" : "CSS")',
  '        + " | via=" + PAGE.via);',
  '    } catch (e) { /* noop */ }',
  '  }, 400);',
  '}',
  '',
  '// 酒馆页面可能尚未就绪',
  'try {',
  '  if (typeof $ === "function") { $(function () { TOYLINK_BOOT(); }); } else { TOYLINK_BOOT(); }',
  '} catch (e) {',
  '  console.error("[TOY·LINK] 启动失败，面板不会工作：", e);',
  '}',
  '/* 兜底自检：boot 若是半途抛错，面板会"看得见、全点不动"，',
  '   而控制台里往往只有一行容易漏掉的红字。这里明确报出来。',
  '   （外层 try/catch 抓不到 $(fn) 里的错误 —— jQuery 是异步调用的。） */',
  'setTimeout(function () {',
  '  if (!window.__TOYLINK__) {',
  '    console.error("[TOY·LINK] 启动流程没有完成：window.__TOYLINK__ 不存在 —— "',
  '      + "面板虽然可能已经画出来，但按钮全是死的。请把控制台里 TOY·LINK 相关的报错发出来。");',
  '  }',
  '}, 3000);'
].join('\n');

const ARTIFACT = HEADER + body + '\n';
fs.writeFileSync(OUT, ARTIFACT, 'utf8');

/* ---------- 分发用的三件套 ----------
 * 为什么不用一行 `import '固定地址'`：
 * jsDelivr 给固定地址的响应头是 `Cache-Control: public, max-age=604800` ——
 * 浏览器会把那个 JS 存 7 天，而 purge 只能清 CDN 那一层，够不着浏览器。
 * 结果就是作者推了新代码、用户刷了页面、看到的还是旧版，且没有任何报错。
 *
 * 所以改成「版本指针 + 按版本命名的文件」：
 *   version.txt                 指针，用 GitHub raw 取（缓存只有几分钟）
 *   dist/TOY-LINK-<版本>.js      本体，每次发版一个新文件名 → 新 URL → 必然回源
 *
 * 脚本本体自带自更新：启动时问一次指针，比自己新就把脚本库里的自己换成新本体。
 * （曾经还有一套「加载器」方案 —— 脚本库只放几十行，每次启动拉本体执行。
 *   自更新验证可用之后已经删掉，加载器唯一多出来的价值是首次少下载 155 KB，
 *   而代价是每次启动都要联网、且本体不落本地、断网就加载不出来。）
 */
fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(OUT_VERSIONED, ARTIFACT, 'utf8');
fs.writeFileSync(POINTER_FILE, VERSION + '\n', 'utf8');

const OWNER = 'fJForever';
const REPO = 'toy-link';
const BRANCH = 'main';


const kb = (Buffer.byteLength(ARTIFACT, 'utf8') / 1024).toFixed(1);
console.log('已生成: ' + path.basename(OUT) + '  (' + kb + ' kB, 本地用)');
console.log('已生成: dist/' + path.basename(OUT_VERSIONED) + '  (' + kb + ' kB, 发版用)');
console.log('已生成: version.txt  → ' + VERSION);
console.log('  CSS  ' + css.length + ' 字符');
console.log('  HTML ' + shell.length + ' 字符');
console.log('  JS   ' + js.length + ' 字符');

/* ---------- 生成可直接导入脚本库的 JSON ----------
 * 依据本机酒馆助手的实际实现（src/panel/script/Toolbar.vue 与 src/type/scripts.ts）：
 *   - 导入走 useFileDialog({ accept: '.json', multiple: true })
 *   - 内容是 ScriptTree（Script 或 ScriptFolder）经过 zod 解析
 *   - Script 的所有字段都有默认值，但 type / name / content 给全最稳
 *   - 导入后会被强制 enabled = false，需要用户手动启用
 */
const IMPORT_FILE = path.join(DIR, 'TOY-LINK脚本.json');
const SCRIPT_INFO = [
  'v' + VERSION + ' · 装置模拟器（自动更新）',
  '',
  '在酒馆界面右下角放一个可拖动的悬浮窗，点开是手机样式的遥控器：',
  '九种震动模式、频率、强度、限时，状态实时同步给角色，角色据此给出身体反馈。',
  '',
  '【自动更新】启动时会问一次版本指针，发现新版就把脚本库里的自己换成新本体 ——',
  '所以装这一次就够，以后作者发版你刷新页面就是新版，不用重新导入。',
  '本体存在本地脚本库里，更新过之后断网也照常工作。',
  '',
  '【装完之后】请手动打开它右边的开关（酒馆助手导入的脚本默认是关闭状态）。',
  '世界书不用另外导入，脚本启动时会自动写一本并挂到当前角色卡；',
  '不想让它自动写，在设置页关掉「自动建立并绑定世界书」。',
  '',
  '用法：点开面板 → 点「启 动」→ 选模式调参数。',
  '面板顶部 ✕ 收起，右下角悬浮球随时再打开。'
].join('\n');

fs.writeFileSync(IMPORT_FILE, JSON.stringify({
  type: 'script',
  enabled: true,
  name: 'TOY·LINK 装置模拟器',
  id: 'toylink-device-simulator',
  content: fs.readFileSync(OUT, 'utf8'),
  info: SCRIPT_INFO,
  button: {
    enabled: true,
    buttons: [{ name: 'TOY·LINK 控制器', visible: true }]
  },
  data: {},
  export_with: { data: true, button: true }
}, null, 2), 'utf8');

console.log('已生成: ' + path.basename(IMPORT_FILE) + '  (脚本库「导入」直接选它 · 自带更新)');
