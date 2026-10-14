/* ============================================================
 * TOY·LINK 一键修复
 *
 * 用途：当脚本库里那一份本体已经坏到"启动就抛错、自更新跑不到"时，
 *       用它从外面把好版本写回脚本库 —— 不必重新导入。
 *
 * 用法（在酒馆页面按 F12，Console 里粘这一行回车）：
 *   import('https://fastly.jsdelivr.net/gh/fJForever/toy-link@main/工具-一键修复.js')
 *
 * 注意：jsDelivr 对已发布路径有 7 天长效缓存，所以第一次取到之后，
 *       将来即使改了这个文件，老用户拿到的可能还是旧版；文件本身是
 *       一次性的修复动作，不需要跟着改，所以这个代价可以接受。
 * ============================================================ */
(() => {
  var FILE = 'TOY-LINK-1.13.30.js';   // 改这里时记得和 version.txt 对齐，否则会把用户覆盖成旧版
  var NAME = 'TOY·LINK 装置模拟器';
  var BASES = [
    'https://fastly.jsdelivr.net/gh/fJForever/toy-link@main/dist/',
    'https://cdn.jsdelivr.net/gh/fJForever/toy-link@main/dist/',
    'https://raw.githubusercontent.com/fJForever/toy-link/main/dist/',
  ];

  // 脚本库接口挂在酒馆页面（通常是 top）上；脚本 iframe 里没有，得找一下
  function hasApi(w) {
    try { return !!(w && w.TavernHelper && w.TavernHelper.updateScriptTreesWith && w.TavernHelper.getScriptTrees); }
    catch (e) { return false; }
  }
  var W = window;
  if (!hasApi(W)) {
    var cands = [];
    try { cands.push(top); } catch (e) { /* 跨域 */ }
    var frames = document.querySelectorAll('iframe');
    for (var i = 0; i < frames.length; i++) {
      try { if (frames[i].contentWindow) cands.push(frames[i].contentWindow); } catch (e) { /* noop */ }
    }
    for (var j = 0; j < cands.length; j++) { if (hasApi(cands[j])) { W = cands[j]; break; } }
  }
  if (!hasApi(W)) {
    console.error('[TOY·LINK] 没找到脚本库接口。请改用：酒馆助手 → 脚本库 → 导入 → 选 TOY-LINK脚本.json');
    return;
  }
  var TH = W.TavernHelper;

  function fetchFirst(i) {
    if (i >= BASES.length) return Promise.reject(new Error('三个源都取不到'));
    return fetch(BASES[i] + FILE, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .catch(function () { return fetchFirst(i + 1); });
  }

  var myId = '', myName = NAME, code = '';
  function isMe(it) {
    if (!it) return false;
    if (myId && it.id === myId) return true;
    // 名字可能被用户改过，所以补一道"内容长度像本体"的确认；脚本库里本体只有一条
    return !!(it.name === myName && String(it.content || '').length > 5000);
  }

  fetchFirst(0).then(function (t) {
    code = String(t || '');
    if (code.length < 50000) throw new Error('取到的内容不正常（' + code.length + ' 字符）');

    var scopes = ['global', 'preset', 'character'];
    for (var s = 0; s < scopes.length; s++) {
      var scope = scopes[s], trees = [];
      try { trees = TH.getScriptTrees({ type: scope }) || []; } catch (e) { continue; }
      var found = [];
      (function walk(a) {
        for (var k = 0; k < (a || []).length; k++) {
          var it = a[k];
          if (!it) continue;
          if (it.type === 'folder' && it.scripts) walk(it.scripts);
          else if (isMe(it)) { if (!myId) myId = it.id; found.push(it); }
        }
      })(trees);
      if (!found.length) continue;

      TH.updateScriptTreesWith(function (ts) {
        (function walk(a) {
          for (var k = 0; k < (a || []).length; k++) {
            var it = a[k];
            if (!it) continue;
            if (it.type === 'folder' && it.scripts) walk(it.scripts);
            else if (isMe(it)) it.content = code;
          }
        })(ts);
        return ts;
      }, { type: scope });

      console.log('[TOY·LINK] 已把 ' + FILE + ' 写进脚本库（作用域 ' + scope + '）。现在按 F5 刷新。');
      try { alert('TOY·LINK 已更新到 ' + FILE.replace('TOY-LINK-', '').replace('.js', '') + '，刷新页面后生效。'); } catch (e) { /* noop */ }
      return;
    }
    console.error('[TOY·LINK] 三个作用域里都没找到本体。请改用：酒馆助手 → 脚本库 → 导入 → 选 TOY-LINK脚本.json');
  }).catch(function (e) {
    console.error('[TOY·LINK] 修复失败：' + ((e && e.message) || e)
      + '。请改用：酒馆助手 → 脚本库 → 导入 → 选 TOY-LINK脚本.json');
  });
})();
