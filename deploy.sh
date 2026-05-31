#!/usr/bin/env bash
# 构建前端并把产物同步进 backend/public（同域部署）。
# 用法： ./deploy.sh
set -e
cd "$(dirname "$0")"

echo "▶ 构建前端…"
npm --prefix frontend install --silent
npm --prefix frontend run build

echo "▶ 同步 dist → backend/public…"
rm -rf backend/public/assets
cp -r frontend/dist/assets backend/public/assets
cp frontend/dist/index.html backend/public/index.html

echo "✅ 完成。提交后服务器 git pull 即为最新前端（无需在服务器构建）。"
