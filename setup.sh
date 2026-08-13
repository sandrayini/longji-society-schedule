#!/bin/bash
set -e

echo "=== 安装后端依赖 ==="
npm install --no-audit --no-fund

echo "=== 安装前端依赖 ==="
cd client
npm install --no-audit --no-fund
cd ..

echo "=== 构建前端 ==="
npm run build

echo "=== 运行测试 ==="
npm test

echo "=== 启动服务（开发模式） ==="
echo "执行 npm start 或 npm run pm2:start 启动生产服务"
