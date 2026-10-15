# 部署任务：TOY·LINK 官网直连中转

> 这份文档是给**在服务器上有 shell 权限的 AI 助手**执行的。
> 读完直接动手，不要提问；遇到文档没覆盖的情况，按"验证步骤"先跑通再说。

---

## 0. 这件事要解决什么

一个给 SillyTavern（酒馆）用户用的前端插件需要调用 Fish Audio / MiniMax 的 TTS 官方接口。
官方接口不带 CORS 响应头，**浏览器直连一定被拦**；而每个用户在自己电脑上跑本机脚本，
手机又用不了（`127.0.0.1` 在手机上指手机自己）。

所以要在**公网**起一个中转：

```
用户的手机/电脑  →  本中转（公网 + HTTPS + CORS）  →  Fish / MiniMax 官方
```

**关键设计：key 透传。** 每个用户在自己面板里填自己的 API Key，中转原样带到官方，
**不存、不记日志、不落盘**。部署方不承担用户额度，也不保管用户密钥。
日志里**只允许**出现"有没有带 key"这种布尔信息，**绝对不要**打印 `Authorization` 或请求/响应正文。

---

## 1. 环境探测（先做，别跳）

```bash
# 系统与版本
cat /etc/os-release | head -3
uname -m

# 是否已有 node（需要 18 或更高，最好 20+）
node -v 2>/dev/null || echo "NO_NODE"

# 是否已有反代 / 进程管理
which caddy nginx pm2 2>/dev/null || echo "none"

# 本机公网出口是否正常（中转要能连出去）
curl -sS -o /dev/null -w "fish=%{http_code}\n" -X POST https://api.fish.audio/v1/tts \
  -H 'content-type: application/json' -d '{}' --max-time 15

# 80/443 是否已被占用（若是 nginx 记得后面改 nginx 配置，不是 caddy）
ss -ltnp | grep -E ':(80|443)\b' || echo "80/443 空闲"
```

`fish=401` 是**正常**的（没带 key 被官方拒），说明服务器能连到官方。
如果这里就超时/连不上，先解决服务器出网问题，别往下做。

**需要向你的操作者确认两件事**（文档里没写就在动手前问一次）：

- **域名**：形如 `tts.example.com`，必须已经解析到这台服务器的公网 IP。
- **端口**：本中转监听哪个端口，默认用 `8800`。

---

## 2. 下载中转脚本

脚本已经从项目仓库的 `relay-only` 分支提供（**中文文件名，URL 必须编码**）：

```bash
mkdir -p /opt/toylink-relay && cd /opt/toylink-relay

# Node 版中转（零依赖，只需要 Node 18+）
curl -fsSL -o relay.js \
  "https://raw.githubusercontent.com/fJForever/toy-link/relay-only/%E5%B7%A5%E5%85%B7-%E4%B8%AD%E8%BD%AC-Node%E7%89%88.js"

# 校验：文件应约 5.9KB，并且含这几个标志
wc -c relay.js
grep -c 'Access-Control-Allow-Origin' relay.js     # 期望 >= 2
grep -c "ROUTES" relay.js                          # 期望 >= 2
node --check relay.js && echo "SYNTAX_OK"
```

**如果 `curl` 拿到 404 或空文件**（GitHub raw 偶发缓存/网络问题），改用备用地址：

```bash
curl -fsSL -o relay.js \
  "https://fastly.jsdelivr.net/gh/fJForever/toy-link@relay-only/%E5%B7%A5%E5%85%B7-%E4%B8%AD%E8%BD%AC-Node%E7%89%88.js"
```

两个地址都拿不到时，说明网络受限——告诉操作者，不要凭记忆重写这段代码，
它里面有几处不能改的细节（见第 6 节）。

脚本内置的上游路由，**不要改**：

```js
const ROUTES = {
  '/fish': 'https://api.fish.audio',
  '/mm':   'https://api.minimax.io',    // 若服务器面向中国内地用户且用国内站，改成 https://api.minimaxi.com
};
```

---

## 3. 让中转常驻

### 3.1 没有 pm2 就用 systemd（推荐，最稳）

`/etc/systemd/system/toylink-relay.service`：

```ini
[Unit]
Description=TOY-LINK TTS relay (public, passthrough)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/toylink-relay
ExecStart=/usr/bin/node /opt/toylink-relay/relay.js
Environment=PORT=8800
Environment=HOST=127.0.0.1
Restart=always
RestartSec=3
# 仅本机监听，外面由反代进来，更安全
User=root

[Install]
WantedBy=multi-user.target
```

```bash
# 确认 node 真实路径（可能不是 /usr/bin/node，按 `which node` 的结果改 ExecStart）
which node

systemctl daemon-reload
systemctl enable --now toylink-relay
systemctl status toylink-relay --no-pager | head -15
```

**`HOST=127.0.0.1` 是有意的**：只让本机反代能连，不直接把 8800 暴露到公网。
这样即使用户从公网扫到 8800 也连不上，攻击面小一层。

### 3.2 有 pm2 的话

```bash
cd /opt/toylink-relay
PORT=8800 HOST=127.0.0.1 pm2 start relay.js --name toylink-relay
pm2 save && pm2 startup    # 按它打印的提示再执行一次那条命令
```

---

## 4. HTTPS 反代

**HTTPS 是硬要求**，不是可选项：酒馆页面本身多半是 https，
浏览器会拦 https 页面里发出的 http 请求（混合内容）。

### 4.1 用 Caddy（自动申请证书，最省事）

`/etc/caddy/Caddyfile`：

```
tts.example.com {
    reverse_proxy 127.0.0.1:8800
    encode gzip
    # 可选：给中转加一层限速，防被当跳板刷流量
    # rate_limit { remote_ip { zone relay { rate 30r/s } } }
}
```

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy 会自动通过 ACME 申请 Let's Encrypt 证书，**前提是 80 端口能从公网访问**
（ACME 的 HTTP-01 校验要用）。确认防火墙放行 80 与 443：

```bash
# 看你装的是哪个防火墙
which ufw firewalld 2>/dev/null
# ufw:
ufw allow 80,443/tcp 2>/dev/null
# firewalld:
firewall-cmd --add-service={http,https} --permanent && firewall-cmd --reload 2>/dev/null
```

**云服务商侧的安全组/防火墙也要放行 80/443**（这一步在网页控制台做，命令行管不到）。

### 4.2 已经装了 nginx 的话（不要两个反代抢 443）

在 `server` 块里加：

```nginx
location / {
    proxy_pass http://127.0.0.1:8800;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    # 音频返回来可能几百 KB，别让 nginx 缓到磁盘
    proxy_buffering off;
}
```

证书自己用 certbot 申请：`certbot --nginx -d tts.example.com`。

---

## 5. 验证（必须逐条跑，不要只看"服务起来了"就结束）

### 5.1 本机直连中转（不走反代）

```bash
curl -sS http://127.0.0.1:8800/health
# 期望形如：{"ok":true,"service":"toylink-relay-public","port":8800,"routes":["/fish","/mm"],...}
```

### 5.2 CORS 预检（**最重要的一条**）

```bash
curl -sS -i -X OPTIONS https://tts.example.com/fish/v1/tts \
  -H 'Origin: https://example.com' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: authorization,content-type' | head -20
```

**必须看到**（缺一个浏览器就会拦）：

```
HTTP/2 204
access-control-allow-origin: *
access-control-allow-headers: authorization,x-api-key,content-type,accept,model,...
access-control-expose-headers: content-type,content-length
```

`access-control-expose-headers` 这条特别容易漏，但它是前端判断
"返回的是音频还是 JSON" 的依据，**漏了插件就读不到响应类型**。

### 5.3 真实透传（用假 key，期望被官方拒）

```bash
curl -sS -i -X POST https://tts.example.com/fish/v1/tts \
  -H 'Origin: https://example.com' \
  -H 'Authorization: Bearer sk-this-is-a-fake-key' \
  -H 'content-type: application/json' \
  --data '{"text":"test"}' | head -20
```

**期望**：HTTP 401 且正文类似 `{"status":401,"message":"Invalid Token"}`，
并且响应头里**仍然带着** `access-control-allow-origin: *`。

- 拿到 401 → 透传通了 ✅
- 拿到 502 → 中转连不上官方，回到 1. 的最后一条排生产环境的出网
- 拿到 404 且正文写"路径不认识" → URL 少了 `/fish` 前缀
- **拿不到任何响应头** → 反代没配好，或者 TLS 有问题

### 5.4 看日志确认没记敏感信息

```bash
journalctl -u toylink-relay -n 20 --no-pager
# 或 pm2 logs toylink-relay --lines 20
```

日志行应该长这样，**只有有没有 key，没有 key 本身、没有正文**：

```
[21:33:20] /fish → 401 · 0KB · 413ms · 带key=true
```

**如果看到 Authorization 或台词内容被打出来，立刻停下并报告** —— 那是违反透传约定的。

---

## 6. 不要改的几处（改了会坏）

| 位置 | 为什么不能动 |
|---|---|
| `OPTIONS` 分支**必须自己答 204** | 官方对 OPTIONS 回 404，转发过去预检就失败，浏览器根本不会发真实请求 |
| `Access-Control-Expose-Headers` | 不写它，前端读不到 `content-type`，无法判断音频/JSON |
| 重建响应头时**不要照抄上游的** | 上游若带自己的 CORS 头，会和我们的重复/冲突，浏览器会直接拒 |
| `x-toylink-*` 那组头的剥离 | 那是"本机转发"模式的专用头，带到官方会让上游莫名多字段 |
| 日志内容 | 透传模式的基本要求：不记 key、不记正文 |

---

## 7. 交付给操作者的信息

部署完成后，把下面这些回报给操作者（他要去告诉插件的用户）：

```
中转地址（Fish）    https://tts.example.com/fish/v1/tts
中转地址（MiniMax） https://tts.example.com/mm/v1/t2a_v2
健康检查            https://tts.example.com/health
重启命令            systemctl restart toylink-relay
日志命令            journalctl -u toylink-relay -f
```

用户在酒馆插件里这样填（**key 各填自己的**）：

| 字段 | 填什么 |
|---|---|
| 合成平台 | Fish Audio |
| 合成地址 | `https://tts.example.com/fish/v1/tts` |
| 经本机转发 | **关**（关着才是浏览器直连） |
| 令牌 | 自己的 Fish API Key |
| 音色 | 自己的音色 ID |

---

## 8. 附带说明（供操作者判断，不必执行）

- **国内服务器做这个需要域名备案**（443 端口对外服务的前提）；境外/香港节点不需要。
  用户主要在国内的话，选香港/新加坡节点，国内直连比绕 Cloudflare 快。
- **Cloudflare Workers 也能做同样的事**（项目里另有 `工具-中转-Worker版.js`），
  但 `*.workers.dev` 域名在国内基本连不上，要用就得绑自定义域名。
  如果这台服务器已经跑起来了，Workers 那条就不必再折腾。
- 中转**不需要鉴权**：它不存任何东西，没有 key 的请求会被官方直接拒。
  真要防滥用，在反代层加限速即可（Caddy 的 `rate_limit` 或 nginx 的 `limit_req`）。
- 用户侧还有一个"经本机转发"模式（在用户自己电脑上跑脚本）。它和这个公网中转是
  **两套互不影响**的机制：中转服务的是"浏览器直连"这条路，本机转发服务的是单机用户。
