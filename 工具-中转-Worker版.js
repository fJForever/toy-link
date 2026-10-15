/* ============================================================
 * TOY·LINK 官网直连中转（Cloudflare Workers 版）
 *
 * 和 Node 版功能一样，区别是不需要自己的服务器：
 *   Cloudflare 免费额度足够，自带 HTTPS 和一个 *.workers.dev 域名，
 *   手机、电脑、别人都填同一个地址就能用。
 *
 * 部署（网页操作，不用命令行）：
 *   1. 注册 / 登录 https://dash.cloudflare.com （免费）
 *   2. 左侧 Workers & Pages → Create → Workers → 起个名字，创建
 *   3. 点 Edit code，把本文件内容整段贴进去，Deploy
 *   4. 拿到形如 https://toylink-xxx.<你的子域>.workers.dev 的地址
 *
 * 部署完把这些地址发给用户，他们填进面板的「合成地址」：
 *   Fish     https://toylink-xxx.xxx.workers.dev/fish/v1/tts
 *   MiniMax  https://toylink-xxx.xxx.workers.dev/mm/v1/t2a_v2
 *
 * key 怎么走：**透传**。每个用户填自己的 key，这里原样带到官方，
 *   不存、不记日志（Workers 默认也不持久化请求体）。你不承担别人的额度。
 * ============================================================ */

const ROUTES = {
  '/fish': 'https://api.fish.audio',
  '/mm': 'https://api.minimax.io',      // MiniMax 国内站改成 https://api.minimaxi.com
};

const ALLOW_HEADERS = [
  'authorization', 'x-api-key', 'content-type', 'accept',
  'model', 'x-toylink-modelheader', 'x-toylink-extra', 'x-toylink-noheaders',
].join(',');

/* 本地转发那套专属头，公网中转让它们过去只会给上游添乱 */
const STRIP_HEADERS = ['x-toylink-target', 'x-toylink-key', 'x-toylink-model', 'x-toylink-auth'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': ALLOW_HEADERS,
  'Access-Control-Max-Age': '86400',
  // 面板靠 content-type 判断"回的是音频还是 JSON"，跨域下必须显式暴露
  'Access-Control-Expose-Headers': 'content-type,content-length',
};

function json(code, obj) {
  return new Response(JSON.stringify(obj), {
    status: code,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CORS),
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // 预检自己答，不转给官方（官方对 OPTIONS 回 404，预检就过不去）
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    if (url.pathname === '/health' || url.pathname === '/') {
      return json(200, { ok: true, service: 'toylink-relay-worker', routes: Object.keys(ROUTES) });
    }

    let prefix = null;
    for (const p of Object.keys(ROUTES)) {
      if (url.pathname === p || url.pathname.startsWith(p + '/')) { prefix = p; break; }
    }
    if (!prefix) {
      return json(404, { ok: false, message: '路径不认识，用 /fish/v1/tts 或 /mm/v1/t2a_v2' });
    }
    if (request.method !== 'POST') return json(405, { ok: false, message: '只支持 POST' });

    const rest = url.pathname.slice(prefix.length);
    const upstream = ROUTES[prefix] + (rest || '/v1/tts') + (url.search || '');

    // 复制请求头（含用户的 Authorization），只剥掉本地转发那套和浏览器来源
    const fwd = new Headers();
    for (const [k, v] of request.headers.entries()) {
      const lk = k.toLowerCase();
      if (STRIP_HEADERS.indexOf(lk) >= 0) continue;
      if (lk === 'host' || lk === 'origin' || lk === 'referer') continue;
      fwd.set(k, v);
    }
    if (!fwd.has('content-type')) fwd.set('content-type', 'application/json');

    try {
      const r = await fetch(upstream, { method: 'POST', headers: fwd, body: request.body });

      // 回给浏览器：重建响应头（不能直接照抄上游的，会带出重复/冲突的 CORS 头）
      const out = new Headers(CORS);
      const ct = r.headers.get('content-type');
      if (ct) out.set('Content-Type', ct);
      return new Response(r.body, { status: r.status, headers: out });
    } catch (e) {
      return json(502, { ok: false, message: '打到官方失败：' + (e && e.message ? e.message : e), upstream });
    }
  },
};
