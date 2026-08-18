# Kiki Personal OS

手机端优先、可安装到主屏幕的个人 AI 工作台。

当前仓库已完成 MVP 第一阶段基础工程：Next.js、Tailwind CSS、PWA、Supabase 客户端、数据库基础迁移和顶层模块路由。业务功能尚未接入。

## 本地启动

1. 安装依赖：`npm install`
2. 复制 `.env.example` 为 `.env.local`
3. 填写 Supabase 项目 URL 和匿名密钥
4. 启动开发环境：`npm run dev`

## 常用命令

- `npm run dev`：启动开发环境
- `npm run lint`：执行代码检查
- `npm run build`：执行生产构建和类型检查
- `npm run start`：启动生产构建
- `npm run db:verify`：静态检查 migration、RLS 和授权
- `npm run db:migrations`：查看已关联项目的 migration 状态
- `npm run db:push`：将待执行 migration 应用到已关联项目
- `npm run db:check`：只读检查 Supabase 连接和 26 张 MVP 表

## 目录结构

```text
.
├── docs/                 # 产品与开发设计文档
├── public/               # PWA 图标与 Service Worker
├── src/
│   ├── app/              # App Router 页面和 Manifest
│   ├── components/       # 基础布局和 PWA 组件
│   └── lib/supabase/     # Supabase 客户端工厂
├── supabase/
│   └── migrations/       # MVP 数据库迁移
└── tests/                # 后续自动化测试
```

## 当前基础路由

- `/dashboard`
- `/tasks`
- `/ai`
- `/content`
- `/profile`
- `/offline`

## 开发约定

- 严格按照 `docs/DEVELOPMENT_DESIGN_V4.md` 的 MVP 范围开发。
- 不提交密钥、本地环境变量、构建产物或依赖目录。
- AI 产物不能覆盖用户原始数据。
- 所有用户业务表必须启用 Row Level Security。
- 提交前执行 `npm run lint` 和 `npm run build`。

Supabase 项目创建、关联、迁移和连接验证步骤见 `docs/SUPABASE_SETUP.md`。
