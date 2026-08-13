# 第二届龙脊学社第五组活动日程

一个全栈网页应用，供学社小组记录成员信息、发起活动、统计活动时间。移动端优先，手账风格 UI。

## 技术栈

- 后端：Node.js + Express
- 数据库：SQLite（单文件）
- 前端：Vue 3 + Vite
- 认证：JWT + bcrypt 加盐哈希
- 部署：PM2 / 直接运行

## 环境要求

- Node.js 18+
- npm 9+
- （可选）PM2 用于生产守护

## 安装启动

```bash
# 1. 克隆/上传代码后进入目录
cd longji-society-schedule

# 2. 安装依赖
npm install
cd client && npm install && cd ..

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，设置 JWT_SECRET 等

# 4. 构建前端
npm run build

# 5. 启动服务
npm start
```

服务默认监听 `http://localhost:3000`。

首次启动会自动初始化数据库，并创建默认管理员账号：

- 账号：`admin`
- 密码：`admin123456`

首次登录后必须修改密码。

## 开发模式

```bash
npm run dev
```

同时启动后端（nodemon）和前端（Vite dev server）。

## 测试

```bash
npm test
```

目前覆盖共同空闲时间区间算法边界用例。

## 生产部署（PM2）

```bash
npm install -g pm2
npm run build
npm run pm2:start
```

## Nginx 反向代理 + HTTPS 示例

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## 数据备份

SQLite 数据库为单文件，默认路径 `./data/app.db`。直接复制该文件即可备份：

```bash
cp data/app.db backups/app-$(date +%Y%m%d).db
```

## 默认账号

- 管理员：`admin` / `admin123456`（首次登录强制改密）
- 新增成员默认密码：`longji123`（管理员可重置）

## 项目目录

```
longji-society-schedule/
├── client/           # Vue 3 前端
├── server/           # Express 后端 + SQLite
├── shared/           # 前后端共用算法
├── tests/            # Jest 单元测试
├── data/             # SQLite 数据文件（运行后生成）
├── index.js          # 入口
├── ecosystem.config.js # PM2 配置
└── .env.example      # 环境变量示例
```

## 验收清单

- [ ] 登录/权限：默认 admin 可登录，普通成员账号可登录
- [ ] 成员管理：admin 可新增、编辑、停用、重置密码
- [ ] 时间待定活动：发起、填录有空/没空、修改、截止、共同空闲统计
- [ ] 时间已定活动：发起、参加/不参加、统计、截止
- [ ] 共同空闲算法：相邻合并、嵌套包含、端点相接、空交集、放宽条件
- [ ] 手机端 UI：温馨手账风格，底部导航，圆角卡片
