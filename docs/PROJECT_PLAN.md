# Kiki Personal OS 项目规划

## 1. 产品定位与边界

Kiki Personal OS 是一个手机端优先、可安装到主屏幕的个人 AI 工作台。它将任务、自媒体生产、学习、身体管理和财富管理集中在一个入口，并由 AI 秘书完成信息汇总、内容分析和行动建议。

首阶段服务单用户，但数据模型保留 `user_id`，以便后续扩展多用户。健康与投资模块定位为个人记录及辅助分析，不提供医疗诊断或确定性投资建议。

### 核心体验原则

- 首页只展示今天需要关注的事项，避免成为数据堆砌页。
- AI 输出必须可追溯到输入数据或信息来源，并显示生成时间。
- AI 分析默认保存为历史快照，不覆盖原始数据。
- 高频录入操作在手机上应能在少量步骤内完成。
- PWA 优先保证快速打开、离线壳可用和安全重试；联网能力不可用时不伪造 AI 或市场结果。

## 2. 整体技术架构

### 2.1 架构选型

采用 Next.js 模块化单体架构。前端、服务端页面、Route Handlers 和 Server Actions 位于同一代码库，降低早期开发与部署复杂度；当定时简报、采集或 AI 任务规模增大后，再拆分独立 Worker。

```text
手机 PWA / 桌面浏览器
        │
        ▼
Next.js 应用
├── UI 层：React + Tailwind CSS
├── BFF 层：Server Actions / Route Handlers
├── 领域层：Dashboard、秘书、自媒体、学习、身体、财富
├── AI 编排层：Prompt 模板、结构化输出、结果校验、用量记录
└── 数据访问层：Supabase Client / Repository
        │
        ├───────────────┐
        ▼               ▼
Supabase             OpenAI API
├── Auth             ├── 简报生成
├── PostgreSQL       ├── 素材拆解
├── Storage          ├── 内容复盘
├── RLS              └── 分析建议
└── 定时任务/函数
```

### 2.2 各层职责

#### 客户端与 PWA

- 使用响应式布局，主导航采用适合单手操作的底部导航。
- Manifest 提供安装名称、图标、主题色及 `standalone` 展示模式。
- Service Worker 缓存应用壳与静态资源。
- 表单草稿可暂存本地；恢复联网后由用户确认提交。
- 涉及 AI、上传、市场数据的请求必须在线执行，并提供失败重试。

#### Next.js 服务端

- 优先由 Server Components 读取数据，减少客户端请求和敏感信息暴露。
- Server Actions 用于站内表单变更；Route Handlers 用于文件上传签名、AI 流式响应、定时任务和外部回调。
- 使用 Zod 一类的 Schema 工具统一验证输入和 AI 结构化输出。
- 按领域拆分服务，不让页面组件直接拼接 SQL 或 Prompt。

#### Supabase

- Auth：首期可采用邮箱魔法链接或第三方登录。
- PostgreSQL：保存业务数据、AI 快照及来源信息。
- Storage：保存体态图片等私有文件。
- RLS：所有用户数据按 `auth.uid() = user_id` 隔离。
- 定时能力：触发每日简报任务；若执行时间较长，交由异步 Worker 处理。

#### OpenAI 集成

- API Key 仅保存在服务端环境变量中。
- Prompt 模板版本化，记录模型、模板版本、输入摘要、输出、状态和 token 用量。
- 要求结构化 JSON 输出，再转换为 UI 所需视图模型。
- 对自媒体、身体和投资分析使用不同系统规则，避免上下文串扰。
- AI 失败不影响原始记录保存；分析任务可独立重试。

### 2.3 推荐的横切能力

- 身份认证与授权：Supabase Auth + RLS 双重保护。
- 错误与日志：服务端结构化日志，后续接入错误监控。
- 数据时间：数据库统一存 UTC，界面按用户时区显示。
- 隐私：身体照片使用私有 Bucket 和短时签名 URL。
- 可观测性：记录 AI 请求耗时、失败率与费用，不记录不必要的敏感原文。
- 数据来源：市场与行业信息后续通过合规数据源接入，不能让模型凭空生成实时行情。
- 备份与导出：后续提供 JSON/CSV 导出及账号数据删除能力。

## 3. 项目目录结构

建议使用领域优先结构，避免所有组件、接口和类型堆积在全局目录。

```text
kiki-personal-os/
├── public/
│   ├── icons/                 # PWA 图标
│   └── manifest.webmanifest
├── src/
│   ├── app/
│   │   ├── (auth)/            # 登录相关路由组
│   │   ├── (app)/             # 登录后的主应用路由组
│   │   ├── api/               # 外部回调、AI 流式接口、定时任务
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                # 通用基础组件
│   │   ├── layout/            # 顶栏、底部导航、页面容器
│   │   └── feedback/          # 空状态、错误、加载、Toast
│   ├── features/
│   │   ├── dashboard/
│   │   ├── assistant/
│   │   ├── media/
│   │   ├── learning/
│   │   ├── health/
│   │   └── wealth/
│   ├── server/
│   │   ├── auth/
│   │   ├── db/                # Supabase 服务端客户端与 Repository
│   │   ├── ai/                # AI 网关、Prompt、Schema、用量记录
│   │   ├── jobs/              # 简报等后台任务
│   │   └── integrations/      # 后续行情、资讯等数据源
│   ├── lib/                   # 无业务状态的通用工具
│   ├── hooks/
│   ├── types/
│   └── config/
├── supabase/
│   ├── migrations/            # 数据库迁移
│   ├── seed.sql               # 本地示例数据
│   └── functions/             # 必要时使用 Edge Functions
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── PROJECT_PLAN.md
│   ├── product/
│   ├── architecture/
│   └── decisions/             # ADR 架构决策记录
├── .env.example
└── README.md
```

每个 `features/<domain>` 内部可按需包含 `components`、`actions`、`schemas`、`queries`、`types`。跨领域共享必须有明确的复用需求，不能预先抽象。

## 4. 数据库设计方案

### 4.1 通用规范

- 主键统一使用 UUID。
- 核心表包含 `user_id`、`created_at`、`updated_at`。
- 用户输入与 AI 结果分表保存，防止分析结果污染原始记录。
- 可恢复数据使用 `deleted_at` 软删除；流水型数据通常不软删除。
- 可枚举状态使用数据库约束或应用层常量，避免任意字符串。
- 高频查询字段建立组合索引，例如 `(user_id, occurred_on desc)`。
- 金额使用 `numeric`，热量和身体指标使用 `numeric`，不可使用浮点金额。

### 4.2 用户与首页

#### `profiles`

- `id`：对应 Supabase Auth 用户 ID
- `display_name`
- `timezone`
- `locale`
- `onboarding_completed_at`
- `created_at`、`updated_at`

#### `tasks`

- `id`、`user_id`
- `title`、`notes`
- `due_date`、`due_time`
- `status`：todo / doing / done / cancelled
- `priority`：low / medium / high
- `source_module`：manual / media / learning / health / wealth
- `source_id`：可选，关联来源记录
- `completed_at`
- `created_at`、`updated_at`、`deleted_at`

首页数据不单独持久化为一张 Dashboard 表，而是由当天任务、最新简报和各模块最新记录聚合生成。必要时增加短时缓存视图。

### 4.3 AI 秘书

#### `briefings`

- `id`、`user_id`
- `briefing_date`
- `type`：daily / ai / solar / media_trend / market
- `title`
- `summary`
- `content_json`：分节内容、要点、行动建议
- `status`：queued / generating / ready / failed
- `generated_at`
- `ai_run_id`
- 唯一约束：`(user_id, briefing_date, type)`

#### `information_sources`

- `id`
- `source_type`：rss / api / webpage / manual
- `name`、`url`
- `published_at`、`fetched_at`
- `title`、`excerpt`
- `content_hash`：去重
- `metadata_json`

#### `briefing_sources`

- `briefing_id`
- `source_id`
- `relevance_score`
- 复合主键：`(briefing_id, source_id)`

#### `ai_runs`

- `id`、`user_id`
- `purpose`：briefing / viral_analysis / recreation / review / investment 等
- `entity_type`、`entity_id`
- `model`
- `prompt_version`
- `input_hash`
- `output_json`
- `status`、`error_code`
- `input_tokens`、`output_tokens`
- `started_at`、`completed_at`

### 4.4 自媒体模块

#### `inspiration_items`

- `id`、`user_id`
- `title`、`content`
- `source_url`
- `inspiration_date`
- `status`：pending / completed / archived
- `completed_at`
- `created_at`、`updated_at`、`deleted_at`

#### `viral_materials`

- `id`、`user_id`
- `platform`
- `title`、`source_url`
- `author_name`
- `content_snapshot`
- `metrics_json`：播放、点赞、评论等非固定平台数据
- `published_at`
- `notes`
- `created_at`、`updated_at`、`deleted_at`

#### `viral_analyses`

- `id`、`user_id`、`material_id`
- `hook_analysis`
- `structure_json`
- `viral_reasons_json`
- `audience_analysis`
- `recreation_plan_json`
- `ai_run_id`
- `created_at`

#### `topics`

- `id`、`user_id`
- `title`
- `description`
- `status`：idea / planned / producing / published / archived
- `priority`
- `platforms`：数组或 JSON
- `scheduled_for`
- `created_at`、`updated_at`、`deleted_at`

#### `title_templates`

- `id`、`user_id`
- `name`、`template`
- `category`
- `example`
- `created_at`、`updated_at`

#### `copy_materials`

- `id`、`user_id`
- `title`、`content`
- `category`
- `source_url`
- `created_at`、`updated_at`、`deleted_at`

#### `tags` 与 `entity_tags`

- `tags`：`id`、`user_id`、`name`、`color`
- `entity_tags`：`tag_id`、`entity_type`、`entity_id`
- 标签名称对单用户唯一。

#### `content_performance_records`

- `id`、`user_id`
- `topic_id`：可选
- `platform`、`content_url`、`title`
- `published_at`
- `recorded_at`
- `views`、`likes`、`comments`、`shares`、`saves`
- `followers_gained`
- `watch_time_seconds`、`completion_rate`
- `extra_metrics_json`
- 同一内容允许多个时间点快照。

#### `content_reviews`

- `id`、`user_id`、`performance_record_id`
- `manual_notes`
- `problem_analysis_json`
- `suggestions_json`
- `ai_run_id`
- `created_at`

### 4.5 技能学习模块

#### `learning_skills`

- `id`、`user_id`
- `name`
- `category`：shooting / editing / ai_tools / other
- `description`
- `target_level`
- `status`：planned / active / paused / completed
- `progress_percent`
- `created_at`、`updated_at`、`deleted_at`

#### `learning_resources`

- `id`、`user_id`、`skill_id`
- `title`、`resource_type`
- `url`
- `status`：unread / learning / completed
- `duration_minutes`
- `completed_at`
- `created_at`、`updated_at`

#### `learning_notes`

- `id`、`user_id`
- `skill_id`、`resource_id`：均可选
- `title`、`content`
- `created_at`、`updated_at`、`deleted_at`

#### `learning_sessions`

- `id`、`user_id`、`skill_id`
- `started_at`、`duration_minutes`
- `progress_delta`
- `notes`

### 4.6 身体管理模块

#### `body_measurements`

- `id`、`user_id`
- `measured_at`
- `weight_kg`、`body_fat_percent`
- `waist_cm`、`hip_cm`、`chest_cm`
- `extra_metrics_json`
- `notes`

#### `posture_records`

- `id`、`user_id`
- `recorded_at`
- `notes`
- `comparison_group_id`：用于前后对比

#### `posture_images`

- `id`、`user_id`、`posture_record_id`
- `storage_path`
- `view_type`：front / side / back / other
- `captured_at`
- 仅保存私有 Storage 路径，不保存长期公开 URL。

#### `water_logs`

- `id`、`user_id`
- `amount_ml`
- `logged_at`

#### `menstrual_cycles`

- `id`、`user_id`
- `start_date`、`end_date`
- `flow_level`
- `symptoms_json`
- `notes`
- 此类敏感信息应最小化采集并严格执行 RLS。

#### `meal_plans`

- `id`、`user_id`
- `plan_date`
- `meal_type`
- `title`、`description`
- `target_calories_kcal`
- `protein_g`、`carbs_g`、`fat_g`

#### `food_logs`

- `id`、`user_id`
- `logged_at`
- `meal_type`
- `food_name`、`quantity_text`
- `calories_kcal`
- `protein_g`、`carbs_g`、`fat_g`
- `source`：manual / estimated / database

#### `exercise_logs`

- `id`、`user_id`
- `exercise_type`
- `started_at`、`duration_minutes`
- `calories_burned_kcal`
- `intensity`
- `notes`

热量计算结果应标注为估算值，并保存计算方式或来源版本。

### 4.7 财富管理模块

#### `funds`

- `id`
- `fund_code`、`fund_name`
- `fund_type`
- `currency`
- 基础标的可全局共享，不保存用户仓位。

#### `fund_transactions`

- `id`、`user_id`、`fund_id`
- `transaction_type`：buy / sell / dividend / fee
- `transaction_date`
- `units`
- `unit_price`
- `amount`
- `fee`
- `notes`

仓位由交易流水计算，避免直接维护容易失真的“当前金额”。必要时创建聚合视图。

#### `fund_nav_snapshots`

- `id`、`fund_id`
- `nav_date`
- `nav`
- `source`
- 唯一约束：`(fund_id, nav_date)`

#### `market_sectors`

- `id`
- `code`、`name`
- `market`

#### `market_snapshots`

- `id`、`sector_id`
- `snapshot_date`
- `metrics_json`
- `source`

#### `investment_analyses`

- `id`、`user_id`
- `analysis_date`
- `scope_type`：portfolio / fund / sector / market
- `scope_id`：可选
- `summary`
- `risk_notes_json`
- `suggestions_json`
- `data_as_of`
- `ai_run_id`
- `created_at`

所有市场结果必须展示“数据截至时间”和数据来源。AI 输出应使用“观察、风险、可选行动”，避免确定性买卖指令。

## 5. 页面路由规划

### 5.1 公共与系统路由

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/login` | 登录 | 邮箱或第三方登录 |
| `/onboarding` | 初始设置 | 时区、关注领域、基础偏好 |
| `/settings` | 设置 | 账号、通知、隐私、AI 偏好 |
| `/offline` | 离线提示 | 无法完成联网操作时展示 |

### 5.2 主导航

手机底部主导航建议保留 5 个入口：首页、秘书、自媒体、身体、更多。“学习”和“财富”放在更多中，后续根据使用频率调整。全局快捷新增按钮用于新建任务、灵感、饮水、学习和运动记录。

| 路由 | 页面 | MVP |
| --- | --- | --- |
| `/` | Dashboard | 是 |
| `/assistant` | AI 秘书 | 是 |
| `/media` | 自媒体总览 | 是 |
| `/health` | 身体管理总览 | 后续 |
| `/more` | 学习、财富和设置入口 | 是 |

### 5.3 Dashboard

| 路由 | 页面 |
| --- | --- |
| `/` | 今日任务、最新简报入口、各模块摘要 |
| `/tasks` | 任务列表 |
| `/tasks/new` | 新建任务 |
| `/tasks/[id]` | 任务详情与编辑 |

### 5.4 AI 秘书

| 路由 | 页面 |
| --- | --- |
| `/assistant` | 今日简报聚合页 |
| `/assistant/briefings` | 历史简报 |
| `/assistant/briefings/[id]` | 简报详情及来源 |
| `/assistant/preferences` | 简报主题与生成偏好 |

不同简报类型使用筛选项或页内标签，不为每种类型复制独立路由。

### 5.5 自媒体

| 路由 | 页面 |
| --- | --- |
| `/media` | 模块总览 |
| `/media/inspiration` | 每日灵感列表 |
| `/media/inspiration/new` | 新建灵感 |
| `/media/inspiration/[id]` | 灵感编辑 |
| `/media/materials` | 爆款素材库 |
| `/media/materials/new` | 录入素材或链接 |
| `/media/materials/[id]` | 素材详情、拆解与二创方案 |
| `/media/topics` | 选题库 |
| `/media/topics/new` | 新建选题 |
| `/media/topics/[id]` | 选题详情 |
| `/media/templates` | 标题模板、文案素材、标签 |
| `/media/reviews` | 内容复盘历史 |
| `/media/reviews/new` | 录入数据并发起分析 |
| `/media/reviews/[id]` | 复盘详情 |

### 5.6 技能学习

| 路由 | 页面 |
| --- | --- |
| `/learning` | 学习总览与进度 |
| `/learning/skills` | 技能列表 |
| `/learning/skills/[id]` | 技能、资源、进度详情 |
| `/learning/notes` | 学习笔记 |
| `/learning/notes/[id]` | 笔记详情与编辑 |

### 5.7 身体管理

| 路由 | 页面 |
| --- | --- |
| `/health` | 当日摘要与快捷记录 |
| `/health/body` | 身体数据趋势 |
| `/health/posture` | 体态记录与图片对比 |
| `/health/water` | 饮水记录 |
| `/health/cycle` | 生理期记录 |
| `/health/nutrition` | 饮食规划与饮食记录 |
| `/health/exercise` | 运动记录 |

### 5.8 财富管理

| 路由 | 页面 |
| --- | --- |
| `/wealth` | 资产摘要与风险提示 |
| `/wealth/funds` | 基金与持仓列表 |
| `/wealth/funds/[id]` | 基金详情及交易流水 |
| `/wealth/sectors` | 行业板块分析 |
| `/wealth/market` | 市场动态 |
| `/wealth/analyses` | AI 投资分析历史 |
| `/wealth/analyses/[id]` | 分析详情与数据来源 |

## 6. MVP 第一阶段开发计划

### 6.1 MVP 目标

第一阶段验证三个关键闭环：

1. 每天打开首页，能看见今天要做什么。
2. 能持续收集自媒体灵感与素材，并获得可保存的 AI 拆解结果。
3. 能生成并查看有来源、有时间戳的个人每日简报。

身体、学习、财富在首页首期可显示占位入口或极简摘要，但不应为了“模块齐全”延迟核心闭环上线。

### 6.2 MVP 范围

#### 纳入

- PWA 安装、移动端应用壳、登录和基础设置。
- Dashboard：今日任务、今日简报、灵感待办和快捷新增。
- 任务：新增、编辑、完成、删除和今日筛选。
- AI 秘书：手动生成每日简报、历史记录、来源展示、失败重试。
- 自媒体灵感：增删改查、完成状态。
- 爆款素材：手动录入链接和内容、AI 爆款分析、二创方案、历史保存。
- 选题库：基础增删改查、标签、状态。
- 内容复盘：手动录入核心指标、AI 分析与历史保存。
- 最小设置：时区、简报关注主题、AI 数据使用说明。
- 基础测试、RLS、安全与错误处理。

#### 暂不纳入

- 自动爬取各内容平台和自动下载视频。
- 自动发布自媒体内容。
- 复杂离线数据同步与冲突合并。
- 身体图片 AI 诊断或自动识别。
- 银行、券商、基金账户自动同步。
- 实时行情和自动交易建议。
- 多人协作、付费系统和运营后台。

### 6.3 里程碑

#### M0：需求冻结与体验原型（2～3 天）

- 明确首位真实用户的一天使用路径。
- 输出 Dashboard、简报、灵感、素材分析、内容复盘的低保真流程。
- 定义 MVP 验收标准、移动端视觉规范和空/错/加载状态。
- 确定行业资讯及市场数据的合法来源策略。

#### M1：工程与数据底座（3～4 天）

- 初始化 Next.js、Tailwind CSS、PWA 和环境变量管理。
- 建立 Supabase Auth、数据库迁移、RLS 和私有 Storage 策略。
- 建立移动端应用壳、路由保护、日志与错误边界。
- 建立测试框架和部署环境。

#### M2：任务、灵感与 Dashboard（4～5 天）

- 完成任务和灵感的增删改查及完成状态。
- 实现 Dashboard 服务端聚合查询。
- 完成快捷新增、空状态和移动端操作体验。
- 增加核心 Repository 与集成测试。

#### M3：AI 秘书与 AI 基础设施（4～6 天）

- 建立统一 AI Gateway、Prompt 版本和结构化输出 Schema。
- 建立 `ai_runs`、简报及来源追踪。
- 完成手动生成、查看、重试和历史简报。
- 加入超时、限流、重复请求保护与用量记录。

#### M4：自媒体生产闭环（5～7 天）

- 完成爆款素材、选题、标签和指标录入。
- 完成素材拆解、二创方案和内容复盘 AI 分析。
- 保存每次分析快照，支持回看。
- 完成端到端核心流程测试。

#### M5：PWA、验收与上线（3～4 天）

- 验证 iOS 和 Android 添加到主屏幕流程。
- 验证缓存策略、断网提示、恢复联网和请求重试。
- 完成权限、RLS、密钥、文件访问和隐私检查。
- 建立种子数据、生产部署、监控和回滚说明。

整体预计 3～4 周完成一个可用的单用户 MVP，实际周期取决于视觉精细度和资讯数据源接入难度。

### 6.4 MVP 验收标准

- 用户可在手机浏览器登录并添加应用到主屏幕。
- 用户可在首页查看、创建并完成今日任务。
- 灵感、素材、选题和复盘数据在刷新或重新登录后保持一致。
- AI 简报和自媒体分析具有明确状态、生成时间和可回看的历史结果。
- 简报中的外部事实有来源；实时性数据有截至时间。
- OpenAI Key 不出现在浏览器包或网络响应中。
- 任意用户无法读取或修改其他用户数据，RLS 自动化测试通过。
- AI 请求失败时，原始表单数据不会丢失，用户可安全重试。
- 核心移动端页面在常见窄屏宽度下无横向溢出，关键操作可单手完成。

### 6.5 MVP 成功指标

- 7 日内至少 5 天打开 Dashboard。
- 每周新增灵感或素材不少于 10 条。
- 至少 50% 的已保存素材完成 AI 分析或进入选题库。
- 每周完成至少 1 次内容复盘。
- AI 任务成功率达到 95% 以上，失败均可恢复。

## 7. 开发前仍需确认的产品决策

这些问题不阻塞当前规划，但应在 M0 结束前确定：

1. 首位用户的登录方式及是否从一开始支持多账号。
2. 每日简报的信息源白名单、语言、生成时间和通知方式。
3. 自媒体首要平台，以及首期需要录入的核心指标。
4. “基金记录”仅记录观察清单，还是需要完整交易流水和收益计算。
5. 身体管理首期最重要的一项记录，避免同时开发全部健康子模块。
6. AI 输入是否允许包含身体和投资数据，以及相应的隐私提示和保留期限。

## 8. 推荐的第二阶段顺序

MVP 稳定后，建议按真实使用频率选择扩展方向，而不是同时铺开：

1. 身体管理的“饮水 + 运动 + 身体数据”轻量闭环。
2. 技能学习的“资源 → 学习记录 → 笔记 → 进度”闭环。
3. 财富管理的“交易流水 → 持仓 → 行业/市场信息 → 风险分析”闭环。
4. 定时简报、通知、外部数据源和更完善的离线能力。

