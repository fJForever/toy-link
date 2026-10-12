/* ============================================================
 * TOY·LINK 装置模拟器 v1.11.2 · 酒馆助手脚本
 *
 * 由 index.html 自动构建，请勿直接手改本文件；改 index.html 后重跑：
 *   node 工具-构建脚本版.js
 *
 * 安装：酒馆助手 → 脚本库（全局 / 预设 / 角色卡任选）→ 新建脚本 → 全文粘贴
 * 使用：右下角悬浮球开合，或点脚本按钮「TOY·LINK 控制器」
 * ============================================================ */
function TOYLINK_BOOT() {
  "use strict";

  /* 已经跑着一个实例。
   * 版本相同：是重复点脚本按钮，切换面板即可。
   * 版本不同：说明先执行的是旧版 —— 这正是换新脚本后最常见的困惑，
   *   用户换了地址、也刷新了，界面却一点没变，因为旧实例还在，新版一进门就退出。
   *   这里把旧实例拆掉，让新版接管。 */
  if (window.__TOYLINK__ && document.getElementById("__toylink_host__")) {
    if (window.__TOYLINK__.version === "1.11.2") {
      window.__TOYLINK__.toggle();
      return;
    }
    try { console.log("[TOY·LINK] 发现旧版 " + window.__TOYLINK__.version + "，拆掉它换成 1.11.2"); } catch (e) {}
    try { if (window.__TOYLINK__.stop) window.__TOYLINK__.stop(); } catch (e) { /* 旧版可能没有 stop */ }
    try {
      var oldHost = document.getElementById("__toylink_host__"); if (oldHost) oldHost.remove();
      var oldBall = document.getElementById("__toylink_ball__"); if (oldBall) oldBall.remove();
      var oldCss = document.getElementById("__toylink_ball___css"); if (oldCss) oldCss.remove();
      window.__TOYLINK__ = null;
    } catch (e) { /* noop */ }
  }

  /* ==================== 定位酒馆页面 ====================
   * 本脚本运行在酒馆助手的 iframe 里，document 是该 iframe 的 document。
   * 界面必须挂到真正的酒馆页面上，否则谁也看不见。
   * 顺序：酒馆页面 jQuery 的 $("body") → 同源的 window.parent → 自身（退化）。
   */
  function resolvePage() {
    try {
      if (typeof $ === "function") {
        var b = $("body");
        if (b && b.length && b[0] && b[0].ownerDocument && b[0].ownerDocument !== document) {
          return { doc: b[0].ownerDocument, win: b[0].ownerDocument.defaultView || window, via: "jquery" };
        }
      }
    } catch (e) { /* noop */ }
    try {
      var p = window.parent;
      if (p && p !== window && p.document && p.document.body) {
        return { doc: p.document, win: p, via: "parent" };
      }
    } catch (e) { /* 跨域则放弃 */ }
    return { doc: document, win: window, via: "self" };
  }

  var PAGE = resolvePage();
  var DOC = PAGE.doc, WIN = PAGE.win;

  // 事件双绑：无论界面挂在哪一层，都能收到 resize / 触控
  var WINS = [window], DOCS = [document];
  if (WIN !== window && WINS.indexOf(WIN) < 0) WINS.push(WIN);
  if (DOC !== document && DOCS.indexOf(DOC) < 0) DOCS.push(DOC);
  function eachWin(fn) { for (var i = 0; i < WINS.length; i++) { try { fn(WINS[i]); } catch (e) { /* noop */ } } }
  function eachDoc(fn) { for (var i = 0; i < DOCS.length; i++) { try { fn(DOCS[i]); } catch (e) { /* noop */ } } }
  function ONWIN(t, f, o) { eachWin(function (w) { w.addEventListener(t, f, o); }); }
  function OFFWIN(t, f, o) { eachWin(function (w) { w.removeEventListener(t, f, o); }); }
  function ONDOC(t, f, o) { eachDoc(function (d) { d.addEventListener(t, f, o); }); }
  function MOUNT(el) {
    try { DOC.body.appendChild(el); } catch (e) { document.body.appendChild(el); }
  }
  function BYID(id) {
    try { return DOC.getElementById(id) || document.getElementById(id); } catch (e) { return document.getElementById(id); }
  }
  var NAV = (WIN.navigator) || navigator;

  var CSS = "/* ==== 注入宿主样式（脚本版专有） ====\n   变量在这里重新声明一遍，不依赖从酒馆页面继承，\n   免得宿主环境的样式差异把面板配色带偏。 */\n:host{\n  position:fixed;inset:0;z-index:2147483000;display:block;\n  --bg:#120a13;--bg-glow-1:rgba(150,62,156,.22);--bg-glow-2:rgba(214,189,150,.06);\n  --card:rgba(238,222,242,.045);--card-2:rgba(238,222,242,.07);\n  --line:rgba(232,214,236,.10);--line-2:rgba(232,214,236,.18);\n  --hot:#c06cc2;--hot-2:#e2b6df;--hot-deep:#76207a;--cyan:#d6bd96;--amber:#eba866;\n  --cyan-a08:rgba(214,189,150,.08);--cyan-a40:rgba(214,189,150,.40);--cyan-a75:rgba(214,189,150,.75);\n  --hot-a12:rgba(192,108,194,.12);--hot-a20:rgba(192,108,194,.20);--hot-a28:rgba(192,108,194,.28);\n  --hot-a35:rgba(192,108,194,.35);--hot-a45:rgba(192,108,194,.45);--hot-a55:rgba(192,108,194,.55);\n  --hot-a75:rgba(192,108,194,.75);\n  --text:#f4ece3;--dim:#b9a5ad;--dim-2:#958290;\n  --r:16px;--safe-t:env(safe-area-inset-top,0px);--safe-b:env(safe-area-inset-bottom,0px);\n  --font:\"PingFang SC\",\"HarmonyOS Sans SC\",\"Hiragino Sans GB\",\"Source Han Sans SC\",\"Microsoft YaHei\",system-ui,-apple-system,sans-serif;\n}\n#btn-close{display:none}\n\n/* ============================================================\n   TOY·LINK 手机端遥控器\n   单文件前端卡，零构建。运行环境：酒馆助手（Tavern Helper）iframe\n\n   两套主题靠变量切换（和悬浮球一套：梅紫硅胶 · 奶白底盘 · 香槟金环，哑光不反光）：\n     · 遥控器在你手里（默认）→ 梅紫 + 香槟金，底色梅黑\n     · 遥控器在 TA 手里     → 酒红 / 石榴红 + 香槟金，主导权不在你手上\n   --cyan 沿用旧名，现在是香槟金（第二强调色：累积环、选中芯片、余像线）。\n   除背景渐变外不写第二套规则，全部靠变量自动跟随。\n   ============================================================ */\n:root{\n  --bg:#120a13;\n  --bg-glow-1:rgba(150,62,156,.22);\n  --bg-glow-2:rgba(214,189,150,.06);\n  --card:rgba(238,222,242,.045);\n  --card-2:rgba(238,222,242,.07);\n  --line:rgba(232,214,236,.10);\n  --line-2:rgba(232,214,236,.18);\n  --hot:#c06cc2;\n  --hot-2:#e2b6df;\n  --hot-deep:#76207a;\n  --hot-a12:rgba(192,108,194,.12);\n  --hot-a20:rgba(192,108,194,.20);\n  --hot-a28:rgba(192,108,194,.28);\n  --hot-a35:rgba(192,108,194,.35);\n  --hot-a45:rgba(192,108,194,.45);\n  --hot-a55:rgba(192,108,194,.55);\n  --hot-a75:rgba(192,108,194,.75);\n  --cyan:#d6bd96;\n  --cyan-a08:rgba(214,189,150,.08);\n  --cyan-a40:rgba(214,189,150,.40);\n  --cyan-a75:rgba(214,189,150,.75);\n  --amber:#eba866;\n  --text:#f4ece3;\n  --dim:#b9a5ad;\n  --dim-2:#958290;\n  --r:16px;\n  --safe-t:env(safe-area-inset-top,0px);\n  --safe-b:env(safe-area-inset-bottom,0px);\n  --font:\"PingFang SC\",\"HarmonyOS Sans SC\",\"Hiragino Sans GB\",\"Source Han Sans SC\",\"Microsoft YaHei\",system-ui,-apple-system,sans-serif;\n}\n*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}\nhtml,body{height:100%;margin:0}\nbody{\n  font-family:var(--font);\n  color:var(--text);\n  background:var(--bg);\n  overflow:hidden;\n  overscroll-behavior:none;\n  -webkit-font-smoothing:antialiased;\n}\nbutton,input{font-family:inherit;color:inherit}\nbutton{border:0;background:none;cursor:pointer}\n\n/* ---------- 舞台与手机外壳 ---------- */\n#shell{\n  position:relative;\n  width:100%;height:100dvh;height:100vh;min-height:600px;min-height:100vh;\n  display:flex;flex-direction:column;\n  overflow:hidden;\n  font-family:var(--font);\n  color:var(--text);\n  /* 底色用常量，不依赖 CSS 变量；渐变叠在上面，即使变量失效也不会透出底下的内容 */\n  background-color:#120a13;\n  background-image:\n    radial-gradient(120% 70% at 12% -8%, var(--bg-glow-1), transparent 62%),\n    radial-gradient(110% 60% at 92% 6%, var(--bg-glow-2), transparent 58%),\n    linear-gradient(180deg,#1b0e1d 0%, #120a13 55%, #09050a 100%);\n}\n#shell::after{\n  content:\"\";position:absolute;inset:0;pointer-events:none;opacity:.5;\n  background-image:linear-gradient(rgba(232,214,236,.018) 1px,transparent 1px),\n                   linear-gradient(90deg,rgba(232,214,236,.018) 1px,transparent 1px);\n  background-size:26px 26px;\n  mask-image:radial-gradient(120% 80% at 50% 0%,#000 30%,transparent 100%);\n}\n@media (min-width:860px){\n  body{display:grid;place-items:center;background:#060307}\n  #shell{\n    width:404px;height:min(800px,92vh);max-height:92vh;min-height:0;\n    border-radius:34px;\n    border:1px solid rgba(232,214,236,.09);\n    box-shadow:0 40px 120px rgba(0,0,0,.75),0 0 0 10px rgba(232,214,236,.02);\n  }\n}\n/* 全屏模式：窄屏默认就是全屏；宽屏可以手动切换 */\n#shell.fit{\n  width:100%;height:100dvh;height:100vh;max-height:none;min-height:0;\n  border-radius:0;border:0;box-shadow:none;\n}\n\n/* ---------- 顶栏 ---------- */\n.bar{\n  position:relative;z-index:5;flex:none;\n  display:flex;align-items:center;gap:10px;\n  padding:calc(var(--safe-t) + 12px) 16px 12px;\n}\n.brand{display:flex;align-items:center;gap:8px;min-width:0}\n.logo{\n  /* 装置本体（和悬浮球同一只 C 形）：梅紫哑光硅胶 + 香槟金环，不垫底盘、不画高光 */\n  width:30px;height:30px;flex:none;display:grid;place-items:center;\n  filter:drop-shadow(0 1.5px 2px rgba(0,0,0,.5));\n}\n.logo svg{width:30px;height:30px;display:block;overflow:visible}\n.brand b{\n  font-size:12px;letter-spacing:.22em;font-weight:700;text-transform:uppercase;\n  white-space:nowrap;color:var(--text);\n}\n.brand b i{font-style:normal;color:var(--cyan)}\n.brand .ver{\n  font-size:9.5px;letter-spacing:.06em;color:var(--dim-2);\n  white-space:nowrap;margin-left:-2px;\n}\n.conn{\n  margin-left:auto;display:flex;align-items:center;gap:6px;\n  font-size:11px;color:var(--dim);\n  padding:5px 10px;border:1px solid var(--line);border-radius:999px;\n  background:var(--card);white-space:nowrap;\n}\n.dot{width:7px;height:7px;border-radius:50%;background:var(--dim-2);flex:none}\n/* 已连接：固定绿灯闪烁，不跟主题走 —— 它是状态指示，不是装饰。\n   跟着主题变会让「连上了」这件事在两档下颜色不同，反而不好认。 */\n.dot.live{background:#5fd08e;box-shadow:0 0 6px rgba(95,208,142,.55);animation:pulse 1.6s ease-in-out infinite}\n.dot.demo{background:var(--amber);box-shadow:0 0 5px var(--amber)}\n@keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}\n\n/* 顶栏小按钮 */\n.bar-btn{\n  flex:none;width:30px;height:30px;margin-left:8px;border-radius:10px;\n  border:1px solid var(--line);background:var(--card);color:var(--dim);\n  font-size:12px;line-height:1;display:grid;place-items:center;\n}\n.bar-btn:active{transform:scale(.94)}\n@media (max-width:859px){ .bar-btn.narrow-hide{display:none} }\n\n/* ---------- 作用对象切换（常驻，面板最上方） ----------\n   这一档换的不是参数，是整台机器谁说了算：\n   你操控 = 遥控台（梅紫、可点）；TA 操控 = 只读仪表（酒红、锁住档位）。 */\n.tgtbar{\n  position:relative;z-index:6;flex:none;\n  display:grid;grid-template-columns:1fr 1fr;gap:4px;\n  margin:0 16px 12px;padding:4px;border-radius:15px;\n  border:1px solid var(--line);background:rgba(238,222,242,.035);\n}\n.tgt-ind{\n  position:absolute;top:4px;bottom:4px;left:4px;width:calc(50% - 6px);\n  border-radius:11px;pointer-events:none;\n  background:linear-gradient(180deg,var(--hot-a28),var(--hot-a12));\n  border:1px solid var(--hot-a45);\n  box-shadow:0 2px 10px rgba(0,0,0,.25);\n  transition:transform .3s cubic-bezier(.4,0,.2,1),background .3s,border-color .3s,box-shadow .3s;\n}\n.tgt{\n  position:relative;z-index:1;padding:9px 6px;border-radius:11px;\n  display:flex;flex-direction:column;align-items:center;gap:2px;\n  color:var(--dim);transition:color .22s;\n}\n.tgt b{font-size:12.5px;font-weight:700;letter-spacing:.02em;white-space:nowrap}\n.tgt i{font-style:normal;font-size:9.5px;letter-spacing:.04em;opacity:.7;white-space:nowrap}\n.tgt.on{color:var(--text)}\n.tgt.on i{opacity:.85}\n\n/* 装置运行中：作用对象切换锁住。\n   这不是防误触，是防矛盾 —— 运行中换对象会整本重写世界书，\n   而装置还带着上一个对象的运行状态，AI 会同时收到两套说法。\n   要换就先停。 */\n.tgtbar.locked{opacity:.45}\n.tgtbar.locked .tgt{cursor:not-allowed}\n.tgtbar.locked .tgt-ind{filter:grayscale(.55)}\n.tgtbar.locked .tgt:active{transform:none}\n\n/* 切到 TA 拿着遥控器：主导权不在你手上，整机从梅紫换成酒红 / 石榴红（悬浮球晕光同步变红）。\n   香槟金不变，还是同一个牌子；这里只换变量和背景，其余规则全部靠 var() 自动跟随。 */\n#shell.tgt-user{\n  --hot:#e0566f;\n  --hot-2:#f2b0ba;\n  --hot-deep:#8a1a33;\n  --hot-a12:rgba(224,86,111,.12);\n  --hot-a20:rgba(224,86,111,.20);\n  --hot-a28:rgba(224,86,111,.28);\n  --hot-a35:rgba(224,86,111,.35);\n  --hot-a45:rgba(224,86,111,.45);\n  --hot-a55:rgba(224,86,111,.55);\n  --hot-a75:rgba(224,86,111,.75);\n  --bg-glow-1:rgba(176,34,68,.26);\n  --bg-glow-2:rgba(214,189,150,.06);\n  --card:rgba(250,226,230,.045);\n  --card-2:rgba(250,226,230,.07);\n  --line:rgba(244,214,220,.10);\n  --line-2:rgba(244,214,220,.18);\n  --text:#f6ebe5;\n  --dim:#bfa2a5;\n  --dim-2:#9a7f83;\n  background-color:#13070a;\n  background-image:\n    radial-gradient(120% 70% at 12% -8%, var(--bg-glow-1), transparent 62%),\n    radial-gradient(110% 60% at 92% 6%, var(--bg-glow-2), transparent 58%),\n    linear-gradient(180deg,#1e0a10 0%, #13070a 55%, #0a0305 100%);\n}\n#shell.tgt-user .tgt-ind{transform:translateX(calc(100% + 4px))}\n/* 圆环渐变：两个停靠点跟着主色走 */\n.ring .s1{stop-color:var(--cyan)}\n.ring .s2{stop-color:var(--hot)}\n.ring .s3{stop-color:var(--hot-2)}\n#v-device.locked .ring .s3{stop-color:var(--hot-2)}\n\n/* 遥控器在 TA 手里时，档位控件整体降级为只读仪表 */\n.lockbar{\n  margin:0 0 12px;padding:10px 13px;border-radius:13px;\n  border:1px dashed var(--hot-a45);background:var(--hot-a12);\n  display:flex;flex-direction:column;gap:3px;\n}\n.lockbar b{font-size:12px;color:var(--hot-2);letter-spacing:.04em}\n.lockbar span{font-size:11px;color:var(--dim);line-height:1.55}\n.lockbar[hidden]{display:none}\n.lockbar.pending{border-style:solid;animation:lockpulse 1.5s ease-in-out infinite}\n@keyframes lockpulse{0%,100%{opacity:1}50%{opacity:.5}}\n\n/* 请求停止：遥控器在 TA 手里时，这是玩家唯一还能做的事。\n   放在电源区上方常驻，不跟着内容滚 —— 做成呼吸的样子，因为它得一直勾着人去按。\n   配色走琥珀而不是主色：主色是\"谁在掌控\"，求饶是另一回事，混在一起两个按钮会糊成一团。 */\n.begbar{flex:none;padding:0 16px 10px}\n.begbar[hidden]{display:none}\n.beg{\n  display:flex;flex-direction:column;align-items:center;gap:3px;\n  width:100%;padding:12px 14px;border-radius:14px;\n  border:1px solid rgba(235,168,102,.48);\n  background:linear-gradient(180deg,rgba(235,168,102,.16),rgba(235,168,102,.06));\n  animation:begbreath 3.2s ease-in-out infinite;\n}\n.beg b{font-size:13.5px;font-weight:700;letter-spacing:.06em;color:#f6d3a8}\n.beg i{font-style:normal;font-size:10.5px;color:var(--dim);letter-spacing:.04em;text-align:center}\n.beg:active{transform:scale(.985)}\n.beg:disabled{animation:none;opacity:.6}\n@keyframes begbreath{\n  0%,100%{box-shadow:0 0 0 0 rgba(235,168,102,.20)}\n  50%{box-shadow:0 0 18px 1px rgba(235,168,102,.20)}\n}\n\n/* 只读态：能看不能碰。当前档位仍然高亮，因为它就是\"TA 现在用的是哪一档\" */\n#v-device.locked .modes{opacity:.5}\n#v-device.locked .mode{cursor:default;transition:none}\n/* 真 disabled 的按钮会被浏览器套上灰字色，会把 currentColor 的图标一起带灰，改回来 */\n#v-device.locked .mode:disabled{color:inherit}\n#v-device.locked .mode:active{transform:none}\n#v-device.locked .mode.on{\n  opacity:1;\n  border-color:var(--hot-a75);\n  background:linear-gradient(180deg,var(--hot-a20),var(--hot-a12));\n  box-shadow:none;\n}\n#v-device.locked .ctl input[type=range]{opacity:.55;pointer-events:none}\n#v-device.locked .ctl input[type=range]::-webkit-slider-thumb{box-shadow:none}\n#v-device.locked #dur-chips{opacity:.5;pointer-events:none}\n#v-device.locked .chip{cursor:default}\n#v-device.locked .chip:active{transform:none}\n\n/* ---------- 主舞台 ---------- */\n.stage{\n  position:relative;z-index:2;flex:1 1 auto;min-height:0;\n  overflow-y:auto;overscroll-behavior:contain;\n  -webkit-overflow-scrolling:touch;\n  padding:2px 16px 20px;\n  scrollbar-width:none;\n}\n.stage::-webkit-scrollbar{display:none}\n.stage[hidden]{display:none}\n\n/* ---------- 圆环仪表 ---------- */\n.hero{\n  position:relative;\n  display:grid;place-items:center;\n  padding:6px 0 4px;\n}\n.ring{position:relative;width:min(232px,56vw,30vh);height:min(232px,56vw,30vh)}\n@media (max-height:700px){\n  .wave-wrap{height:52px}\n  .readout .big{font-size:clamp(30px,10vw,42px)}\n}\n.ring svg{width:100%;height:100%;transform:rotate(-90deg)}\n.ring .trk{fill:none;stroke:rgba(232,214,236,.07);stroke-width:7}\n.ring .val{fill:none;stroke:url(#gr);stroke-width:7;stroke-linecap:round;\n  transition:stroke-dasharray .12s linear}\n.ring .val2{fill:none;stroke:var(--cyan-a75);stroke-width:3;stroke-linecap:round}\n.readout{\n  position:absolute;inset:0;display:grid;place-content:center;text-align:center;gap:2px;\n}\n.readout .big{\n  font-size:clamp(38px,13vw,54px);font-weight:800;line-height:1;letter-spacing:-.02em;\n  font-variant-numeric:tabular-nums;color:var(--text);\n}\n.readout .big small{font-size:.38em;font-weight:600;letter-spacing:.06em;color:var(--dim);margin-left:4px}\n.readout .sub{font-size:11.5px;color:var(--dim);letter-spacing:.14em;font-variant-numeric:tabular-nums}\n.readout .mode-tag{\n  margin-top:6px;font-size:11px;color:var(--hot-2);letter-spacing:.2em;\n  text-transform:uppercase;\n}\n.ring.off .val{stroke:rgba(232,214,236,.10)}\n.ring.off .big{color:var(--dim);text-shadow:none}\n\n/* ---------- 波形 ---------- */\n.wave-wrap{\n  position:relative;margin:10px 0 2px;height:66px;border-radius:14px;\n  border:1px solid var(--line);background:linear-gradient(180deg,rgba(238,222,242,.035),rgba(238,222,242,.01));\n  overflow:hidden;\n}\n.wave-wrap canvas{position:absolute;inset:0;width:100%;height:100%;display:block}\n.wave-tag{\n  position:absolute;left:10px;top:7px;font-size:9.5px;letter-spacing:.2em;\n  color:var(--dim-2);text-transform:uppercase;\n}\n\n/* ---------- 阶段进度 ---------- */\n.phases{display:flex;gap:6px;margin:12px 0 4px}\n.phase{flex:1;height:4px;border-radius:4px;background:rgba(232,214,236,.09);overflow:hidden}\n.phase i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--cyan),var(--hot));transition:width .3s}\n.phase.done i{width:100%}\n.freeze{\n  margin:9px 0 0;padding:7px 12px;border-radius:10px;text-align:center;\n  font-size:11.5px;letter-spacing:.05em;color:var(--cyan);cursor:pointer;\n  border:1px dashed var(--cyan-a40);background:var(--cyan-a08);\n}\n.freeze:active{transform:scale(.99)}\n.freeze[hidden]{display:none}\n.phase-head{display:flex;justify-content:space-between;font-size:11px;color:var(--dim);letter-spacing:.1em}\n.phase-head b{color:var(--text);font-weight:600}\n\n/* ---------- 通用面板 ---------- */\n.panel{\n  margin-top:14px;padding:14px;border-radius:var(--r);\n  border:1px solid var(--line);background:var(--card);\n  backdrop-filter:blur(6px);\n}\n.panel h3{\n  margin:0 0 11px;font-size:10.5px;letter-spacing:.2em;color:var(--dim-2);\n  text-transform:uppercase;font-weight:700;\n}\n.panel h3 .tag{\n  margin-left:8px;padding:2px 8px;border-radius:999px;\n  font-size:9.5px;letter-spacing:.06em;text-transform:none;font-weight:600;\n  color:var(--amber);background:rgba(235,168,102,.10);\n  border:1px solid rgba(235,168,102,.32);\n}\n.panel h3 .tag:empty{display:none}\n\n/* ---------- 模式网格 ---------- */\n.modes{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}\n@media (max-width:360px){.modes{grid-template-columns:repeat(3,1fr)}}\n.mode{\n  position:relative;padding:11px 4px 9px;border-radius:13px;\n  border:1px solid var(--line);background:rgba(238,222,242,.025);\n  display:flex;flex-direction:column;align-items:center;gap:5px;\n  transition:transform .12s,border-color .18s,background .18s;\n}\n.mode:active{transform:scale(.94)}\n.mode svg{width:26px;height:26px;opacity:.8;color:var(--cyan)}\n.mode span{font-size:10.5px;letter-spacing:.04em;color:var(--dim)}\n.mode.on{\n  border-color:var(--hot-a75);\n  background:linear-gradient(180deg,var(--hot-a20),var(--hot-a12));\n  box-shadow:0 4px 14px rgba(0,0,0,.22);\n}\n.mode.on svg{opacity:1;color:var(--hot-2)}\n.mode.on span{color:var(--text);font-weight:600}\n\n/* ---------- 滑块 ---------- */\n.ctl{display:block;margin-top:14px}\n.ctl:first-of-type{margin-top:0}\n.ctl .row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}\n.ctl .row span{font-size:12px;color:var(--dim);letter-spacing:.08em}\n.ctl .row b{\n  font-size:15px;font-weight:700;font-variant-numeric:tabular-nums;\n  color:var(--text);letter-spacing:.02em;\n}\n.ctl .row b em{font-style:normal;font-size:10.5px;color:var(--dim);margin-left:2px;letter-spacing:.06em}\ninput[type=range]{\n  -webkit-appearance:none;appearance:none;width:100%;height:30px;background:transparent;\n}\ninput[type=range]::-webkit-slider-runnable-track{\n  height:6px;border-radius:6px;\n  background:linear-gradient(90deg,var(--hot) var(--p,50%),rgba(232,214,236,.10) var(--p,50%));\n}\ninput[type=range]::-webkit-slider-thumb{\n  -webkit-appearance:none;width:22px;height:22px;margin-top:-8px;border-radius:50%;\n  background:#f6efe7;border:3px solid var(--hot);\n  box-shadow:0 2px 6px rgba(0,0,0,.4);\n}\ninput[type=range]::-moz-range-track{height:6px;border-radius:6px;background:rgba(232,214,236,.10)}\ninput[type=range]::-moz-range-progress{height:6px;border-radius:6px;background:var(--hot)}\ninput[type=range]::-moz-range-thumb{\n  width:22px;height:22px;border-radius:50%;background:#f6efe7;border:3px solid var(--hot);\n}\n\n/* ---------- 快捷芯片 ---------- */\n.chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}\n.chip{\n  padding:7px 12px;border-radius:999px;font-size:11.5px;color:var(--dim);\n  border:1px solid var(--line);background:rgba(238,222,242,.025);\n}\n.chip.on{border-color:var(--cyan-a75);color:#efe0c6;background:var(--cyan-a08)}\n.chip:active{transform:scale(.96)}\n\n/* ---------- 电源键 ---------- */\n.powerbar{\n  position:relative;z-index:5;flex:none;display:flex;gap:10px;\n  padding:12px 16px calc(var(--safe-b) + 12px);\n  border-top:1px solid var(--line);\n  background:linear-gradient(180deg,rgba(10,5,10,.35),rgba(10,5,10,.92));\n  backdrop-filter:blur(12px);\n}\n.power{\n  flex:1;padding:15px;border-radius:15px;font-size:14.5px;font-weight:700;letter-spacing:.1em;\n  background:linear-gradient(160deg,var(--hot) -35%,var(--hot-deep,#76207a) 90%);\n  color:#fbf6f0;box-shadow:0 6px 18px rgba(0,0,0,.35);\n  transition:transform .12s,filter .2s;\n}\n.power:active{transform:scale(.975)}\n.power.stop{background:linear-gradient(160deg,#352a36,#1f1720);color:var(--text);box-shadow:none;border:1px solid var(--line-2)}\n.ghost{\n  flex:none;width:56px;border-radius:15px;border:1px solid var(--line);\n  background:var(--card);display:grid;place-items:center;font-size:19px;color:var(--cyan);\n}\n.ghost:active{transform:scale(.95)}\n\n/* ---------- 视图切换 ---------- */\n.dock{\n  position:relative;z-index:5;flex:none;display:flex;\n  border-top:1px solid var(--line);\n  padding-bottom:var(--safe-b);background:rgba(10,5,10,.92);\n}\n.tab{\n  flex:1;padding:10px 4px calc(10px + var(--safe-b)/2);font-size:11px;color:var(--dim-2);\n  letter-spacing:.1em;position:relative;\n}\n.tab.on{color:var(--text)}\n.tab.on::after{\n  content:\"\";position:absolute;left:50%;top:0;transform:translateX(-50%);\n  width:26px;height:2px;border-radius:2px;background:var(--cyan);\n}\n.tab b{display:block;font-size:16px;font-weight:400;margin-bottom:3px}\n.tab.on b{color:var(--cyan)}\n\n/* ---------- 对话流 ---------- */\n.say{\n  position:sticky;top:0;z-index:4;display:flex;gap:8px;\n  padding:7px 0 11px;\n  background:linear-gradient(180deg,rgba(13,7,11,.97) 30%,rgba(13,7,11,.72) 78%,rgba(13,7,11,0));\n}\n.say input{\n  flex:1;min-width:0;padding:11px 14px;border-radius:12px;font-size:16px;\n  border:1px solid var(--line);background:rgba(0,0,0,.42);outline:none;\n}\n.say input:focus{border-color:var(--hot-a55)}\n.say button{\n  flex:none;padding:0 18px;border-radius:12px;font-size:13px;font-weight:700;color:#fbf6f0;\n  background:linear-gradient(160deg,var(--hot) -35%,var(--hot-deep) 90%);\n}\n.say button:active{transform:scale(.96)}\n.feed{display:flex;flex-direction:column;gap:12px;padding:4px 0 8px}\n.feed-empty{\n  text-align:center;color:var(--dim-2);font-size:12px;line-height:2;\n  padding:56px 20px;letter-spacing:.08em;\n}\n.msg{max-width:100%;animation:rise .45s cubic-bezier(.2,.7,.3,1)}\n@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}\n.msg .who{\n  display:flex;align-items:center;gap:7px;font-size:10.5px;color:var(--dim-2);\n  letter-spacing:.16em;text-transform:uppercase;margin-bottom:6px;\n}\n.msg .who i{width:16px;height:16px;border-radius:5px;background:linear-gradient(160deg,var(--hot),var(--hot-deep));display:block}\n.msg .bubble{\n  padding:12px 14px;border-radius:14px;font-size:13.5px;line-height:1.75;\n  background:var(--card-2);border:1px solid var(--line);white-space:pre-wrap;word-break:break-word;\n}\n.msg.me .bubble{background:var(--hot-a12);border-color:var(--hot-a28)}\n.msg.sys .bubble{\n  background:transparent;border-style:dashed;color:var(--dim);font-size:11.5px;padding:8px 12px;\n}\n.msg.now .bubble{box-shadow:0 0 0 1px var(--cyan-a40)}\n.blink::after{content:\"▍\";color:var(--cyan);animation:pulse 1s infinite}\n\n/* ---------- 设置页 ---------- */\n.field{\n  display:flex;align-items:center;justify-content:space-between;gap:12px;\n  padding:12px 0;border-bottom:1px solid var(--line);\n}\n.field:last-child{border-bottom:0}\n.field .lb{min-width:0}\n.field .lb b{display:block;font-size:13px;font-weight:600;margin-bottom:3px}\n.field .lb small{display:block;font-size:11px;color:var(--dim-2);line-height:1.5}\n.sw{\n  position:relative;width:46px;height:27px;border-radius:999px;flex:none;\n  background:rgba(232,214,236,.10);border:1px solid var(--line);transition:background .2s;\n}\n.sw i{\n  position:absolute;top:2.5px;left:2.5px;width:20px;height:20px;border-radius:50%;\n  background:#f6efe7;transition:transform .2s;\n}\n.sw.on{background:linear-gradient(160deg,var(--hot) -20%,var(--hot-deep) 100%);border-color:transparent}\n.sw.on i{transform:translateX(19px)}\n.mini{\n  flex:none;padding:8px 13px;border-radius:10px;font-size:12px;\n  border:1px solid var(--line);background:var(--card);color:var(--dim);\n}\n.mini:active{transform:scale(.96)}\n.num{\n  width:64px;padding:8px 10px;border-radius:10px;text-align:center;font-size:13px;\n  border:1px solid var(--line);background:rgba(0,0,0,.35);\n}\ntextarea{\n  width:100%;min-height:96px;margin-top:10px;padding:11px 12px;border-radius:12px;\n  border:1px solid var(--line);background:rgba(0,0,0,.35);color:var(--text);\n  font-size:12.5px;line-height:1.6;font-family:var(--font);resize:vertical;\n}\n.hint{font-size:11px;color:var(--dim-2);line-height:1.7;margin-top:8px}\n\n/* ---------- 吐司 ---------- */\n#toast{position:absolute;left:50%;bottom:12%;transform:translateX(-50%);z-index:99;\n  display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none}\n.tst{\n  padding:9px 16px;border-radius:999px;font-size:12px;\n  background:rgba(24,14,25,.95);border:1px solid var(--line-2);\n  box-shadow:0 8px 30px rgba(0,0,0,.6);animation:tin .25s;max-width:82vw;text-align:center;\n}\n@keyframes tin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}\n";
  var HTML = "<div id=\"shell\">\n\n  <header class=\"bar\">\n    <div class=\"brand\">\n      <span class=\"logo\" aria-hidden=\"true\"><svg viewBox=\"7 6 50 50\" xmlns=\"http://www.w3.org/2000/svg\"><defs><linearGradient id=\"lgPod\" x1=\"0\" y1=\"0\" x2=\".35\" y2=\"1\"><stop offset=\"0\" stop-color=\"#b25cb4\"/><stop offset=\".5\" stop-color=\"#8c3291\"/><stop offset=\"1\" stop-color=\"#5e1868\"/></linearGradient><linearGradient id=\"lgArm\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#9c43a1\"/><stop offset=\".6\" stop-color=\"#78247e\"/><stop offset=\"1\" stop-color=\"#561462\"/></linearGradient><linearGradient id=\"lgShade\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\".55\" stop-color=\"#2a0630\" stop-opacity=\"0\"/><stop offset=\"1\" stop-color=\"#2a0630\" stop-opacity=\".45\"/></linearGradient><linearGradient id=\"lgGold\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#ead9be\"/><stop offset=\".5\" stop-color=\"#cdb391\"/><stop offset=\"1\" stop-color=\"#9f8262\"/></linearGradient></defs><path d=\"M19.4 33 C13.6 35.6 9.6 41.6 12.6 47.4 C15.8 53.6 28 53.4 36.4 47.2 C40.4 44.2 43.2 40.8 44.6 37.6\" fill=\"none\" stroke=\"url(#lgArm)\" stroke-width=\"8.8\" stroke-linecap=\"round\"/><g transform=\"translate(24 31) rotate(-24)\"><path d=\"M0 -5 C6 -6.4 12 -8.6 19.5 -8.5 C27.5 -8.4 32 -4.6 32 0 C32 4.6 27.5 8.4 19.5 8.5 C12 8.6 6 6.4 0 5 Z\" fill=\"url(#lgPod)\"/><path d=\"M0 -5 C6 -6.4 12 -8.6 19.5 -8.5 C27.5 -8.4 32 -4.6 32 0 C32 4.6 27.5 8.4 19.5 8.5 C12 8.6 6 6.4 0 5 Z\" fill=\"url(#lgShade)\"/><path d=\"M-5.6 -4.9 Q-6.5 0 -5.6 4.9 L0.7 5.3 Q1.7 0 0.7 -5.3 Z\" fill=\"url(#lgGold)\"/><path d=\"M0.7 -5.3 Q1.7 0 0.7 5.3\" fill=\"none\" stroke=\"#6b5238\" stroke-opacity=\".45\" stroke-width=\".6\"/></g></svg></span>\n      <b>TOY<i>·</i>LINK</b>\n      <span class=\"ver\" id=\"brand-ver\"></span>\n    </div>\n    <div class=\"conn\" id=\"conn\"><span class=\"dot\" id=\"dot\"></span><span id=\"conn-txt\">待机</span></div>\n    <button class=\"bar-btn\" id=\"btn-size\" type=\"button\" aria-label=\"切换全屏/悬浮\">⤢</button>\n    <button class=\"bar-btn\" id=\"btn-close\" type=\"button\" aria-label=\"收起\">✕</button>\n  </header>\n\n  <!-- ============ 作用对象（常驻在面板最上方） ============\n       这一档决定的不是\"参数\"，而是整台机器谁说了算：\n       你操控 → 它是一台遥控台；TA 操控 → 它是一块只读仪表。 -->\n  <div class=\"tgtbar\" id=\"tgtbar\" data-t=\"char\">\n    <span class=\"tgt-ind\" aria-hidden=\"true\"></span>\n    <button class=\"tgt on\" id=\"tgt-char\" data-t=\"char\" type=\"button\">\n      <b>你拿着遥控器</b><i>装置在 TA 身上</i>\n    </button>\n    <button class=\"tgt\" id=\"tgt-user\" data-t=\"user\" type=\"button\">\n      <b>TA 拿着遥控器</b><i>装置在你身上</i>\n    </button>\n  </div>\n\n  <!-- ============ 设备页 ============ -->\n  <main class=\"stage\" id=\"v-device\">\n    <div class=\"lockbar\" id=\"lockbar\" hidden>\n      <b>遥控器在 TA 手里</b>\n      <span>档位由 TA 决定。下面的按钮只是\"催一下\"，TA 回复到了这里才会更新成现在的档位。</span>\n    </div>\n\n    <section class=\"hero\">\n      <div class=\"ring off\" id=\"ring\">\n        <svg viewBox=\"0 0 120 120\" aria-hidden=\"true\">\n          <defs>\n            <linearGradient id=\"gr\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n              <stop class=\"s1\" offset=\"0%\" stop-color=\"#d6bd96\"/>\n              <stop class=\"s2\" offset=\"55%\" stop-color=\"#c06cc2\"/>\n              <stop class=\"s3\" offset=\"100%\" stop-color=\"#e2b6df\"/>\n            </linearGradient>\n          </defs>\n          <circle class=\"trk\" cx=\"60\" cy=\"60\" r=\"52\"/>\n          <circle class=\"val2\" id=\"ring2\" cx=\"60\" cy=\"60\" r=\"43\"\n                  stroke-dasharray=\"0 999\"/>\n          <circle class=\"val\" id=\"ring1\" cx=\"60\" cy=\"60\" r=\"52\"\n                  stroke-dasharray=\"0 999\"/>\n        </svg>\n        <div class=\"readout\">\n          <div class=\"big\" id=\"big\">0<small>%</small></div>\n          <div class=\"sub\" id=\"sub\">8.4 Hz</div>\n          <div class=\"mode-tag\" id=\"mtag\">待机</div>\n        </div>\n      </div>\n    </section>\n\n    <div class=\"wave-wrap\">\n      <span class=\"wave-tag\">waveform</span>\n      <canvas id=\"wave\"></canvas>\n    </div>\n\n    <div class=\"phase-head\">\n      <span>累积 <b id=\"aro\">0</b>/100</span>\n      <span id=\"stage-name\">第 1 阶段 · 适应</span>\n    </div>\n    <div class=\"freeze\" id=\"freeze-tip\" hidden>AI 正在生成，剧情时间暂停 · 点这里立即继续</div>\n    <div class=\"phases\" id=\"phases\">\n      <div class=\"phase\"><i></i></div><div class=\"phase\"><i></i></div>\n      <div class=\"phase\"><i></i></div><div class=\"phase\"><i></i></div>\n      <div class=\"phase\"><i></i></div>\n    </div>\n\n    <section class=\"panel\">\n      <h3>震动模式<span class=\"tag\" id=\"modes-tag\"></span></h3>\n      <div class=\"modes\" id=\"modes\"></div>\n    </section>\n\n    <section class=\"panel\">\n      <h3>参数<span class=\"tag\" id=\"param-state\"></span></h3>\n      <label class=\"ctl\">\n        <div class=\"row\"><span>频率 FREQ</span><b id=\"fv\">8.4<em>Hz</em></b></div>\n        <input type=\"range\" id=\"freq\" min=\"1\" max=\"100\" value=\"42\">\n      </label>\n      <label class=\"ctl\">\n        <div class=\"row\"><span>强度 POWER</span><b id=\"pv\">62<em>%</em></b></div>\n        <input type=\"range\" id=\"pow\" min=\"1\" max=\"100\" value=\"62\">\n      </label>\n      <label class=\"ctl\">\n        <div class=\"row\"><span>限时 DURATION</span><b id=\"dv\">30<em>分</em></b></div>\n        <input type=\"range\" id=\"dur\" min=\"0\" max=\"90\" value=\"30\">\n      </label>\n      <div class=\"chips\" id=\"dur-chips\">\n        <button class=\"chip\" data-d=\"5\">5 分</button>\n        <button class=\"chip\" data-d=\"15\">15 分</button>\n        <button class=\"chip on\" data-d=\"30\">30 分</button>\n        <button class=\"chip\" data-d=\"60\">60 分</button>\n        <button class=\"chip\" data-d=\"0\">不限制</button>\n      </div>\n    </section>\n\n    <section class=\"panel\">\n      <h3>联动</h3>\n      <div class=\"chips\">\n        <button class=\"chip on\" id=\"c-auto\">自动反应</button>\n        <button class=\"chip on\" id=\"c-freeze\" title=\"打开后，AI 出字期间累积值暂停推进，等它写完再接着走\">等回复再走</button>\n        <button class=\"chip on\" id=\"c-haptap\" title=\"切模式、启停、切换作用对象时震一下\">按键震动</button>\n        <button class=\"chip\" id=\"c-hapfol\" title=\"装置运行时按实时频率一直震。手机马达分辨不出频率，实际是断续的哒哒声，且费电发热\">跟随震动</button>\n        <button class=\"chip\" id=\"c-audio\">声波模拟</button>\n        <button class=\"chip\" id=\"c-now\">立刻反应一次</button>\n      </div>\n      <div class=\"hint\" id=\"auto-hint\"></div>\n      <div class=\"hint\" id=\"hap-hint\"></div>\n    </section>\n  </main>\n\n  <!-- ============ 反应页 ============ -->\n  <main class=\"stage\" id=\"v-chat\" hidden>\n    <form class=\"say\" id=\"say-form\" autocomplete=\"off\">\n      <input id=\"say-input\" type=\"text\" placeholder=\"对 TA 说点什么…\" enterkeyhint=\"send\">\n      <button type=\"submit\">发送</button>\n    </form>\n    <div class=\"feed\" id=\"feed\">\n      <div class=\"feed-empty\">\n        还没有心声<br>装置跑起来之后，TA 心里在想什么会显示在这里\n      </div>\n    </div>\n  </main>\n\n  <!-- ============ 设置页 ============ -->\n  <main class=\"stage\" id=\"v-config\" hidden>\n    <section class=\"panel\">\n      <h3>与角色的联动</h3>\n      <div class=\"field\">\n        <div class=\"lb\"><b>回复出现在哪里</b><small>酒馆聊天：状态以系统提示注入，然后触发发言，回复照常进聊天记录。<br>面板内生成：回复流式显示在面板里，同时落库。</small></div>\n        <button class=\"mini\" id=\"s-drive\">酒馆聊天</button>\n      </div>\n      <div class=\"field\">\n        <div class=\"lb\"><b>身体反应</b><small id=\"s-body-note\">女性：没有不应期，一波刚落下一波能接上，顶点之后更敏感。<br>男性：顶点是一次性释放，之后有不应期，继续刺激只会变成酸胀难受。</small></div>\n        <button class=\"mini\" id=\"s-body\">女性</button>\n      </div>\n      <div class=\"field\">\n        <div class=\"lb\"><b>露骨描写</b><small id=\"s-scale-note\"></small></div>\n        <div class=\"sw on\" id=\"s-explicit\"><i></i></div>\n      </div>\n      <div class=\"field\">\n        <div class=\"lb\"><b>TA 会乖乖停手</b><small id=\"s-beg-note\">开：遥控器在 TA 手里时，你开口请求停下，TA 这一轮就答应。<br>关：TA 按自己的性格决定听不听，往往要请求两三次才松口——但求够了一定会松口。</small></div>\n        <div class=\"sw on\" id=\"s-beg\"><i></i></div>\n      </div>\n      <div class=\"field\">\n        <div class=\"lb\"><b>发送方式</b><small id=\"s-send-note\">generate：走插件自己的请求，不会撞上酒馆「生成中无法运行 /trigger」的限制。<br>slash：走酒馆原生流程。</small></div>\n        <button class=\"mini\" id=\"s-send\">generate</button>\n      </div>\n      <div class=\"field\">\n        <div class=\"lb\"><b>自动建立并绑定世界书</b><small>把装置设定写进一本名为「TOY·LINK 装置设定」的世界书，并挂到当前角色卡。不会覆盖你已有的同名世界书，也不会抢角色卡的主世界书。</small></div>\n        <div class=\"sw on\" id=\"s-wb\"><i></i></div>\n      </div>\n      <div class=\"field\">\n        <div class=\"lb\"><b>自动反应</b><small id=\"s-auto-note\">当前：开。装置状态变化会自动触发 AI 生成。</small></div>\n        <div class=\"sw on\" id=\"s-auto\"><i></i></div>\n      </div>\n      <div class=\"field\">\n        <div class=\"lb\"><b>注入状态提示词</b><small>每次生成前把装置状态放到提示词最前，角色不会忘记自己正处在什么状态。</small></div>\n        <div class=\"sw on\" id=\"s-inject\"><i></i></div>\n      </div>\n      <div class=\"field\">\n        <div class=\"lb\"><b>生成期间冻结剧情时间</b><small>默认打开。AI 出字期间累积值暂停推进，生成一结束立刻接着走，免得「换阶段」和「回复」撞在同一刻。波形照常跳动。</small></div>\n        <div class=\"sw on\" id=\"s-freeze\"><i></i></div>\n      </div>\n      <div class=\"field\">\n        <div class=\"lb\"><b>反应冷却</b><small>两次生成之间的最小间隔秒数。冷却期间的操作不会被丢掉，会攒起来在冷却结束时用最新状态触发一次。</small></div>\n        <input class=\"num\" id=\"s-cd\" type=\"number\" min=\"5\" max=\"600\" value=\"12\">\n      </div>\n      <div class=\"field\">\n        <div class=\"lb\"><b>阶段跃迁必触发</b><small>进入新阶段与临界爆发不受冷却限制。</small></div>\n        <div class=\"sw on\" id=\"s-stage\"><i></i></div>\n      </div>\n    </section>\n\n    <section class=\"panel\">\n      <h3>装置</h3>\n      <div class=\"field\">\n        <div class=\"lb\"><b>强度手感倍率</b><small>影响累积速度与临界到来的快慢。</small></div>\n        <input class=\"num\" id=\"s-gain\" type=\"number\" min=\"10\" max=\"400\" value=\"100\" step=\"10\">\n      </div>\n      <div class=\"field\">\n        <div class=\"lb\"><b>到达临界后归零</b><small>关闭则临界后维持在满值附近持续输出。</small></div>\n        <div class=\"sw on\" id=\"s-reset\"><i></i></div>\n      </div>\n      <div class=\"field\">\n        <div class=\"lb\"><b>切换模式自动推荐频率</b><small>每种模式有自己合适的工作频段。</small></div>\n        <div class=\"sw on\" id=\"s-recfreq\"><i></i></div>\n      </div>\n    </section>\n\n    <section class=\"panel\">\n      <h3>面板</h3>\n      <div class=\"field\">\n        <div class=\"lb\"><b>全屏</b><small>手机上默认铺满屏幕；关掉就缩成一个小窗，顶栏可以拖着走。顶栏右上角的 ⤢ 是同一个开关——手机状态栏挡住它时就在这里切。</small></div>\n        <div class=\"sw\" id=\"s-fit\"><i></i></div>\n      </div>\n    </section>\n\n    <section class=\"panel\" id=\"s-ball-sec\" hidden>\n      <h3>悬浮球</h3>\n      <div class=\"field\">\n        <div class=\"lb\"><b>大小</b><small>只存在这台设备上，换聊天不变。</small></div>\n        <div class=\"chips\" id=\"s-ball-size\" style=\"margin-top:0\">\n          <button class=\"chip\" data-s=\"44\">小</button>\n          <button class=\"chip on\" data-s=\"58\">中</button>\n          <button class=\"chip\" data-s=\"72\">大</button>\n        </div>\n      </div>\n      <div class=\"field\">\n        <div class=\"lb\"><b>底盘透明度</b><small>只调装置后面那块奶白圆盘，装置本体永远实心。盘透了就不挡字。</small></div>\n        <div class=\"chips\" id=\"s-ball-fade\" style=\"margin-top:0\">\n          <button class=\"chip\" data-f=\"1\">实心</button>\n          <button class=\"chip on\" data-f=\"0.45\">半透</button>\n          <button class=\"chip\" data-f=\"0\">透明</button>\n        </div>\n      </div>\n      <div class=\"field\">\n        <div class=\"lb\"><b>隐藏悬浮球</b><small id=\"s-ball-hide-note\">只用脚本按钮「TOY·LINK 控制器」开面板。按钮在酒馆的快速回复栏里（需开着 QR 栏）；装了 QR 整合插件的，在它的火箭菜单里。</small></div>\n        <div class=\"sw\" id=\"s-ball-hide\"><i></i></div>\n      </div>\n      <div class=\"field\">\n        <div class=\"lb\"><b>贴边半藏（手机）</b><small>球靠着屏幕边几秒没人碰，就半藏进边里变半透明，不挡字。点它、或装置跑起来会出来。电脑上不贴。</small></div>\n        <div class=\"sw on\" id=\"s-ball-tuck\"><i></i></div>\n      </div>\n    </section>\n\n    <section class=\"panel\">\n      <h3>状态快照（角色能看到的内容）</h3>\n      <textarea id=\"state-box\" readonly></textarea>\n      <div class=\"hint\">\n        这份文本写入聊天变量 <code>toy_state</code>，世界书条目用 <code>{{getvar::toy_state}}</code> 读取。\n      </div>\n      <div class=\"chips\">\n        <button class=\"chip\" id=\"c-sync\">立即同步变量</button>\n        <button class=\"chip\" id=\"c-copy\">复制快照</button>\n      </div>\n    </section>\n\n    <section class=\"panel\">\n      <h3>维护</h3>\n      <div class=\"chips\">\n        <button class=\"chip\" id=\"c-wipe\">清空反应记录</button>\n        <button class=\"chip\" id=\"c-reset\">复位装置</button>\n      </div>\n      <div class=\"hint\" id=\"env-hint\"></div>\n      <div class=\"hint\" id=\"ver-hint\"></div>\n    </section>\n  </main>\n\n  <!-- ============ 请求停止（常驻，遥控器在 TA 手里时才出现） ============\n       它是这一档里玩家唯一还能做的事，所以不能放在会滚动的区域里 ——\n       一滚到参数区就够不着了，「求 TA 放人」也就成了摆设。 -->\n  <div class=\"begbar\" id=\"begbar\" hidden>\n    <button class=\"beg\" id=\"beg-stop\" type=\"button\">\n      <b>请求 TA 停下</b>\n      <i>TA 会松口的</i>\n    </button>\n  </div>\n\n  <!-- ============ 电源区 ============ -->\n  <div class=\"powerbar\">\n    <button class=\"power\" id=\"power\">启 动</button>\n    <button class=\"ghost\" id=\"btn-burst\" title=\"冲击一次\"><svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M12 2 4 14h7l-1 8 9-13h-7z\"/></svg></button>\n  </div>\n\n  <nav class=\"dock\">\n    <button class=\"tab on\" data-go=\"device\"><b>◈</b>装置</button>\n    <button class=\"tab\" data-go=\"chat\"><b>❖</b>TA 的心声</button>\n    <button class=\"tab\" data-go=\"config\"><b>⚙</b>设置</button>\n    <button class=\"tab\" id=\"tab-hide\" type=\"button\" aria-label=\"收起面板\"><b>⌄</b>收起</button>\n  </nav>\n\n  <div id=\"toast\"></div>\n</div>";

  /* ==================== 建面板 ==================== */
  var host = DOC.createElement("div");
  host.id = "__toylink_host__";
  // 关键样式走内联，确保不受酒馆页面样式表与容器布局的影响。
  // pointer-events:none 让整层不吞事件，只有面板本体（shell）自己接收操作，
  // 这样酒馆的聊天、输入框、侧边栏全都照常可用。
  host.style.cssText = "position:fixed;inset:0;z-index:2147483000;display:block;pointer-events:none;";
  var root = host.attachShadow({ mode: "open" });
  var styleEl = DOC.createElement("style");
  styleEl.textContent = CSS;
  root.appendChild(styleEl);
  var holder = DOC.createElement("div");
  holder.innerHTML = HTML;
  while (holder.firstChild) root.appendChild(holder.firstChild);
  MOUNT(host);

  var shellEl = root.querySelector("#shell");
  if (shellEl) {
    shellEl.style.position = "fixed";
    shellEl.style.pointerEvents = "auto";
  }

  /* ==================== 悬浮球：紫色小 lelo（源码见构建脚本里的 TOY_BALL_RUNTIME） ==================== */
  var BALL_ID = "__toylink_ball__", TK_VERSION = "1.11.2";
  var TK_S = null;   // 主脚本跑起来后指向它的装置状态 S
  var TK_SPRING_LIN = "linear(0, 0.0235, 0.084, 0.1688, 0.2674, 0.3716, 0.4753, 0.574, 0.6646, 0.7453, 0.8153, 0.8743, 0.9228, 0.9614, 0.9911, 1.0131, 1.0285, 1.0384, 1.0439, 1.0459, 1.0453, 1.0429, 1.0392, 1.0348, 1.03, 1.0252, 1.0206, 1.0164, 1.0125, 1.0092, 1.0064, 1.004, 1.0022, 1.0007, 0.9996, 0.9988, 0.9983, 0.998, 0.9979, 0.9979, 1)", TK_SPRING_MS = 728;
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


  var ROOT = root;

  /* ==================== 以下逻辑与 index.html 同源 ==================== */
(function () {
  'use strict';

  /* 版本号：改动时改这里，构建脚本会把它写进脚本版与角色卡，并做版本备份 */
  var VERSION = '1.11.2';
  var BUILD_DATE = '2026-10-11';

  /* ── 作用对象切到「自己」（装置戴在玩家身上）时替换的三条 ──
     其余条目统一用 {{char}} 宏，不需要为方向重写一遍。
     身体版本（男/女）走 WB_BODY_MALE，只替换 ④ 一条。 */
  var WB_ENTRIES_ALT = {
    '① 既成事实（常驻）': {
      content: [
        '【既成事实】',
        '{{user}} 身上已经戴着一枚小巧的遥控震动装置，在此之前就已经戴上了。',
        '它贴着皮肤、几乎无声，只有 {{user}} 自己感觉得到，外人看不出来。',
        '来源不必交代：{{char}} 没问过，{{user}} 也没主动提，这件事在两人之间是默认的背景。',
        '如果剧情里被问起，按 {{char}} 的性格临场给一句解释即可，说完就过去，不要展开成回忆段落。',
        '',
        '装置此刻是关闭的。遥控器在 {{char}} 手上，{{char}} 可以随时启动、切换模式、调整频率与强度。',
        '{{user}} 无法自己关掉它。'
      ].join('\n')
    },
    '③ 装置设定（关键词触发）': {
      content: [
        '【装置设定】',
        '{{char}} 手上有一只遥控器，能远程操控 {{user}} 身上那枚贴着皮肤的小装置。装置小巧无声，只有 {{user}} 自己感觉得到，外人看不出来。',
        '',
        '九种模式：脉冲（短促点动）、潮汐（绵长起伏）、心跳（两下连着的强震，后一下更重）、渐强（缓慢爬到顶再落下）、乱流（毫无规律，猜不到下一下）、撩拨（长时间空着，偶尔来一下）、暴雨（密集连击不留空隙）、临界（顶在高位再突然撤走）、冲刺（短时间直冲顶点，到顶后装置自动停下）。',
        '频率决定节奏快慢，强度决定力度大小。低频高强是拖着磨，高频低强是细密的痒。',
        '',
        '{{user}} 无法自己关掉装置。开不开、开多大，全看 {{char}} 的心情。'
      ].join('\n')
    },
    '⑨ 输出禁令（常驻）': {
      content: [
        '【输出禁令（优先级最高）】',
        '· 不要出现这些词：系统、数据、变量、面板、界面、参数、状态同步。',
        '· 不要复述上面的数字，用身体去表现它们。',
        '· 被作用的是 {{user}}，不是你。写你的动作、手上的遥控器、你的表情和你说的台词；{{user}} 的外在反应可以写，但不要替他写内心想法。',
        '· 节奏上每次只往前走一小步：这一回合的失控程度只比上一回合深一点，不要一口气写到底。',
        '· 按 {{char}} 本来的性格来写，不要换成另一个人。',
        '· {{char}} 没在强撑，所以不必嘴硬——这一局里，硬撑的是 {{user}}。'
      ].join('\n')
    }
  };

  var WB_EXTRA_USER = {
    name: '⑩ 视角转换（常驻）',
    strategy: 'constant',
    keys: [],
    position: 'at_depth',
    depth: 1,
    role: 'system',
    order: 102,
    content: [
      '【视角转换，优先级最高】',
      '这一局里装置戴在 {{user}} 身上，遥控器在 {{char}} 手里——与下面各条默认写的方向相反。',
      '读到下面任何一条时，把"被作用的那一方"一律理解成 {{user}}：',
      '被震动、被刺激、出现身体反应的是 {{user}}，操控的一方是 {{char}}。',
      '正文以外在表现为主：写 {{char}} 怎么调、怎么看、怎么说，写 {{user}} 身体上看得见的变化。'
    ].join('\n')
  };

  /* 紧贴最新消息的归属条目。
     之所以要单独一条、还带纠错措辞：多轮对话有惯性——
     头几轮如果写反了，后面每一轮都会照着前面继续写，
     光靠"设定里写了什么"压不过已经落进聊天记录的事实。
     这条用 at_depth 0 贴在最新消息前面，并且明说"前面写错了，从这里改"。 */
  var WB_ANCHOR = {
    name: '⓪ 装置归属（常驻，紧贴最新）',
    strategy: 'constant',
    keys: [],
    position: 'at_depth',
    depth: 0,
    role: 'system',
    order: 110,
    content: [
      '【装置归属 · 最高优先级，覆盖前面所有相反的内容】',
      '装置戴在 {{char}} 身上。{{user}} 身上没有装置，{{user}} 手里只有遥控器。',
      '被震动、被刺激、出现身体反应的是 {{char}}，不是 {{user}}。',
      '不要写 {{user}} 的下腹、大腿、腰或皮肤下面有任何东西在动。',
      '如果前面的楼层里出现过"贴着你""你的大腿发软"这类描写，那是写错了——'
        + '从这条回复开始一律改成写 {{char}} 的身体，直接改过来，不要在回复里解释这件事。'
    ].join('\n')
  };

  var WB_ANCHOR_USER = {
    content: [
      '【装置归属 · 最高优先级，覆盖前面所有相反的内容】',
      '装置戴在 {{user}} 身上。{{char}} 身上没有装置，遥控器在 {{char}} 手里。',
      '被震动、被刺激、出现身体反应的是 {{user}}；{{char}} 是操控的那一方。',
      '写 {{char}} 怎么调遥控器、怎么看、怎么说；{{user}} 身体上看得到的变化可以写。',
      '如果前面的楼层写反了，从这条回复开始纠正过来，不要在回复里解释这件事。'
    ].join('\n')
  };

  /* =========================================================
   * 通用世界书设定
   *
   * 脚本启动时会把这套设定写进一本世界书，并挂到当前角色卡。
   * 这样把它装到任何角色卡上都能直接用，不必另外导世界书。
   *
   * 这里是「默认版」：装置作用在对方（角色）身上，不含任何特定角色的
   * 性格、安全词、关系。角色卡自带的那版由角色卡构建脚本生成，
   * 那边会在通用版基础上叠加角色专属条目。
   * ======================================================= */
  var WB_NAME = 'TOY·LINK 装置设定';

  var WB_ENTRIES = [
    {
      name: '① 既成事实（常驻）',
      strategy: 'constant',
      keys: [],
      position: 'before_character_definition',
      depth: 4,
      role: 'system',
      order: 101,
      content: [
        '【既成事实】',
        '{{char}} 身上已经戴着一枚小巧的遥控震动装置，在此之前就已经戴上了。',
        '它贴着皮肤、几乎无声，只有 {{char}} 自己感觉得到，外人看不出来。',
        '来源不必交代：{{user}} 没问过，{{char}} 也没主动提，这件事在两人之间是默认的背景。',
        '如果剧情里被问起，按 {{char}} 的性格临场给一句解释即可（一场没赢的赌局、朋友开的玩笑、一次冲动），说完就过去，不要展开成回忆段落。',
        '',
        '装置此刻是关闭的。{{user}} 手上有遥控器，可以随时启动、切换模式、调整频率与强度。',
        '{{char}} 无法自己关掉它。'
      ].join('\n')
    },
    {
      name: '② 实时状态（常驻）',
      strategy: 'constant',
      keys: [],
      position: 'before_character_definition',
      depth: 4,
      role: 'system',
      order: 100,
      content: [
        '【装置实时状态】',
        '{{getvar::toy_state}}',
        '',
        '字段对照：运行 {{getvar::toy_on}}｜模式 {{getvar::toy_mode_name}}（{{getvar::toy_mode}}）｜频率 {{getvar::toy_hz}} Hz｜强度 {{getvar::toy_intensity}}%｜阶段 {{getvar::toy_stage}}·{{getvar::toy_stage_name}}｜累积 {{getvar::toy_arousal}}/100｜已持续 {{getvar::toy_elapsed}}｜累计临界 {{getvar::toy_peak}} 次',
        '',
        '状态为「已停止」时，只当作刚刚结束的余韵，不要写成正在发生的事。'
      ].join('\n')
    },
    {
      name: '③ 装置设定（关键词触发）',
      strategy: 'selective',
      keys: ['遥控器', '装置', '跳蛋', '震动', '档位', '开大', '关掉它', '调高', '频率', '模式'],
      position: 'before_character_definition',
      depth: 4,
      role: 'system',
      order: 90,
      content: [
        '【装置设定】',
        '{{user}} 手上有一只遥控器，能远程操控 {{char}} 身上那枚贴着皮肤的小装置。装置小巧无声，只有 {{char}} 自己感觉得到，外人看不出来。',
        '',
        '九种模式：脉冲（短促点动）、潮汐（绵长起伏）、心跳（两下连着的强震，后一下更重）、渐强（缓慢爬到顶再落下）、乱流（毫无规律，猜不到下一下）、撩拨（长时间空着，偶尔来一下）、暴雨（密集连击不留空隙）、临界（顶在高位再突然撤走）、冲刺（短时间直冲顶点，到顶后装置自动停下）。',
        '频率决定节奏快慢，强度决定力度大小。低频高强是拖着磨，高频低强是细密的痒。',
        '',
        '{{char}} 无法自己关掉装置，只能开口求 {{user}}。'
      ].join('\n')
    },
    {
      name: '④ 强度档位 × 身体反应（常驻）',
      strategy: 'constant',
      keys: [],
      position: 'at_depth',
      depth: 5,
      role: 'system',
      order: 96,
      content: [
        '【强度档位对应的身体反应】',
        '看 toy_intensity（此刻多用力）与 toy_stage（累积到哪一步）。两者都高时，按更高那一档写。',
        '',
        '轻 · 强度 1-35',
        '　身体：皮肤表面发麻，像有细小的电流在爬；小腹深处泛出一丝酸；大腿内侧不自觉收紧。',
        '　说话：句子还能说完，但末尾发飘；被问话时会慢半拍，要先"啊？"一声才回过神。',
        '　动作：坐姿悄悄换重心；手指在桌沿上无意识地敲；膝盖并拢又松开。',
        '　声音：呼吸比平时深；偶尔一声很轻的吸气；吞咽的声音变得明显；衣料摩挲声变多。',
        '',
        '中 · 强度 36-65',
        '　身体：热从下腹往上漫，耳根和脖子发烫；腰开始使不上力，坐不住也站不直；腿根发软。',
        '　说话：一句话要分两三次才说完；尾音发颤，说到一半会突然停住；开始用短句敷衍（"没事""等一下"）。',
        '　动作：手去找支撑物，抓扶手、抓衣角、抓桌沿；上半身前倾或者整个塌下去；脚趾蜷起来。',
        '　声音：压着的鼻音；从齿缝里漏出的气音；偶尔一声没憋住的小声哼；布料的摩擦声。',
        '',
        '重 · 强度 66-85',
        '　身体：整条腿在抖，膝盖并不拢；小腹一阵阵抽紧；视线失焦，眼前发白；皮肤浮起一层薄汗。',
        '　说话：说不出完整的句子，只剩碎片和重复的音节；叫名字、讨饶，或者干脆失语；字与字之间全是喘。',
        '　动作：弓背、蜷缩、抓紧什么就不放手；额头抵在某处；想合腿却合不上；眼泪开始往外冒。',
        '　声音：连续的呜咽；气声和实音搅在一起；牙关打颤的细碎响声；呼吸变成短促的抽气。',
        '',
        '极限 · 强度 86-100',
        '　身体：意识被搅成一片白；肌肉不受控地痉挛；下腹缩成一团；什么都抓不住，也放不开。',
        '　说话：只剩气音和单字，叫不出完整的名字；或者反复念同一个音。',
        '　动作：身体弓成一张拉满的弦；四肢挣动；脚背绷直；指甲掐进掌心。',
        '　声音：破碎的呜咽；被咬碎的哭腔；呼吸几乎没有节律；偶尔一声拔高的尖叫又断在半路。',
        '',
        '同一档里也要有起伏，不要一路平推。写到最狠的那一处，停一下，再让 {{char}} 喘过一口气。',
        '',
        '【女性身体的特性】没有明确的不应期：一波刚落，下一波就能接上。累积值回落之后反而比之前更敏感，'
          + '所以不要把顶点写成"结束"，它是下一轮更容易被推上去的起点，余韵还没过去就已经能重新累积。'
      ].join('\n')
    },
    {
      name: '⑤ 正文写什么（常驻）',
      strategy: 'constant',
      keys: [],
      position: 'at_depth',
      depth: 3,
      role: 'system',
      order: 98,
      content: [
        '【正文写什么】',
        '这一轮正文的主体是 {{char}} 的反应。剧情推进不是重点，环境白描也不是。',
        '大致篇幅：{{char}} 的身体与语言反应占七成，环境与声音占两成，其余一成。',
        '',
        '每一条反应都要落实：',
        '· 落实到部位——是腰、腿根、小腹，还是喉咙在动。',
        '· 落实到程度——抖是轻微的还是压不住的；喘是深一口，还是连着几下短抽。',
        '· 落实到应对——在忍、在藏、在转移话题，还是已经放弃了。',
        '· 环境跟着动——碰倒了什么、布料蹭出什么声音、屋子里的嗡鸣什么时候换了节奏。',
        '',
        '不要写结论句。不写"{{char}}很舒服""{{char}}受不了了""{{char}}彻底沦陷了"。',
        '要写能让人自己得出这个结论的东西：抓住扶手的指节、断在喉咙里的半句话、脚背绷直的弧度。'
      ].join('\n')
    },
    {
      name: '⑥ 九种模式各自是什么感觉（常驻）',
      strategy: 'constant',
      keys: [],
      position: 'at_depth',
      depth: 7,
      role: 'system',
      order: 94,
      content: [
        '【九种模式各自是什么感觉（看 toy_mode_name）】',
        '脉冲：一下一下地点，每一下之间有空档。身体会本能地跟着节奏绷紧又松开，最怕的是那点空档——刚放松就被点名。',
        '潮汐：像水一层层漫上来，退下去的时候人会不自觉地去追，追不到比被推上去还难受。',
        '心跳：两下连着来，后一下比前一下更重。它是震，不是敲 —— 感受是那两下之间的空档被拉长，'
          + '身体会自动跟着这个节奏起伏，久了连呼吸都被带跑。',
        '渐强：慢慢爬到顶，然后突然落下。每一次落下都比上一次更难熬，因为已经知道接下来要爬多高。',
        '乱流：没有规律，猜不到下一拍落在哪。身体一直没法放松，等的过程中比真的来的时候更折磨。',
        '撩拨：长时间空着，偶尔轻轻碰一下就走。累积得慢，但人会被吊得发慌，开始主动去要。',
        '暴雨：几乎不留空隙，密到没法思考。很快会失去说话的能力，只剩喘。',
        '临界：一直顶在很高的位置，然后整个撤走。那一下的落空比任何强度都磨人。',
        '冲刺：短时间直冲顶点。没有铺垫、没有台阶，上来就是最密的节奏，一路把人推到底；到顶之后装置会自己停下，要再来一次得重新按启动。这一档的写法是一次性的爆发，不是慢慢积累——从第一句就在往顶点压，最后给一个完整的顶点。',
        '',
        '模式只决定"怎么给"，强度决定"给多重"，阶段决定"{{char}} 已经到了哪一步"。三者配合着写，不要只写震动本身。'
      ].join('\n')
    },
    {
      name: '⑦ 累积阶段（常驻）',
      strategy: 'constant',
      keys: [],
      position: 'at_depth',
      depth: 6,
      role: 'system',
      order: 95,
      content: [
        '【累积阶段（看 toy_stage / toy_arousal）】',
        '第 1 阶段·适应（0-21）：呼吸略乱，走神，腿不自觉并拢，还能把话说完整。',
        '第 2 阶段·升温（22-47）：语速忽快忽慢，耳根发烫，手指抓紧身边的东西，尾音发抖。',
        '第 3 阶段·攀升（48-73）：句子碎掉，腰塌下去，得扶着什么才稳，压不住的轻哼往外漏。',
        '第 4 阶段·濒临（74-92）：意识被节奏牵着走，眼角发潮，口齿不清，开始求人。',
        '第 5 阶段·临界（93 以上）：理智断线，只剩本能反应。',
        '',
        '强度很高但阶段还低，说明刚开始不久：{{char}} 想硬撑，但撑得很勉强，破绽全在细节里。'
      ].join('\n')
    },
    {
      name: '⑧ 临界与停机（关键词触发）',
      strategy: 'selective',
      keys: ['临界', '高潮', '去了', '停手', '停'],
      position: 'at_depth',
      depth: 4,
      role: 'system',
      order: 93,
      content: [
        '【临界爆发】',
        'toy_peak 增加、或状态里出现「临界爆发」时，说明 {{char}} 刚被推到顶点。',
        '写法：先是几秒的空白，然后是脱力的抽搐、止不住的眼泪和破碎的气音，四肢发软，来不及收拾自己。',
        '爆发之后累积值回落，装置仍在运转，余韵还没过去下一轮就已经开始爬升，此时 {{char}} 比之前更敏感、更没力气抵抗。',
        '',
        '【停机】',
        '装置停止后，写 {{char}} 悬在半空的空虚、身体残留的余颤，和 {{char}} 对 {{user}} 的反应：撒娇、埋怨，或者还没缓过来的沉默。'
      ].join('\n')
    },
    {
      name: '⑨ 输出禁令（常驻）',
      strategy: 'constant',
      keys: [],
      position: 'at_depth',
      depth: 2,
      role: 'system',
      order: 99,
      content: [
        '【输出禁令（优先级最高）】',
        '· 不要出现这些词：系统、数据、变量、面板、界面、参数、状态同步。',
        '· 不要复述上面的数字，用身体去表现它们。',
        '· 不要替 {{user}} 行动，不要替 {{user}} 说话，也不要替 {{user}} 决定剧情走向。',
        '· 节奏上每次只往前走一小步：这一回合的失控程度只比上一回合深一点，不要一口气写到底。',
        '· {{char}} 还在强撑，就写出强撑的破绽；已经放弃抵抗，就写 {{char}} 怎么被推着走。',
        '',
        '【它是震，不是敲】',
        '· 装置贴着皮肤高频震颤，感受是麻、酥、酸、发胀、一阵阵收不住，'
          + '不是被什么东西敲打或撞击。',
        '· 不要写「砰」「咚」「啪」「哐」这类撞击声，也不要写「砸」「捶」「碾」「钉」「撞开」'
          + '这类动作 —— 这些会把震动写成打击。',
        '· 声音方面：它只有极轻的嗡鸣，贴身时几乎听不出来。绝大多数情况下不需要描写声音；'
          + '要写就写「嗡」这类持续的低频声，而且是被身体先感觉到、后来才注意到的那种。'
      ].join('\n')
    },
    {
      name: '⑪ 感受链怎么写（常驻）',
      strategy: 'constant',
      keys: [],
      position: 'at_depth',
      depth: 3,
      role: 'system',
      order: 92,
      content: [
        '【一次反应要写成一条链，不是几个点】',
        '一条完整的感受按这个顺序铺开。少了中间任何一层，读起来都会是「局部速写」而不是「身临其境」。',
        '',
        '一、起点 —— 震感落在哪儿',
        '　写清部位，也写清那是什么感觉。同一个部位，参数不同手感就不同：',
        '　低频是拖着磨、有推的余地；高频是细密的痒、躲不开；强度低时只有表面发麻，',
        '　强度上去之后才会一路酸到深处。不要只写「她被震动」，写震动在做什么。',
        '',
        '二、传导 —— 它往哪走',
        '　感受不会停在一个点上。写它怎么漫出去：从下腹往上一路烧到耳根，',
        '　从腰窝往下沉到尾椎，从腿根散到脚趾蜷起来。这一层决定现场感。',
        '',
        '三、对抗 —— 身体在做什么',
        '　不是被动挨着。写下意识的反应：并腿、绷紧、挪重心、抓身边的东西、',
        '　把到嘴边的话咽回去、假装若无其事。越是克制，破绽越值得写。',
        '',
        '四、失守 —— 控制在哪里断',
        '　按累积值（toy_arousal）和阶段（toy_stage）来，不要跳过台阶：',
        '　还能把话说完整 → 说话开始断句 → 只能出气音和单字 → 只剩本能反应。',
        '　每一条回复只比上一条深一点点，把后面的空间留给下一轮。',
        '',
        '五、外显 —— 别人看得见什么',
        '　呼吸的深浅、声音碎到什么程度、手抓着什么、眼神往哪里躲、',
        '　皮肤和衣料是湿是皱。外部表现比内心陈述可信得多，能写外面就不要写里面。',
        '',
        '【几条要守住的】',
        '· 不要一口气写到底。递进的价值在于还有下一步，写满了就没有下一步了。',
        '· 不要写结论句。不写「{{char}} 受不了了」，写抓住扶手的指节发白。',
        '· 液体、失控之类的表现，看这张卡的人物和这个场景是否涉及。不涉及就别硬加 ——',
        '  通用条目写的是「可以有」，不是「必须有」。',
        '· 模式名只描述手感，不要当成动作。比如「心跳」指的是两下连震的节奏，'
          + '不是心脏在跳，更不是有人在敲。'
      ].join('\n')
    }
  ];

  /* ── ④ 的男性身体版 ──
     被作用者的身体是男性时，整条 ④ 换成这一版。
     男女的差异不在"强度"上，而在顶点之后：女性可以接着来，
     男性有一次性的不应期，顶点之后继续刺激会变成难受而不是享受。
     这一点必须写进条目，否则模型会照着女性那套写连续高潮。 */
  var WB_BODY_MALE = [
    '【强度档位对应的身体反应（男性身体）】',
    '看 toy_intensity（此刻多用力）与 toy_stage（累积到哪一步）。两者都高时，按更高那一档写。',
    '',
    '轻 · 强度 1-35',
    '　身体：皮肤表面发麻，像有细小的电流在爬；小腹深处泛起一阵酸胀；下体开始有反应，但还压得住；会不自觉想并腿。',
    '　说话：句子还能说完，但末尾发飘；被问话时会慢半拍；会刻意把话头引到别的事情上。',
    '　动作：坐姿换重心；手指无意识地收紧又松开；手往腿边放了一下又收回去。',
    '　声音：呼吸比平时深；偶尔一声很轻的吸气；吞咽的声音变得明显。',
    '',
    '中 · 强度 36-65',
    '　身体：热往下沉，会阴一阵阵发紧；小腹连着后腰绷起来；坐不住也站不直；额角开始出汗。',
    '　说话：一句话要分两三次才说完；尾音发颤；开始用短句敷衍（"嗯""等一下"）。',
    '　动作：手去找支撑物，抓桌沿、抓衣角；上半身前倾或者整个塌下去；膝盖分开又并上；下意识调整坐姿。',
    '　声音：压着的鼻音；从齿缝里漏出的气音；憋住的一两声闷哼；布料的摩擦声。',
    '',
    '重 · 强度 66-85',
    '　身体：整条腿在抖；会阴与后腰缩成一团；小腹紧得发酸；呼吸彻底乱了；指尖发凉。',
    '　说话：说不出完整的句子，只剩碎片和重复的音节；开始求人，或者干脆不说话了；字与字之间全是喘。',
    '　动作：弓背、蜷缩、抓紧什么就不放手；额头抵在某处；脚背绷直；腰往前顶又收回去。',
    '　声音：连续的闷哼；气声和实音搅在一起；牙关打颤的细碎响声；呼吸变成短促的抽气。',
    '',
    '极限 · 强度 86-100',
    '　身体：意识被搅成一片白；全身肌肉不受控地绷紧又松开；下腹和后腰缩成一块；顶点来得很快，几乎没有预兆。',
    '　说话：只剩气音和单字；叫不出完整的名字；或者反复念同一个音。',
    '　动作：身体弓成一张拉满的弦；四肢挣动；手死死攥住什么；指甲掐进掌心。',
    '　声音：破碎的气音；压在喉咙里的低哼；呼吸几乎没有节律。',
    '',
    '同一档里也要有起伏，不要一路平推。写到最狠的那一处，停一下，再让 {{char}} 喘过一口气。',
    '',
    '【男性身体的特性】有不应期，这一点必须写准：',
    '· 顶点是一次性的释放，不要写成连续高潮。到达之后会有几分钟到十几分钟的不应期，'
      + '那段时间里身体是钝的，继续刺激只会变成酸胀和难受，而不是再来一次。',
    '· 顶点之后如果装置还在运转，写的应该是"过载、想让它停下"，不是"还想再来"。',
    '· 女性能一波接一波、累积值回落之后更敏感，男性不行——回落之后是疲惫和敏感过头，'
      + '要写这段恢复期怎么把余韵拖长，而不是立刻爬第二波。',
    '· 冲刺模式在男性身上是"一次干净利落到底"，到顶停下之后要写出那口终于松下来的气。'
  ].join('\n');

  /* ── 「忍耐 · 假装镇定」：关掉「露骨描写」之后的另一套 ──
     体内的感觉、生理机制、液体与痉挛一概不写，全部落在外部可观察的表现上。
     换的不是措辞，是描写的因果方向：由「体内在发生什么」改成「对周围世界
     失去了多少控制」。手比嘴诚实，声音比表情诚实。
     ④⑧⑪ 整条换掉，⑤⑦⑨ 在末尾追加段落（见 WB_PLAIN_ADDON）。
     注意：这一套只在脚本自动建的那本世界书里生效；用的是角色卡自带世界书时，
     靠状态注入里那条同款禁令兜底。 */
  var WB_BODY_PLAIN_F = [
    '【强度档位对应的外部表现（忍耐 · 假装镇定）】',
    '看 toy_intensity（此刻多用力）与 toy_stage（累积到哪一步）。两者都高时，按更高那一档写。',
    '这一档不写体内感觉，不写任何生理机制。全部落在外面：呼吸、姿态、手在做什么、',
    '话说得完不完整、声音从哪里出来，以及对周围事物的失手。',
    '',
    '轻 · 强度 1-35',
    '　身体：坐姿悄悄换了重心，又换回来；膝盖并拢过一次又松开；呼吸比平时深半拍。',
    '　说话：句子还能说完，末尾有点飘；被问话时会慢半拍，先「啊？」一声才回过神。',
    '　动作：手指在桌沿上无意识地敲；伸手去端杯子，指尖在杯壁上停了一下。',
    '　声音：偶尔一声很轻的吸气；吞咽的声音比平时明显；衣料摩挲的声音变多了。',
    '',
    '中 · 强度 36-65',
    '　身体：耳根和脖子泛红，盖不住的那一小块最显眼；不再靠着椅背，坐得比刚才直，直得有点用力。',
    '　说话：一句话要分两三次才说完；尾音发颤，说到一半会突然停住，再若无其事地接上；',
    '　　　　开始用短句敷衍（「没事」「等一下」）。',
    '　动作：手要找东西扶着，抓扶手、抓衣角、抓桌沿；伸手去拿什么，半路改成扶住桌边。',
    '　声音：压着的鼻音；从齿缝里漏出的气音；偶尔一声没憋住的小声哼；布料的摩擦声。',
    '',
    '重 · 强度 66-85',
    '　身体：整条腿在抖，膝盖并不拢；低头把脸藏进头发或袖口；额角一层薄汗。',
    '　说话：说不出完整的句子，只剩碎片和重复的音节；叫名字、讨饶，或者干脆不说话了；',
    '　　　　字与字之间全是喘。',
    '　动作：弓背、蜷缩、抓紧什么就不放手；额头抵在某处；想合腿却合不上。',
    '　声音：连续的呜咽；气声和实音搅在一起；牙关打颤的细碎响声；呼吸变成短促的抽气。',
    '',
    '极限 · 强度 86-100',
    '　身体：整个人挂在支撑物上；肌肉不受控地绷紧又松开；周围的东西开始遭殃 ——',
    '　　　　杯子倒了，手机摔在地上没人捡，手边的纸张被攥成一团。',
    '　说话：只剩气音和单字，叫不出完整的名字；或者反复念同一个音；',
    '　　　　也有人会突然说一句完全无关的话，像是在给自己找台阶。',
    '　动作：身体弓成一张拉满的弦；四肢挣动；脚背绷直；指甲掐进掌心。',
    '　声音：破碎的呜咽；被咬碎的哭腔；呼吸几乎没有节律；偶尔一声拔高的尖叫又断在半路。',
    '',
    '同一档里也要有起伏，不要一路平推。写到最狠的那一处，停一下，再让人喘过一口气。',
    '',
    '【这一档的看点不是爽，是还在装】',
    '· 被作用的一方一直在努力把这件事演成没发生：嘴硬、转移话题、硬撑着做原来的事。',
    '　越接近失控，破绽越该落在动作和语言上。',
    '· 不要写「高潮」「受不了了」「彻底沦陷了」这类结论句，写让人自己得出这个结论的东西：',
    '　发白的指节、断在半截的话、从扶手上滑下去的手。',
    '· 顶点写成「装不住了」的那一下，不写体内的爆发过程。',
    '',
    '【顶点之后】不要写成「结束」：落空之后很快又会被推上去，所以接下来的挣扎是',
    '「以为过去了、结果没有」，撑的样子一次比一次勉强。'
  ].join('\n');

  var WB_BODY_PLAIN_M = [
    '【强度档位对应的外部表现（男性身体 · 忍耐 · 假装镇定）】',
    '看 toy_intensity（此刻多用力）与 toy_stage（累积到哪一步）。两者都高时，按更高那一档写。',
    '这一档不写体内感觉，不写任何生理机制。全部落在外面：呼吸、姿态、手在做什么、',
    '话说得完不完整、声音从哪里出来，以及对周围事物的失手。',
    '',
    '轻 · 强度 1-35',
    '　身体：坐姿换了重心，手往腿边放了一下又收回去；呼吸比平时深。',
    '　说话：句子还能说完，末尾发飘；被问话时慢半拍；会刻意把话头引到别的事情上。',
    '　动作：手指无意识地收紧又松开；站起来又坐回去。',
    '　声音：偶尔一声很轻的吸气；吞咽的声音变得明显。',
    '',
    '中 · 强度 36-65',
    '　身体：额角开始出汗；膝盖分开又并上；后背绷得很紧。',
    '　说话：一句话要分两三次才说完；尾音发颤；开始用短句敷衍（「嗯」「等一下」）。',
    '　动作：手去找支撑物，抓桌沿、抓衣角；上半身前倾，或者整个塌下去；反复调整坐姿。',
    '　声音：压着的鼻音；从齿缝里漏出的气音；憋住的一两声闷哼；布料的摩擦声。',
    '',
    '重 · 强度 66-85',
    '　身体：整条腿在抖；呼吸彻底乱了；指尖发凉；肩背绷成一条线。',
    '　说话：说不出完整的句子，只剩碎片和重复的音节；开始求人，或者干脆不说话了；',
    '　　　　字与字之间全是喘。',
    '　动作：弓背、蜷缩、抓紧什么就不放手；额头抵在某处；手死死抵在桌沿上，指节发白。',
    '　声音：连续的闷哼；气声和实音搅在一起；牙关打颤的细碎响声；呼吸变成短促的抽气。',
    '',
    '极限 · 强度 86-100',
    '　身体：整个人撑不住地压下去；肌肉不受控地绷紧又松开；顶点来得很快，几乎没有预兆。',
    '　说话：只剩气音和单字，叫不出完整的名字；反复念同一个音；或者突然闭嘴，谁也撬不开。',
    '　动作：身体弓成一张拉满的弦；四肢挣动；手死死攥住什么；指甲掐进掌心。',
    '　声音：破碎的气音；压在喉咙里的低哼；呼吸几乎没有节律。',
    '',
    '同一档里也要有起伏，不要一路平推。写到最狠的那一处，停一下，再让人喘过一口气。',
    '',
    '【这一档的看点不是爽，是还在装】',
    '· 全程在演「什么都没发生」：把话接回去、假装在忙、反过来问一句。',
    '　越接近失控，破绽越落在动作和语言上 —— 手比嘴诚实，声音比表情诚实。',
    '· 不写体内感觉，不写生理机制，也不写「高潮」「受不了了」这类结论句。',
    '· 顶点写成「装不住了」的那一下：话断在半句、整个人僵住，然后才是脱力和收拾自己。',
    '',
    '【顶点之后】顶点是一次性的释放，不要写成连续高潮。到了之后写的是「想让它停下来」：',
    '想站起来、想找个借口走开、手已经伸向遥控器又收回去。恢复期写疲惫与敏感过头，',
    '不要立刻爬第二波。'
  ].join('\n');

  /* ⑧ 的忍耐版：顶点与停机都不写体内过程，只写「装不住」与收拾 */
  var WB_PEAK_PLAIN = [
    '【临界爆发】',
    'toy_peak 增加、或状态里出现「临界爆发」时，说明被作用的一方刚被推到顶点。',
    '这一档不写体内的爆发过程，写「装不住了」的那一下：话断在半句、身体从支撑物上滑下去、',
    '几秒里发不出任何声音。接下来是脱力、发愣、手抖、眼泪，来不及收拾自己 ——',
    '看得见的狼狈全留着，看不见的一概不写。',
    '爆发之后累积值回落，装置仍在运转，余韵还没过去下一轮就已经开始爬升，',
    '此时比之前更敏感、更没力气抵抗，而表面那层撑也薄得多了。',
    '',
    '【停机】',
    '装置停止后，写悬在半空的落空、身体残留的余颤，和对 {{user}} 的反应：撒娇、埋怨，',
    '或者还没缓过来的沉默。'
  ].join('\n');

  /* ⑪ 的忍耐版：感受链改成「失控链」，链条整条架在外面 */
  var WB_CHAIN_PLAIN = [
    '【一次反应要写成一条链，不是几个点】',
    '这一档不写体内的感受，链条全部架在外面。按下面的顺序铺开，少了中间任何一层，',
    '读起来都会是「局部速写」而不是「身临其境」。',
    '',
    '一、落点 —— 装置在做什么，人怎么接住',
    '　不看体内，看外面的接法：手里的动作停了半拍、话音落空、身上的重心挪了一下、呼吸换了个节奏。',
    '　同一个参数，接法不一样：低频是拖着磨，人会一直分神；高频是细密的痒，躲不开也停不下；',
    '　强度上去之后才开始真的撑不住。不要只写「被震了」，写震到的时候那个人在做什么。',
    '',
    '二、蔓延 —— 从哪儿开始藏不住',
    '　看不见的部分靠「遮」来写：低头、把脸藏进头发、用手背压住嘴、把椅子往后拖一点、抓住衣摆往下拉。',
    '　这一层决定现场感：遮哪儿，就说明哪儿出了问题。',
    '',
    '三、对抗 —— 还在假装无事',
    '　写应对：把话接回去、假装在忙、主动换话题、睁着眼睛说「我没事」，甚至反过来问 {{user}} 一句。',
    '　越是克制，破绽越值得写：手比嘴诚实，声音比表情诚实。',
    '',
    '四、失守 —— 控制在哪里断',
    '　按累积值（toy_arousal）和阶段（toy_stage）来，不要跳过台阶：',
    '　还能把话说完整 → 说话开始断句 → 只能出气音和单字 → 只剩本能反应。',
    '　每一条回复只比上一条深一点点，把后面的空间留给下一轮。',
    '',
    '五、外显 —— 别人看得见什么',
    '　呼吸的深浅、声音碎到什么程度、手抓着什么、眼神往哪里躲、皮肤和衣料是湿是皱；',
    '　还有周围被弄乱的痕迹：碰倒的杯子、歪掉的靠垫、被攥出褶子的纸。',
    '　外部表现比内心陈述可信得多，能写外面就不要写里面。',
    '',
    '【几条要守住的】',
    '· 不写体内感觉、不写生理机制、不写液体，也尽量不要直接说「高潮」；只写看得见、听得见的东西。',
    '· 不要一口气写到底。递进的价值在于还有下一步，写满了就没有下一步了。',
    '· 不要写结论句。不写「受不了了」，写抓住扶手的指节发白。',
    '· 模式名只描述手感，不要当成动作。比如「心跳」指的是两下连震的节奏，'
      + '不是心脏在跳，更不是有人在敲。'
  ].join('\n');

  /* ⑤⑦⑨ 不改写整条，只在末尾追加：这三条的骨架对两档都成立 */
  var WB_PLAIN_ADDON = {
    '⑤ 正文写什么（常驻）': [
      '',
      '',
      '【这一档的篇幅】',
      '外部可观察的反应占七成（动作、语言完整度、声音、表情、对周围事物的失手），',
      '环境与被弄乱的痕迹占两成，其余一成。'
    ].join('\n'),
    '⑦ 累积阶段（常驻）': [
      '',
      '',
      '【忍耐】每个阶段都要把「还在装」写出来，而且装得一次比一次勉强：',
      '第 1、2 阶段还有余力掩饰；第 3 阶段开始遮不住；第 4、5 阶段连掩饰的动作都做不完整。'
    ].join('\n'),
    '⑨ 输出禁令（常驻）': [
      '',
      '',
      '【忍耐 · 假装镇定（优先级最高）】',
      '· 不写体内感觉、不写生理机制、不写液体，也不写痉挛、收缩这类内部反应。',
      '· 不写「高潮」「受不了了」「沦陷」这类结论，用外部表现让它自己成立。',
      '· 顶点只写「装不住了」的那一下，以及之后怎么把场面收拾回来。',
      '· 全篇的主体是「在忍」：手比嘴诚实，声音比表情诚实。'
    ].join('\n')
  };

  /* =========================================================
   * 0. 基础工具
   * ======================================================= */
  var $ = function (s) { return ROOT.querySelector(s); };
  var clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  var round = function (v, n) { var p = Math.pow(10, n || 0); return Math.round(v * p) / p; };
  var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
  function toast(msg, ms) {
    var box = $('#toast');
    var el = document.createElement('div');
    el.className = 'tst';
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .3s';
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 320);
    }, ms || 1900);
  }

  /* =========================================================
   * 1. 酒馆助手桥接层
   *    优先当前 window，其次全局 TavernHelper，最后父窗口
   * ======================================================= */
  function th(name) {
    try {
      if (typeof window[name] === 'function') return window[name].bind(window);
    } catch (e) { /* noop */ }
    try {
      if (typeof TavernHelper !== 'undefined' && TavernHelper && typeof TavernHelper[name] === 'function') {
        return TavernHelper[name].bind(TavernHelper);
      }
    } catch (e) { /* noop */ }
    try {
      var p = window.parent;
      if (p && p !== window && p.TavernHelper && typeof p.TavernHelper[name] === 'function') {
        return p.TavernHelper[name].bind(p.TavernHelper);
      }
    } catch (e) { /* 跨域时静默 */ }
    return null;
  }
  function hasTH(name) { return !!th(name); }

  var BRIDGE = {
    ready: false,
    probe: function () {
      var ok = hasTH('getVariables') || hasTH('generate') || hasTH('triggerSlash');
      this.ready = ok;
      return ok;
    },
    getVars: function (type) {
      var f = th('getVariables'); if (!f) return null;
      try { return f({ type: type || 'chat' }) || {}; } catch (e) { return null; }
    },
    setVars: function (obj, type) {
      var f = th('insertOrAssignVariables');
      if (f) { try { f(obj, { type: type || 'chat' }); return true; } catch (e) { /* fallthrough */ } }
      var g = th('replaceVariables');
      if (g) {
        try {
          var cur = this.getVars(type) || {};
          Object.keys(obj).forEach(function (k) { cur[k] = obj[k]; });
          g(cur, { type: type || 'chat' });
          return true;
        } catch (e) { /* noop */ }
      }
      return false;
    },
    lastMsgId: function () {
      var f = th('getLastMessageId'); if (!f) return -1;
      try { return f(); } catch (e) { return -1; }
    },
    getMsg: function (id) {
      var f = th('getChatMessages'); if (!f) return null;
      try { var r = f(id); return (r && r[0]) || null; } catch (e) { return null; }
    },
    addMsg: function (msg, opts) {
      var f = th('createChatMessages'); if (!f) return null;
      try { return f([msg], opts || { refresh: 'affected' }); } catch (e) { return null; }
    },
    slash: function (cmd) {
      var f = th('triggerSlash'); if (!f) return null;
      try { return f(cmd); } catch (e) { return null; }
    },
    gen: function (cfg) {
      var f = th('generate'); if (!f) return null;
      try { return f(cfg); } catch (e) { return null; }
    },
    on: function (evt, fn) {
      var f = th('eventOn'); if (!f) return false;
      try { f(evt, fn); return true; } catch (e) { return false; }
    },
    inject: function (prompts, opts) {
      var f = th('injectPrompts'); if (!f) return null;
      try { return f(prompts, opts); } catch (e) { return null; }
    },
    uninject: function (ids) {
      var f = th('uninjectPrompts'); if (!f) return false;
      try { f(ids); return true; } catch (e) { return false; }
    }
  };

  var EVT = {
    MSG_RECEIVED: 'message_received',
    GEN_STARTED: 'generation_started',
    GEN_ENDED: 'generation_ended',
    GEN_STOPPED: 'generation_stopped',
    JS_GEN_STARTED: 'js_generation_started',
    JS_GEN_ENDED: 'js_generation_ended',
    STREAM_FULL: 'js_stream_token_received_fully',
    CHAT_CHANGED: 'chat_id_changed'
  };

  /* =========================================================
   * 2. 震动模式库
   *    每个模式给出 0..1 的包络函数 env(t, p)
   *    t: 秒（装置运行时间）  p: {pow,hz,phase}
   * ======================================================= */
  function noise(t) {
    var x = Math.sin(t * 127.1) * 43758.5453;
    return x - Math.floor(x);
  }

  var MODES = [
    {
      id: 'pulse', name: '脉冲', rec: 26, gain: 1.0,
      icon: '<path d="M4 20h3v-9H4zM10.5 20h3V5h-3zM17 20h3v-6h-3z"/>',
      desc: '短促点动，一下一下地推',
      env: function (t, p) {
        var T = 1 / p.hz;
        var x = (t % T) / T;
        return clamp(p.pow * (x < 0.22 ? 1 : 0.10), 0, 1);
      }
    },
    {
      id: 'wave', name: '潮汐', rec: 22, gain: 1.05,
      icon: '<path d="M2 15c3-6 6 6 9 0s6 6 9 0v4c-3 6-6-6-9 0s-6-6-9 0z"/>',
      desc: '正弦起伏，一层层漫上来',
      env: function (t, p) {
        var T = 1 / Math.max(p.hz, 0.4);
        var s = 0.5 + 0.5 * Math.sin((t / T) * Math.PI * 2);
        return clamp(p.pow * (0.25 + 0.75 * Math.pow(s, 1.4)), 0, 1);
      }
    },
    {
      id: 'heart', name: '心跳', rec: 30, gain: 1.15,
      icon: '<path d="M12 21s-8-5.2-8-10.4A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 3.6C20 15.8 12 21 12 21z"/>',
      desc: '两下连震，跟着脉搏走',
      env: function (t, p) {
        var T = 1 / p.hz;
        var x = (t % T) / T;
        var a = x < 0.10 ? 1 : 0;
        var b = (x > 0.20 && x < 0.29) ? 0.72 : 0;
        return clamp(p.pow * Math.max(a, b, 0.06), 0, 1);
      }
    },
    {
      id: 'ramp', name: '渐强', rec: 12, gain: 1.35,
      icon: '<path d="M3 18 10 6l3 7 3-4 5 9z"/>',
      desc: '缓慢爬升，到底再落下来',
      env: function (t, p) {
        var T = 1 / Math.max(p.hz * 0.35, 0.25);
        var x = (t % T) / T;
        var up = Math.min(1, x / 0.78);
        var v = x < 0.78 ? up : Math.max(0, 1 - (x - 0.78) / 0.22);
        return clamp(p.pow * (0.08 + 0.92 * v), 0, 1);
      }
    },
    {
      id: 'chaos', name: '乱流', rec: 34, gain: 1.2,
      icon: '<path d="M3 8h6l3 8h3l3-8h3v3h-2l-3 8h-5l-3-8H3z"/>',
      desc: '没有规律，猜不到下一下',
      env: function (t, p) {
        var seg = Math.floor(t * p.hz);
        var r = noise(seg + p.phase);
        var micro = 0.5 + 0.5 * Math.sin(t * p.hz * Math.PI * 2);
        return clamp(p.pow * (0.25 + 0.75 * r) * (0.55 + 0.45 * micro), 0, 1);
      }
    },
    {
      id: 'tease', name: '撩拨', rec: 16, gain: 0.88,
      icon: '<path d="M12 3c2 5 6 6 6 10a6 6 0 0 1-12 0c0-4 4-5 6-10z"/>',
      desc: '长间歇的轻触，点到就走',
      env: function (t, p) {
        var T = 1 / Math.max(p.hz * 0.30, 0.22);
        var x = (t % T) / T;
        return clamp(p.pow * (x < 0.14 ? 0.62 : 0.03), 0, 1);
      }
    },
    {
      id: 'storm', name: '暴雨', rec: 46, gain: 1.45,
      icon: '<path d="M6 14h12l-2 7h-8zM9 3h6l-1 9H10z"/>',
      desc: '密集连击，几乎不留空隙',
      env: function (t, p) {
        var T = 1 / p.hz;
        var x = (t % T) / T;
        var base = 0.62 + 0.30 * Math.sin((t / T) * Math.PI * 2);
        var spike = noise(Math.floor(t * p.hz * 1.7)) > 0.86 ? 0.38 : 0;
        return clamp(p.pow * (x < 0.62 ? base + spike : 0.30), 0, 1);
      }
    },
    {
      id: 'edge', name: '临界', rec: 8, gain: 1.6,
      icon: '<path d="M12 2 4 14h7l-1 8 9-13h-7z"/>',
      desc: '顶在高位，然后突然撤走',
      env: function (t, p) {
        var T = 1 / Math.max(p.hz * 0.18, 0.16);
        var x = (t % T) / T;
        if (x < 0.70) return clamp(p.pow * (0.80 + 0.20 * Math.sin(t * 5)), 0, 1);
        if (x < 0.76) return clamp(p.pow * 0.04, 0, 1);
        return clamp(p.pow * 0.25, 0, 1);
      }
    },
    {
      id: 'rush', name: '冲刺', rec: 72, gain: 30.0, oneShot: true,
      icon: '<path d="M13 2 4 14h6l-1 8 11-15h-7zM11 4l-5 8h4l-1 6"/>',
      desc: '短时间直冲顶点，到顶后装置自动停下',
      env: function (t, p) {
        // 一路压在高位，只留很浅的起伏，不给她喘息的台阶
        var wob = 0.86 + 0.14 * Math.sin(t * 7.3);
        return clamp(p.pow * wob, 0, 1);
      }
    }
  ];
  function modeById(id) {
    for (var i = 0; i < MODES.length; i++) if (MODES[i].id === id) return MODES[i];
    return MODES[1];
  }
  function modeExists(id) {
    for (var i = 0; i < MODES.length; i++) if (MODES[i].id === id) return true;
    return false;
  }

  var STAGES = [
    { name: '适应', at: 0 },
    { name: '升温', at: 22 },
    { name: '攀升', at: 48 },
    { name: '濒临', at: 74 },
    { name: '临界', at: 93 }
  ];
  function stageOf(aro) {
    var s = 1;
    for (var i = 0; i < STAGES.length; i++) if (aro >= STAGES[i].at) s = i + 1;
    return s;
  }

  /* =========================================================
   * 3. 装置状态
   * ======================================================= */
  var S = TK_S = {
    on: false,
    mode: 'wave',
    freq: 42,          // 1..100 滑杆值
    pow: 62,           // 1..100 滑杆值
    limit: 30,         // 分钟，0 为不限
    t: 0,              // 剧情时间（秒），AI 生成期间会冻结
    clock: 0,          // 视觉与包络用的时间（秒），一直在走
    aro: 0,            // 0..100 累积
    env: 0,            // 当前包络
    stage: 1,
    peak: 0,           // 临界次数
    lastEvent: '装置就绪',
    stopReason: '',    // 停止原因，写进状态快照，免得 AI 自己编成"玩家关掉了"
    lastActionNote: '', // 遥控器在角色手里时，角色自己决定的档位意图
    pending: false,    // 遥控器在角色手里、已经催过一次、还在等 TA 决定（瞬时状态，不写进变量）
    beg: 0,            // 本轮已经请求停止的次数（瞬时状态）
    begNeed: 2,        // 顽固模式下需要请求几次才松口（每次启动重掷）
    actions: [],       // 玩家刚在面板上做的动作，让 AI 在正文开头先描述它们
    freezeOnGen: true, // AI 生成期间冻结剧情时间，生成一结束就接着走
    // 设置
    auto: true,
    hapticTap: true,     // 按键反馈：切模式、启停、切作用对象时的短震
    hapticFollow: false, // 跟随震动：装置运行时按频率一直震。默认关，理由见 HAP.fire 注释
    audio: false,
    inject: true,
    manageWb: true,    // 自动把通用设定写进世界书并挂到当前角色卡
    target: 'char',    // char：装置作用在对方（角色）身上；user：作用在自己（玩家）身上
    body: 'female',    // 被作用者的身体：female | male，决定反应条目用哪一版
    explicit: true,    // 描写尺度：true 直写体内；false 切「忍耐 · 假装镇定」，只写外部可观察的表现
    begDocile: true,   // 遥控器在角色手里时，角色是否一求就停；关掉则要请求两三次
    sendMode: 'generate', // generate：绕开酒馆的 /trigger 限制；slash：走酒馆原生流程
    drive: 'floor',    // floor | inner
    cd: 12,
    stageForce: true,
    gain: 100,
    resetOnPeak: true,
    recFreq: true
  };
  var LAST_REACT = 0;
  var PEND_KIND = null, PEND_TIMER = 0;
  var LAST_FREQ_PUSH = -999;
  var LAST_POW_PUSH = -999;

  // 玩家动作序列：连续调几个参数时会攒在一起，一次性交给 AI 描述
  function pushAction(text) {
    if (!text) return;
    S.actions.push(text);
    if (S.actions.length > 3) S.actions.shift();
  }

  // 动作的主语随作用对象变：默认玩家拨遥控器，切到"自己"后由角色操作
  function act(asPlayer, asNpc) {
    return S.target === 'user' ? asNpc : asPlayer;
  }

  /* 画布和 canvas 里用不了 CSS 变量，这里跟着主题存一份 rgb，
     由 paintTarget() 在切换时同步。数值必须和 :root / #shell.tgt-user 对得上。 */
  var THEME_RGB = {
    char: { hot: '192,108,194', hot2: '226,182,223', cyan: '214,189,150' },
    user: { hot: '224,86,111', hot2: '242,176,186', cyan: '214,189,150' }
  };
  var HOT_RGB = THEME_RGB.char.hot;
  var HOT_RGB_2 = THEME_RGB.char.hot2;
  var CYAN_RGB = THEME_RGB.char.cyan;

  /* 取当前扮演的角色名。
     注入里直接点名（而不是写"角色"）——"角色"这种词 AI 会自己找参照，
     在多 NPC 的卡上很容易指错人，写成具体名字就没有歧义。 */
  function charName() {
    var n = '';
    try {
      var f = th('getCurrentCharacterName');
      if (f) n = f() || '';
    } catch (e) { /* noop */ }
    if (!n) {
      try { n = (typeof SillyTavern !== 'undefined' && SillyTavern.name2) || ''; } catch (e) { /* noop */ }
    }
    return n || '角色';
  }

  // 频率换算：滑杆 1..100 → 0.6 .. 20 Hz（对数手感）
  function hzOf(v) { return round(0.6 * Math.pow(33.3, (v - 1) / 99), 1); }
  function hz() { return hzOf(S.freq); }
  function pow01() { return S.pow / 100; }

  function fmtTime(sec) {
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + '分' + pad2(s) + '秒';
  }

  /* =========================================================
   * 4. 触觉输出（手机马达 + 声波兜底）
   * ======================================================= */
  /* 这里一律写 navigator：源码是"单文件前端卡"用的，直接拿本窗口的。
     打包成脚本版时，工具-构建脚本版.js 会把这两处改写成 NAV（酒馆页面那一侧），
     绕开脚本 iframe 的权限策略 —— 所以两边都写 navigator 才是对的，
     在源码里手写 NAV 只会让前端卡模式下取不到对象（异常被 try 吞掉，表现为按键完全不震）。 */
  var HAP = {
    last: 0,
    /* 能不能震。iOS / Safari 全平台没有 Vibration API，那边靠声波与界面反馈兜底。 */
    ok: function () {
      try { return ('vibrate' in NAV); } catch (e) { return false; }
    },
    /* 跟随震动：装置运行时按实时频率驱动马达。
       默认关闭 —— 手机马达分辨不出频率，Web API 也只能一段一段地给，
       连续重发的结果是哒哒声而不是平滑震动，而且持续运转费电发热。 */
    fire: function (env, freq) {
      if (!S.hapticFollow || !this.ok() || env < 0.05) return;
      var period = 1000 / clamp(freq, 0.5, 25);
      var now = performance.now();
      if (now - this.last < period * 0.85) return;
      this.last = now;
      var on = clamp(Math.round(period * env * 0.92), 6, 380);
      try { NAV.vibrate(on); } catch (e) { /* noop */ }
      pulseRing();
    },
    burst: function () {
      if (!S.hapticFollow || !this.ok()) return;
      try {
        NAV.vibrate([0, 90, 40, 140, 50, 220, 60, 340]);
      } catch (e) { /* noop */ }
    },
    /* 操作反馈：按下去的"手感"。跟装置是否运行无关，所以走另一个开关。
       只在真按了按钮时调用，滑杆拖动不走这里，否则会一路震。 */
    tap: function (pattern) {
      if (!S.hapticTap || !this.ok()) return;
      try { NAV.vibrate(pattern || 24); } catch (e) { /* noop */ }
    },
    /* 立刻掐断当前震动：关开关、停止装置、页面切到后台时用 */
    kill: function () {
      try { if ('vibrate' in NAV) NAV.vibrate(0); } catch (e) { /* noop */ }
    }
  };

  var AUD = {
    ctx: null, osc: null, gain: null, lfo: null,
    start: function () {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
      var AC = WIN.AudioContext || WIN.webkitAudioContext;
      if (!AC) return false;
      try {
        var ctx = new AC();
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        var lfo = ctx.createOscillator();
        var lfoGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 80;
        lfo.type = 'sine';
        lfo.frequency.value = 8;
        lfoGain.gain.value = 14;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(); lfo.start();
        this.ctx = ctx; this.osc = osc; this.gain = gain; this.lfo = lfo;
        return true;
      } catch (e) { return false; }
    },
    update: function (env, freq) {
      if (!this.ctx || !S.audio) return;
      var t = this.ctx.currentTime;
      this.osc.frequency.setTargetAtTime(52 + clamp(freq, 0.5, 25) * 6.5, t, 0.08);
      this.lfo.frequency.setTargetAtTime(clamp(freq, 1, 18), t, 0.15);
      this.gain.gain.setTargetAtTime(S.on ? env * 0.11 * S.pow / 100 : 0, t, 0.05);
    },
    stop: function () {
      if (!this.ctx) return;
      try { this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); } catch (e) { /* noop */ }
    }
  };

  /* =========================================================
   * 5. 渲染
   * ======================================================= */
  var ring1 = $('#ring1'), ring2 = $('#ring2'), ringEl = $('#ring');
  var big = $('#big'), sub = $('#sub'), mtag = $('#mtag');
  var aroEl = $('#aro'), stageName = $('#stage-name');
  var phaseEls = $('#phases').children;
  var waveCv = $('#wave'), wctx = waveCv.getContext('2d');
  var hist = [];
  var HIST_MAX = 180;
  var ringPulse = 0;
  var lastStatePaint = 0;

  function pulseRing() { ringPulse = 1; }

  function fitCanvas() {
    var r = waveCv.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    waveCv.width = Math.max(10, Math.round(r.width * dpr));
    waveCv.height = Math.max(10, Math.round(r.height * dpr));
    wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawWave() {
    var w = waveCv.width / (Math.min(window.devicePixelRatio || 1, 2.5));
    var h = waveCv.height / (Math.min(window.devicePixelRatio || 1, 2.5));
    wctx.clearRect(0, 0, w, h);
    var n = hist.length;
    if (n < 2) return;
    var stepX = w / (HIST_MAX - 1);
    var x0 = w - (n - 1) * stepX;

    function pathAt(mul, offset) {
      wctx.beginPath();
      for (var i = 0; i < n; i++) {
        var v = hist[i] * mul;
        var y = h - 4 - v * (h - 10) + offset;
        var x = x0 + i * stepX;
        if (i === 0) wctx.moveTo(x, y); else wctx.lineTo(x, y);
      }
    }
    // 填充
    pathAt(1, 0);
    wctx.lineTo(w, h); wctx.lineTo(Math.max(x0, 0), h); wctx.closePath();
    var g = wctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(' + HOT_RGB + ',.34)');
    g.addColorStop(1, 'rgba(' + HOT_RGB + ',0)');
    wctx.fillStyle = g; wctx.fill();
    // 主线
    pathAt(1, 0);
    wctx.strokeStyle = S.on ? 'rgba(' + HOT_RGB_2 + ',.95)' : 'rgba(232,214,236,.20)';
    wctx.lineWidth = 1.6; wctx.lineJoin = 'round'; wctx.stroke();
    // 余像
    pathAt(0.62, -3);
    wctx.strokeStyle = 'rgba(' + CYAN_RGB + ',.35)';
    wctx.lineWidth = 1; wctx.stroke();
  }

  function render() {
    var f = hz(), p = pow01();
    // 圆环
    var C1 = 2 * Math.PI * 52, C2 = 2 * Math.PI * 43;
    var v1 = S.on ? (0.18 + 0.82 * S.env) : 0;
    var v2 = S.aro / 100;
    ring1.setAttribute('stroke-dasharray', (C1 * clamp(v1, 0, 1)).toFixed(1) + ' ' + C1.toFixed(1));
    ring2.setAttribute('stroke-dasharray', (C2 * clamp(v2, 0, 1)).toFixed(1) + ' ' + C2.toFixed(1));
    ringEl.classList.toggle('off', !S.on);

    var shown = S.on ? Math.round(S.env * 100) : 0;
    big.innerHTML = shown + '<small>%</small>';
    sub.textContent = f.toFixed(1) + ' Hz';
    mtag.textContent = S.on ? modeById(S.mode).name : '待机';

    aroEl.textContent = Math.round(S.aro);
    var frozenNow = S.on && (HOLD || BUSY) && S.freezeOnGen;
    stageName.textContent = (frozenNow ? '⏸ ' : '') + '第 ' + S.stage + ' 阶段 · ' + STAGES[S.stage - 1].name;
    var tip = $('#freeze-tip');
    if (tip) tip.hidden = !frozenNow;
    for (var i = 0; i < phaseEls.length; i++) {
      var ph = phaseEls[i];
      var lo = STAGES[i].at;
      var hi = (i + 1 < STAGES.length) ? STAGES[i + 1].at : 100;
      var v = clamp((S.aro - lo) / (hi - lo), 0, 1);
      ph.firstElementChild.style.width = (v * 100) + '%';
      ph.classList.toggle('done', v >= 1);
    }
    // 圆环呼吸
    if (ringPulse > 0) {
      ringPulse = Math.max(0, ringPulse - 0.08);
      ringEl.style.transform = 'scale(' + (1 + ringPulse * 0.014) + ')';
    }
    $('#fv').innerHTML = f.toFixed(1) + '<em>Hz</em>';
    $('#pv').innerHTML = S.pow + '<em>%</em>';
    $('#dv').innerHTML = (S.limit === 0 ? '∞' : S.limit) + '<em>' + (S.limit === 0 ? '' : '分') + '</em>';
    var ps = $('#param-state');
    if (ps) ps.textContent = S.on ? '' : '未启动 · 调整只是预置';
    var nowMs = Date.now();
    if (nowMs - lastStatePaint > 800 && !$('#v-config').hidden) {
      lastStatePaint = nowMs;
      $('#state-box').value = stateText();
    }
    // 遥控器在 TA 手里时，这个键不是"开关"，只是"催 TA 一次"
    var userT = (S.target === 'user');
    $('#power').textContent = userT ? (S.on ? '再催一次' : '催 TA 一次') : (S.on ? '停 止' : '启 动');
    $('#power').classList.toggle('stop', S.on && !userT);
  }

  function paintSlider(el) {
    var pct = ((+el.value - +el.min) / (+el.max - +el.min)) * 100;
    el.style.setProperty('--p', pct + '%');
  }

  /* =========================================================
   * 6. 主循环
   * ======================================================= */
  var raf = 0, lastTs = 0, lastSync = 0, lastDraw = 0, lastPhys = 0;

  // 物理推进与绘制分离：界面被折叠、iframe 不可见或浏览器暂停 rAF 时，
  // 定时器仍能维持装置运行，不会出现"启动了但数值不动"。
  function physics(dt) {
    if (S.on) {
      // clock 驱动波形与包络，一直在走；t 是剧情时间，AI 生成期间可以冻结。
      // LLM 出字慢，若生成期间继续累积，回复落地时状态早就变了，
      // 表现为"换阶段"和"回复"撞在同一时刻。
      S.clock += dt;
      var m = modeById(S.mode);
      S.env = m.env(S.clock, { pow: pow01(), hz: hz(), phase: S.clock * 0.37 });

      var frozen = (HOLD || BUSY) && S.freezeOnGen;
      if (!frozen) {
        S.t += dt;

        // 累积：强度与频率共同决定，模式有增益差
        var rate = (0.075 * pow01() + 0.055 * Math.pow(S.freq / 100, 0.8)) * m.gain * (S.gain / 100);
        S.aro = clamp(S.aro + rate * dt * 6.2, 0, 100);

        var st = stageOf(S.aro);
        if (st !== S.stage) {
          var up = st > S.stage;
          S.stage = st;
          S.lastEvent = '进入第 ' + st + ' 阶段 · ' + STAGES[st - 1].name;
          // 冲刺模式是一次性直冲，阶段会被瞬间跨过好几级；
          // 逐级触发生成只会把它切成一段段冻结，所以这一档不响应阶段跃迁。
          if (up && !m.oneShot) {
            if (S.stageForce && S.auto) react('stage');
            toast('进入第 ' + st + ' 阶段 · ' + STAGES[st - 1].name);
          }
        }
        if (S.aro >= 99.5) {
          S.peak++;
          HAP.burst();

          // 冲刺模式是一次性的：到顶即完成，装置自己停下，要再来一次得重新点启动
          if (m.oneShot) {
            S.aro = 100;
            S.stage = 5;
            S.lastEvent = '冲刺到顶，' + charName() + '直接到了顶点，装置随即自动停下';
            toast('冲刺完成');
            stop('冲刺到顶');
            HAP.fire(S.env, hz());
            return;
          }

          S.lastEvent = '第 ' + S.peak + ' 次临界爆发';
          if (S.auto) react('peak');
          toast('临界爆发 ×' + S.peak);
          S.aro = S.resetOnPeak ? 6 : 96;
          S.stage = stageOf(S.aro);
        }

        // 限时到点自动停
        if (S.limit > 0 && S.t >= S.limit * 60) stop('限时结束');
      }

      HAP.fire(S.env, hz());
      AUD.update(S.env, hz());
    } else {
      S.env = 0;
    }
  }

  function paint() {
    var now = performance.now();
    if (now - lastDraw < 32) return;
    lastDraw = now;
    hist.push(S.on ? S.env : 0);
    if (hist.length > HIST_MAX) hist.shift();
    drawWave();
    render();
  }

  function step() {
    var now = performance.now();
    var dt = lastPhys ? Math.min((now - lastPhys) / 1000, 0.5) : 0;
    lastPhys = now;
    physics(dt);
    paint();
    // 变量同步（5 秒一次，差量写入）
    if (now - lastSync > 5000) {
      lastSync = now;
      if (S.on) syncVars(true);
    }
  }

  // 省电：装置关着时物理层只会把 env 归零，没必要 60 帧地画。
  // rAF 只在装置运行时跑；停下后由下面那个心跳以 ~4Hz 兜底，启动时再把 rAF 拉起来。
  // （这四处是从仓库产物的 v1.10.3 回移过来的，改动者是 fannnnnnn5822。）
  var lastIdle = 0;
  function loop(ts) {
    raf = S.on ? requestAnimationFrame(loop) : 0;
    step();
  }
  function wakeLoop() { if (!raf) raf = requestAnimationFrame(loop); }
  function heartbeat() {
    if (S.on) { if (!raf) wakeLoop(); step(); return; }
    var now = performance.now();
    if (now - lastIdle < 250) return;
    lastIdle = now;
    step();
  }

  /* =========================================================
   * 7. 与角色交互
   * ======================================================= */
  function stateText() {
    var m = modeById(S.mode);
    var sn = STAGES[S.stage - 1].name;
    var L = [];
    var cn = charName();
    L.push('【TOY·LINK 装置 · 实时状态】');
    // 归属必须写死、而且要点名：光靠世界书那一条很容易被角色卡自己的设定盖过去，
    // 用"角色""对方"这类词也容易被多 NPC 的卡指错人。
    if (S.target === 'user') {
      L.push('归属：装置戴在【玩家自己】身上，遥控器在【' + cn + '】手里。被震动的是玩家，不是 ' + cn + '。');
    } else {
      L.push('归属：装置戴在【' + cn + '】身上。【玩家】身上没有装置，玩家手里只有遥控器。');
      L.push('▲ 被震动、被刺激、出现身体反应的是 ' + cn + '，不是玩家。'
        + '不要写玩家的下腹、大腿、腰或皮肤下面有任何东西在动。');
      L.push('▲ 如果前面的楼层里出现过"贴着你""你的大腿发软"这类描写，那是写错了：'
        + '从这条回复开始一律改成写 ' + cn + ' 的身体，直接改过来，不要解释这件事。');
    }
    L.push('运行状态：' + (S.on ? '运行中（装置此刻正在工作）' : '已停止（' + (S.stopReason || '已关闭') + '）'));
    L.push('模式：' + m.name + '｜频率：' + hz().toFixed(1) + ' Hz｜强度：' + S.pow + '%');
    L.push('已持续：' + fmtTime(S.t) + (S.limit > 0 ? '｜本次限时：' + S.limit + ' 分钟' : ''));
    L.push('阶段：第 ' + S.stage + ' 阶段·' + sn + '（累积 ' + Math.round(S.aro) + '/100，累计临界 ' + S.peak + ' 次）');
    L.push('最近变化：' + S.lastEvent);
    if (S.lastActionNote) {
      L.push(cn + ' 自己定下的意图：' + S.lastActionNote + '（接着往下写时保持这个方向）');
    }
    L.push('');
    if (S.actions.length) {
      L.push('玩家刚刚在遥控器上的操作：');
      for (var k = 0; k < S.actions.length; k++) L.push('　' + (k + 1) + '. ' + S.actions[k]);
      L.push('');
    }
    L.push('写作要求（优先级最高）：');
    if (!S.explicit) {
      // 忍耐 · 假装镇定：不写体内，全部落到外部可观察的表现上。
      // 这三条与「世界书 ④⑧⑪ 的忍耐版」同款，两边都写是有意的 ——
      // 用的是角色卡自带世界书时，世界书那半改不到，注入这半才是兜底。
      L.push('· 描写尺度是【忍耐 · 假装镇定】：不写体内感觉、不写生理机制、不写液体，'
        + '也不写"高潮""受不了了"这类结论句。全部落在外面：呼吸、姿态、手在抓什么、话说到第几个字、'
        + '声音从哪里漏出来，以及对周围事物的失手。');
      L.push('· 全篇的主体是"在忍"：嘴硬、转移话题、硬撑着做原来的事；破绽落在动作和语言上 —— '
        + '手比嘴诚实，声音比表情诚实。');
      L.push('· 顶点只写"装不住了"的那一下（话断在半句、身体从支撑物上滑下去、几秒里发不出声音），'
        + '以及之后怎么把场面收拾回来。');
    } else {
      // 身体版本要显式告诉模型，免得它在男女的反应机制上串线
      L.push(S.body === 'male'
        ? '· 被作用者的身体是【男性】：顶点是一次性的释放，到达后有不应期，那段时间里继续刺激只会变成酸胀难受，'
          + '不要再写连续高潮。回落之后写恢复期的疲惫与敏感过头，不要立刻爬第二波。'
        : '· 被作用者的身体是【女性】：没有明确的不应期，一波刚落下一波就能接上，累积回落之后反而更敏感，'
          + '所以顶点不是"结束"，而是下一轮更容易被推上去的起点。');
    }
    // 冲刺到顶是个特殊时刻：装置已经停了，但正文要写的是"她刚到顶点"这件事
    if (S.stopReason && S.stopReason.indexOf('冲刺') === 0) {
      L.push(S.explicit
        ? '▲ ' + cn + ' 刚被冲刺模式一路推到顶点。这一轮正文就写这次高潮本身：到达的那一刻、脱力的痉挛、'
          + '止不住的眼泪与随后的余韵。不要写慢慢积累的过程，也不要把重点放在"装置停了"上。'
        : '▲ ' + cn + ' 刚被冲刺模式一路推到顶点。这一轮不写体内的过程，只写"装不住了"的那一下：'
          + '话断在半句、身体从支撑物上滑下去、几秒里发不出声音；随后是脱力、发愣、手抖，以及收拾自己。'
          + '不要写慢慢积累的过程，也不要把重点放在"装置停了"上。');
    }
    if (S.target === 'user') {
      L.push('· 被作用的是玩家，不是你。写 ' + cn + ' 的掌控动作、表情变化和说的话；玩家身体上的外在反应可以写，但不要替玩家写内心想法和台词。');
    } else {
      L.push('· 装置戴在 ' + cn + ' 身上，玩家身上没有装置，玩家手里只有遥控器。不要写成玩家自己在被震动，也不要把遥控器写到 ' + cn + ' 手里。');
    }
    if (S.actions.length) {
      L.push('· 回复的开头先用一两句话，从玩家的视角描写玩家刚才这些操作（按了什么键、拨到哪一档），再接着写 ' + cn + ' 的身体反应。动作描写要简短，不要展开成玩家的心理活动，也不要替玩家说台词。');
    }
    if (S.on) {
      L.push('· 装置此刻正在运行。不要描写它被关闭、被取下、被调低，也不要假设玩家按了上面没提到的键。');
    } else {
      L.push('· 装置此刻不在运行，可以写余韵和恢复，但不要描写新的震动。');
      if (S.stopReason) L.push('· 停止原因：' + S.stopReason + '。按这个原因来写，不要改写成玩家手动关掉。');
    }
    L.push('· 正文主体是 ' + cn + ' 的反应：写清部位、程度、' + cn + ' 的应对，以及环境声音的变化，不要写结论句。');
    L.push('· 不要替玩家行动、说话，也不要替玩家决定剧情走向。');
    L.push('');
    // 面板上只显示这一句，正文在聊天记录里已经有了，面板再放一遍就是重复
    L.push('【正文之后另起一行，附一句心声】');
    L.push('格式必须完全照下面这样，单独一行：');
    L.push('<TOY>心声=' + cn + '此刻心里真正的想法</TOY>');
    L.push('· 写 ' + cn + ' 心里想的，不是嘴上说的 —— 口是心非的时候，这里要写实话。');
    L.push('· 一句话，25 字以内，不要引号，不要句号结尾。');
    L.push('· 这一行是给面板读的，正文里绝对不要提到它，也不要解释这是什么。');
    L.push('· 不要出现"装置状态""系统""面板""数据"这类词，也不要复述上面的数字，用身体去表现它们。');
    // 模式名里如果出现"重击"这类打击乐比喻，模型会顺着写成"砰、砰"的敲击声。
    // 它贴在皮肤上高频震颤，不是被敲打，所以这一条必须写死。
    L.push('· 它是**震**，不是敲：感受是麻、酥、酸、发胀，不要写"砰""咚""啪"这类撞击声，'
      + '也不要写"砸""捶""碾""撞开"这类动作。');
    L.push('· 它只有极轻的嗡鸣，贴身几乎听不出来 —— 大多数情况下不用写声音；'
      + '要写就写持续的低频"嗡"，不要写有节拍的闷响。');
    return L.join('\n');
  }

  var LAST_VARS_SIG = '';
  function syncVars(reactive) {
    if (!BRIDGE.ready) return false;
    var m = modeById(S.mode);
    var payload = {
      toy_on: S.on ? 'on' : 'off',
      toy_mode: S.mode,
      toy_mode_name: m.name,
      toy_freq: S.freq,
      toy_hz: hz().toFixed(1),
      toy_intensity: S.pow,
      toy_elapsed: fmtTime(S.t),
      toy_elapsed_sec: Math.round(S.t),
      toy_stage: S.stage,
      toy_stage_name: STAGES[S.stage - 1].name,
      toy_arousal: Math.round(S.aro),
      toy_peak: S.peak,
      toy_limit: S.limit,
      toy_last_event: S.lastEvent,
      toy_state: stateText()
    };
    var sig = JSON.stringify(payload);
    if (sig === LAST_VARS_SIG) return true;          // 无变化就不打扰酒馆
    LAST_VARS_SIG = sig;
    var ok = BRIDGE.setVars(payload, 'chat');
    if (ok && !reactive) toast('状态已同步到酒馆变量');
    return ok;
  }

  function injectOnce() {
    if (!S.inject || !BRIDGE.ready) return null;
    return BRIDGE.inject([{
      id: 'toy_state_sync',
      position: 'in_chat',
      depth: 0,
      role: 'system',
      content: stateText(),
      should_scan: true
    }], { once: true });
  }

  function react(kind, force) {
    if (!S.auto && !force) return;

    // 装置没在运行时调参数只是预设置，不叫 AI 说话。
    // 预置的动作会留在动作序列里，等按下启动键时一起交代给 AI。
    var paramEvent = (kind === 'mode' || kind === 'freq' || kind === 'power');
    if (paramEvent && !S.on) return;

    if (BRIDGE.ready === false) { fakeReact(kind); return; }
    var now = Date.now();
    // 启停与手动冲击是即时动作，不受冷却约束；求人停下更不该等冷却
    var hard = (kind === 'manual' || kind === 'burst' || kind === 'start' || kind === 'stop'
      || kind === 'beg' || (kind === 'stage' && S.stageForce));
    if (!force && !hard && now - LAST_REACT < S.cd * 1000) {
      // 冷却期间的操作不丢弃：记下来，冷却一结束用最新状态补触发一次。
      // 连续调几个参数只会补一次，动作序列会把它们一起带过去。
      PEND_KIND = kind;
      clearTimeout(PEND_TIMER);
      PEND_TIMER = setTimeout(function () {
        var k = PEND_KIND;
        PEND_KIND = null;
        if (k) react(k);
      }, Math.max(600, S.cd * 1000 - (now - LAST_REACT) + 200));
      return;
    }
    LAST_REACT = now;

    syncVars(true);
    pushMsg('sys', kindLabel(kind));

    if (S.drive === 'inner') {
      innerGenerate();
    } else {
      floorTrigger();
    }
  }

  function kindLabel(kind) {
    switch (kind) {
      case 'mode': return '切换模式 → ' + modeById(S.mode).name;
      case 'freq': return '频率调整 → ' + hz().toFixed(1) + ' Hz';
      case 'power': return '强度调整 → ' + S.pow + '%';
      case 'stage': return '阶段跃迁 → 第 ' + S.stage + ' 阶段 · ' + STAGES[S.stage - 1].name;
      case 'peak': return '临界爆发';
      case 'start': return '装置启动';
      case 'stop': return '装置停止' + (S.stopReason ? '（' + S.stopReason + '）' : '');
      case 'manual': return '手动触发';
      case 'burst': return '冲击键';
      case 'beg': return '开口请求 ' + charName() + ' 停下（第 ' + S.beg + ' 次）';
      default: return '状态同步';
    }
  }

  /* =========================================================
   * 世界书自管理
   * 把上面那套通用设定写进一本世界书，并挂到当前角色卡，
   * 这样脚本装到任何角色卡上都能直接用，不必另外导世界书。
   * 两条安全线：不覆盖用户自己的同名世界书；不抢角色卡的主世界书。
   * ======================================================= */
  function wbEntriesForTavern() {
    var useUser = (S.target === 'user');
    var useMale = (S.body === 'male');
    var usePlain = !S.explicit;   // 忍耐 · 假装镇定：只写外部可观察的表现
    var list = WB_ENTRIES.map(function (e) {
      var alt = useUser && WB_ENTRIES_ALT[e.name];
      var src = alt || e;
      var content = src.content;
      // 描写尺度优先于身体版本：忍耐档下男女各有一版外部表现条目
      // ④ 按被作用者的身体换整条：男女的顶点机制不同，不能共用一套
      if (usePlain && e.name === '⑧ 临界与停机（关键词触发）') {
        content = WB_PEAK_PLAIN;
      } else if (usePlain && e.name === '⑪ 感受链怎么写（常驻）') {
        content = WB_CHAIN_PLAIN;
      } else if (e.name === '④ 强度档位 × 身体反应（常驻）') {
        content = usePlain
          ? (useMale ? WB_BODY_PLAIN_M : WB_BODY_PLAIN_F)
          : (useMale ? WB_BODY_MALE : content);
      } else if (usePlain && WB_PLAIN_ADDON[e.name]) {
        content = content + '\n' + WB_PLAIN_ADDON[e.name];
      }
      return {
        name: e.name,
        enabled: true,
        strategy: {
          type: e.strategy === 'selective' ? 'selective' : 'constant',
          keys: e.keys || [],
          keys_secondary: { logic: 'and_any', keys: [] },
          scan_depth: 'same_as_global'
        },
        position: {
          type: e.position,
          role: e.role || 'system',
          depth: e.depth || 4,
          order: e.order || 100
        },
        content: content,
        probability: 100,
        recursion: { prevent_incoming: false, prevent_outgoing: false, delay_until: null },
        effect: { sticky: null, cooldown: null, delay: null },
        extra: { toylink_managed: VERSION }   // 标记：这本世界书由本脚本管理
      };
    });
    if (useUser) {
      var x = WB_EXTRA_USER;
      list.push({
        name: x.name,
        enabled: true,
        strategy: { type: 'constant', keys: [], keys_secondary: { logic: 'and_any', keys: [] }, scan_depth: 'same_as_global' },
        position: { type: x.position, role: x.role, depth: x.depth, order: x.order },
        content: x.content,
        probability: 100,
        recursion: { prevent_incoming: false, prevent_outgoing: false, delay_until: null },
        effect: { sticky: null, cooldown: null, delay: null },
        extra: { toylink_managed: VERSION }
      });
    }
    // 归属条目永远排在最后（数组末尾），确保它是注入列表里最靠后、最贴近最新消息的一条
    var anchor = WB_ANCHOR;
    list.push({
      name: anchor.name,
      enabled: true,
      strategy: { type: 'constant', keys: [], keys_secondary: { logic: 'and_any', keys: [] }, scan_depth: 'same_as_global' },
      position: { type: anchor.position, role: anchor.role, depth: anchor.depth, order: anchor.order },
      content: useUser ? WB_ANCHOR_USER.content : anchor.content,
      probability: 100,
      recursion: { prevent_incoming: false, prevent_outgoing: false, delay_until: null },
      effect: { sticky: null, cooldown: null, delay: null },
      extra: { toylink_managed: VERSION }
    });
    return list;
  }

  function syncWorldbook(silent) {
    if (!S.manageWb || !BRIDGE.ready) return;
    var listFn = th('getWorldbookNames');
    var getFn = th('getWorldbook');
    var putFn = th('createOrReplaceWorldbook');
    var charFn = th('getCharWorldbookNames');
    var bindFn = th('rebindCharWorldbooks');
    if (!listFn || !putFn) {
      console.log('[TOY·LINK] 当前酒馆助手没有世界书接口，跳过自动建库');
      return;
    }

    var bind = function () {
      if (!charFn || !bindFn) return;
      try {
        var cur = charFn('current') || {};
        var add = cur.additional || [];
        if (add.indexOf(WB_NAME) >= 0) return;
        var done = function () { if (!silent) toast('装置设定已挂到当前角色卡'); };
        var p = bindFn('current', { primary: cur.primary || null, additional: add.concat([WB_NAME]) });
        if (p && p.then) p.then(done, function () { /* noop */ }); else done();
      } catch (e) { /* noop */ }
    };

    var write = function () {
      try {
        var p = putFn(WB_NAME, wbEntriesForTavern(), { render: 'none' });
        if (p && p.then) p.then(bind, function () { /* noop */ }); else bind();
      } catch (e) { bind(); }
    };

    var names = [];
    try { names = listFn() || []; } catch (e) { names = []; }

    if (names.indexOf(WB_NAME) < 0) { write(); return; }

    // 已存在：只有带本脚本标记的才更新，避免覆盖用户自己的同名世界书
    if (!getFn) { bind(); return; }
    var check = function (wb) {
      var mine = (wb || []).some(function (e) { return e && e.extra && e.extra.toylink_managed; });
      if (mine) { write(); return; }
      console.log('[TOY·LINK] 已有同名世界书但不是本脚本建的，保持原样，只做绑定');
      bind();
    };
    try {
      var r = getFn(WB_NAME);
      if (r && r.then) r.then(check, function () { /* noop */ }); else check(r);
    } catch (e) { bind(); }
  }

  // ---- 路线一：写入隐藏楼层 + 触发发言（回复落在酒馆聊天里） ----
  // 酒馆在生成回复期间会拒绝 /trigger，所以生成中先把请求记下来，等结束再补。
  // 注意生成结束的信号不止一个：正常结束是 generation_ended，
  // 被停止按钮打断是 generation_stopped，面板内 generate() 走的是 js_generation_*。
  var BUSY = false, PENDING = false, PENDING_TIMER = 0, BUSY_GUARD = 0;
  var BUSY_SINCE = 0, BUSY_WATCH = 0;

  /* 我们自己掌控的"剧情时间暂停"标记。
     为什么不用 BUSY：BUSY 是靠酒馆事件推出来的，事件可能被别的东西提前打断
     （比如别的生成结束、消息事件），一旦被误清，冻结就悄悄失效了。
     HOLD 只在"我们确实发起了一次生成"时打开，在它自己的回调里关闭，
     不依赖任何外部事件，所以冻结一定站得住。 */
  var HOLD = false, HOLD_GUARD = 0;

  function holdOn() {
    HOLD = true;
    clearTimeout(HOLD_GUARD);
    HOLD_GUARD = setTimeout(function () { HOLD = false; }, 180000);
  }
  function holdOff() {
    HOLD = false;
    clearTimeout(HOLD_GUARD);
  }

  function markBusy() {
    if (!BUSY) BUSY_SINCE = Date.now();
    BUSY = true;
    // 保险丝一：无论事件有没有丢，180 秒后自动解除，避免永久卡在"生成中"
    clearTimeout(BUSY_GUARD);
    BUSY_GUARD = setTimeout(function () { markIdle(); }, 180000);
    startWatch();
  }

  function markIdle() {
    clearTimeout(BUSY_GUARD);
    if (BUSY_WATCH) { clearInterval(BUSY_WATCH); BUSY_WATCH = 0; }
    if (!BUSY && !PENDING) return;
    BUSY = false;
    if (PENDING) {
      PENDING = false;
      clearTimeout(PENDING_TIMER);
      setTimeout(function () { floorTrigger(); }, 300);
    }
  }

  /* 问一次酒馆到底在不在生成：
   * true = 明确在生成，false = 明确没在生成，null = 判断不了 */
  function externalGen() {
    try {
      if (typeof SillyTavern !== 'undefined' && SillyTavern && typeof SillyTavern.getContext === 'function') {
        var c = SillyTavern.getContext();
        if (c && typeof c.isGenerating === 'function') return !!c.isGenerating();
      }
    } catch (e) { /* noop */ }
    try {
      // 生成中时酒馆的发送按钮会变成停止图标。用原生查询，不依赖 jQuery 版本差异。
      var btn = DOC.querySelector('#send_but');
      if (btn) return !!btn.querySelector('.fa-stop');
    } catch (e) { /* noop */ }
    return null;
  }

  /* 保险丝二：看门狗。事件全丢的时候把冻结解开。
   * 酒馆明确说没在生成就立刻解冻；判断不了就等 90 秒。 */
  function startWatch() {
    if (BUSY_WATCH) return;
    BUSY_WATCH = setInterval(function () {
      if (!BUSY) { clearInterval(BUSY_WATCH); BUSY_WATCH = 0; return; }
      if (Date.now() - BUSY_SINCE < 4000) return;   // 刚进入生成，给它一点时间
      var g = externalGen();
      if (g === false) markIdle();
      else if (g === null && Date.now() - BUSY_SINCE > 90000) markIdle();
    }, 2000);
  }

  function stBusy() {
    if (BUSY) return true;
    return externalGen() === true;
  }

  function findStateFloor() {
    var f = th('getChatMessages');
    if (!f) return -1;
    var id = BRIDGE.lastMsgId();
    if (id < 0) return -1;
    var lo = Math.max(0, id - 15);
    try {
      var arr = f(lo + '-' + id, { hide_state: 'hidden' }) || [];
      for (var i = arr.length - 1; i >= 0; i--) {
        var t = arr[i] && arr[i].message;
        if (typeof t === 'string' && t.indexOf('【装置状态同步】') === 0) return arr[i].message_id;
      }
    } catch (e) { /* noop */ }
    return -1;
  }

  var ACTION_EXPIRE = 0;

  /* 动作序列要两条通道都走：
   * 1) 注入（injectPrompts）—— 只对这一次生成有效，干净但可能被环境吞掉；
   * 2) 聊天变量 toy_state —— 世界书条目读的就是它，实测最可靠。
   * 变量这份在触发后保留 25 秒再清掉，既够 AI 读到，又不会在后续几轮里
   * 反复描述同一个操作。 */
  function scheduleActionExpiry() {
    clearTimeout(ACTION_EXPIRE);
    ACTION_EXPIRE = setTimeout(function () { syncVars(true); }, 25000);
  }

  /* 直接用 generate 请求生成，绕开 /trigger。
   * 酒馆在生成期间会拒绝 /trigger（弹「在回复生成时无法运行 /trigger 命令」），
   * 而 generate 走的是酒馆助手自己的请求通道，不吃这个限制。
   * 回复拿到后用 createChatMessages 落进聊天记录，观感与 /trigger 一致。 */
  function generateToChat() {
    markBusy();
    holdOn();          // 我们发起的生成，冻结由自己开关
    markPending(true); // 遥控器在 TA 手里时，先摆出"等 TA 决定"的中间态
    var res = BRIDGE.gen({
      user_input: '（装置控制台同步，接着上一楼继续）',
      should_stream: false,
      should_silence: false,
      injects: innerInjections()
    });
    S.actions.length = 0;   // 这批动作已经交给 AI 了
    scheduleActionExpiry();

    var done = function (text) {
      markIdle();
      holdOff();
      var d = applyToyDirective(typeof text === 'string' ? text : '');
      markPending(false);   // 面板此刻显示的已经是 TA 刚选定的那一档
      var body = cleanReply(d.text);
      if (!body) { toast('没有拿到回复，检查 API 与预设'); settleBeg(false); return; }
      settleBeg(true);      // 回复到了才算数：TA 答没答应，这里结账
      BRIDGE.addMsg({ role: 'assistant', message: body });
      // 面板上只放心声，正文已经在聊天记录里了
      pushMsg('ai', d.heart || heartFallback());
    };
    if (res && res.then) res.then(done, function () { markIdle(); holdOff(); markPending(false); settleBeg(false); }); else done('');
  }

  function floorTrigger() {
    if (!BRIDGE.ready) { fakeReact('auto'); return; }

    // 默认走 generate：不会撞上酒馆的生成锁，也就没有那条报错
    if (S.sendMode === 'generate' && th('generate')) { generateToChat(); return; }

    if (stBusy()) {
      // AI 正在生成，插队会撞上酒馆的「无法运行 /trigger」拦截
      if (PENDING) return;
      PENDING = true;
      // 兜底：万一结束事件没来（中断、报错），12 秒后自己重试一次
      clearTimeout(PENDING_TIMER);
      PENDING_TIMER = setTimeout(function () {
        if (PENDING) { PENDING = false; BUSY = false; floorTrigger(); }
      }, 12000);
      return;
    }
    var payload = stateText();
    var fire = function () { BRIDGE.slash('/trigger'); };

    // 首选：把状态作为 system 提示注入到最新位置，只对这一次生成有效。
    // 不写进聊天记录，AI 也不会把它当成玩家说的话来接。
    // 注意：动作序列必须在注入之后才清空，否则注入的那一份会是空的。
    if (S.inject && th('injectPrompts')) {
      injectOnce();
      S.actions.length = 0;
      fire();
      scheduleActionExpiry();
      return;
    }

    S.actions.length = 0;
    scheduleActionExpiry();
    // 兜底：老版本酒馆助手没有注入接口时，退回写一条隐藏楼层
    var after = fire;
    var reuse = findStateFloor();
    if (reuse >= 0) {
      // 复用最近的状态楼层，避免隐藏楼层无限堆积
      var setF = th('setChatMessages');
      if (setF) {
        try {
          setF([{ message_id: reuse, message: payload }], { refresh: 'none' });
          after();
          return;
        } catch (e) { /* 退化到新建楼层 */ }
      }
    }
    var p = BRIDGE.addMsg({ role: 'user', message: payload, is_hidden: true }, { refresh: 'none' });
    if (p && p.then) p.then(after, after); else after();
  }

  // ---- 路线二：界面内自行生成并落库 ----
  // 预设常会带出容器标签、流程注释、草稿标记，面板里只留正文与对白
  var CLEAN_FORMAT_PROMPT = [
    '【输出格式】只输出角色这一轮的动作神态与对白本身。',
    '不要输出任何标签、注释、分隔线、标题、进度标记、草稿或思考过程；',
    '诸如 <!-- -->、<content>、<ts>、### 这类东西一律不要出现在输出里。',
    '不要复述状态数据，也不要写"正文""第一段""草稿"这类结构提示。'
  ].join('\n');

  function cleanReply(text) {
    if (!text) return '';
    var t = String(text);
    t = t.replace(/<TOY>[\s\S]*?<\/TOY>/gi, '');   // 装置读数由脚本消费，不给玩家看
    t = t.replace(/<!--[\s\S]*?-->/g, '');
    t = t.replace(/<(think|thinking|reasoning|analysis|scratchpad|chain_of_thought)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
    t = t.replace(/<\/?(content|maintext|main_text|reply|output|正文|内容|输出)\b[^>]*>/gi, '');
    t = t.replace(/<ts\b[^>]*>[\s\S]*?<\/ts>/gi, '');   // 情绪标注整块（含角色名/情绪这类元信息）
    t = t.replace(/<\/?ts\b[^>]*>/gi, '');
    t = t.replace(/^\s*#{1,6}\s*(正文|回复|内容|输出)\s*$/gmi, '');
    t = t.replace(/^\s*```[a-zA-Z]*\s*$/gmi, '');
    t = t.replace(/\n{3,}/g, '\n\n');
    return t.trim();
  }

  /* 遥控器在角色手里时的"决策格式"。
     这一档下玩家不是操控方，面板上的按钮只是"推进一次"的信号，
     调到什么档、想达到什么效果由角色自己决定；角色把这个决定写进一行读数，
     脚本解析后把面板切到那一档——所以是"读完回复界面才变"，而不是反过来。 */
  function decidePrompt() {
    var cn = charName();
    var L = [
      '【这一轮由你决定装置怎么用】',
      '遥控器在 ' + cn + ' 手里。玩家按下的只是一个"开始"的信号，'
        + '具体调到什么档、想达到什么效果，由你按 ' + cn + ' 的性格与此刻的心情决定。',
      '',
      '正文写完之后，另起一行附上装置读数，格式必须完全照下面这样：',
      '<TOY>开关=开|模式=潮汐|频率=45|强度=70|说明=想让你在人前先开口求他|心声=嘴上说着求我，其实自己也快撑不住了</TOY>',
      '',
      '规则：',
      '· 开关填「开」或「关」。填「关」表示这一轮把装置停了。',
      '· 模式只能填这九个之一：脉冲、潮汐、心跳、渐强、乱流、撩拨、暴雨、临界、冲刺。',
      '· 频率与强度填 1-100 的整数。',
      '· 说明用一句短话写清这次想干什么、想看到什么样的反应。',
      '· 心声写 ' + cn + ' 此刻心里真正的想法，不是嘴上说的话，一句话、25 字以内。'
        + '面板上只显示这一句，所以它要能独立看懂。',
      '· 这一行是给装置读的，正文里绝对不要提到它，也不要解释这是什么。'
    ];

    // 玩家按了「请求停下」：这一轮的重点从"怎么调"变成"肯不肯放"
    if (S.beg > 0) {
      var give = S.begDocile || (S.beg >= S.begNeed);
      L.push('');
      L.push('【玩家在求你停下】');
      L.push('这是第 ' + S.beg + ' 次开口。' + cn + ' 的语气一次比一次软，'
        + '这一次' + (S.beg === 1 ? '还带着点不好意思' : (S.beg === 2 ? '已经是在服软了' : '几乎是明着认输')) + '。');
      if (give) {
        L.push('这一轮应当答应：让 ' + cn + ' 松口，把装置停下。'
          + '正文写 ' + cn + ' 停手之后的样子——那口终于松下来的气、余韵、'
          + '以及 ' + cn + ' 对玩家服软的反应（得意、心疼、或者嘴上不认但手上停了，按性格来）。');
        L.push('读数里的「开关」填「关」。');
      } else {
        L.push('按 ' + cn + ' 的性格，这一次可以不听——' + cn + ' 还想再看一会儿，或者故意拖着不答应，'
          + '甚至反过来把档位往上拨一点。');
        L.push('但不许写死：如果 ' + cn + ' 的人设本来就不忍心，也可以提前答应。');
        L.push('读数里的「开关」按你的决定填：答应了填「关」，没答应填「开」。');
      }
    }
    return L.join('\n');
  }

  /* 解析回复里的装置读数，把面板切到那一档。返回剥离读数后的正文。 */
  function applyToyDirective(text) {
    var raw = String(text || '');
    var cn = charName();
    var m = /<TOY>([\s\S]*?)<\/TOY>/i.exec(raw);
    if (!m) return { text: raw, applied: false };
    var body = m[1];
    var pick = function (k) {
      var r = new RegExp(k + '\\s*[=:：]\\s*([^|｜\\r\\n]+)');
      var mm = r.exec(body);
      return mm ? mm[1].trim() : '';
    };

    var powerOn = pick('开关');
    var modeName = pick('模式');
    var freq = parseInt(pick('频率'), 10);
    var pow = parseInt(pick('强度'), 10);
    var note = pick('说明');
    var heart = pick('心声');   // 面板上显示这一句，不放正文

    var changed = [];
    var i;
    for (i = 0; i < MODES.length; i++) {
      if (MODES[i].name === modeName && MODES[i].id !== S.mode) {
        S.mode = MODES[i].id;
        var nodes = $('#modes').children;
        for (var k = 0; k < nodes.length; k++) nodes[k].classList.toggle('on', nodes[k].dataset.id === S.mode);
        changed.push('模式「' + MODES[i].name + '」');
        break;
      }
    }
    if (freq >= 1 && freq <= 100 && freq !== S.freq) {
      S.freq = freq;
      var fe = $('#freq'); if (fe) { fe.value = freq; paintSlider(fe); }
      changed.push('频率 ' + hz().toFixed(1) + ' Hz');
    }
    if (pow >= 1 && pow <= 100 && pow !== S.pow) {
      S.pow = pow;
      var pe = $('#pow'); if (pe) { pe.value = pow; paintSlider(pe); }
      changed.push('强度 ' + pow + '%');
    }
    if (powerOn === '开' && !S.on) {
      startSilent();
      changed.push('已启动');
    } else if (powerOn === '关' && S.on) {
      stop(cn + '关掉了装置', true);
      changed.push('已停止');
    }

    S.lastEvent = cn + '调到：' + (changed.length ? changed.join('，') : '维持原档');
    if (note) S.lastActionNote = note;
    render();
    syncVars(true);

    if (changed.length) {
      toast(cn + '调到了 ' + changed.join('，'), 2600);
    } else if (note) {
      toast(cn + '的想法：' + note, 2600);
    }
    return { text: raw.replace(/<TOY>[\s\S]*?<\/TOY>/gi, '').trim(), applied: true, note: note, heart: heart };
  }

  /* 用户和状态之间的翻译层：拿不到心声时不要编。
     硬凑一句"她心里想着……"是假的，不如老实报当前档位。 */
  function heartFallback() {
    var cn = charName();
    if (!S.on) return cn + '还没被碰到 · 装置待机';
    return '强度 ' + S.pow + '% · 第 ' + S.stage + ' 阶段·' + STAGES[S.stage - 1].name;
  }

  function innerInjections() {
    var arr = [];
    if (S.inject) {
      arr.push({ role: 'system', content: stateText(), position: 'in_chat', depth: 0, should_scan: true });
    }
    // 遥控器在她手里时，档位由她决定，得额外告诉模型怎么把决定交回来
    if (S.target === 'user') {
      arr.push({ role: 'system', content: decidePrompt(), position: 'in_chat', depth: 0, should_scan: false });
    }
    arr.push({ role: 'system', content: CLEAN_FORMAT_PROMPT, position: 'in_chat', depth: 1, should_scan: false });
    return arr;
  }

  function innerGenerate() {
    if (!BRIDGE.ready) { fakeReact('auto'); return; }
    var holder = pushMsg('ai', '');
    holder.querySelector('.bubble').classList.add('blink', 'now');
    var buf = '';
    var streamFn = function (text) {
      buf = text || '';
      holder.querySelector('.bubble').textContent = cleanReply(buf);
      scrollFeed();
    };
    var offStream = function () {
      var f = th('eventRemoveListener');
      if (f) { try { f(EVT.STREAM_FULL, streamFn); } catch (e) { /* noop */ } }
    };
    BRIDGE.on(EVT.STREAM_FULL, streamFn);

    markBusy();
    holdOn();
    markPending(true);   // 遥控器在 TA 手里时，先摆出"等 TA 决定"的中间态
    var res = BRIDGE.gen({
      user_input: '（装置控制台同步，接着上一楼继续）',
      should_stream: true,
      should_silence: false,
      injects: innerInjections()
    });
    var finish = function (text) {
      offStream();
      markIdle();
      holdOff();
      var d = applyToyDirective((typeof text === 'string' && text) ? text : buf);
      markPending(false);   // 面板此刻显示的已经是 TA 刚选定的那一档
      var body = cleanReply(d.text);
      var b = holder.querySelector('.bubble');
      b.classList.remove('blink', 'now');
      if (body) {
        b.textContent = d.heart || heartFallback();
        BRIDGE.addMsg({ role: 'assistant', message: body }, { refresh: 'none' });
        settleBeg(true);
      } else {
        holder.remove();
        toast('没有拿到回复，检查 API 与预设');
        settleBeg(false);
      }
      scrollFeed();
    };
    if (res && res.then) res.then(finish, finish); else finish('');
  }

  // ---- 离线演示 ----
  var FAKE = {
    low: ['轻轻吸了口气，膝盖不自觉地并了并。', '攥住手边的布料，声音里带出一点黏。', '低下头，呼吸乱了一拍。'],
    mid: ['整个人抖了一下，指尖掐进掌心，喉咙里漏出一声没压住的轻哼。', '试着稳住呼吸，可腰已经自己塌了下去。', '声音开始发飘，一句话断成三截。'],
    high: ['再也说不出完整的句子，只剩下贴着牙齿的呜咽。', '弓起背，指节泛白，一声比一声更哑。', '意识被搅成一团白光，只能本能地追着那点节奏。']
  };
  function fakeReact() {
    var bank = S.aro < 25 ? FAKE.low : (S.aro < 65 ? FAKE.mid : FAKE.high);
    var txt = bank[Math.floor(Math.random() * bank.length)];
    setTimeout(function () {
      var holder = pushMsg('ai', '');
      holder.querySelector('.bubble').textContent = txt;
      scrollFeed();
    }, 420);
  }

  /* =========================================================
   * 8. 反应流渲染
   * ======================================================= */
  function scrollFeed() {
    var v = $('#v-chat');
    v.scrollTop = v.scrollHeight;
  }
  function pushMsg(kind, text) {
    var feed = $('#feed');
    var empty = feed.querySelector('.feed-empty');
    if (empty) empty.remove();
    var el = document.createElement('div');
    el.className = 'msg ' + (kind === 'ai' ? 'ai' : (kind === 'me' ? 'me' : 'sys'));
    var who = kind === 'ai' ? 'TA 的心声' : (kind === 'me' ? '你' : '装置');
    el.innerHTML = '<div class="who"><i></i>' + who + '</div><div class="bubble"></div>';
    el.querySelector('.bubble').textContent = text || '';
    feed.appendChild(el);
    scrollFeed();
    return el;
  }

  /* =========================================================
   * 9. 启停与事件绑定
   * ======================================================= */
  /* 只把装置跑起来，不触发 AI。
     给"她自己按下启动键"这条路径用——那是回复里发生的事，
     不该反过来再叫一次生成。 */
  function startSilent() {
    if (S.on) return false;
    S.on = true;
    wakeLoop();       // 装置跑起来了，把渲染循环拉起来（关着时它不跑）
    S.beg = 0;        // 新的一轮，请求次数清零
    paintTargetLock();   // 装置跑起来了，作用对象先锁住
    S.t = 0;
    S.clock = 0;
    S.aro = 0;
    S.stage = 1;
    S.stopReason = '';
    lastPhys = 0;
    if (S.audio) AUD.start();
    render();
    return true;
  }

  function start() {
    if (S.on) return;
    S.lastEvent = '装置启动，' + modeById(S.mode).name + ' 模式 ' + hz().toFixed(1) + ' Hz';
    pushAction(act(
      '按下遥控器的启动键，装置开始运行：' + modeById(S.mode).name + ' 模式，频率 ' + hz().toFixed(1) + ' Hz，强度 ' + S.pow + '%',
      '把遥控器拿在手里，按下了启动键：' + modeById(S.mode).name + ' 模式，频率 ' + hz().toFixed(1) + ' Hz，强度 ' + S.pow + '%'));
    startSilent();
    HAP.tap([0, 45, 70, 45]);   // 启动：两下，给点仪式感
    // 每一轮重新掷"这次要为难你几回"，2 或 3
    S.beg = 0;
    S.begNeed = 2 + Math.round(Math.random());
    paintBeg();
    render();
    toast('装置已启动');
    if (S.auto) toast('自动反应开着：状态变化会让 AI 新生成回复', 3200);
    setTimeout(function () { react('start'); }, 260);
  }
  function stop(reason, silent) {
    if (!S.on) return;
    S.on = false;
    S.stopReason = reason || '玩家手动关闭';
    S.lastEvent = '装置停止（' + S.stopReason + '）';
    pushAction((S.stopReason === '玩家手动关闭')
      ? act('按下遥控器的关闭键，装置停下', '把遥控器关掉，装置停下')
      : '装置因「' + S.stopReason + '」自行停下，没有人碰遥控器');
    HAP.kill();   // 先把跟随震动掐掉，不然会震完剩下的一段
    AUD.stop();
    S.beg = 0;    // 停了就不用再求了
    paintBeg();
    paintTargetLock();   // 停了，作用对象可以换了
    render();
    syncVars(true);   // 停止要立刻反映到变量，不能等下一次定时同步
    if (silent) { HAP.tap(50); return; }   // 她自己关的，不必再叫一次生成
    HAP.tap(70);   // 停止：一下长的，手感上收得住
    toast('装置已停止');
    setTimeout(function () { react('stop'); }, 240);
  }

  function buildModes() {
    var box = $('#modes');
    box.innerHTML = '';
    MODES.forEach(function (m) {
      var b = document.createElement('button');
      b.className = 'mode' + (m.id === S.mode ? ' on' : '');
      b.dataset.id = m.id;
      b.title = m.desc;
      b.disabled = (S.target === 'user');   // 只读仪表：真禁用，连程序化点击也拦
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor">' + m.icon + '</svg><span>' + m.name + '</span>';
      b.addEventListener('click', function () { setMode(m.id); });
      box.appendChild(b);
    });
  }
  function setMode(id) {
    if (S.target === 'user') return;   // 遥控器不在玩家手里，档位点了也不算
    if (S.mode === id) return;
    S.mode = id;
    var m = modeById(id);
    if (S.recFreq) {
      $('#freq').value = m.rec;
      paintSlider($('#freq'));
      S.freq = m.rec;
      syncSliders();
    }
    S.lastEvent = '切换到「' + m.name + '」模式' + (S.recFreq ? '，频率适配至 ' + hz().toFixed(1) + ' Hz' : '');
    HAP.tap(22);   // 切模式：一下短促的确认
    pushAction(act('在遥控器上把模式切到「' + m.name + '」', '把遥控器上的模式拨到「' + m.name + '」')
      + (S.recFreq ? '，频率随之拨到 ' + hz().toFixed(1) + ' Hz' : ''));
    var nodes = $('#modes').children;
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.toggle('on', nodes[i].dataset.id === id);
    render();
    react('mode');
  }

  function syncSliders() { render(); }

  // 拖动滑杆会连续触发 input：等手停下来再叫 AI，避免一次调整说三遍
  var REACT_DEBOUNCE = 0;
  function scheduleReact(kind) {
    clearTimeout(REACT_DEBOUNCE);
    REACT_DEBOUNCE = setTimeout(function () { react(kind); }, 750);
  }

  $('#freq').addEventListener('input', function (e) {
    var oldHz = hz().toFixed(1);
    S.freq = +e.target.value;
    var newHz = hz().toFixed(1);
    paintSlider(e.target);
    if (Math.abs(S.freq - LAST_FREQ_PUSH) >= 9) {
      LAST_FREQ_PUSH = S.freq;
      S.lastEvent = '频率' + (newHz >= oldHz ? '提升' : '降低') + '至 ' + newHz + ' Hz';
      pushAction(act('把频率从 ' + oldHz + ' Hz 拨到 ' + newHz + ' Hz', '把频率拨到 ' + newHz + ' Hz'));
      scheduleReact('freq');
    }
    render();
  });
  $('#pow').addEventListener('input', function (e) {
    var oldPow = S.pow;
    S.pow = +e.target.value;
    paintSlider(e.target);
    if (Math.abs(S.pow - LAST_POW_PUSH) >= 12) {
      LAST_POW_PUSH = S.pow;
      S.lastEvent = '强度调整至 ' + S.pow + '%';
      pushAction(act('把强度从 ' + oldPow + '% 推到 ' + S.pow + '%', '把强度推到 ' + S.pow + '%'));
      scheduleReact('power');
    }
    render();
  });
  $('#dur').addEventListener('input', function (e) {
    S.limit = +e.target.value;
    paintSlider(e.target);
    markDurChip();
    S.lastEvent = S.limit === 0 ? '取消限时' : '限时 ' + S.limit + ' 分钟';
    render();
  });
  $('#dur-chips').addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    S.limit = +b.dataset.d;
    $('#dur').value = S.limit;
    paintSlider($('#dur'));
    markDurChip();
    S.lastEvent = S.limit === 0 ? '取消限时' : '限时 ' + S.limit + ' 分钟';
    render();
  });
  function markDurChip() {
    var cs = $('#dur-chips').children;
    for (var i = 0; i < cs.length; i++) cs[i].classList.toggle('on', +cs[i].dataset.d === S.limit);
  }

  $('#power').addEventListener('click', function () { S.on ? stop() : start(); });
  $('#btn-burst').addEventListener('click', function () {
    if (!S.on) { toast('先启动装置'); return; }
    S.aro = clamp(S.aro + 26, 0, 100);
    S.env = 1;
    HAP.tap([0, 40, 30, 70, 30, 110]);   // 这是玩家按的键，走按键反馈，不走跟随震动
    S.lastEvent = '手动冲击，强度骤增';
    pushAction(act('按下遥控器上的冲击键，强度瞬间拉满', '按下冲击键，把强度瞬间拉满'));
    toast('冲击 +26');
    render();
    react('burst', true);
  });

  function toggleBtn(el, key, after) {
    el.addEventListener('click', function () {
      S[key] = !S[key];
      el.classList.toggle('on', S[key]);
      if (after) after();
      bindSettings();
      persist();
    });
  }
  toggleBtn($('#c-auto'), 'auto');
  toggleBtn($('#c-freeze'), 'freezeOnGen', function () {
    toast(S.freezeOnGen ? 'AI 出字期间累积会暂停，等它写完再走' : '累积不再暂停，AI 出字期间装置照常推进');
  });
  toggleBtn($('#c-haptap'), 'hapticTap', function () {
    if (!S.hapticTap) HAP.kill();
    else HAP.tap([0, 40, 60, 40]);   // 打开时立刻给一下，让人知道自己开对了
  });
  toggleBtn($('#c-hapfol'), 'hapticFollow', function () {
    if (!S.hapticFollow) HAP.kill();
  });
  toggleBtn($('#c-audio'), 'audio', function () {
    if (S.audio) { AUD.start(); AUD.update(S.on ? S.env : 0, hz()); }
    else AUD.stop();
  });
  $('#c-now').addEventListener('click', function () { HAP.tap(28); react('manual', true); });

  /* 请求 TA 停下。按下去不算数——得看 TA 这一轮肯不肯。
     默认一求就停；开了「TA 未必肯听」之后要两三回，但脚本保证求满就一定停。 */
  $('#beg-stop').addEventListener('click', function () {
    if (S.target !== 'user') return;
    if (!S.on) { toast('装置本来就停着'); return; }
    S.beg = Math.min(S.beg + 1, 3);
    HAP.tap([0, 35, 30, 35]);
    S.lastEvent = '你第 ' + S.beg + ' 次开口请求 ' + charName() + ' 把装置停下';
    pushAction('开口请求 ' + charName() + ' 把装置停下');
    paintBeg();
    react('beg', true);
  });

  // 冻结提示本身可以点：卡住时手动让它继续
  $('#freeze-tip').addEventListener('click', function () {
    markIdle();
    toast('已手动继续：剧情时间恢复流动');
  });

  // 手动对角色说话：走酒馆正常用户楼层，保持上下文连续
  $('#say-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var inp = $('#say-input');
    var text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    pushMsg('me', text);
    if (!BRIDGE.ready) { setTimeout(fakeReact, 400); return; }
    syncVars(true);
    // 先把自己这句话落进聊天记录，再用面板自己那条通道触发生成。
    // 以前这里发的是 /trigger —— 那是酒馆自己生成，两个毛病：
    // 生成期间会被酒馆拦掉，而且结果我们拿不到，解析不出心声，
    // 面板就一直是空的。改走 floorTrigger 之后，回复同样落库，
    // 还能顺带拿到这一轮的心声。
    var p = BRIDGE.addMsg({ role: 'user', message: text });
    var after = function () { floorTrigger(); };
    if (p && p.then) p.then(after, after); else after();
  });

  $('#c-sync').addEventListener('click', function () {
    if (syncVars(false)) toast('已写入聊天变量');
    else toast('未检测到酒馆环境');
  });
  $('#c-copy').addEventListener('click', function () {
    var t = stateText();
    var done = function () { toast('快照已复制'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(done, function () { fallbackCopy(t, done); });
    } else fallbackCopy(t, done);
  });
  function fallbackCopy(t, cb) {
    try {
      var ta = document.createElement('textarea');
      ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
      MOUNT(ta); ta.select();
      document.execCommand('copy'); ta.remove(); cb();
    } catch (e) { toast('复制失败，请手动选择'); }
  }
  $('#c-wipe').addEventListener('click', function () {
    $('#feed').innerHTML = '<div class="feed-empty">还没有心声<br>装置跑起来之后，TA 心里在想什么会显示在这里</div>';
    toast('记录已清空');
  });
  $('#c-reset').addEventListener('click', function () {
    stop();
    S.t = 0; S.aro = 0; S.peak = 0; S.stage = 1; S.env = 0;
    S.lastEvent = '装置复位';
    hist.length = 0;
    render();
    toast('装置已复位');
  });

  // 设置页
  function bindSettings() {
    $('#s-auto').classList.toggle('on', S.auto);
    $('#s-wb').classList.toggle('on', S.manageWb);
    var sendBtn = $('#s-send');
    if (sendBtn) sendBtn.textContent = (S.sendMode === 'slash' ? 'slash /trigger' : 'generate');
    var bodyBtn = $('#s-body');
    if (bodyBtn) bodyBtn.textContent = (S.body === 'male' ? '男性' : '女性');
    var expSw = $('#s-explicit');
    if (expSw) expSw.classList.toggle('on', S.explicit);
    var scaleNote = $('#s-scale-note');
    if (scaleNote) {
      scaleNote.innerHTML = S.explicit
        ? '<b>当前：直写。</b>体内的感觉、装置怎么震、顶点怎么来，照写。<br>'
          + '关掉换成「忍耐 · 假装镇定」：不写体内，只写呼吸、姿态、手在抓什么、话说得完不完整、'
          + '声音从哪里出来，以及对周围事物的失手。'
        : '<b>当前：忍耐 · 假装镇定。</b>不写体内感觉与生理机制；顶点写成「装不住了」的那一下与之后的收拾，'
          + '主体是「还在装」。<br>改的是脚本自动建的那本世界书；用角色卡自带世界书时，'
          + '靠状态注入里那条同款禁令兜底。';
    }
    $('#s-beg').classList.toggle('on', S.begDocile);
    var cFreeze = $('#c-freeze');
    if (cFreeze) cFreeze.classList.toggle('on', S.freezeOnGen);
    $('#s-freeze').classList.toggle('on', S.freezeOnGen);
    $('#s-inject').classList.toggle('on', S.inject);
    $('#s-stage').classList.toggle('on', S.stageForce);
    $('#s-reset').classList.toggle('on', S.resetOnPeak);
    $('#s-recfreq').classList.toggle('on', S.recFreq);
    $('#s-drive').textContent = (S.drive === 'inner' ? '面板内生成' : '酒馆聊天');
    $('#s-cd').value = S.cd;
    $('#s-gain').value = S.gain;
    $('#c-auto').classList.toggle('on', S.auto);
    $('#c-haptap').classList.toggle('on', S.hapticTap);
    $('#c-hapfol').classList.toggle('on', S.hapticFollow);
    $('#c-audio').classList.toggle('on', S.audio);

    // 震动这条要说清两件事：哪个开关管什么，以及这台设备到底震不震得起来
    var hapHint = $('#hap-hint');
    if (hapHint) {
      if (!HAP.ok()) {
        hapHint.innerHTML = '<b>这台设备拿不到马达。</b>iOS / Safari 全平台都没有 Vibration 接口，'
          + '开关留着不影响使用，但按下不会有震动 —— 想要手感就打开上面的「声波模拟」，用低频声代替。';
      } else {
        hapHint.innerHTML = '<b>按键震动</b>管的是操作手感：切模式、启停、切换作用对象各给一下不同长度的短震。'
          + '<b>跟随震动</b>管的是装置运行时按实时频率一直震 —— 默认关着，因为手机马达分辨不出频率，'
          + '实际听到的是断续的哒哒声，而且持续运转费电发热，也盖不住其它通知。';
      }
    }

    // 自动反应是个会花额度的开关，界面上必须说清楚它到底做什么
    var autoBtn = $('#c-auto');
    if (autoBtn) autoBtn.textContent = '自动反应 · ' + (S.auto ? '开' : '关');
    var autoHint = $('#auto-hint');
    if (autoHint) {
      autoHint.innerHTML = S.auto
        ? '<b>自动反应：开。</b>模式切换、频率大幅调整、阶段跃迁、临界爆发，都会让 AI <b>立刻新生成一条回复</b>。'
          + '这会消耗额度，也会写进聊天记录。不需要时点上面的开关关掉，装置本身照常运行。'
        : '<b>自动反应：关。</b>装置照常运行、状态照常同步给角色，但不会主动叫 AI 说话。'
          + '想让它开口就点「立刻反应一次」。';
    }
    var setAuto = $('#s-auto-note');
    if (setAuto) {
      setAuto.textContent = S.auto
        ? '当前：开。装置状态变化会自动触发 AI 生成。'
        : '当前：关。装置运行时不产生新的 AI 回复。';
    }
    paintTarget();
  }

  /* 作用对象：首页顶部的分段开关。
     切到「自己」后整台机器换一套身份——不是换几个参数，而是从"遥控台"变成"只读仪表"：
     配色换成酒红、档位控件锁住、当前档位只等 TA 的回复来更新。 */
  function paintTarget() {
    var user = (S.target === 'user');
    // 画布上色跟着主题走
    var tc = THEME_RGB[user ? 'user' : 'char'];
    HOT_RGB = tc.hot; HOT_RGB_2 = tc.hot2; CYAN_RGB = tc.cyan;
    var shell = $('#shell');
    if (shell) shell.classList.toggle('tgt-user', user);
    var tb = $('#tgtbar');
    if (tb) tb.setAttribute('data-t', S.target);
    var cb = $('#tgt-char'), ub = $('#tgt-user');
    if (cb) cb.classList.toggle('on', !user);
    if (ub) ub.classList.toggle('on', user);

    // 档位控件降级为只读：看得见，点不动
    var dev = $('#v-device');
    if (dev) dev.classList.toggle('locked', user);
    ['#freq', '#pow', '#dur'].forEach(function (s) {
      var el = $(s); if (el) el.disabled = user;
    });
    // 模式卡用真 disabled：只靠 CSS 的 pointer-events 拦不住程序化点击
    var modesBox = $('#modes');
    if (modesBox) {
      for (var k = 0; k < modesBox.children.length; k++) modesBox.children[k].disabled = user;
    }
    var chips = $('#dur-chips');
    if (chips) {
      for (var i = 0; i < chips.children.length; i++) chips.children[i].disabled = user;
    }
    var lb = $('#lockbar');
    if (lb) lb.hidden = !user;
    var mt = $('#modes-tag');
    if (mt) mt.textContent = user ? '由 TA 决定' : '';

    // 参数面板原本用「未启动 · 调整只是预置」这个标记，两者不能打架；
    // render 会一并把启动键的文案改掉（"启动" → "催 TA 一次"）
    render();
    paintPending();
    paintBeg();
    paintTargetLock();
  }

  /* 等 TA 决定的中间态：催过一次、回复还没到。 */
  function paintPending() {
    var lb = $('#lockbar');
    if (!lb || S.target !== 'user') return;
    var b = lb.querySelector('b'), s = lb.querySelector('span');
    lb.classList.toggle('pending', !!S.pending);
    if (!b || !s) return;
    if (S.pending) {
      b.textContent = 'TA 正在决定这一轮怎么用…';
      s.textContent = '等这条回复写完，上面的档位就会跳到 TA 选的那一档。';
    } else {
      b.textContent = '遥控器在 TA 手里';
      s.textContent = '档位由 TA 决定。下面的按钮只是"催一下"，TA 回复到了这里才会更新成现在的档位。';
    }
  }

  /* 遥控器在 TA 手里时，玩家按的按钮只是"催一下"：
     从催下去到回复落地这段时间面板显示"TA 正在决定"，
     回复一到就切回当前档位——那正是 TA 刚选的那一档。
     90 秒兜底，免得请求失败时提示一直转着不走。 */
  var PD_TIMER = 0;
  function markPending(on) {
    clearTimeout(PD_TIMER);
    if (S.target !== 'user') { S.pending = false; paintPending(); return; }
    S.pending = !!on;
    paintPending();
    if (on) PD_TIMER = setTimeout(function () { markPending(false); }, 90000);
  }

  /* 请求停止：遥控器在 TA 手里时，玩家唯一还能做的事。
     文案随请求次数往上走，让人看得出已经求了几回。 */
  function paintBeg() {
    var bar = $('#begbar'), b = $('#beg-stop');
    if (!bar || !b) return;
    var user = (S.target === 'user');
    bar.hidden = !user;
    if (!user) return;
    var t = b.querySelector('b'), s = b.querySelector('i');
    if (t) {
      t.textContent = S.beg === 0 ? '请求 TA 停下' : (S.beg === 1 ? '再求一次' : '最后一次求 TA');
    }
    if (s) {
      if (!S.on) s.textContent = '装置已经停着了';
      else if (S.beg === 0) s.textContent = S.begDocile ? 'TA 会松口的' : 'TA 未必肯听';
      else if (S.begDocile || S.beg >= S.begNeed) s.textContent = '已经求了 ' + S.beg + ' 次 · TA 该松口了';
      else s.textContent = '已经求了 ' + S.beg + ' 次 · TA 还没答应（大概还要 ' + (S.begNeed - S.beg) + ' 次）';
    }
    b.disabled = !S.on;
  }

  /* 请求的落点。放在回复解析完之后判断：
     AI 自己肯停最好；没停的话看玩家求够了没有——默认模式求一次就兜底，
     顽固模式要两三回。不留兜底的话"说了会停"就落不了地。 */
  function settleBeg(hadReply) {
    if (S.target !== 'user' || S.beg <= 0) return;
    if (!hadReply) return;                          // 生成失败：留着计数，让人能再按
    if (!S.on) { S.beg = 0; paintBeg(); return; }   // TA 自己答应了
    if (S.begDocile || S.beg >= S.begNeed) {
      stop(charName() + '终于松了口', true);
      S.beg = 0;
      paintBeg();
      return;
    }
    paintBeg();
  }

  /* 装置运行中锁住作用对象切换。
     换对象要整本重写世界书，而装置还带着上一个对象的运行状态，
     两边对不上，AI 会同时收到两套设定。所以先停、后换。
     写得很轻，因为它每次启停都会被调到。 */
  function paintTargetLock() {
    var tb = $('#tgtbar');
    if (!tb) return;
    tb.classList.toggle('locked', S.on);
    tb.title = S.on ? '装置运行中，先停止才能换作用对象' : '';
  }

  /* 只有这一个入口改 S.target，避免两处状态各说各话 */
  function setTarget(t, notify) {
    if (t !== 'user' && t !== 'char') return;
    if (S.on) return;            // 运行中不许换，兜底
    if (S.target === t) return;
    S.target = t;
    S.pending = false;
    S.lastActionNote = '';
    S.beg = 0;   // 换了谁拿着遥控器，请求次数重新算
    bindSettings();
    persist();
    S.lastEvent = (t === 'user')
      ? '装置改为作用在玩家身上，遥控器交到 ' + charName() + ' 手里'
      : '装置改为作用在 ' + charName() + ' 身上，遥控器在玩家手里';
    syncWorldbook(true);   // 世界书要按新模式整本重写
    HAP.tap(t === 'user' ? 30 : 22);
    if (notify) {
      toast(t === 'user'
        ? '已切换：遥控器交给' + charName() + '，档位由 TA 决定'
        : '已切换：遥控器回到你手里', 2600);
    }
  }
  $('#s-inject').addEventListener('click', function () { S.inject = !S.inject; bindSettings(); persist(); });
  $('#s-auto').addEventListener('click', function () {
    S.auto = !S.auto;
    bindSettings();
    persist();
    toast(S.auto ? '自动反应已开启' : '自动反应已关闭，不会再自动生成回复');
  });
  $('#s-stage').addEventListener('click', function () { S.stageForce = !S.stageForce; bindSettings(); persist(); });
  $('#s-freeze').addEventListener('click', function () { S.freezeOnGen = !S.freezeOnGen; bindSettings(); persist(); });
  // 首页顶部的分段切换：两个段各自点到自己的档上就直接返回，不做无谓重写
  $('#tgtbar').addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.tgt') : null;
    if (!btn) return;
    // 运行中不换。这里必须自己判一次再提示，因为按钮没有 disabled ——
    // 用了 disabled 就收不到 click，用户点了没反应也不知道为什么。
    if (S.on) {
      HAP.tap([0, 18, 22, 18]);   // 连着两下短促的拒绝感
      toast('装置还在运行，先停下才能换作用对象', 2600);
      return;
    }
    setTarget(btn.dataset.t, true);
  });
  $('#s-body').addEventListener('click', function () {    S.body = (S.body === 'male') ? 'female' : 'male';
    bindSettings();
    persist();
    S.lastEvent = (S.body === 'male') ? '反应写法改为男性身体' : '反应写法改为女性身体';
    syncWorldbook(true);   // ④ 整条按身体换，必须重写
    toast(S.body === 'male'
      ? '已切换：按男性身体写反应（顶点后有不应期）'
      : '已切换：按女性身体写反应（可连续高潮）');
  });
  // 描写尺度：换的是整条写法的方向，不是禁用词表，所以运行中也能换
  $('#s-explicit').addEventListener('click', function () {
    S.explicit = !S.explicit;
    bindSettings();
    persist();
    S.lastEvent = S.explicit ? '描写尺度改为直写' : '描写尺度改为忍耐 · 假装镇定';
    syncWorldbook(true);   // ④⑧⑪ 整条换、⑤⑦⑨ 追加，必须重写
    toast(S.explicit
      ? '已切换：直写（体内感觉与顶点照写）'
      : '已切换：忍耐 · 假装镇定（只写撑不住的样子）', 2600);
  });
  /* 悬浮球偏好：只有脚本版才有球（TK_API 由构建脚本里的球运行时提供），网页单开时整节隐藏 */
  (function () {
    var sec = $('#s-ball-sec'); if (!sec) return;
    var api = (typeof TK_API !== 'undefined' && TK_API) ? TK_API : null;
    if (!api) return;
    sec.hidden = false;
    var sizeBox = $('#s-ball-size'), fadeBox = $('#s-ball-fade'), hideSw = $('#s-ball-hide'), tuckSw = $('#s-ball-tuck'), hideNote = $('#s-ball-hide-note');
    function paint() {
      var p = api.get();
      var cs = sizeBox.children;
      for (var i = 0; i < cs.length; i++) cs[i].classList.toggle('on', +cs[i].getAttribute('data-s') === p.size);
      var fs = fadeBox.children;
      for (var j = 0; j < fs.length; j++) fs[j].classList.toggle('on', +fs[j].getAttribute('data-f') === p.fade);
      hideSw.classList.toggle('on', p.hidden);
      tuckSw.classList.toggle('on', p.tuck);
      if (!p.btnOk) {
        hideSw.style.opacity = '.4'; hideSw.style.pointerEvents = 'none';
        hideNote.innerHTML = '<b>这个环境里没注册上脚本按钮</b>，球是唯一的入口，不能藏。';
      }
    }
    sizeBox.addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      api.set('size', +b.getAttribute('data-s')); paint(); HAP.tap([30]);
    });
    fadeBox.addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      api.set('fade', +b.getAttribute('data-f')); paint(); HAP.tap([30]);
    });
    hideSw.addEventListener('click', function () {
      var p = api.get(); api.set('hidden', !p.hidden); paint();
      toast(!p.hidden
        ? '已隐藏悬浮球。收起面板后，点快速回复栏里的「TOY·LINK 控制器」再打开'
        : '悬浮球回来了', 3200);
    });
    tuckSw.addEventListener('click', function () {
      var p = api.get(); api.set('tuck', !p.tuck); paint();
    });
    paint();
  })();
  $('#s-beg').addEventListener('click', function () {
    S.begDocile = !S.begDocile;
    bindSettings();
    persist();
    toast(S.begDocile
      ? '已改回：开口求一次，TA 就停'
      : '已开启：TA 会按自己的性格拖着，通常要请求两三次', 2800);
  });
  $('#s-send').addEventListener('click', function () {
    S.sendMode = (S.sendMode === 'slash') ? 'generate' : 'slash';
    bindSettings();
    persist();
    toast(S.sendMode === 'slash'
      ? '改用 /trigger：酒馆原生流程，生成期间会被拦'
      : '改用 generate：不会撞上酒馆的生成锁');
  });
  $('#s-wb').addEventListener('click', function () {
    S.manageWb = !S.manageWb;
    bindSettings();
    persist();
    if (S.manageWb) {
      toast('正在写入装置设定…');
      syncWorldbook(false);
    } else {
      toast('已停止自动管理，世界书保持现状');
    }
  });
  $('#s-reset').addEventListener('click', function () { S.resetOnPeak = !S.resetOnPeak; bindSettings(); persist(); });
  $('#s-recfreq').addEventListener('click', function () { S.recFreq = !S.recFreq; bindSettings(); persist(); });
  $('#s-drive').addEventListener('click', function () {
    S.drive = (S.drive === 'inner') ? 'floor' : 'inner';
    bindSettings(); persist();
    toast(S.drive === 'inner' ? '回复改为在面板内生成' : '回复改为进入酒馆聊天');
  });
  $('#s-cd').addEventListener('change', function (e) { S.cd = clamp(+e.target.value || 45, 5, 600); bindSettings(); persist(); });
  $('#s-gain').addEventListener('change', function (e) { S.gain = clamp(+e.target.value || 100, 10, 400); bindSettings(); persist(); });

  // 视图切换
  ROOT.querySelector('.dock').addEventListener('click', function (e) {
    var b = e.target.closest('.tab'); if (!b) return;
    if (!b.dataset.go) return;   // 脚本版底栏多一个「收起」页签（构建脚本插的），它不切视图，自己绑了收起
    HAP.tap(14);   // 页签：一下很轻的确认
    go(b.dataset.go);
  });
  function go(view) {
    ['device', 'chat', 'config'].forEach(function (v) {
      $('#v-' + v).hidden = (v !== view);
    });
    var ts = ROOT.querySelectorAll('.tab');
    for (var i = 0; i < ts.length; i++) ts[i].classList.toggle('on', ts[i].dataset.go === view);
    if (view === 'chat') scrollFeed();
    if (view === 'device') setTimeout(fitCanvas, 30);
    if (view === 'config') { lastStatePaint = Date.now(); $('#state-box').value = stateText(); }
  }

  /* =========================================================
   * 10. 设置持久化（消息楼层变量，随聊天走）
   * ======================================================= */
  function persist() {
    if (!BRIDGE.ready) return;
    var blob = {
      toy_cfg_drive: S.drive,
      toy_cfg_inject: S.inject,
      toy_cfg_cd: S.cd,
      toy_cfg_gain: S.gain,
      toy_cfg_reset: S.resetOnPeak,
      toy_cfg_recfreq: S.recFreq,
      toy_cfg_freeze: S.freezeOnGen,
      toy_cfg_managewb: S.manageWb,
      toy_cfg_sendmode: S.sendMode,
      toy_cfg_target: S.target,
      toy_cfg_body: S.body,
      toy_cfg_explicit: S.explicit,
      toy_cfg_begdocile: S.begDocile,
      toy_cfg_auto: S.auto,
      toy_cfg_haptap: S.hapticTap,
      toy_cfg_hapfol: S.hapticFollow,
      toy_cfg_audio: S.audio,
      toy_cfg_mode: S.mode,
      toy_cfg_freq: S.freq,
      toy_cfg_pow: S.pow
    };
    BRIDGE.setVars(blob, 'chat');
  }
  function restore() {
    if (!BRIDGE.ready) return;
    var v = BRIDGE.getVars('chat') || {};
    if (typeof v.toy_cfg_drive === 'string') S.drive = v.toy_cfg_drive;
    if (typeof v.toy_cfg_inject === 'boolean') S.inject = v.toy_cfg_inject;
    if (typeof v.toy_cfg_cd === 'number') S.cd = v.toy_cfg_cd;
    if (typeof v.toy_cfg_gain === 'number') S.gain = v.toy_cfg_gain;
    if (typeof v.toy_cfg_reset === 'boolean') S.resetOnPeak = v.toy_cfg_reset;
    if (typeof v.toy_cfg_recfreq === 'boolean') S.recFreq = v.toy_cfg_recfreq;
    if (typeof v.toy_cfg_freeze === 'boolean') S.freezeOnGen = v.toy_cfg_freeze;
    if (typeof v.toy_cfg_managewb === 'boolean') S.manageWb = v.toy_cfg_managewb;
    if (v.toy_cfg_sendmode === 'slash' || v.toy_cfg_sendmode === 'generate') S.sendMode = v.toy_cfg_sendmode;
    if (v.toy_cfg_target === 'user' || v.toy_cfg_target === 'char') S.target = v.toy_cfg_target;
    if (v.toy_cfg_body === 'male' || v.toy_cfg_body === 'female') S.body = v.toy_cfg_body;
    // 老聊天里没有这个键，缺失时保持默认（直写），不改变已有存档的行为
    if (typeof v.toy_cfg_explicit === 'boolean') S.explicit = v.toy_cfg_explicit;
    if (typeof v.toy_cfg_begdocile === 'boolean') S.begDocile = v.toy_cfg_begdocile;
    if (typeof v.toy_cfg_auto === 'boolean') S.auto = v.toy_cfg_auto;
    // 三个输出开关原先没有持久化，每次重载都会弹回默认值，一并补上
    if (typeof v.toy_cfg_haptap === 'boolean') S.hapticTap = v.toy_cfg_haptap;
    if (typeof v.toy_cfg_hapfol === 'boolean') S.hapticFollow = v.toy_cfg_hapfol;
    if (typeof v.toy_cfg_audio === 'boolean') S.audio = v.toy_cfg_audio;
    if (typeof v.toy_cfg_mode === 'string' && modeExists(v.toy_cfg_mode)) S.mode = v.toy_cfg_mode;
    if (typeof v.toy_cfg_freq === 'number') S.freq = clamp(v.toy_cfg_freq, 1, 100);
    if (typeof v.toy_cfg_pow === 'number') S.pow = clamp(v.toy_cfg_pow, 1, 100);
  }

  /* =========================================================
   * 11. 酒馆事件监听
   * ======================================================= */
  function bindTavernEvents() {
    if (!BRIDGE.ready) return;
    // 新楼层到达 = 这一轮生成结束了，先把冻结解掉。
    // 注意这里不再把正文搬进面板：面板现在只显示心声，而心声是随正文一起
    // 生成、随即被剥掉的（正文落库时已经不含 <TOY>），从楼层里捞不到。
    // 正文本身就在聊天记录里躺着，不需要面板再复述一遍。
    BRIDGE.on(EVT.MSG_RECEIVED, function () {
      markIdle();
    });
    // 生成状态：AI 在回复中时不要调用 /trigger，酒馆会直接拦掉
    BRIDGE.on(EVT.GEN_STARTED, markBusy);
    BRIDGE.on(EVT.GEN_ENDED, markIdle);
    BRIDGE.on(EVT.GEN_STOPPED, markIdle);      // 被停止按钮打断
    BRIDGE.on(EVT.JS_GEN_STARTED, markBusy);   // 面板内 generate()
    BRIDGE.on(EVT.JS_GEN_ENDED, markIdle);
    BRIDGE.on(EVT.CHAT_CHANGED, function () { location.reload(); });
  }

  /* =========================================================
   * 12. 启动
   * ======================================================= */
  function boot() {
    BRIDGE.probe();
    restore();
    buildModes();
    bindSettings();
    markDurChip();
    ['#freq', '#pow', '#dur'].forEach(function (s) {
      var el = $(s);
      el.value = s === '#freq' ? S.freq : (s === '#pow' ? S.pow : S.limit);
      paintSlider(el);
    });
    $('#modes').querySelectorAll('.mode').forEach(function (n) {
      n.classList.toggle('on', n.dataset.id === S.mode);
    });
    fitCanvas();
    ONWIN('resize', fitCanvas);
    ONWIN('orientationchange', function () { setTimeout(fitCanvas, 120); });

    // 全屏 / 窗口切换：窄屏本来是全屏，宽屏默认窗口，可手动切
    var shellEl = $('#shell'), sizeBtn = $('#btn-size'), fitSw = $('#s-fit'), FIT_KEY = 'toylink_fit_mode';
    function applyFit(on) {
      shellEl.classList.toggle('fit', on);
      if (sizeBtn) sizeBtn.textContent = on ? '⤡' : '⤢';
      if (fitSw) fitSw.classList.toggle('on', on);
      setTimeout(fitCanvas, 60);
    }
    // 首开规则要和脚本版 layout() 的一致：没存过偏好时，窄屏（<860）默认全屏。
    // 以前这里默认 false，会把脚本版刚加上的 fit 摘掉——面板是满屏的、状态却是「窗口」，⤢ 要点两次才缩小。
    var fitOn = false;
    try {
      var fitSaved = localStorage.getItem(FIT_KEY);
      fitOn = fitSaved === null ? (window.innerWidth < 860) : fitSaved === '1';
    } catch (e) { /* noop */ }
    applyFit(fitOn);
    // 顶栏 ⤢ 和设置页的「全屏」开关是同一个动作。手机上顶栏可能被系统状态栏盖住（2026-10-12 玩家反馈：
    // 满屏、退不出来），所以设置页里也放一个，底栏「设置」永远点得到。
    function toggleFit() {
      fitOn = !shellEl.classList.contains('fit');
      applyFit(fitOn);
      try { localStorage.setItem(FIT_KEY, fitOn ? '1' : '0'); } catch (e) { /* noop */ }
      toast(fitOn ? '全屏模式' : '窗口模式');
    }
    if (sizeBtn) sizeBtn.addEventListener('click', toggleFit);
    if (fitSw) fitSw.addEventListener('click', toggleFit);

    var dot = $('#dot'), txt = $('#conn-txt');
    if (BRIDGE.ready) {
      dot.classList.add('live');
      txt.textContent = '已连接酒馆';
      bindTavernEvents();
      syncVars(true);
      syncWorldbook(true);   // 通用设定：写进世界书并挂到当前角色卡
      $('#env-hint').textContent = '运行环境：酒馆助手 iframe，接口就绪。装置状态写进聊天变量，并作为系统提示注入给角色；回复走' +
        (S.drive === 'inner' ? '面板内生成' : '酒馆聊天') + '。';
    } else {
      dot.classList.add('demo');
      txt.textContent = '演示模式';
      $('#env-hint').textContent = '未检测到酒馆助手接口，当前为演示模式：界面、波形、触觉可用，角色回复由本地模板模拟。' +
        '把本文件作为前端界面载入酒馆助手后即可接入真实角色。';
      toast('演示模式：未检测到酒馆助手', 2600);
    }

    // 首次交互解锁音频
    var unlock = function () {
      if (S.audio) AUD.start();
      OFFWIN('touchstart', unlock);
      OFFWIN('click', unlock);
    };
    ONWIN('touchstart', unlock, { passive: true });
    ONWIN('click', unlock);

    // 页面隐藏时停输出，避免后台白震
    ONDOC('visibilitychange', function () {
      if (document.hidden) {
        HAP.kill();
        AUD.update(0, hz());
      }
    });
    ONWIN('pagehide', function () { HAP.kill(); });

    render();
    wakeLoop();
    setInterval(heartbeat, 50);   // rAF 被挂起时的兜底心跳；装置关着时自动降到 ~4Hz

    // 后台问一次有没有新版，不阻塞启动、失败也不影响使用
    try { selfUpdate(); } catch (e) { /* noop */ }

    var verEl = $('#ver-hint');
    if (verEl) verEl.textContent = 'TOY·LINK v' + VERSION + '（' + BUILD_DATE + '）';
    var brandVer = $('#brand-ver');
    if (brandVer) brandVer.textContent = 'v' + VERSION;

    // 兜底：某些环境里 iframe 晚于脚本就绪
    if (!BRIDGE.ready) {
      setTimeout(function () {
        if (BRIDGE.probe()) {
          $('#dot').classList.remove('demo');
          $('#dot').classList.add('live');
          $('#conn-txt').textContent = '已连接酒馆';
          restore(); bindSettings(); bindTavernEvents(); syncVars(true); syncWorldbook(true);
          $('#env-hint').textContent = '运行环境：酒馆助手 iframe，接口就绪。';
        }
      }, 1200);
    }
  }

  /* =========================================================
   * 自更新
   *
   * 脚本库里存的本来就是「本体自己」。启动时问一次版本指针，发现比手上这个
   * 新，就把新本体写回脚本库 —— 下次启动直接跑新版，不再需要网络。
   *
   * 为什么是这个方案，而不是一行 `import '网址'`：
   *   · jsDelivr 给固定网址的响应头是 max-age=604800，浏览器缓存 7 天，
   *     purge 只清 CDN 那一层，够不着浏览器 → 热更新失效。
   *   · GitHub raw 缓存只有 5 分钟，但给的是 text/plain 加 nosniff，
   *     而 import 按规范要求 JavaScript 的 MIME，浏览器直接拒绝执行。
   * 两头都堵，所以只能自己拿 fetch 拉（fetch 不看 MIME），再写回脚本库。
   * 好处是更新过的本体落在本地，之后断网也照常跑。
   *
   * 只在酒馆助手脚本环境里生效；当前端卡加载时这些接口不存在，直接跳过。
   * ======================================================= */
  var UPD_POINTER = 'https://raw.githubusercontent.com/fJForever/toy-link/main/version.txt';
  var UPD_BASES = [
    'https://cdn.jsdelivr.net/gh/fJForever/toy-link@main/dist/',
    'https://fastly.jsdelivr.net/gh/fJForever/toy-link@main/dist/',
    'https://raw.githubusercontent.com/fJForever/toy-link/main/dist/'
  ];

  // 脚本里这些是全局函数；导出到 TavernHelper 的也试一下，两边都探
  function thai(name) {
    try { if (typeof window[name] === 'function') return window[name]; } catch (e) { /* noop */ }
    try {
      if (typeof TavernHelper !== 'undefined' && TavernHelper && typeof TavernHelper[name] === 'function') {
        return TavernHelper[name].bind(TavernHelper);
      }
    } catch (e) { /* noop */ }
    return null;
  }

  function newerThan(mine, theirs) {
    var a = String(mine).split('.').map(Number);
    var b = String(theirs).split('.').map(Number);
    for (var i = 0; i < 3; i++) {
      var x = a[i] || 0, y = b[i] || 0;
      if (y > x) return true;
      if (y < x) return false;
    }
    return false;
  }

  function fetchText(url, ms) {
    var ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, ms) : null;
    return fetch(url, { cache: 'no-store', signal: ctl ? ctl.signal : undefined }).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }, function (e) {
      if (timer) clearTimeout(timer);
      throw e;
    });
  }

  /* 把自己这个脚本的 content 换成新版本。
     逐个 scope 试，只在真的找到自己那条（id 对得上）时才改，其余原样返回。 */
  function writeBackSelf(code, done) {
    var upd = thai('updateScriptTreesWith');
    var idFn = thai('getScriptId');
    if (!upd || !idFn) { done(false, '这个环境没有脚本管理接口'); return; }
    var myId = '';
    try { myId = idFn() || ''; } catch (e) { /* noop */ }
    if (!myId) { done(false, '拿不到当前脚本 id'); return; }

    var scopes = ['global', 'preset', 'character'];
    var i = 0;
    (function nextScope() {
      if (i >= scopes.length) { done(false, '三个作用域里都没找到自己'); return; }
      var scope = scopes[i++];
      var touched = false;
      try {
        upd(function (trees) {
          (function walk(list) {
            if (!list || !list.length) return;
            for (var k = 0; k < list.length; k++) {
              var it = list[k];
              if (!it) continue;
              if (it.type === 'folder' && it.scripts) walk(it.scripts);
              else if (it.id === myId) { it.content = code; touched = true; }
            }
          })(trees);
          return trees;
        }, { type: scope });
      } catch (e) { /* 这个作用域不存在或没权限，换下一个 */ }
      if (touched) { done(true, scope); return; }
      nextScope();
    })();
  }

  function selfUpdate() {
    // 不在脚本里（前端卡 / 演示模式）就没必要跑
    if (!thai('getScriptId')) return;
    fetchText(UPD_POINTER, 6000).then(function (txt) {
      var remote = String(txt || '').trim();
      if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(remote)) return;
      if (!newerThan(VERSION, remote)) return;   // 自己不比它旧，什么都不做

      console.log('[TOY·LINK] 发现新版 ' + remote + '（当前 ' + VERSION + '），准备更新');
      var file = 'TOY-LINK-' + remote + '.js';
      var j = 0;
      (function tryNext() {
        if (j >= UPD_BASES.length) { console.log('[TOY·LINK] 所有源都不通，保持当前版本'); return; }
        var url = UPD_BASES[j++] + file;
        fetchText(url, 15000).then(function (code) {
          // 宁可停在当前版本，也不把半截内容写进用户的脚本库
          if (!code || code.length < 50000) throw new Error('内容异常 ' + (code ? code.length : 0) + ' 字符');
          writeBackSelf(code, function (ok, where) {
            if (ok) {
              console.log('[TOY·LINK] 已写入脚本库（' + where + '），刷新页面生效');
              try { toastr.info('TOY·LINK 已更新到 v' + remote + '，刷新页面生效', 'TOY·LINK'); } catch (e) { /* noop */ }
            } else {
              console.log('[TOY·LINK] 写回失败：' + where);
            }
          });
        }, function (e) {
          console.log('[TOY·LINK] 源失败 ' + url + '：' + ((e && e.message) || e));
          tryNext();
        });
      })();
    }).catch(function (e) {
      console.log('[TOY·LINK] 更新检查跳过：' + ((e && e.message) || e));
    });
  }

  if (document.readyState === 'loading') {
    ONDOC('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
  /* ==================== 同源逻辑结束 ==================== */

  /* ---------- 定位：悬浮窗 / 全屏 ----------
   * 全部用内联样式算，不走 CSS 媒体查询。
   * 默认悬浮窗：固定在视口一角、可拖动，酒馆其他地方照常点击与输入。
   */
  var sizeBtn = ROOT.querySelector("#btn-size");
  var FIT_KEY = "toylink_fit_mode", POS_KEY = "toylink_win_pos";

  function viewport() {
    var w = WIN.innerWidth || DOC.documentElement.clientWidth || 0;
    var h = WIN.innerHeight || DOC.documentElement.clientHeight || 0;
    return { w: w, h: h };
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* noop */ } }

  var savedPos = (function () {
    var s = lsGet(POS_KEY);
    if (!s) return null;
    var a = s.split(",");
    if (a.length !== 2) return null;
    var x = parseFloat(a[0]), y = parseFloat(a[1]);
    return (isFinite(x) && isFinite(y)) ? { left: x, top: y } : null;
  })();

  var layingOut = false;   // layout 末尾会广播 resize，而 layout 自己也挂在 resize 上：不设闸就无限递归（控制台成串的 Maximum call stack）
  function layout() {
    if (!shellEl || layingOut) return;
    layingOut = true;
    try { layoutInner(); } finally { layingOut = false; }
  }
  function layoutInner() {
    var vp = viewport();
    // 窄屏第一次打开默认全屏，之后听用户的
    if (lsGet(FIT_KEY) === null && vp.w < 860) shellEl.classList.add("fit");
    var full = shellEl.classList.contains("fit");
    shellEl.style.position = "fixed";
    shellEl.style.pointerEvents = "auto";
    if (full) {
      shellEl.style.left = "0px"; shellEl.style.top = "0px";
      shellEl.style.right = "auto"; shellEl.style.bottom = "auto";
      shellEl.style.width = vp.w + "px";
      shellEl.style.height = vp.h + "px";
      shellEl.style.maxHeight = "none";
      shellEl.style.borderRadius = "0px";
      shellEl.style.border = "0";
      shellEl.style.boxShadow = "none";
    } else {
      var w = Math.max(280, Math.min(368, vp.w - 20));
      var h = Math.max(300, Math.min(Math.round(vp.h * 0.78), vp.h - 120, 640));
      shellEl.style.width = w + "px";
      shellEl.style.height = h + "px";
      shellEl.style.maxHeight = h + "px";
      shellEl.style.borderRadius = "20px";
      shellEl.style.border = "1px solid rgba(232,214,236,.10)";
      shellEl.style.boxShadow = "0 24px 70px rgba(0,0,0,.72)";
      var L, T;
      if (savedPos) {
        L = Math.min(Math.max(4, savedPos.left), Math.max(4, vp.w - w - 4));
        T = Math.min(Math.max(4, savedPos.top), Math.max(4, vp.h - h - 4));
      } else {
        L = Math.max(8, vp.w - w - 18);
        T = Math.max(8, vp.h - h - 88);
      }
      shellEl.style.left = L + "px";
      shellEl.style.top = T + "px";
      shellEl.style.right = "auto";
      shellEl.style.bottom = "auto";
    }
    try { WIN.dispatchEvent(new Event("resize")); } catch (e) { /* noop */ }
  }

  /* ---------- 拖动窗身 ---------- */
  var bar = ROOT.querySelector(".bar");
  if (bar) {
    bar.style.cursor = "grab";
    bar.style.touchAction = "none";
    var dg = { on: false, ox: 0, oy: 0 };
    bar.addEventListener("pointerdown", function (e) {
      if (!shellEl || shellEl.classList.contains("fit")) return;
      if (e.target && e.target.closest && e.target.closest("button")) return;
      var r = shellEl.getBoundingClientRect();
      dg.on = true; dg.ox = e.clientX - r.left; dg.oy = e.clientY - r.top;
      bar.style.cursor = "grabbing";
      try { bar.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    });
    bar.addEventListener("pointermove", function (e) {
      if (!dg.on) return;
      var vp = viewport();
      var w = shellEl.offsetWidth, h = shellEl.offsetHeight;
      var L = Math.min(Math.max(4, e.clientX - dg.ox), Math.max(4, vp.w - w - 4));
      var T = Math.min(Math.max(4, e.clientY - dg.oy), Math.max(4, vp.h - h - 4));
      shellEl.style.left = L + "px";
      shellEl.style.top = T + "px";
      savedPos = { left: L, top: T };
      lsSet(POS_KEY, Math.round(L) + "," + Math.round(T));
    });
    var dgEnd = function () {
      if (!dg.on) return;
      dg.on = false;
      bar.style.cursor = "grab";
    };
    bar.addEventListener("pointerup", dgEnd);
    bar.addEventListener("pointercancel", dgEnd);
  }

  layout();
  ONWIN("resize", layout);
  ONWIN("orientationchange", function () { setTimeout(layout, 120); });
  if (sizeBtn) sizeBtn.addEventListener("click", function () { setTimeout(layout, 0); });
  var fitSw = ROOT.querySelector("#s-fit");   // 设置页的「全屏」开关和 ⤢ 是同一个动作，尺寸同样要重算
  if (fitSw) fitSw.addEventListener("click", function () { setTimeout(layout, 0); });

  /* ---------- 开合 ---------- */
  // 同一次会话里记住上次的收起状态，避免切聊天就又弹一脸
  var opened = true;
  try { if (WIN.__toylink_opened === false) opened = false; } catch (e) { /* noop */ }
  function apply() {
    host.style.display = opened ? "block" : "none";
    tkVisible(!opened);   // 面板展开时收起悬浮球，别挡视线；收起时弹出来
    try { WIN.__toylink_opened = opened; } catch (e) { /* noop */ }
  }
  function open() { opened = true; apply(); setTimeout(layout, 0); }
  function collapse() { opened = false; apply(); }
  function toggle() { opened = !opened; apply(); if (opened) setTimeout(layout, 0); }

  tkBind(toggle);   // 点按开合，拖动吸边

  var closeBtn = ROOT.querySelector("#btn-close");
  if (closeBtn) {
    closeBtn.style.display = "grid";
    closeBtn.addEventListener("click", collapse);
  }
  var hideTab = ROOT.querySelector("#tab-hide");   // 底栏「收起」：顶栏被手机状态栏盖住时唯一点得到的出口
  if (hideTab) hideTab.addEventListener("click", function (e) { e.stopPropagation(); collapse(); });

  // 装置运行时的动态由悬浮球自己的循环直接读 S（见 TOY_BALL_RUNTIME），这里不用再轮询面板

  window.__TOYLINK__ = {
    version: "1.11.2",
    host: host, root: root, ball: ball, page: PAGE,
    open: open, collapse: collapse, toggle: toggle,
    stop: function () {
      try { if (NAV.vibrate) NAV.vibrate(0); } catch (e) { /* noop */ }
      try { tkDispose(); } catch (e) { /* noop */ }
      var h = BYID("__toylink_host__"); if (h) h.remove();
      var b = BYID("__toylink_ball__"); if (b) b.remove();
      window.__TOYLINK__ = null;
    }
  };

  /* ---------- 脚本按钮 ----------
   * 点击事件的通道是 getButtonEvent(name) 返回的事件类型，
   * 不能用 eventOnButton（那是脚本设置里的按键绑定）。
   */
  function pickApi(name) {
    try { if (typeof window[name] === "function") return window[name]; } catch (e) { /* noop */ }
    try {
      if (typeof TavernHelper !== "undefined" && TavernHelper && typeof TavernHelper[name] === "function") {
        return TavernHelper[name].bind(TavernHelper);
      }
    } catch (e) { /* noop */ }
    try {
      var p = window.parent;
      if (p && p !== window && p.TavernHelper && typeof p.TavernHelper[name] === "function") {
        return p.TavernHelper[name].bind(p.TavernHelper);
      }
    } catch (e) { /* noop */ }
    return null;
  }

  try {
    var rsb = pickApi("replaceScriptButtons");
    if (rsb) { rsb([{ name: "TOY·LINK 控制器", visible: true }]); TK_API.btnOk = true; }

    var eon = pickApi("eventOn");
    var gbe = pickApi("getButtonEvent");
    if (eon && gbe) {
      eon(gbe("TOY·LINK 控制器"), function () { open(); });
    } else {
      // 极老版本没有 getButtonEvent 时留个念想
      var eob = pickApi("eventOnButton");
      if (eob) eob("TOY·LINK 控制器", function () { open(); });
    }
  } catch (e) {
    console.log("[TOY·LINK] 脚本按钮注册失败：", e);
  }
  if (!TK_API.btnOk) tkPref.hidden = false;   // 没按钮的环境里，球是唯一的门，不许藏

  /* ---------- 卸载清理 ---------- */
  var bye = function () {
    try { if (NAV.vibrate) NAV.vibrate(0); } catch (e) { /* noop */ }
    if (window.__TOYLINK__ && window.__TOYLINK__.stop) window.__TOYLINK__.stop();
  };
  ONWIN("pagehide", bye);

  apply();
  console.log("[TOY·LINK] 已挂载到 " + (PAGE.via === "self" ? "脚本自身 iframe（未找到酒馆页面，界面可能不可见）" : "酒馆页面 via " + PAGE.via));
  setTimeout(function () {
    try {
      var hb = host.getBoundingClientRect();
      var sb = ROOT.querySelector("#shell").getBoundingClientRect();
      var dr = ROOT.querySelector("#v-device").getBoundingClientRect();
      var rg = ROOT.querySelector(".ring").getBoundingClientRect();
      console.log("[TOY·LINK] 尺寸 host " + Math.round(hb.width) + "x" + Math.round(hb.height)
        + " | shell " + Math.round(sb.width) + "x" + Math.round(sb.height)
        + " | stage " + Math.round(dr.width) + "x" + Math.round(dr.height)
        + " | ring " + Math.round(rg.width) + "x" + Math.round(rg.height)
        + " | dpr " + (WIN.devicePixelRatio || 1));
    } catch (e) { /* noop */ }
  }, 400);
}

// 酒馆页面可能尚未就绪
try {
  if (typeof $ === "function") { $(function () { TOYLINK_BOOT(); }); } else { TOYLINK_BOOT(); }
} catch (e) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", TOYLINK_BOOT);
  } else {
    TOYLINK_BOOT();
  }
}
