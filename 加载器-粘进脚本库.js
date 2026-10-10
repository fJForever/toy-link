/* ============================================================
 * TOY·LINK 装置模拟器 · 在线加载器 v1.10.6 时期的分发结构
 *
 * 脚本库里只放这一段，以后再也不用换。它每次启动做的事：
 *   1. 拉 version.txt，问「现在该用哪一版」
 *   2. 按版本号拼出本体地址 —— 每版都是新文件名，所以是新 URL，缓存挡不住
 *   3. 三个源依次试，哪个通用哪个（jsDelivr / fastly / GitHub raw）
 *   4. 在全局作用域执行本体
 *
 * 为什么绕这一圈：固定地址的 CDN 响应带 7 天浏览器缓存，purge 清不到浏览器。
 * 指针用 GitHub raw，缓存只有几分钟，比 CDN 的 12 小时可靠得多。
 *
 * 安装：酒馆助手 → 脚本库 → 新建脚本 → 全文粘贴这一段 → 保存启用。
 * 之后作者发版，你刷新酒馆页面就是新版，不用再动这里。
 * ============================================================ */
(async function () {
  var OWNER = "fJForever", REPO = "toy-link", BRANCH = "main";

  // 日志只用 console.log —— 酒馆助手会吞掉脚本 iframe 里的 warn / info
  function log(m) { try { console.log("[TOY·LINK 加载器] " + m); } catch (e) {} }

  var POINTER = "https://raw.githubusercontent.com/" + OWNER + "/" + REPO + "/" + BRANCH + "/version.txt";
  var BASES = [
    "https://cdn.jsdelivr.net/gh/" + OWNER + "/" + REPO + "@" + BRANCH + "/dist/",
    "https://fastly.jsdelivr.net/gh/" + OWNER + "/" + REPO + "@" + BRANCH + "/dist/",
    "https://raw.githubusercontent.com/" + OWNER + "/" + REPO + "/" + BRANCH + "/dist/"
  ];

  // 带闸刀的 fetch：被墙的域不会报错，会一直挂着，必须自己超时
  function get(url, ms) {
    var ctl = (typeof AbortController !== "undefined") ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, ms) : null;
    return fetch(url, { cache: "no-store", signal: ctl ? ctl.signal : undefined }).then(
      function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); }
    ).then(function (t) { if (timer) clearTimeout(timer); return t; },
           function (e) { if (timer) clearTimeout(timer); throw e; });
  }

  var ver = "";
  try {
    var raw = (await get(POINTER, 6000)).trim();
    // 只认干净的版本号，指针文件万一被写坏也不会拼出奇怪的 URL
    if (/^[0-9]+\.[0-9]+\.[0-9]+$/.test(raw)) { ver = raw; log("版本指针 = " + ver); }
    else log("指针内容不合法，忽略：" + raw.slice(0, 40));
  } catch (e) { log("拿不到指针：" + ((e && e.message) || e)); }

  // 指针拿不到就退回 latest.js，至少还能跑，只是可能落后一个版本
  var file = ver ? ("TOY-LINK-" + ver + ".js") : "latest.js";

  var code = null, lastErr = null;
  for (var i = 0; i < BASES.length && code === null; i++) {
    var url = BASES[i] + file;
    try {
      var t = await get(url, 12000);
      if (!t || t.length < 1000) throw new Error("内容异常 " + (t ? t.length : 0) + " 字符");
      code = t;
      log("已加载 " + url + "（" + t.length + " 字符）");
    } catch (e) { lastErr = e; log("失败 " + url + "：" + ((e && e.message) || e)); }
  }

  if (code === null) {
    try { toastr.error("TOY·LINK 加载失败，检查网络后刷新重试", "TOY·LINK"); } catch (e) {}
    log("所有源都不通：" + ((lastErr && lastErr.message) || lastErr));
    return;
  }

  // 间接 eval：(0, eval) 在全局作用域执行，本体里的函数才会挂到 window 上。
  // 直接 eval(code) 会被关在这个 async 函数里，面板挂载后引用全丢。
  try { (0, eval)(code); } catch (e) {
    try { toastr.error("TOY·LINK 执行出错：" + ((e && e.message) || e), "TOY·LINK"); } catch (e2) {}
    log("执行失败：" + ((e && e.message) || e));
  }
})();
