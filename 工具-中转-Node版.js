/* ============================================================
 * TOY·LINK 官网直连中转（Node 版）
 *
 * 干什么：让手机、平板、别人电脑都能"直连官网"。
 *   浏览器 → 这个中转（公网、开了 CORS）→ Fish / MiniMax 官方
 *
 * 为什么必须有它：官方端点不带 CORS 头，浏览器直接打会被拦。
 *   而本机转发脚本的 127.0.0.1 在手机上指手机自己 —— 所以只有放到公网、
 *   让所有人都填同一个地址，手机才用得上。
 *
 * key 怎么走：**透传**。用户在自己面板里填自己的 key，中转原样带到官方、
 *   不存、不记日志、不落盘。所以你不承担别人的额度，也不碰别人的密钥。
 *
 * 跑起来：
 *   node 工具-中转-Node.js
 *   默认监听 0.0.0.0:8800（0.0.0.0 = 局域网/公网都能连）。
 *   想换端口：PORT=9000 node 工具-中转-Node.js
 *
 * 面板里怎么填（每个用户都一样）：
 *   合成平台  Fish Audio
 *   合成地址  http://你的域名或IP:8800/fish/v1/tts
 *   令牌      自己的 Fish API Key
 *   （路径打头的 /fish 是给这个中转看的，它据此决定转发到哪家官方）
 *
 * 上线到公网时记得：
 *   · 前面挂 HTTPS（Nginx/Caddy 反代），否则手机浏览器可能拦混合内容；
 *   · 防火墙只放你需要的端口；
 *   · 不需要鉴权 —— 它不存 key，被人扫到也只是白转发（上游会拒掉没 key 的请求）。
 * ============================================================ */

'use strict';
const http = require('http');

const PORT = Number(process.env.PORT || 8800);
const HOST = process.env.HOST || '0.0.0.0';

/* 路径前缀 → 官方端点。中转自己决定打哪儿，不依赖页面传来的 x-toylink-target ——
   一来面板在「中转」模式下本来就不会填地址给官方，二来让上游不可由外部指定更安全。 */
const ROUTES = {
  '/fish': 'https://api.fish.audio',
  '/mm': 'https://api.minimax.io',      // MiniMax 国内站换成 https://api.minimaxi.com
};

/* 只允许浏览器带这些头过来；Authorization 是用户自己的 key，原样透传 */
const ALLOW_HEADERS = [
  'authorization', 'x-api-key', 'content-type', 'accept',
  'model', 'x-toylink-modelheader', 'x-toylink-extra', 'x-toylink-noheaders',
].join(',');

/* 这些是"本地转发"那套用的，公网中转不需要，带了会让上游莫名的多字段 */
const STRIP_HEADERS = ['x-toylink-target', 'x-toylink-key', 'x-toylink-model', 'x-toylink-auth'];

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', ALLOW_HEADERS);
  res.setHeader('Access-Control-Max-Age', '86400');
  /* 关键：跨域下浏览器默认只让前端读 6 个"安全"响应头，
     而面板要靠 content-type 判断"回的是音频还是 JSON"，所以必须显式暴露。 */
  res.setHeader('Access-Control-Expose-Headers', 'content-type,content-length');
}

function sendJson(res, code, obj) {
  if (res.headersSent) { res.end(); return; }
  cors(res);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));

  // 预检：必须自己答，不能转给官方 —— 官方对 OPTIONS 回 404，预检就过不去
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); res.end(); return; }

  if (url.pathname === '/health' || url.pathname === '/') {
    sendJson(res, 200, {
      ok: true, service: 'toylink-relay-public', port: PORT,
      routes: Object.keys(ROUTES), uptimeSec: Math.round(process.uptime()),
      note: '透传模式：不存 key、不记请求内容',
    });
    return;
  }

  // 找前缀
  let prefix = null;
  for (const p of Object.keys(ROUTES)) {
    if (url.pathname === p || url.pathname.indexOf(p + '/') === 0) { prefix = p; break; }
  }
  if (!prefix) {
    sendJson(res, 404, {
      ok: false,
      message: '路径不认识。地址应该写成 /fish/v1/tts（Fish）或 /mm/v1/t2a_v2（MiniMax）',
    });
    return;
  }
  if (req.method !== 'POST') { sendJson(res, 405, { ok: false, message: '只支持 POST' }); return; }

  // 拼上游地址：去掉前缀，其余原样
  const rest = url.pathname.slice(prefix.length);
  const upstream = ROUTES[prefix] + (rest || '/v1/tts') + (url.search || '');

  // 读请求体（音频合成请求不大，但给个上限免得被人塞大包）
  let body;
  try {
    const chunks = [];
    let size = 0;
    for await (const c of req) {
      size += c.length;
      if (size > 2 * 1024 * 1024) { sendJson(res, 413, { ok: false, message: '请求体过大（上限 2MB）' }); return; }
      chunks.push(c);
    }
    body = Buffer.concat(chunks);
  } catch (e) {
    sendJson(res, 400, { ok: false, message: '读取请求体失败：' + e.message });
    return;
  }

  // 转发头：原样带过去（含用户的 Authorization），只剥掉本地转发那套
  const fwd = {};
  for (const [k, v] of Object.entries(req.headers)) {
    const lk = k.toLowerCase();
    if (STRIP_HEADERS.indexOf(lk) >= 0) continue;
    if (lk === 'host' || lk === 'origin' || lk === 'referer') continue;   // 别把浏览器来源带给官方
    if (lk === 'content-length') continue;                              // 重新算
    fwd[k] = v;
  }
  if (!fwd['content-type']) fwd['content-type'] = 'application/json';

  const t0 = Date.now();
  try {
    const r = await fetch(upstream, { method: 'POST', headers: fwd, body });
    const ct = r.headers.get('content-type') || '';
    const buf = Buffer.from(await r.arrayBuffer());

    // 回给浏览器：只带必要响应头，再补 CORS
    cors(res);
    res.writeHead(r.status, {
      'Content-Type': ct || 'application/octet-stream',
      'Content-Length': buf.length,
    });
    res.end(buf);

    /* 日志只记"有没有 key"，绝不记 key 本身、也不记正文 —— 透传模式的基本操守 */
    const hasKey = !!(req.headers['authorization'] || req.headers['x-api-key']);
    console.log('[' + new Date().toISOString().slice(11, 19) + '] ' + prefix + ' → ' + r.status +
      ' · ' + Math.round(buf.length / 1024) + 'KB · ' + (Date.now() - t0) + 'ms · 带key=' + hasKey);
  } catch (e) {
    /* 注意：打到上游失败时也必须带 CORS 头 —— 否则浏览器读不到这个响应，
       用户只看到"Failed to fetch"，永远不知道真正的原因（连不上、还是被拦）。 */
    const msg = '打到官方失败：' + (e && e.message ? e.message : e);
    console.log('[' + new Date().toISOString().slice(11, 19) + '] ' + prefix + ' → 502 ' + msg);
    sendJson(res, 502, { ok: false, message: msg, upstream: upstream });
  }
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  TOY·LINK 官网直连中转（透传模式）已就绪');
  console.log('  ------------------------------------------------');
  for (const [p, u] of Object.entries(ROUTES)) {
    console.log('  面板地址  http://<你的域名或IP>:' + PORT + p + (p === '/fish' ? '/v1/tts' : '/v1/t2a_v2') + '   → ' + u);
  }
  console.log('  健康检查  http://127.0.0.1:' + PORT + '/health');
  console.log('  ------------------------------------------------');
  console.log('  手机/电脑都填同一个地址；令牌各填自己的 key，本服务不存。');
  console.log('  放到公网时前面挂一层 HTTPS 更稳妥。Ctrl+C 结束。');
  console.log('');
});
