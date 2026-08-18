# Kiki Personal OS V4 开发设计

> 状态：开发前最终确认稿  
> 版本日期：2026-08-04  
> V4 继承 `PRODUCT_DESIGN_V2.md` 与 `PRODUCT_DESIGN_V3.md` 的产品、数据和 AI 原则，并将其收敛为可执行的首版开发方案。本文重点定义每日使用流程、模块数据关系、MVP 边界和最终开发路线图。

## 1. V4 开发目标

第一版不追求一次实现完整 Personal OS，而是验证一个每天真正会被使用的闭环：

```text
早晨理解今天并确认重点
        ↓
白天完成行动和快速记录
        ↓
晚上补齐数据并完成复盘
        ↓
第二天 AI 使用已确认的上下文继续服务
```

MVP 成功的核心不是模块数量，而是用户连续使用 7 天后，系统能够回答：

- 今天最重要的事情是什么？
- 今天应该完成哪一个自媒体动作？
- 今天计划的运动是否完成？
- 今天做得怎样，明天应该延续什么？
- AI 的建议基于哪些目标、记录和可靠信息？

## 2. 用户每日使用流程设计

### 2.1 每日状态模型

每个用户每天对应一个 `daily_page`，其产品状态如下：

| 状态 | 进入条件 | 退出条件 |
| --- | --- | --- |
| `not_started` | 当天尚未进入工作台 | 用户开始晨间流程或直接进行白天记录 |
| `morning_planning` | 打开晨间流程 | 用户确认今日重点或选择跳过 |
| `active_day` | 晨间流程完成或发生第一条白天记录 | 用户进入晚间流程 |
| `evening_review` | 晚间时间后主动进入，或手动切换 | 提交复盘或选择跳过 |
| `completed` | 已提交当日复盘 | 次日自然开始 |

状态只表达工作流进度，不限制用户操作：用户即使跳过晨间流程，也可以记录任务、灵感、饮水和运动；第二天仍可补写历史复盘。

建议为 `daily_pages` 增加：

- `workflow_state`：上述状态。
- `morning_completed_at`。
- `evening_completed_at`。
- `morning_skipped_at`、`evening_skipped_at`。
- `last_activity_at`。

### 2.2 Morning Workflow

#### 目标

让用户在 2～3 分钟内理解今天并确认最多三个重点，不要求早晨完成大量录入。

#### 触发方式

- 系统预准备：用户设定的晨间时间前 30～60 分钟。
- 用户触发：当天第一次打开首页。
- 手动触发：首页切换至“早晨”模式或点击重新整理。

#### 后台预准备

1. 创建或取得当天 `daily_page`。
2. 读取已授权的 Profile：当前目标、内容定位、每日重点数量和时间约束。
3. 读取有效 Memory：未过期决定、创作原则和已确认经验。
4. 聚合今天任务、昨天未完成事项、今日运动计划、待推进选题和待处理灵感。
5. 检查今日简报是否已经生成；若没有则调度 Daily Brief Agent。
6. Daily Action Agent 生成重点候选、健身提示和自媒体行动候选。
7. 所有建议写入 AI Artifact 或 Approval Request，不直接创建任务和计划。
8. 生成 Dashboard 读取模型，等待用户打开。

#### 用户界面流程

**步骤 1：今日状态，约 10 秒**

- 显示日期、问候和天气入口（天气不属于 MVP 必需数据）。
- 用户可选择精力 1～5、心情 1～5。
- 可填写一句“今天最想完成什么”，也可跳过。

**步骤 2：今日 AI 简报，约 30 秒**

- 首屏显示最多 3 条关键摘要。
- 每条摘要展示所属领域、数据截至时间和来源数量。
- 支持展开完整简报或标记“不感兴趣”。
- 简报失败时展示可靠的任务与计划数据，不阻塞晨间流程。

**步骤 3：确认今日重点，约 60 秒**

- 系统合并展示用户任务与 AI 建议候选。
- 用户最多选择 3 项，可以排序、修改标题或新增手工重点。
- 确认后写入 `daily_focus_items`。
- AI 推荐项只有被接受后，才按需要创建或关联 `tasks`。

**步骤 4：确认两类行动，约 30 秒**

- 健身：展示已有运动计划；没有计划时可选择“今天不安排”或快速创建。
- 自媒体：展示一个最优先动作，例如整理灵感、拆解素材、推进选题或录入复盘。
- 用户可接受、替换或忽略建议。

**步骤 5：进入今日，约 10 秒**

- 显示最终三个重点。
- 写入 `morning_completed_at`，状态变为 `active_day`。
- 用户跳过时写入 `morning_skipped_at`，但不自动接受任何建议。

#### Morning Workflow 验收条件

- 在 AI 不可用时，仍可查看和确认任务与运动计划。
- 重复打开不会重复创建重点、任务或简报。
- 未经确认的 AI 建议不进入业务表。
- 首屏可在移动网络下快速展示已有数据，AI 内容允许异步补齐。
- 用户能查看每条 AI 建议使用的目标、记忆和业务事实。

### 2.3 Day Workflow

#### 目标

白天只支持行动和快速记录，避免用户为了维护系统而增加负担。

#### 首页常驻内容

- 今日三个重点及完成状态。
- 下一个建议行动。
- 全局快捷新增按钮。
- 简化后的饮水进度和运动计划。
- AI 后台任务完成提醒。

#### 快捷新增入口

全局“＋”优先提供：

1. 新增任务。
2. 记录灵感。
3. 收藏爆款素材。
4. 记录饮水。
5. 完成或记录运动。

MVP 要求每个快捷操作在手机端尽量少于三步完成，详细字段可稍后补充。

#### 关键事件流程

**完成重点任务**

1. 用户勾选完成。
2. 若重点关联任务，同时更新任务状态和 `completed_at`。
3. 首页即时更新完成进度。
4. 不立即触发 AI 总结，避免每次操作产生调用。

**记录灵感**

1. 用户输入一句标题或正文，可选链接。
2. 保存为 `media_inspirations(status=inbox)`。
3. 系统使用确定性规则检查相同链接和完全重复内容。
4. AI 标签、扩写和转选题均作为可选后续操作。

**收藏爆款素材**

1. 用户录入链接、平台和标题。
2. 保存原始素材记录。
3. 用户点击“分析”后创建 AI Job。
4. AI 完成后通知用户查看；不自动创建选题。
5. 用户确认二创方案后，才建立 `media_topic` 和实体关系。

**记录饮水**

1. 用户选择常用容量或自定义毫升数。
2. 写入一条 `health_water_logs` 流水。
3. 今日总量由流水求和，不覆盖原始记录。

**完成运动**

1. 从今日计划进入完成记录，或直接新建运动记录。
2. 保存运动类型、时长和可选消耗热量。
3. 回写运动计划状态及 `exercise_log_id`。
4. 热量总计由确定性代码重算。

#### 白天 AI 行为

允许自动：

- 完成用户主动发起的素材分析。
- 对已保存数据执行去重和状态汇总。
- 提醒已经完成的 AI 任务。
- 在用户设置的提醒窗口内提醒临近任务。

需要确认：

- 将素材变成选题。
- 将建议变成任务。
- 保存 Profile 或 Memory。
- 调整今日重点和任务日期。

首版禁止：

- 自动发布内容。
- 自动抓取需要绕过平台限制的数据。
- AI 自动修改健康或财富原始记录。
- 因短期指标自动改变账号定位。

#### Day Workflow 验收条件

- 所有高频记录在窄屏设备上可单手完成。
- AI 任务在后台运行，离开页面后不会丢失状态。
- 网络失败时保留未提交表单草稿，并提供明确重试。
- 快捷记录不会因为 AI 失败而无法保存。

### 2.4 Evening Workflow

#### 目标

让用户在 3～5 分钟内补齐重要数据、理解今天并为明天留下可执行信息。

#### 触发方式

- 到达用户设置的晚间时间后，首页默认进入晚间模式。
- 用户随时可以手动切换。
- 系统仅发送一次可关闭的晚间提醒。

#### 步骤 1：今日完成概览

展示确定性事实：

- 今日重点完成数量。
- 任务完成数量。
- 是否完成计划运动。
- 今日新增灵感、素材及推进选题数量。
- 今日饮水总量。

不使用 AI 计算完成率，不用播放量评价用户当天是否“成功”。

#### 步骤 2：重要数据补录

仅根据用户设置提示缺口：

- 运动计划已完成但没有运动记录。
- 用户启用了饮水目标但今天没有记录。
- 用户发布了内容但尚未建立 Publication。
- 用户明确计划学习但没有学习记录。

每项支持“补录”“今天没有”“以后不提醒”。系统不把缺失数据自动当成零。

#### 步骤 3：极简复盘

默认只要求三个字段：

- 今天做得最好的一件事。
- 今天最大的阻碍。
- 明天最需要延续的一件事。

用户可以展开填写收获、精力、心情和详细说明。

#### 步骤 4：AI 今日总结

用户提交复盘后才触发 Evening Review Agent。输出固定分为：

1. 今日事实：来自任务与记录。
2. 用户判断：来自复盘原文。
3. AI 观察：明确标为推断。
4. 明日建议：最多 3 条。

#### 步骤 5：确认明日延续

- 未完成重点不会自动顺延。
- 用户可将一项未完成工作或 AI 建议加入明日任务。
- AI 提炼的经验进入 Memory Proposal；用户确认后才成为 active Memory。
- 完成后更新 `evening_completed_at`，状态变为 `completed`。

#### Evening Workflow 验收条件

- 不填写敏感健康信息也能完成晚间流程。
- 用户可以跳过任何数据缺口和整个复盘。
- AI 总结清楚区分事实、用户判断和推断。
- 明日任务、记忆和画像更新均必须独立确认。
- 历史日期可以补录，但补录不会再次发送过期通知。

### 2.5 跨日延续规则

- 未完成普通任务保持原计划日期，不自动移动。
- 用户在晚间确认“移至明天”后，更新任务日期并记录变更来源。
- `daily_focus_items` 是当天快照，跨日后不修改历史记录。
- AI 简报按自然日版本化，旧简报不覆盖。
- 到期承诺或 Memory 在新一天 Context Build 时排除。
- 用户当天没有完成复盘时，次日 AI 只使用已有事实，不推测未记录原因。

## 3. 模块之间的数据关联关系

### 3.1 关系设计原则

1. 核心归属关系使用真实外键，例如发布内容必须关联自媒体账号。
2. 高频且稳定的跨模块关系使用专门关联字段或关联表。
3. 低频、未来可能扩展的关系使用统一 `entity_links`，避免给每张表增加大量可空字段。
4. AI Artifact 只引用事实，不成为事实表的唯一数据来源。
5. 删除源实体时保留历史分析所需的最小快照，并将关联标记为失效。

### 3.2 用户根关系

```text
auth.users
   └── profiles
       ├── profile_versions ── profile_goals / attributes / constraints
       ├── memory_items
       ├── daily_pages
       ├── tasks
       ├── media_accounts
       ├── learning_skills
       ├── health_* records
       └── wealth_accounts
```

所有用户业务表直接保存 `user_id`。即使可以通过父表推导，也保留 `user_id`，以简化 RLS 和常用索引；数据库触发器或服务层必须校验父子记录属于同一用户。

### 3.3 每日工作台与业务模块

```text
daily_page
├── daily_focus_items
│   ├── task
│   ├── health_exercise_plan
│   ├── media_topic
│   └── learning_skill
├── daily_review
│   └── ai_artifact(evening_summary)
└── workflow_runs
    ├── workflow_step_runs
    └── approval_requests
```

实现规则：

- `daily_focus_items` 保留 `item_type + source_id`，并保存当日标题快照。
- 关联源被编辑或删除后，历史每日页仍显示当日标题与完成状态。
- Dashboard 聚合当天事实，不把所有模块数据复制进 `daily_pages`。
- `daily_reviews` 可引用晚间 AI Artifact，但手工复盘独立保存。

### 3.4 自媒体生产链

```text
media_account
    ├── media_content_pillars
    ├── media_account_metric_snapshots
    └── media_publications ── publication_metrics ── content_reviews
                                      │                    │
media_inspiration ──► media_topic ─────┘                    └──► memory_proposal
        │                ▲
        │                │
        └── entity_link ─┤
media_viral_material ── analysis ── recreation_plan
        └────────────────────────────► media_topic

media_growth_periods ── media_growth_analyses ── growth_experiments
```

关键关系：

- 一条灵感可以转为多个选题；一个选题也可以参考多个灵感，因此使用关联表而非单字段。
- 一个素材可以产生多个版本的热点分析、视频拆解和二创方案。
- 一个选题可以发布到多个账号和平台，对应多条 `media_publications`。
- 每条发布内容拥有多个时间点的指标快照。
- 内容复盘必须记录使用的是哪个指标快照，避免未来数据变化后无法解释结论。
- 账号成长分析聚合 Publication、指标和内容支柱，但不覆盖单条内容复盘。
- 经用户确认的实验结论可以关联到 `memory_items(type=lesson/hypothesis)`。

建议新增明确关联表：

#### `media_topic_sources`

- `topic_id`。
- `source_type`：`inspiration / viral_material / growth_analysis / manual`。
- `source_id`。
- `relationship`：`origin / reference / evidence`。
- `created_at`。

#### `media_topic_accounts`

- `topic_id`、`account_id`。
- `planned_format`、`priority`、`created_at`。
- 一个选题可计划用于多个账号。

### 3.5 Profile、Memory 与业务事实

```text
business facts ──► AI analysis ──► proposal
       │                                │
       │                         user approves
       │                                ▼
       ├──────────────────────────► memory_item
       │                                │
       └── stable evidence ──► profile_change_proposal
                                        │
                                 user approves
                                        ▼
                                  profile_version
```

约束：

- 业务事实不会因生成 Memory 而被删除或修改。
- Memory 必须通过 `memory_evidence` 引用来源。
- Profile 变更必须创建新版本，不原地篡改历史。
- AI Run 记录本次实际使用的 Profile Version 和 Memory IDs。
- 用户拒绝 Proposal 后保留最小决策记录，用于避免同一建议反复出现。

### 3.6 学习与其他模块

```text
profile_goal(learning)
    └── learning_skill
        ├── learning_tutorials
        ├── learning_sessions
        ├── learning_notes
        └── learning_progress_snapshots
```

跨模块关系：

- 学习技能可以关联上级 `profile_goal`。
- 学习任务通过 `tasks.source_type=learning` 关联技能或教程。
- 学习技能可成为 `daily_focus_item`。
- 学习心得经用户确认后可成为 Memory，但原始 Note 保持独立。
- 自媒体选题可以通过 `entity_links` 引用学习笔记，例如将剪辑教程应用于某条视频。

### 3.7 身体管理内部关系

```text
health_exercise_plan ──► health_exercise_log
health_meal_plan ──────► health_meal ──► health_food_entries
health_posture_record ──► health_posture_photos
health_menstrual_cycle ──► health_cycle_daily_logs

water_logs + food_entries + exercise_logs
                    └──► health_energy_daily_summary
```

跨模块关系：

- 运动计划可以成为今日重点或任务。
- 身体趋势 Agent 读取已授权的健康事实，输出独立 AI Artifact。
- 健康 AI Artifact 不自动生成医疗性质的 Profile 属性或 Memory。
- Daily Review 仅保存当日健康完成摘要，不复制敏感原始记录。

### 3.8 财富管理内部关系

```text
wealth_account
    ├── wealth_fund_transactions ──► wealth_fund
    └── wealth_position_snapshots ──► wealth_fund

wealth_fund ── wealth_fund_industries ── wealth_industry
wealth_fund ── wealth_fund_navs

market_snapshots ──► market_analyses ──► ai_artifact
position_snapshots ─────────────────────► portfolio analysis
```

约束：

- 交易流水是持仓成本和份额的主要事实来源。
- 持仓快照是可重建或手工导入的历史状态，不反向修改交易。
- 市场分析必须关联所依据的数据快照和 `data_as_of`。
- 市场 Agent 不能创建交易；任何行动建议都只是文本产物。

### 3.9 通用跨模块关联表

#### `entity_links`

只用于没有稳定专用关系的跨领域引用。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `source_type` / `source_id` | text / uuid | 来源实体 |
| `target_type` / `target_id` | text / uuid | 目标实体 |
| `relationship` | enum | `derived_from / supports / related_to / applies_to / created_from` |
| `metadata` | jsonb nullable | 最小扩展信息 |
| `created_by` | enum | `user / system / ai_approved` |
| `created_at` / `deleted_at` | timestamptz | 审计字段 |

约束与使用规范：

- 服务层校验 source 与 target 均属于当前用户。
- 不用 `entity_links` 替代强约束关系，例如 Publication → Account 必须是真实外键。
- 列表查询不依赖复杂的跨类型多次扫描；高频关系升级为专用关联表。

### 3.10 AI 与工作流关系

```text
workflow_run
   └── workflow_step_run
       └── ai_job
           └── ai_run
               └── ai_artifact
                   ├── artifact_sources
                   ├── ai_feedback
                   └── approval_request
                           └── approved business entity
```

推荐为 AI 相关表补充：

- `profile_version_id`：调用时使用的画像版本。
- `memory_ids`：实际注入的记忆列表，详细选择原因仍保存在检索日志。
- `business_data_as_of`：业务数据截至时间。
- `output_schema_version`：结构化输出版本。

## 4. MVP 第一版本明确范围

### 4.1 MVP 产品定义

MVP 是一个可安装到手机主屏幕、支持单用户真实连续使用的 Personal OS。它必须打通：

1. 登录并建立最小个人画像。
2. 早晨确认重点。
3. 白天完成任务、收集自媒体资料、记录饮水和运动。
4. 查看有来源的 AI 简报，并按需分析素材。
5. 晚上补录并完成复盘。
6. 将用户明确确认的经验保存为 Memory。

### 4.2 必须开发：基础平台

- Next.js + Tailwind CSS 的手机优先应用壳。
- Supabase Auth，首期一种稳定登录方式即可。
- PWA Manifest、图标、安装体验、离线提示和静态应用壳缓存。
- Supabase PostgreSQL 数据迁移与所有用户表 RLS。
- 服务端环境变量和 OpenAI API 安全调用。
- 通用表单验证、错误边界、加载状态和 Toast。
- AI Job/Run/Artifact 最小状态链路。
- 结构化日志和基础错误监控接口。

### 4.3 必须开发：Daily OS

- 同一路由下的 Morning、Day、Evening 三种 Dashboard 状态。
- `daily_pages`、`daily_focus_items` 和 `daily_reviews`。
- 今日任务新增、编辑、完成、取消和日期筛选。
- 晨间确认最多三个重点。
- 晚间确定性完成概览、极简复盘和明日延续确认。
- 快捷新增：任务、灵感、素材、饮水和运动。
- 历史每日页查看。
- AI 不可用时的完整降级体验。

### 4.4 必须开发：AI 秘书

- 每日简报：首期支持有限且明确的资讯源。
- 简报生成、失败重试、历史列表、详情和来源展示。
- 数据截至时间和生成时间。
- Daily Action Agent：生成今日重点和自媒体行动候选。
- Evening Review Agent：用户提交复盘后生成结构化总结。
- 所有 AI 结果区分事实、推断和建议。
- AI 建议写任务、选题或 Memory 前必须确认。

### 4.5 必须开发：自媒体核心闭环

- 每日灵感增删改查、完成/归档、转选题。
- 爆款素材手工录入链接、标题、平台和内容快照。
- AI 热点分析、视频文本拆解和二创方案；首期不负责自动下载视频。
- 选题库增删改查、状态和基础标签。
- 发布内容手工录入。
- 发布指标手工快照。
- 单条内容复盘与 AI 优化建议。
- 一个自媒体账号的基础资料，所有 Publication 归属该账号。

### 4.6 必须开发：Profile 与 Memory Lite

#### Profile Lite

- Onboarding 收集：时区、三个当前目标、内容定位、目标受众、输出偏好、早晚时间。
- 画像总览与手工编辑。
- 单一 active Profile Version。
- Agent 使用最小 Profile Context，并显示建议依据。

#### Memory Lite

- 用户手工新增、编辑、停用和忘记 Memory。
- AI 可从晚间复盘产生 Memory Proposal。
- 用户确认后激活。
- 首期使用领域、类型、关键词和重要性检索；暂不依赖向量召回。
- AI 结果可查看实际使用的 Memory。

### 4.7 必须开发：身体管理 Lite

为了支撑 Dashboard 的健身计划和每日记录，首期只开发：

- 饮水流水和今日饮水总量。
- 运动计划、运动记录和完成关联。
- 体重记录作为可选的基础身体指标。
- 首页与晚间流程的数据入口。

这些功能使用确定性计算，不调用身体趋势 AI。

### 4.8 MVP 可选项

只有在所有必须项通过验收且周期允许时加入：

- 教程收藏与单次学习记录的极简版本。
- 自媒体账号手工日/周指标快照。
- 一种简易账号周趋势图，不包含 AI 增长归因。
- Web Push 提醒；如果 iOS/权限适配影响周期，则首版仅使用站内提醒。
- 饮食的纯手工热量记录，不做图片识别。

### 4.9 明确暂缓：V1.1～V1.2

#### 自媒体成长

- 多账号、多平台对比。
- 完整账号漏斗、内容支柱归因。
- Account Growth Agent 周报/月报。
- 增长实验管理和实验结论沉淀。
- 平台 API 自动同步及自动抓取数据。

#### Profile 与 Memory

- AI 自动推断画像变更。
- 多版本画像恢复和复杂变更对比。
- pgvector、语义检索和记忆自动聚类。
- 记忆冲突自动发现和复杂关系图谱。
- 跨领域长期模式主动挖掘。

#### Daily Workflow

- 完整后台定时 Orchestrator。
- 白天复杂事件自动触发。
- 多渠道通知和可视化工作流编辑器。
- 月度自动规划和跨模块自动排期。

MVP 可以在用户打开应用时懒触发晨间准备；待验证活跃度后再引入完整定时基础设施。

### 4.10 明确暂缓：后续大版本

#### 技能学习完整模块

- 多技能、教程收藏、学习进度快照、学习统计和 AI 学习规划。

#### 身体管理完整模块

- 三围、体态照片、生理期、详细饮食、营养素和热量目标。
- 身体趋势 Agent、体态照片 AI 对比和穿戴设备同步。

#### 财富管理完整模块

- 基金交易流水、持仓成本、净值、行业分类和市场快照。
- 市场 Agent、组合风险与行业暴露分析。
- 券商或基金平台自动同步。

#### 其他

- 自动发布内容、团队协作和多用户共享。
- 支付订阅、运营后台和插件市场。
- 原生 App、桌面客户端和复杂离线冲突同步。

### 4.11 MVP 不做但需预留的结构

- 所有业务表保留 `user_id` 和 RLS，不因首期单用户而省略。
- Publication 必须关联 `account_id`，即使首期只有一个账号。
- AI 表保留 `agent_type`、`prompt_version` 和 Schema Version。
- Memory 保留敏感等级和 AI Access 字段。
- Profile 保留 Version 表，但首期界面只维护一个 active 版本。
- 数据库迁移按领域拆分，不提前创建所有后续表。
- 页面导航仅显示已实现模块，未实现路由不放空白占位页。

## 5. MVP 导航与首发路由

### 5.1 底部导航

1. 首页 `/`
2. AI 秘书 `/assistant`
3. 自媒体 `/media`
4. 身体 `/health`
5. 更多 `/more`

“更多”首期只显示 Profile、Memory、设置；学习和财富显示在产品路线图中，但不提供无法使用的空入口。

### 5.2 MVP 路由白名单

#### 系统

- `/login`
- `/auth/callback`
- `/onboarding`
- `/offline`
- `/settings`
- `/settings/profile`
- `/settings/dashboard`
- `/settings/ai`
- `/settings/privacy`

#### 每日工作台

- `/`
- `/day/[date]`
- `/day/[date]/review`
- `/tasks`
- `/tasks/new`
- `/tasks/[id]`
- `/tasks/[id]/edit`

#### AI 秘书

- `/assistant`
- `/assistant/briefings`
- `/assistant/briefings/[id]`
- `/assistant/runs/[id]`
- `/assistant/preferences`

#### 自媒体

- `/media`
- `/media/inspirations`
- `/media/inspirations/new`
- `/media/inspirations/[id]`
- `/media/inspirations/[id]/edit`
- `/media/materials`
- `/media/materials/new`
- `/media/materials/[id]`
- `/media/materials/[id]/analysis`
- `/media/materials/[id]/recreate`
- `/media/topics`
- `/media/topics/new`
- `/media/topics/[id]`
- `/media/topics/[id]/edit`
- `/media/publications`
- `/media/publications/new`
- `/media/publications/[id]`
- `/media/publications/[id]/metrics/new`
- `/media/reviews`
- `/media/reviews/new`
- `/media/reviews/[id]`

#### 身体 Lite

- `/health`
- `/health/water`
- `/health/water/new`
- `/health/exercise`
- `/health/exercise/plans/new`
- `/health/exercise/logs/new`
- `/health/measurements`
- `/health/measurements/new`

#### Profile、Memory 与确认

- `/profile`
- `/profile/edit`
- `/profile/goals`
- `/profile/goals/new`
- `/profile/goals/[id]`
- `/profile/content-identity`
- `/memory`
- `/memory/new`
- `/memory/[id]`
- `/memory/[id]/edit`
- `/memory/proposals`
- `/approvals`
- `/approvals/[id]`
- `/more`

## 6. 最终开发路线图

路线图按一名全栈开发者为主要执行者估算，目标为 7～9 周得到可真实使用的首版。若多人并行，可缩短日历时间，但阶段验收顺序不变。

### Phase 0：需求冻结与原型验收

预计：3～4 个工作日。

交付：

- Morning、Day、Evening 五个关键移动端低保真流程。
- Dashboard 信息优先级和底部导航。
- 自媒体“灵感 → 素材 → 选题 → 发布 → 复盘”流程原型。
- Profile Onboarding 问题清单。
- AI 简报首期信息源白名单。
- MVP 路由白名单及验收用例冻结。

退出条件：

- 用户可以只看原型理解一天如何使用产品。
- 所有 MVP 页面都有明确的空、加载、错误和成功状态。
- 没有未确认的首期数据源和登录方式。

### Phase 1：工程底座与安全

预计：5～6 个工作日。

交付：

- Next.js、Tailwind CSS、TypeScript 与基础质量工具。
- Supabase 本地/远程环境、Auth、迁移和 RLS 测试。
- PWA Manifest、图标、离线页和应用壳。
- 服务端 OpenAI Gateway 和环境变量校验。
- 移动端布局、导航、表单、错误边界和加载骨架。
- 基础日志与错误监控接入点。

退出条件：

- 用户可登录、退出并完成受保护路由访问。
- RLS 测试证明用户数据隔离。
- OpenAI Key 不进入客户端构建与响应。
- 应用可添加到主屏幕并在离线时显示正确降级页。

### Phase 2：Profile Lite、任务与 Daily OS

预计：6～8 个工作日。

交付：

- Onboarding、Profile Lite 和目标。
- 任务增删改查。
- `daily_pages`、今日重点和历史每日页。
- Morning / Day / Evening Dashboard 状态。
- 晨间确认与晚间手工复盘，不含 AI 总结。
- 快捷新增框架。

退出条件：

- 用户可完整经历“早晨选重点—白天完成—晚上复盘”。
- 刷新、重新登录和跨日后数据正确。
- AI 完全关闭时 Daily OS 仍可使用。

### Phase 3：自媒体事实数据闭环

预计：7～9 个工作日。

交付：

- 单账号基础信息。
- 灵感、素材、选题、Publication 和指标快照。
- 单条内容手工复盘。
- 内容状态流转和核心实体关系。
- Dashboard 自媒体行动入口。

退出条件：

- 一条灵感可转为选题、登记为发布内容并完成复盘。
- 一个选题可以引用多个灵感或素材。
- 指标以历史快照保存，复盘关联明确快照。

### Phase 4：AI 秘书与自媒体 AI

预计：6～8 个工作日。

交付：

- AI Job / Run / Artifact 状态链路。
- 每日简报、来源展示、历史和重试。
- 热点分析、视频文本拆解和二创方案。
- Daily Action Agent。
- AI 结构化输出校验、幂等和调用用量记录。

退出条件：

- AI 失败不影响原始素材保存。
- 同一输入重试不会产生不可控重复数据。
- 简报事实具有来源和截至时间。
- 二创方案只有确认后才能创建选题。

### Phase 5：身体 Lite、Evening AI 与 Memory Lite

预计：5～7 个工作日。

交付：

- 饮水、运动计划、运动记录和体重记录。
- 晚间数据缺口提示。
- Evening Review Agent。
- Memory 手工管理、复盘候选和确认流程。
- Approval Center 最小版本。
- AI 建议依据和 Context 使用记录。

退出条件：

- 用户可拒绝或编辑任意 AI 写入建议。
- AI 推断不会直接变成 active Memory。
- 忘记一条 Memory 后不再用于新生成结果。
- 晚间总结正确区分事实、用户判断和推断。

### Phase 6：PWA 完善、测试与上线

预计：5～7 个工作日。

交付：

- iOS Safari 与 Android Chrome 的主屏幕安装验证。
- 表单草稿、网络失败重试和重复提交保护。
- 核心流程 E2E 测试。
- RLS、文件访问、AI 密钥和敏感日志安全检查。
- 性能、移动端适配和无障碍基础检查。
- 生产环境、数据库备份、监控和回滚说明。
- 种子数据与首位用户使用指南。

退出条件：

- 关键路径在目标手机上通过验收。
- 高优先级缺陷清零。
- 所有核心写入具有错误恢复或明确重试方案。
- 生产环境可观测 AI 失败、耗时和成本。

### Phase 7：封闭试用与 MVP 验证

预计：至少连续 14 天，不与开发完成混为同一里程碑。

重点验证：

- 早晨流程完成率。
- 晚间复盘完成率。
- 每周灵感、素材和复盘数量。
- AI 建议接受、编辑和拒绝比例。
- 用户是否理解 AI 建议依据。
- 哪些入口最常用，哪些模块实际无人使用。

进入 V1.1 条件：

- 核心数据无严重丢失或隐私问题。
- 用户至少 7 天中的 5 天打开 Dashboard。
- AI 任务成功率达到 95% 左右且失败可恢复。
- 已有足够账号指标数据支持成长分析，而不是仅为了路线图提前开发。

## 7. 上线后路线图

### V1.1：账号成长与学习 Lite

- 自媒体账号指标趋势。
- 周期统计和内容支柱。
- Account Growth Agent 周报。
- 增长实验。
- 教程收藏、学习记录和基础进度。

### V1.2：完整自动化与 Memory Intelligence

- 后台定时 Morning / Evening Workflow。
- 白天事件触发和可配置通知。
- Profile Change Proposal。
- Memory 混合检索、证据、冲突和复核。
- 工作流历史与 AI 用量中心。

### V2.0：身体管理完整版

- 三围、体态照片、生理期、饮食和完整热量记录。
- 身体趋势分析。
- 严格授权下的体态照片对比。

### V2.1：财富管理

- 基金账户、交易流水、持仓和净值。
- 行业分类与暴露。
- 市场数据源和市场分析记录。
- 有来源、有截至时间的市场 Agent。

每个后续版本都以实际使用数据决定是否启动，不以模块清单完整为唯一目标。

## 8. MVP 最终验收清单

### 每日流程

- [ ] 用户能在 3 分钟内完成晨间确认。
- [ ] 白天五类快捷记录在移动端流畅可用。
- [ ] 用户能在 5 分钟内完成晚间补录和复盘。
- [ ] 未完成任务不会未经确认自动移动到明天。
- [ ] AI 不可用时每日流程仍可完成。

### 数据关系

- [ ] 灵感、素材、选题、发布和复盘之间可追溯。
- [ ] 每条发布内容属于明确账号。
- [ ] 内容复盘关联明确的指标快照。
- [ ] Profile、Memory 和业务事实分开存储。
- [ ] AI 产物记录输入范围、来源和版本。

### AI 与信任

- [ ] 简报事实显示来源与截至时间。
- [ ] AI 输出区分事实、推断和建议。
- [ ] 所有 AI 写入操作经过用户确认。
- [ ] 用户能查看 AI 使用的 Profile 和 Memory。
- [ ] 被停用或遗忘的 Memory 不再参与生成。

### 安全与 PWA

- [ ] RLS 跨用户隔离测试通过。
- [ ] OpenAI 和 Supabase 服务端密钥不暴露。
- [ ] 应用可安装到目标手机主屏幕。
- [ ] 弱网、断网和重复提交具有明确处理。
- [ ] 敏感数据不出现在非必要日志中。

## 9. 开发启动前最后决策

以下项目确认后即可进入 Phase 0/Phase 1：

- [ ] 登录方式：建议首期使用邮箱验证码或魔法链接。
- [ ] 首个自媒体平台及其手工指标字段。
- [ ] 每日简报首期信息源白名单。
- [ ] Morning / Evening 默认时间。
- [ ] Profile Onboarding 的最少问题。
- [ ] OpenAI 日调用成本上限。
- [ ] 首发部署平台和 Supabase 项目环境。
- [ ] 是否将“学习 Lite”从可选项提升为 MVP 必须项；默认不提升。

