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
const OUT_LATEST = path.join(DIST, 'latest.js');
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
  ['NAV.vibrate(0)', '振动停止调用替换']
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

/* ---------- 宿主样式 ---------- */
const EXTRA_CSS = [
  '/* ==== 注入宿主样式（脚本版专有） ====',
  '   变量在这里重新声明一遍，不依赖从酒馆页面继承，',
  '   免得宿主环境的样式差异把面板配色带偏。 */',
  ':host{',
  '  position:fixed;inset:0;z-index:2147483000;display:block;',
  '  --bg:#140810;--bg-glow-1:rgba(255,127,176,.20);--bg-glow-2:rgba(168,216,255,.13);',
  '  --card:rgba(255,255,255,.05);--card-2:rgba(255,255,255,.08);',
  '  --line:rgba(255,255,255,.11);--line-2:rgba(255,255,255,.19);',
  '  --hot:#ff7fb0;--hot-2:#ffb3d1;--hot-deep:#d14a80;--cyan:#a8d8ff;--amber:#ffb347;',
  '  --hot-a12:rgba(255,127,176,.12);--hot-a20:rgba(255,127,176,.20);--hot-a28:rgba(255,127,176,.28);',
  '  --hot-a35:rgba(255,127,176,.35);--hot-a45:rgba(255,127,176,.45);--hot-a55:rgba(255,127,176,.55);',
  '  --hot-a75:rgba(255,127,176,.75);',
  '  --text:#fdf0f6;--dim:#c49aae;--dim-2:#8a6c7c;',
  '  --r:16px;--safe-t:0px;--safe-b:0px;',
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

const body = [
  'function TOYLINK_BOOT() {',
  '  "use strict";',
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
  '  /* ==================== 悬浮球 ==================== */',
  '  var ball = DOC.createElement("div");',
  '  ball.id = "' + BALL_ID + '";',
  '  ball.textContent = "◈";',
  '  ball.title = "TOY·LINK 控制器 v' + VERSION + '";',
  '  ball.style.cssText = "position:fixed;right:14px;bottom:104px;width:50px;height:50px;"',
  '    + "border-radius:50%;display:grid;place-items:center;font-size:20px;color:#fff;"',
  '    + "background:linear-gradient(140deg,#ff2f6e,#7a1bd4);z-index:2147483000;"',
  '    + "box-shadow:0 8px 26px rgba(255,47,110,.5);cursor:pointer;user-select:none;"',
  '    + "-webkit-tap-highlight-color:transparent;transition:opacity .2s,transform .12s;";',
  '  MOUNT(ball);',
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
  '  function viewport() {',
  '    var w = WIN.innerWidth || DOC.documentElement.clientWidth || 0;',
  '    var h = WIN.innerHeight || DOC.documentElement.clientHeight || 0;',
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
  '    return (isFinite(x) && isFinite(y)) ? { left: x, top: y } : null;',
  '  })();',
  '',
  '  function layout() {',
  '    if (!shellEl) return;',
  '    var vp = viewport();',
  '    // 窄屏第一次打开默认全屏，之后听用户的',
  '    if (lsGet(FIT_KEY) === null && vp.w < 860) shellEl.classList.add("fit");',
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
  '      shellEl.style.border = "1px solid rgba(255,255,255,.10)";',
  '      shellEl.style.boxShadow = "0 24px 70px rgba(0,0,0,.72)";',
  '      var L, T;',
  '      if (savedPos) {',
  '        L = Math.min(Math.max(4, savedPos.left), Math.max(4, vp.w - w - 4));',
  '        T = Math.min(Math.max(4, savedPos.top), Math.max(4, vp.h - h - 4));',
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
  '',
  '  /* ---------- 开合 ---------- */',
  '  // 同一次会话里记住上次的收起状态，避免切聊天就又弹一脸',
  '  var opened = true;',
  '  try { if (WIN.__toylink_opened === false) opened = false; } catch (e) { /* noop */ }',
  '  function apply() {',
  '    host.style.display = opened ? "block" : "none";',
  '    ball.style.display = opened ? "none" : "grid";   // 面板展开时收起悬浮球，别挡视线',
  '    try { WIN.__toylink_opened = opened; } catch (e) { /* noop */ }',
  '  }',
  '  function open() { opened = true; apply(); setTimeout(layout, 0); }',
  '  function collapse() { opened = false; apply(); }',
  '  function toggle() { opened = !opened; apply(); if (opened) setTimeout(layout, 0); }',
  '',
  '  ball.addEventListener("click", function (e) { e.stopPropagation(); toggle(); });',
  '  ball.addEventListener("touchstart", function () { ball.style.transform = "scale(.9)"; }, { passive: true });',
  '  ball.addEventListener("touchend", function () { ball.style.transform = ""; }, { passive: true });',
  '',
  '  var closeBtn = ROOT.querySelector("#btn-close");',
  '  if (closeBtn) {',
  '    closeBtn.style.display = "grid";',
  '    closeBtn.addEventListener("click", collapse);',
  '  }',
  '',
  '  // 装置运行时让悬浮球呼吸，收起后也能看出还在跑',
  '  var liveAnim = null;',
  '  function setLive(on) {',
  '    if (on && !liveAnim && ball.animate) {',
  '      liveAnim = ball.animate([',
  '        { boxShadow: "0 8px 26px rgba(255,47,110,.45)" },',
  '        { boxShadow: "0 0 0 12px rgba(255,47,110,0), 0 10px 34px rgba(255,47,110,.95)" }',
  '      ], { duration: 1300, iterations: Infinity, direction: "alternate" });',
  '    } else if (!on && liveAnim) {',
  '      liveAnim.cancel(); liveAnim = null; ball.style.boxShadow = "0 8px 26px rgba(255,47,110,.5)";',
  '    }',
  '  }',
  '  setInterval(function () {',
  '    var p = ROOT.querySelector("#power");',
  '    setLive(!!p && p.textContent.indexOf("停") >= 0);',
  '  }, 900);',
  '',
  '  window.__TOYLINK__ = {',
  '    version: "' + VERSION + '",',
  '    host: host, root: root, ball: ball, page: PAGE,',
  '    open: open, collapse: collapse, toggle: toggle,',
  '    stop: function () {',
  '      try { if (NAV.vibrate) NAV.vibrate(0); } catch (e) { /* noop */ }',
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
  '    if (rsb) rsb([{ name: "' + BTN_NAME + '", visible: true }]);',
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
  '    } catch (e) { /* noop */ }',
  '  }, 400);',
  '}',
  '',
  '// 酒馆页面可能尚未就绪',
  'try {',
  '  if (typeof $ === "function") { $(function () { TOYLINK_BOOT(); }); } else { TOYLINK_BOOT(); }',
  '} catch (e) {',
  '  if (document.readyState === "loading") {',
  '    document.addEventListener("DOMContentLoaded", TOYLINK_BOOT);',
  '  } else {',
  '    TOYLINK_BOOT();',
  '  }',
  '}'
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
 *   dist/latest.js              指针失效时的兜底
 * 加载器每次启动问一次指针，按版本号拼地址，拉下来直接执行。
 */
fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(OUT_VERSIONED, ARTIFACT, 'utf8');
fs.writeFileSync(OUT_LATEST, ARTIFACT, 'utf8');
fs.writeFileSync(POINTER_FILE, VERSION + '\n', 'utf8');

const OWNER = 'fJForever';
const REPO = 'toy-link';
const BRANCH = 'main';

const LOADER = [
  '/* ============================================================',
  ' * TOY·LINK 装置模拟器 · 在线加载器 v' + VERSION + ' 时期的分发结构',
  ' *',
  ' * 脚本库里只放这一段，以后再也不用换。它每次启动做的事：',
  ' *   1. 拉 version.txt，问「现在该用哪一版」',
  ' *   2. 按版本号拼出本体地址 —— 每版都是新文件名，所以是新 URL，缓存挡不住',
  ' *   3. 三个源依次试，哪个通用哪个（jsDelivr / fastly / GitHub raw）',
  ' *   4. 在全局作用域执行本体',
  ' *',
  ' * 为什么绕这一圈：固定地址的 CDN 响应带 7 天浏览器缓存，purge 清不到浏览器。',
  ' * 指针用 GitHub raw，缓存只有几分钟，比 CDN 的 12 小时可靠得多。',
  ' *',
  ' * 安装：酒馆助手 → 脚本库 → 新建脚本 → 全文粘贴这一段 → 保存启用。',
  ' * 之后作者发版，你刷新酒馆页面就是新版，不用再动这里。',
  ' * ============================================================ */',
  '(async function () {',
  '  var OWNER = "' + OWNER + '", REPO = "' + REPO + '", BRANCH = "' + BRANCH + '";',
  '',
  '  // 日志只用 console.log —— 酒馆助手会吞掉脚本 iframe 里的 warn / info',
  '  function log(m) { try { console.log("[TOY·LINK 加载器] " + m); } catch (e) {} }',
  '',
  '  var POINTER = "https://raw.githubusercontent.com/" + OWNER + "/" + REPO + "/" + BRANCH + "/version.txt";',
  '  var BASES = [',
  '    "https://cdn.jsdelivr.net/gh/" + OWNER + "/" + REPO + "@" + BRANCH + "/dist/",',
  '    "https://fastly.jsdelivr.net/gh/" + OWNER + "/" + REPO + "@" + BRANCH + "/dist/",',
  '    "https://raw.githubusercontent.com/" + OWNER + "/" + REPO + "/" + BRANCH + "/dist/"',
  '  ];',
  '',
  '  // 带闸刀的 fetch：被墙的域不会报错，会一直挂着，必须自己超时',
  '  function get(url, ms) {',
  '    var ctl = (typeof AbortController !== "undefined") ? new AbortController() : null;',
  '    var timer = ctl ? setTimeout(function () { ctl.abort(); }, ms) : null;',
  '    return fetch(url, { cache: "no-store", signal: ctl ? ctl.signal : undefined }).then(',
  '      function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); }',
  '    ).then(function (t) { if (timer) clearTimeout(timer); return t; },',
  '           function (e) { if (timer) clearTimeout(timer); throw e; });',
  '  }',
  '',
  '  var ver = "";',
  '  try {',
  '    var raw = (await get(POINTER, 6000)).trim();',
  '    // 只认干净的版本号，指针文件万一被写坏也不会拼出奇怪的 URL',
  '    if (/^[0-9]+\\.[0-9]+\\.[0-9]+$/.test(raw)) { ver = raw; log("版本指针 = " + ver); }',
  '    else log("指针内容不合法，忽略：" + raw.slice(0, 40));',
  '  } catch (e) { log("拿不到指针：" + ((e && e.message) || e)); }',
  '',
  '  // 指针拿不到就退回 latest.js，至少还能跑，只是可能落后一个版本',
  '  var file = ver ? ("TOY-LINK-" + ver + ".js") : "latest.js";',
  '',
  '  var code = null, lastErr = null;',
  '  for (var i = 0; i < BASES.length && code === null; i++) {',
  '    var url = BASES[i] + file;',
  '    try {',
  '      var t = await get(url, 12000);',
  '      if (!t || t.length < 1000) throw new Error("内容异常 " + (t ? t.length : 0) + " 字符");',
  '      code = t;',
  '      log("已加载 " + url + "（" + t.length + " 字符）");',
  '    } catch (e) { lastErr = e; log("失败 " + url + "：" + ((e && e.message) || e)); }',
  '  }',
  '',
  '  if (code === null) {',
  '    try { toastr.error("TOY·LINK 加载失败，检查网络后刷新重试", "TOY·LINK"); } catch (e) {}',
  '    log("所有源都不通：" + ((lastErr && lastErr.message) || lastErr));',
  '    return;',
  '  }',
  '',
  '  // 间接 eval：(0, eval) 在全局作用域执行，本体里的函数才会挂到 window 上。',
  '  // 直接 eval(code) 会被关在这个 async 函数里，面板挂载后引用全丢。',
  '  try { (0, eval)(code); } catch (e) {',
  '    try { toastr.error("TOY·LINK 执行出错：" + ((e && e.message) || e), "TOY·LINK"); } catch (e2) {}',
  '    log("执行失败：" + ((e && e.message) || e));',
  '  }',
  '})();',
  ''
].join('\n');

const INSTALL_FILE = path.join(DIR, '加载器-粘进脚本库.js');
fs.writeFileSync(INSTALL_FILE, LOADER, 'utf8');

const kb = (Buffer.byteLength(ARTIFACT, 'utf8') / 1024).toFixed(1);
console.log('已生成: ' + path.basename(OUT) + '  (' + kb + ' kB, 本地用)');
console.log('已生成: dist/' + path.basename(OUT_VERSIONED) + '  (' + kb + ' kB, 发版用)');
console.log('已生成: dist/latest.js  (指针失效时兜底)');
console.log('已生成: version.txt  → ' + VERSION);
console.log('已生成: ' + path.basename(INSTALL_FILE) + '  (整段粘进脚本库)');
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

/* ---------- 加载器的可导入版本 ----------
 * 同一段加载器，打包成脚本库「导入」能直接选的文件。
 * 不带 button 字段：按钮由本体自己注册，加载器只负责把本体拉下来执行。 */
const LOADER_JSON = path.join(DIR, '加载器.json');
fs.writeFileSync(LOADER_JSON, JSON.stringify({
  type: 'script',
  enabled: true,
  name: 'TOY·LINK 装置模拟器（在线）',
  id: 'toylink-loader',
  content: LOADER,
  info: [
    'v' + VERSION + ' 时期的加载器 · 在线版',
    '',
    '装上之后不用再管：作者发版，你刷新酒馆页面就是新版，这里永远不用换。',
    '',
    '它每次启动先去问一个版本指针（version.txt），拿到版本号再拉对应的本体执行。',
    '每版都是新文件名、也就是新网址，所以不会被浏览器缓存挡住 —— 这正是',
    '一行 import 指向固定网址做不到的，那种网址会被缓存 7 天。',
    '',
    '三个源轮换：jsDelivr → fastly → GitHub raw；拿不到指针时退回 latest.js。',
    '需要联网。要离线用就导入离线版那个 JSON。',
    '',
    '导入后请手动打开右边的开关（酒馆助手导入的脚本默认是关闭状态）。'
  ].join('\n'),
  button: { enabled: false, buttons: [] },
  data: {},
  export_with: { data: false, button: false }
}, null, 2), 'utf8');
console.log('已生成: ' + path.basename(LOADER_JSON) + '  (脚本库「导入」可直接选它 · 在线版)');

console.log('已生成: ' + path.basename(IMPORT_FILE) + '  (脚本库「导入」可直接选它)');
