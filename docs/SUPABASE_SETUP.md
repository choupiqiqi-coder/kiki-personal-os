# Supabase 项目连接流程

## 当前状态

- Supabase 客户端与 CLI 已安装。
- `supabase/config.toml` 已初始化。
- 三个 MVP migration 已纳入版本控制。
- `.env.local` 已配置并成功连接远程项目。
- `0001_core`、`0002_content`、`0003_memory_health` 已应用并写入标准迁移历史。
- 26 张 MVP 表、RLS、Policy 和 Data API 已通过远程只读验证。
- 未生成测试数据，`supabase/seed.sql` 保持为空。

最近验证日期：2026-08-17。

## 1. 创建项目并取得配置

1. 在 Supabase Dashboard 创建项目。
2. 在项目设置中复制 Project URL 与 Publishable Key。
3. 从 Dashboard 项目 URL 中取得 Project Ref。
4. 准备创建项目时设置的数据库密码。

Supabase 官方 Next.js 指南目前推荐使用 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`：

- https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- https://supabase.com/docs/guides/getting-started/api-keys

## 2. 配置本地环境变量

编辑仓库根目录的 `.env.local`：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_PROJECT_REF=<project-ref>
SUPABASE_DB_PASSWORD=<database-password>
SUPABASE_ACCESS_TOKEN=<personal-access-token>
OPENAI_API_KEY=
```

注意：

- `.env.local` 已被 Git 忽略，不要把真实密钥复制到 `.env.example`。
- Publishable Key 可以由浏览器端使用，数据安全依赖 Auth 与 RLS。
- 数据库密码和 Personal Access Token 只能用于 CLI，不得出现在客户端代码中。
- Access Token 可在 Supabase Account Tokens 页面创建，不要粘贴到聊天或提交到 Git。

## 3. 登录并关联远程项目

```powershell
npx supabase link --project-ref $env:SUPABASE_PROJECT_REF
```

CLI 会读取 `SUPABASE_ACCESS_TOKEN`；也可以不配置该变量并手动运行 `npx supabase login`。官方 CLI 流程：

- https://supabase.com/docs/guides/local-development/cli/getting-started
- https://supabase.com/docs/reference/cli/getting-started

## 4. 检查并执行 migration

先检查本地 migration 结构：

```powershell
npm run db:verify
```

关联远程项目后，查看本地与远程迁移状态：

```powershell
npm run db:migrations
```

确认目标项目为空或远程 Schema 已妥善合并后执行：

```powershell
npm run db:push
```

`db push` 会按顺序执行 `supabase/migrations` 内尚未应用的 migration。不要绕过迁移流程在 Dashboard 中重复创建这些表。

## 5. 验证连接和表结构

```powershell
npm run db:check
```

该命令会：

- 使用 `.env.local` 中的 URL 和 Publishable Key 建立连接。
- 逐表执行只读、无数据返回的结构探测。
- 验证 26 张 MVP 表都可通过 Supabase Data API 访问。
- 不插入、修改或删除任何数据。

## 6. 常见状态

- `Supabase connection is not configured`：本地 URL 或 Publishable Key 为空。
- `relation does not exist`：migration 尚未执行，或连接到了错误项目。
- `Connected ... tables failed verification`：连接成功，但远程表结构不完整。
- `Supabase connection healthy`：连接和全部 MVP 表结构验证通过。

## 7. 数据库变更规则

- 每次 Schema 变更必须新增 migration，不修改已经应用到共享环境的历史 migration。
- 不通过 Seed 写入真实用户数据。
- 新增用户表必须包含 `user_id`、索引和 RLS Policy。
- 执行 `db push` 前先运行 `npm run db:verify`。
