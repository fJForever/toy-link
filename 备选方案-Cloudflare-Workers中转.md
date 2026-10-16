# 备选方案：用 Cloudflare Workers 当中转

> 状态：**未实施**。用户已注册 Cloudflare 账号，尚未部署 Worker。
> 记于 v1.13.47。等需要时按本文走一遍即可。
> 这个方案的价值：不需要作者的中转服务器，也不需要用户改任何配置文件、重启任何东西。

## 一句话原理

官方端点不给跨域头（实测 `OPTIONS /v1/tts` → 404、`POST` → 401 且无 `Access-Control-Allow-Origin`），
所以浏览器不可能直连。但**任何位于浏览器之外的转发者都没有这个限制** —— Cloudflare Workers 就是这种转发者。

## 两种用法，成本不同

### 用法一：现在就能用，零部署改动

面板的「**中转 api**」档发的就是**官方鉴权头 + 官方请求体**（见 `index.html` 的 `buildHeaders`：
非本机通道一律带 `Authorization: Bearer <用户自己的 key>`），正好与 Worker 脚本的路径前缀映射对上。

| 面板字段 | Fish | MiniMax（国际站） |
|---|---|---|
| 连到哪儿 | 中转 api | 中转 api |
| 中转地址 | `https://toylink.你的子域.workers.dev/fish/v1/tts` | `https://toylink.你的子域.workers.dev/mm/v1/t2a_v2` |
| 中转令牌 | **自己的 Fish 官网 API Key** | **自己的 MiniMax 官网 API Key** |

无需改动 Worker 脚本、无需改动面板。

### 用法二：加一个「云中转地址」字段（更贴近"输入官网 URL + Key"）

在「官网 api」档里多一个可选输入框：填了 Worker 地址就走它，留空就走现有通道。
这样用户看到的是官方地址与官方 Key，Worker 只是一条"走法"。

需要两边各改一处：

1. **Worker 侧**：加动态目标 —— 从 `?target=<encodeURIComponent(官方地址)>` 取值，
   配域名白名单（只放行 `api.fish.audio`、`api.minimax.io`、`api.minimaxi.com`）。
   改完要**重新 Deploy 一次**。
2. **面板侧**：加输入框 + 端点计算分支；识别 `*.workers.dev` 时把文案从「中转令牌」切成「官方 API Key」。

## 两个已知坑

1. **MiniMax 国内站（`api.minimaxi.com`）走不通** —— Worker 脚本里 `/mm` 写死指向国际站 `api.minimax.io`。
   要么别用国内站，要么在 Worker 的 `ROUTES` 里加一行 `'/mmcn': 'https://api.minimaxi.com'`。
   用法二做了动态 target 之后这个坑自动消失。
2. **界面文案会错位** —— 用法一里这一档显示的是「中转地址 / 中转令牌」，但实际填的是官网地址与官网 Key。
   功能没问题，只是标签不对，用户可能会困惑。

## 部署步骤（Cloudflare 网页操作，免费）

1. 登录 https://dash.cloudflare.com
2. 左侧 **Workers & Pages** → **Create** → **Workers** → 起名（如 `toylink`）→ **Deploy**
3. 点 **Edit code**，把 `工具-中转-Worker版.js` 整段替换进去 → **Deploy**
4. 拿到形如 `https://toylink.你的子域.workers.dev` 的地址
5. 浏览器打开 `<地址>/health`，看到 `{"ok":true,...}` 即部署成功

免费额度：每天 10 万次请求，TTS 这个量级远用不完。TTS 几秒内返回，也在 Workers 的执行时间上限内。

## 验证清单

- [ ] 浏览器打开 `https://你的地址/health` → `{"ok":true,"service":"toylink-relay-worker",...}`
- [ ] 面板填 `.../fish/v1/tts` + 自己的 key → 点「试听一句」能出声
- [ ] 故意填错 key → 应回 401（说明请求真的到了官方，只是鉴权失败）
- [ ] 手机上也试一次（确认 HTTPS 与跨域都没问题）

## 安全边界（透传模式）

- Worker **能看到**用户的 `Authorization` 和台词文本 —— 这是任何转发者的固有性质，部署者自己要知情
- Worker **不落盘、不写日志内容**，脚本里没有持久化逻辑
- 被外人扫到这个地址也只是白转发：没有 key 的请求会被官方拒掉，不会消耗部署者的额度
- Worker 脚本已剔除 `x-toylink-*` 那套旧协议头，也会丢掉 `origin`/`referer`，不把浏览器来源带给官方
- 它自己回 `OPTIONS` 预检（官方对 OPTIONS 回 404，预检过不去），并暴露 `content-type` 给浏览器读 ——
  面板靠这个头判断"回来的是音频还是 JSON"

## 相关文件

- `工具-中转-Worker版.js` —— Workers 版实现（另有 Node 版 `工具-中转-Node版.js`，需要自己的服务器）
- `官网直连-部署说明.md` —— 更早的部署说明；其中「经本机转发」一节已过时（那套 UI 在 1.13.36 删掉了），
  但 Worker 部署步骤与排查表仍然有效
