# Kiki Personal OS 产品设计 V3

> 状态：开发前确认稿  
> 版本日期：2026-08-04  
> V3 继承 `PRODUCT_DESIGN_V2.md` 中已确认的技术架构、长期业务数据库、Dashboard、AI Agent 和完整路由，并新增个人画像层、AI 记忆层、自媒体账号成长分析及 AI Daily Workflow。若 V3 与 V2 冲突，以 V3 为准。

## 1. V3 产品升级目标

V2 解决了“记录什么、每天如何使用、AI 在哪里工作”的问题。V3 进一步解决四个长期问题：

1. AI 如何理解用户未来想去哪里，而不只理解今天记录了什么。
2. AI 如何记住重要决策、有效经验和内容风格，同时允许用户查看、修改和遗忘。
3. 自媒体分析如何从单条作品升级到账号增长、内容策略和长期实验。
4. AI 如何在早晨、白天和晚上持续工作，而不是等待用户逐个点击功能。

V3 增加以下产品层次：

```text
用户交互层
├── 每日 Dashboard
├── 各业务模块
└── Profile / Memory 控制中心

AI 工作层
├── Daily Workflow Orchestrator
├── 专业 Agent
├── Context Builder
└── Approval Center

长期上下文层
├── Personal Profile：目标、方向、稳定偏好、约束
├── AI Memory：决策、经验、风格、教训、承诺
└── 业务事实：任务、内容、健康、学习、财富数据
```

三类长期数据必须严格区分：

- Profile 回答“我是谁、我要什么、我偏好怎样做”。
- Memory 回答“过去发生过什么、我做过什么决定、哪些经验有效”。
- Business Facts 回答“实际记录的数据是什么”。

AI 只能读取授权范围内的三层上下文，不能把模型推测直接当作事实。

## 2. Personal Profile 个人画像层

### 2.1 画像目标

Personal Profile 为所有 Agent 提供稳定、可控、可解释的长期上下文，使不同模块的建议保持一致。例如：

- 用户的年度目标是建立稳定的自媒体账号，而不是短期追逐所有热点。
- 用户偏好手机端快速记录、晚上集中整理。
- 用户当前重点学习剪辑，AI 不应每天推荐完全无关的技能。
- 用户投资风险偏好较保守，市场分析应优先解释风险暴露。
- 用户不允许体态照片用于通用 AI 个性化。

### 2.2 画像分层

#### A. 基础身份

- 显示名称、语言、时区。
- 职业阶段、所在行业、常用工作时间。
- 当前主要角色，例如创作者、学习者、投资记录者。

#### B. 长期愿景

- 1～3 年方向。
- 年度目标。
- 当前季度主题。
- 各目标的成功标准、截止时间和优先级。

#### C. 领域画像

- 自媒体：账号定位、目标受众、内容赛道、平台、变现方向。
- 学习：当前技能水平、目标技能、每周可投入时间。
- 身体：用户自行设定的目标和习惯偏好，不保存 AI 医疗判断。
- 财富：分析关注点、风险承受偏好、投资周期；不替代合规风险测评。

#### D. 工作偏好

- 喜欢简短还是详细的 AI 输出。
- 偏好先给结论还是先给依据。
- 每日可接受的重点任务数量。
- 早晚工作节奏、提醒时段和免打扰时间。

#### E. 边界与约束

- 时间、预算、设备、隐私和健康方面的现实约束。
- 禁止 AI 使用的数据类别。
- 不希望被推荐的内容或行动。

### 2.3 数据库设计

#### `profile_versions`

画像总版本。每次重要更新形成新版本，保证历史可追溯。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `version` | integer | 用户画像版本号 |
| `status` | enum | `draft / active / archived` |
| `change_summary` | text nullable | 本次变化摘要 |
| `created_by` | enum | `user / ai_proposed / system` |
| `confirmed_at` | timestamptz nullable | 用户确认时间 |
| `created_at` | timestamptz | 创建时间 |
| 唯一约束 |  | `(user_id, version)`；同一用户仅一个 active 版本 |

#### `profile_attributes`

保存可解释的画像属性，避免将整个画像封装成无法查询的大 JSON。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` / `profile_version_id` | uuid | 归属 |
| `namespace` | enum | `identity / work / media / learning / health / wealth / communication / privacy` |
| `key` | text | 稳定属性键，例如 `communication.detail_level` |
| `value` | jsonb | 标量、数组或结构化值 |
| `source_type` | enum | `user_declared / behavior_inferred / imported` |
| `confidence` | numeric nullable | 仅推断属性使用 |
| `sensitivity` | enum | `normal / personal / sensitive / highly_sensitive` |
| `ai_access` | enum | `never / explicit_only / allowed` |
| `valid_from` / `valid_until` | timestamptz nullable | 有效期 |
| `created_at` / `updated_at` | timestamptz | 审计时间 |
| 唯一约束 |  | `(profile_version_id, namespace, key)` |

#### `profile_goals`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` / `profile_version_id` | uuid | 归属 |
| `domain` | enum | `life / media / learning / health / wealth / work` |
| `title` | text | 目标 |
| `description` | text nullable | 目标背景 |
| `horizon` | enum | `long_term / yearly / quarterly / monthly` |
| `priority` | smallint | 1～5 |
| `success_criteria` | jsonb | 可验证标准 |
| `target_date` | date nullable | 目标日期 |
| `status` | enum | `draft / active / paused / achieved / abandoned` |
| `parent_goal_id` | uuid nullable | 目标拆解层级 |
| `created_at` / `updated_at` | timestamptz | 审计时间 |

#### `profile_constraints`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` / `profile_version_id` | uuid | 归属 |
| `domain` | enum | 约束领域 |
| `constraint_type` | enum | `time / budget / privacy / health / device / preference / other` |
| `description` | text | 约束内容 |
| `severity` | enum | `soft / strong / absolute` |
| `valid_until` | date nullable | 临时约束截止日期 |
| `created_at` / `updated_at` | timestamptz | 审计时间 |

#### `profile_content_identity`

自媒体账号的个人定位，可由多个账号复用，也可被账号级定位覆盖。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` / `profile_version_id` | uuid | 归属 |
| `positioning_statement` | text nullable | 一句话定位 |
| `target_audiences` | jsonb | 目标人群及需求 |
| `content_pillars` | jsonb | 内容支柱与比例 |
| `value_proposition` | text nullable | 为受众提供的价值 |
| `tone_keywords` | text[] | 风格关键词 |
| `avoid_topics` | text[] | 不做的主题 |
| `monetization_directions` | text[] | 变现方向 |
| `updated_at` | timestamptz | 更新时间 |

#### `profile_change_proposals`

AI 根据长期行为发现画像可能变化时，只能提交变更建议。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `target_namespace` / `target_key` | text | 拟更新属性 |
| `current_value` / `proposed_value` | jsonb | 当前值与建议值 |
| `reason` | text | 建议原因 |
| `evidence_refs` | jsonb | 证据记录引用 |
| `status` | enum | `pending / accepted / rejected / expired` |
| `reviewed_at` | timestamptz nullable | 用户处理时间 |
| `created_at` | timestamptz | 创建时间 |

### 2.4 画像生成与更新流程

#### 首次建立

1. Onboarding 收集最少信息：当前重点、三个目标、内容方向、每日节奏、隐私授权。
2. 系统生成画像草稿和一页摘要。
3. 用户逐项确认后激活 V1。
4. 未回答项保持未知，AI 不自行补全。

#### 持续更新

- 用户可随时直接编辑自己声明的信息。
- 系统可根据 30 天以上的稳定行为提出画像变更建议。
- AI 推断必须显示证据，例如“过去 30 天 80% 的选题集中在 AI 工具”。
- 用户接受后创建新的 Profile Version；拒绝后记录原因，避免反复建议。
- 临时状态不进入画像，例如一天情绪低落、一次任务延误或单条视频爆发。

### 2.5 Profile Context Pack

Agent 不直接加载全部画像，而由 Context Builder 按任务生成最小上下文包：

| Agent | 默认可读取画像 |
| --- | --- |
| 每日简报 | 关注主题、语言、摘要长度、信息源偏好 |
| 自媒体 Agent | 内容定位、目标受众、平台、内容支柱、风格边界 |
| 学习 Agent | 技能目标、当前水平、时间约束 |
| 身体趋势 Agent | 用户明确授权的目标、习惯与输出偏好 |
| 市场 Agent | 风险偏好、关注行业、投资周期，不读取身体或内容数据 |
| 每日行动 Agent | 当前目标、今日时间约束、重点领域、任务数量偏好 |

每次 Context Pack 记录使用了哪些画像字段，便于用户审计 AI 为什么给出某项建议。

## 3. AI Memory 记忆层

### 3.1 记忆目标

AI Memory 保存具有长期复用价值的信息：

- 用户作出的重要决定及原因。
- 被实践证明有效或无效的方法。
- 内容表达风格、标题偏好和创作原则。
- 项目或账号的重要上下文。
- 用户明确要求 AI 记住的事项。
- 需要未来回访的承诺和待验证假设。

Memory 不是聊天记录仓库，也不是所有业务数据的副本。

### 3.2 记忆类型

| 类型 | 示例 | 默认保存策略 |
| --- | --- | --- |
| `decision` | 决定未来 30 天聚焦光伏职场内容 | 用户确认后长期保存 |
| `lesson` | 教程型视频开头过长会明显降低完播率 | 有复盘证据后建议保存 |
| `experience` | 晚上集中写脚本比白天碎片时间效率高 | 多次出现后建议保存 |
| `preference` | 标题偏好直接、克制，不使用夸张承诺 | 可由用户直接保存 |
| `style_rule` | 文案先给场景，再解释方法，结尾给行动 | 用户确认后用于内容 Agent |
| `principle` | 不为了热点偏离账号长期定位 | 高优先级长期记忆 |
| `commitment` | 本月发布 8 条视频 | 有到期时间，到期后归档 |
| `hypothesis` | 光伏求职选题可能比行业新闻更适合账号 | 需要实验验证，不能当事实 |
| `fact` | 当前只有手机和领夹麦克风可拍摄 | 有效期或人工更新 |

### 3.3 数据库设计

#### `memory_items`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `memory_type` | enum | 上述九类记忆 |
| `domain` | enum | `global / media / learning / health / wealth / work` |
| `title` | text | 可读标题 |
| `content` | text | 标准化记忆内容 |
| `structured_data` | jsonb nullable | 决策理由、适用条件等 |
| `importance` | smallint | 1～5 |
| `confidence` | numeric | 0～1；用户声明通常为 1 |
| `status` | enum | `proposed / active / superseded / expired / forgotten` |
| `origin` | enum | `user_explicit / ai_extracted / workflow / imported` |
| `sensitivity` | enum | `normal / personal / sensitive / highly_sensitive` |
| `ai_access` | enum | `never / explicit_only / allowed` |
| `valid_from` / `valid_until` | timestamptz nullable | 有效时间 |
| `last_used_at` | timestamptz nullable | 最近被检索时间 |
| `review_after` | timestamptz nullable | 复核时间 |
| `supersedes_id` | uuid nullable | 替代的旧记忆 |
| `created_at` / `updated_at` | timestamptz | 审计时间 |

#### `memory_evidence`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` / `memory_id` | uuid | 归属 |
| `source_type` | enum | `review / publication / task / note / conversation / profile / manual` |
| `source_id` | uuid nullable | 内部记录 ID |
| `excerpt` | text nullable | 最小证据摘要 |
| `occurred_at` | timestamptz nullable | 证据发生时间 |
| `created_at` | timestamptz | 创建时间 |

#### `memory_embeddings`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `memory_id` | uuid PK | 对应记忆 |
| `embedding` | vector | pgvector 向量 |
| `embedding_model` | text | 模型版本 |
| `content_hash` | text | 内容变化检测 |
| `updated_at` | timestamptz | 更新时间 |

#### `memory_links`

- `from_memory_id`、`to_memory_id`。
- `relationship`：`supports / contradicts / refines / caused_by / applies_to`。
- 用于发现经验冲突、决策链和风格规则之间的关系。

#### `memory_retrieval_logs`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` / `ai_run_id` | uuid | 归属 |
| `query_summary` | text | 不保存不必要的完整 Prompt |
| `candidate_memory_ids` | uuid[] | 初步候选 |
| `used_memory_ids` | uuid[] | 实际注入上下文的记忆 |
| `reason` | jsonb | 相关性和选择理由 |
| `created_at` | timestamptz | 检索时间 |

#### `memory_feedback`

- `id`、`user_id`、`memory_id`。
- `feedback_type`：`correct / incorrect / outdated / too_personal / not_useful`。
- `comment`、`created_at`。

### 3.4 记忆写入策略

#### 可以自动保存为 active

- 用户明确说“记住这个”“以后都按这个风格”。
- 系统生成的确定性状态，例如用户接受某个画像版本；仍需标明来源。

#### 只能作为 proposed 候选

- AI 从复盘、笔记或多次行为中提炼的经验。
- AI 推断的内容风格或长期偏好。
- 一次实验得到的初步结论。
- 对用户动机、能力和价值观的判断。

#### 默认禁止进入记忆

- 密码、API Key、身份证件和支付凭据。
- 详细生理期、身体照片及高敏感健康原文。
- 临时情绪、无长期价值的聊天内容。
- 未经授权的第三方隐私数据。
- 模型自己生成但没有证据的结论。

### 3.5 记忆检索流程

```text
当前任务
  ↓
按 Agent 限定 domain、类型、敏感级别
  ↓
结构化过滤：状态、有效期、授权、重要性
  ↓
关键词 + 向量混合召回
  ↓
相关性、时间衰减、证据质量排序
  ↓
冲突检测与去重
  ↓
生成最小 Memory Pack
  ↓
记录实际使用的 memory_id
```

推荐排序因素：任务相关性、用户明确程度、重要性、证据数量、最近验证时间。`principle` 和未过期的 `decision` 不应仅因时间久而快速衰减。

### 3.6 冲突、更新和遗忘

- 新决定与旧决定冲突时，不直接改写旧记录；新记忆通过 `supersedes_id` 替代旧记忆。
- 经验出现相反证据时建立 `contradicts` 关系，并提示用户重新判断。
- 到期承诺自动转 `expired`，不继续用于行动建议。
- 用户点击“忘记”后设置为 `forgotten`，从检索和上下文中立即排除。
- 用户可选择彻底删除；彻底删除同时移除向量、证据摘录和检索引用中的可恢复内容。
- 高敏感记忆默认不生成 embedding，除非用户单独授权。

### 3.7 记忆透明度

每个使用了记忆的 AI 结果都提供“为什么这样建议”入口，展示：

- 本次使用的 Profile 条目。
- 本次使用的 Memory 条目。
- 使用的业务数据范围和截至时间。
- 用户可对单条记忆执行纠正、停用、忘记或禁止某类 Agent 使用。

## 4. 自媒体账号成长分析模块

### 4.1 模块目标

单条内容复盘回答“这条作品发生了什么”。账号成长分析回答：

- 账号是否在稳定增长，增长来自哪些内容和受众行为。
- 哪些内容支柱正在建立账号认知。
- 发布频率、选题、形式和时长与增长有什么关系。
- 当前增长瓶颈位于曝光、点击、观看、互动还是关注转化。
- 过去的创作实验是否有效，下一周期应该验证什么。

### 4.2 数据模型

#### `media_accounts`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `platform` | text | 平台 |
| `account_name` | text | 账号名称 |
| `account_handle` | text nullable | 账号标识 |
| `profile_url` | text nullable | 主页链接 |
| `niche` | text nullable | 账号赛道 |
| `positioning_statement` | text nullable | 账号级定位，可覆盖 Profile 默认定位 |
| `target_audience` | jsonb nullable | 账号目标受众 |
| `started_at` | date nullable | 运营开始日期 |
| `status` | enum | `active / paused / archived` |
| `data_source` | enum | `manual / api / imported` |
| 审计字段 | timestamptz | 创建、更新、软删除 |

`media_publications` 增加必填 `account_id`，确保每条发布内容归属具体账号。

#### `media_account_metric_snapshots`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` / `account_id` | uuid | 归属 |
| `snapshot_date` | date | 数据日期 |
| `followers` | bigint nullable | 粉丝数 |
| `following` | bigint nullable | 关注数 |
| `total_likes` | bigint nullable | 平台累计获赞 |
| `profile_views` | bigint nullable | 主页访问 |
| `impressions` | bigint nullable | 曝光 |
| `content_views` | bigint nullable | 内容播放/阅读 |
| `engagements` | bigint nullable | 互动量 |
| `new_followers` / `unfollows` | bigint nullable | 当期新增与取关 |
| `posts_published` | integer nullable | 当期发布量 |
| `extra_metrics` | jsonb | 平台特有指标 |
| `source` | enum | `manual / api / import` |
| `captured_at` | timestamptz | 记录时间 |
| 唯一约束 |  | `(account_id, snapshot_date, source)` |

#### `media_account_goals`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` / `account_id` | uuid | 归属 |
| `goal_type` | enum | `followers / output / views / engagement / conversion / custom` |
| `target_value` | numeric nullable | 目标值 |
| `start_date` / `target_date` | date | 周期 |
| `baseline_value` | numeric nullable | 起始值 |
| `status` | enum | `active / achieved / missed / cancelled` |
| `notes` | text nullable | 说明 |

#### `media_content_pillars`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` / `account_id` | uuid | 归属 |
| `name` | text | 内容支柱名称 |
| `description` | text nullable | 定义 |
| `target_share_percent` | numeric nullable | 计划内容比例 |
| `status` | enum | `testing / active / paused / retired` |
| `created_at` / `updated_at` | timestamptz | 审计时间 |

增加 `media_publication_pillars(publication_id, pillar_id, weight_percent)`，允许一条内容属于多个内容支柱。

#### `media_growth_periods`

保存周、月、季度的确定性指标汇总。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` / `account_id` | uuid | 归属 |
| `period_type` | enum | `week / month / quarter / custom` |
| `period_start` / `period_end` | date | 周期 |
| `followers_start` / `followers_end` | bigint nullable | 粉丝变化 |
| `followers_net_growth` | bigint nullable | 净增粉 |
| `publications_count` | integer | 发布量 |
| `total_views` / `total_engagements` | bigint nullable | 周期总量 |
| `median_views` | numeric nullable | 中位播放，降低爆款干扰 |
| `engagement_rate` | numeric nullable | 按平台规则计算 |
| `follow_conversion_rate` | numeric nullable | 关注转化率 |
| `calculation_version` | text | 计算规则版本 |
| `calculated_at` | timestamptz | 计算时间 |
| 唯一约束 |  | `(account_id, period_type, period_start, period_end)` |

#### `media_growth_analyses`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` / `account_id` | uuid | 归属 |
| `growth_period_id` | uuid | 依据的统计周期 |
| `analysis_type` | enum | `weekly / monthly / milestone / custom` |
| `baseline_period_id` | uuid nullable | 对比周期 |
| `ai_artifact_id` | uuid nullable | AI 成长分析 |
| `user_conclusion` | text nullable | 用户最终判断 |
| `created_at` / `updated_at` | timestamptz | 审计时间 |

#### `media_growth_experiments`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` / `account_id` | uuid | 归属 |
| `title` | text | 实验名称 |
| `hypothesis` | text | 可验证假设 |
| `variable` | text | 本次只改变的主要变量 |
| `success_metric` | text | 成功指标 |
| `baseline_value` / `target_value` | numeric nullable | 基线与目标 |
| `start_date` / `end_date` | date | 实验周期 |
| `status` | enum | `draft / running / completed / cancelled` |
| `result` | jsonb nullable | 确定性统计结果 |
| `conclusion` | text nullable | 用户确认的结论 |
| `memory_id` | uuid nullable | 确认后沉淀为经验或教训 |
| `created_at` / `updated_at` | timestamptz | 审计时间 |

增加 `media_experiment_publications(experiment_id, publication_id)` 记录参与实验的内容。

### 4.3 账号成长指标体系

#### 规模指标

- 粉丝总量、净增粉、发布量、总播放、总互动。

#### 效率指标

- 单条中位播放、千次播放增粉、发布频率、关注转化率。
- 优先使用中位数和分位数，避免单个爆款扭曲长期判断。

#### 内容结构指标

- 各内容支柱的发布占比、播放占比、增粉贡献和稳定性。
- 视频形式、时长区间、发布时间、标题类型的表现差异。

#### 漏斗指标

```text
曝光 → 点击/播放 → 有效观看 → 互动 → 主页访问 → 关注/转化
```

不同平台数据口径不同，系统必须保存平台与计算版本，不跨平台直接比较原始绝对值。

### 4.4 Account Growth Agent

#### 触发方式

- 每周自动生成轻量周报。
- 每月自动生成完整成长分析。
- 达到粉丝里程碑或发生明显异常时生成候选提醒。
- 用户可以手动选择周期重新分析。

#### 输入

- 账号指标快照、发布内容及其指标时间线。
- 内容支柱、账号目标和正在运行的实验。
- Personal Profile 中的内容定位与现实约束。
- 已确认的内容风格、决策和历史经验 Memory。

#### 输出结构

1. 本周期发生了什么：仅使用可验证数据。
2. 主要增长来源：内容支柱、作品和漏斗环节。
3. 瓶颈判断：清楚区分事实与推测。
4. 与上周期和移动基线的比较。
5. 已运行实验的结果与证据强弱。
6. 下一周期最多三个行动建议。
7. 一个优先实验草案，需用户确认后创建。

#### 安全边界

- 数据量不足时不强行得出趋势结论。
- 相关性不能描述成因果关系。
- 不因单条爆款立即修改账号定位。
- AI 结论不会自动成为 Memory；只有用户确认的实验结论或策略决策才能沉淀。

## 5. AI Daily Workflow 自动化流程

### 5.1 工作流目标

Daily Workflow 让系统在合适时间准备信息、发现缺口并生成候选行动，同时保留用户最终决策权。

工作流由 Orchestrator 编排，专业 Agent 负责具体分析。Orchestrator 本身不生成领域结论，只负责：

- 判断当前阶段和需要执行的步骤。
- 准备最小授权上下文。
- 调度 Agent、处理依赖和失败重试。
- 将建议放入待确认中心。
- 确保同一步骤不会重复执行或重复扣费。

### 5.2 工作流数据库

#### `workflow_definitions`

系统级版本定义：`id`、`workflow_type`、`version`、`trigger_config` JSONB、`step_definition` JSONB、`status`、`created_at`。

#### `user_workflow_settings`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `workflow_type` | enum | `morning / daytime / evening / weekly / monthly` |
| `enabled` | boolean | 是否启用 |
| `preferred_time` | time nullable | 本地时间 |
| `timezone` | text | 时区快照 |
| `allowed_agents` | text[] | 允许自动运行的 Agent |
| `max_ai_runs_per_day` | integer | 每日成本上限 |
| `notification_enabled` | boolean | 是否通知 |
| `updated_at` | timestamptz | 更新时间 |

#### `workflow_runs`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` / `definition_id` | uuid | 归属 |
| `workflow_type` | enum | 工作流类型 |
| `business_date` | date | 用户时区自然日 |
| `trigger_type` | enum | `schedule / app_open / user / event` |
| `status` | enum | `queued / running / awaiting_user / completed / partial / failed / cancelled` |
| `idempotency_key` | text unique | 防止重复执行 |
| `context_manifest` | jsonb | 使用的数据类别与截至时间，不保存所有原文 |
| `started_at` / `completed_at` | timestamptz nullable | 执行时间 |

#### `workflow_step_runs`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `workflow_run_id` | uuid | 归属 |
| `step_key` | text | 稳定步骤标识 |
| `agent_type` | text nullable | 使用的 Agent |
| `status` | enum | `pending / running / awaiting_user / completed / skipped / failed` |
| `depends_on` | text[] | 前置步骤 |
| `input_refs` / `output_refs` | jsonb | 输入和输出引用 |
| `ai_run_id` | uuid nullable | AI 调用 |
| `attempt_count` | integer | 重试次数 |
| `started_at` / `completed_at` | timestamptz nullable | 执行时间 |

#### `approval_requests`

所有 AI 建议写入业务数据前的统一确认中心。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `workflow_run_id` / `step_run_id` | uuid nullable | 来源工作流 |
| `action_type` | enum | `create_task / create_topic / update_profile / save_memory / create_experiment / reschedule` |
| `proposal` | jsonb | 待执行内容 |
| `reason` | text | 建议原因 |
| `status` | enum | `pending / approved / rejected / expired / executed` |
| `expires_at` | timestamptz nullable | 过期时间 |
| `reviewed_at` / `executed_at` | timestamptz nullable | 处理时间 |

#### `workflow_events`

保存轻量事件：`id`、`user_id`、`event_type`、`entity_type`、`entity_id`、`occurred_at`、`metadata`。用于触发白天工作流，不保存敏感业务全文。

### 5.3 早晨工作流

#### 阶段 A：后台预准备

建议在用户晨间时间前 30～60 分钟执行：

1. 确认用户时区、工作流开关和每日 AI 成本上限。
2. 抓取用户授权的信息源并完成去重、时效和来源校验。
3. 运行每日简报 Agent，生成带来源和截至时间的简报。
4. 聚合今日任务、未完成任务、运动计划、自媒体选题和昨日复盘。
5. 构建最小 Profile Pack 与 Memory Pack。
6. 每日行动 Agent 生成今日重点候选、健身提醒和自媒体行动建议。
7. 缓存 Dashboard 视图；AI 建议不直接写入任务和今日重点。

#### 阶段 B：用户首次打开

1. 展示晨间问候、精力和心情快速记录。
2. 展示今日简报及三个最重要信息点。
3. 展示 AI 建议的 3～5 个重点候选。
4. 用户选择最多三个，调整顺序后保存为 `daily_focus_items`。
5. 用户可接受健身计划或自媒体行动建议；接受后才创建计划/任务。
6. 保存今日意图，完成晨间启动。

#### 降级策略

- 资讯采集失败：展示上次成功简报并标明时间，不伪装为今日数据。
- AI 生成失败：仍显示任务、运动计划和手工数据。
- 用户未打开：不自动替用户确认今日重点。
- 工作流多次触发：按 `user_id + business_date + morning + version` 幂等。

### 5.4 白天工作流

白天以事件驱动和低打扰为原则。

#### 快速记录事件

- 新增灵感：保存后只做标签和重复项候选，不自动展开长分析。
- 新增爆款素材：可后台准备转写或元数据；分析需要用户授权或符合自动分析设置。
- 完成任务：更新进度，不立即打断用户进行复盘。
- 记录饮水、饮食和运动：只做确定性汇总，不调用 AI。
- 完成学习：更新累计时长和进度快照。

#### 智能触发

- 灵感与现有选题高度重复：显示合并建议。
- 素材分析完成：通知用户查看，不自动创建选题。
- 任务临近截止且未开始：只在用户允许的提醒窗口通知。
- 已完成今日三个重点：提供可选的下一步，不自动追加任务。
- 新内容指标达到用户定义的复盘条件：创建“建议复盘”提醒。

#### 白天快速问 AI

用户可在任意实体详情页发起上下文 AI：

- “把这个灵感整理成选题。”
- “拆解这个视频。”
- “根据今天剩余时间重新排序任务。”
- “总结刚才的学习记录。”

所有写操作仍进入 Approval Center。

### 5.5 晚间工作流

#### 阶段 A：预检查

在晚间时间或用户打开晚间模式时：

1. 汇总今日重点、任务、运动、自媒体、学习及用户授权的身体记录。
2. 计算确定性数据：完成率、饮水量、摄入和运动热量、学习分钟数。
3. 检查用户设置为重要的数据缺口。
4. 生成不带批评语气的快捷补录入口。

#### 阶段 B：用户复盘

1. 用户补充必要记录，也可选择“今天不记录”。
2. 填写极简复盘：一个成果、一个问题、一个明日提醒。
3. 可展开完整复盘：收获、情绪、精力、原因和下一步。
4. 用户提交后，晚间复盘 Agent 生成事实摘要、模式观察和明日建议。
5. 用户可将建议转为明日任务、保存为 Memory 候选或忽略。

#### 阶段 C：后台收尾

1. 完成当日热量、学习进度等可重建汇总。
2. 为新增经验生成 Memory Proposal，不自动激活 AI 推断记忆。
3. 检查是否出现 Profile 更新证据；只有达到稳定阈值才提出变更。
4. 归档工作流状态，并准备第二天必要的延续事项。

### 5.6 周期工作流

#### 每周

- 自媒体账号成长周报。
- 学习时间和技能进度回顾。
- 身体趋势轻量观察，仅使用用户授权数据。
- 活跃目标进度回顾。
- 待确认 Memory 候选清理。

#### 每月

- 自媒体账号完整成长分析和下月实验草案。
- Profile 目标进度回顾。
- Memory 过期、冲突和低价值内容复核。
- 财富市场分析记录汇总，仅在可靠数据源可用时生成。

### 5.7 自动化权限矩阵

| 动作 | 自动执行 | 需要确认 | 禁止 |
| --- | --- | --- | --- |
| 抓取已授权资讯源 | 是 |  |  |
| 生成简报和分析草稿 | 是 |  |  |
| 计算饮水、热量、进度、持仓 | 是，使用确定性代码 |  |  |
| 生成任务/选题/实验候选 |  | 是 |  |
| 保存 AI 推断的 Profile 或 Memory |  | 是 |  |
| 使用身体照片分析 |  | 每次明确确认 |  |
| 修改原始健康、投资和内容数据 |  | 用户手工修改 | AI 自动修改 |
| 发布内容、执行交易、提供医疗诊断 |  |  | 是 |

### 5.8 成本、可靠性与通知

- 每个工作流设置每日调用预算和最大重试次数。
- 优先复用同日有效 AI Artifact，输入未变化时不重复生成。
- 低价值步骤采用规则和确定性计算，不调用模型。
- 长任务异步执行，页面显示 queued / running / ready / failed。
- 通知只在产物可用、需要确认或用户设置的异常发生时发送。
- 单个 Agent 失败不使整个工作流失败，运行状态可标记为 `partial`。

## 6. V3 新增与调整路由

以下路由加入 V2 的完整路由表。

### 6.1 Personal Profile

| 路由 | 页面 | 主要能力 |
| --- | --- | --- |
| `/profile` | 个人画像总览 | 当前方向、目标、偏好和约束摘要 |
| `/profile/edit` | 编辑个人画像 | 编辑用户声明信息 |
| `/profile/goals` | 目标体系 | 长期、年度、季度和领域目标 |
| `/profile/goals/new` | 新建目标 | 创建目标与成功标准 |
| `/profile/goals/[id]` | 目标详情 | 进度、子目标与关联行动 |
| `/profile/content-identity` | 内容身份 | 定位、受众、内容支柱和风格边界 |
| `/profile/preferences` | AI 与工作偏好 | 输出、提醒、节奏和个性化 |
| `/profile/constraints` | 边界与约束 | 时间、预算、隐私和禁止项 |
| `/profile/history` | 画像版本 | 查看版本变化和恢复 |
| `/profile/proposals` | 画像更新建议 | 接受或拒绝 AI 建议 |

### 6.2 AI Memory

| 路由 | 页面 | 主要能力 |
| --- | --- | --- |
| `/memory` | 记忆中心 | 决策、经验、风格和承诺概览 |
| `/memory/new` | 手动新增记忆 | 明确要求系统记住 |
| `/memory/[id]` | 记忆详情 | 内容、来源、证据和使用记录 |
| `/memory/[id]/edit` | 编辑记忆 | 更正内容、授权和有效期 |
| `/memory/proposals` | 待确认记忆 | 审核 AI 提炼候选 |
| `/memory/conflicts` | 冲突记忆 | 处理相互矛盾的经验和决策 |
| `/memory/privacy` | 记忆权限 | 各 Agent 的访问范围 |
| `/memory/activity` | 记忆使用记录 | 查看何时被哪个 AI 使用 |

### 6.3 自媒体账号成长

| 路由 | 页面 | 主要能力 |
| --- | --- | --- |
| `/media/accounts` | 账号列表 | 多平台账号总览 |
| `/media/accounts/new` | 新增账号 | 平台、定位和数据来源 |
| `/media/accounts/[id]` | 账号 Dashboard | 增长、漏斗、支柱和目标 |
| `/media/accounts/[id]/edit` | 编辑账号 | 账号定位和状态 |
| `/media/accounts/[id]/metrics/new` | 录入账号数据 | 手动新增指标快照 |
| `/media/accounts/[id]/trends` | 数据趋势 | 粉丝、播放、互动和转化趋势 |
| `/media/accounts/[id]/pillars` | 内容支柱 | 支柱表现和发布比例 |
| `/media/accounts/[id]/goals` | 账号目标 | 目标与进度 |
| `/media/accounts/[id]/analyses` | 成长分析 | 周报、月报和里程碑分析 |
| `/media/accounts/[id]/analyses/[analysisId]` | 分析详情 | 数据、结论、证据和建议 |
| `/media/accounts/[id]/experiments` | 增长实验 | 实验列表和状态 |
| `/media/accounts/[id]/experiments/new` | 新建实验 | 假设、变量和成功指标 |
| `/media/accounts/[id]/experiments/[experimentId]` | 实验详情 | 关联作品、结果和结论 |

同时将 V2 的以下路由增加 `account` 筛选：

- `/media/materials?account=...`
- `/media/topics?account=...`
- `/media/publications?account=...`
- `/media/reviews?account=...`

### 6.4 Workflow 与确认中心

| 路由 | 页面 | 主要能力 |
| --- | --- | --- |
| `/approvals` | 待确认中心 | 任务、选题、记忆、画像和实验建议 |
| `/approvals/[id]` | 建议详情 | 查看依据后接受、编辑或拒绝 |
| `/workflows` | 自动化中心 | 早晨、白天、晚上及周期流程 |
| `/workflows/settings` | 自动化设置 | 时间、Agent、预算和通知 |
| `/workflows/history` | 工作流历史 | 完成、部分失败和重试记录 |
| `/workflows/runs/[id]` | 工作流详情 | 每一步状态、输入范围和产物 |

设置区增加：

- `/settings/context`：Profile、Memory 与业务数据的 AI 使用授权。
- `/settings/automation`：跳转或整合 Daily Workflow 设置。
- `/settings/ai-usage`：查看 AI 调用量、失败率和费用估算。

## 7. Dashboard V3 调整

### 7.1 新增上下文提示

Dashboard 的 AI 建议卡提供“建议依据”，最多展示三个来源：

- 当前目标，例如“本季度重点：稳定更新光伏职场内容”。
- 已确认经验，例如“教程型内容的收藏率更高”。
- 当日事实，例如“今天有 90 分钟可用时间”。

用户可即时标记“这不符合我”，系统将反馈到相关 Profile 或 Memory，而不是只隐藏卡片。

### 7.2 新增确认收件箱

首页显示轻量待确认入口：

- 今日重点候选。
- 可转成选题的素材分析。
- 可保存的经验或风格记忆。
- 画像更新建议。
- 账号增长实验草案。

首页只显示数量和最紧急的一项，完整处理在 `/approvals` 完成。

### 7.3 新增账号成长卡片

- 早晨：显示本周账号目标和今日建议动作。
- 白天：发布后提示录入或等待指标，不立即判断好坏。
- 晚上：显示今天完成的创作动作，而不是用短期播放量制造焦虑。
- 每周/月：成长报告完成后显示入口和最重要变化。

## 8. 新增 Agent 与现有 Agent 调整

| Agent | 职责 | 写入权限 |
| --- | --- | --- |
| Profile Curator | 根据稳定行为提出画像变更建议 | 只能写 proposal；用户确认后创建新版本 |
| Memory Curator | 从决策和复盘中提炼记忆候选，发现冲突和过期项 | 只能写 proposed 记忆和关系 |
| Account Growth Agent | 生成账号周报、月报、瓶颈和实验草案 | 写 AI Artifact；实验需确认 |
| Daily Workflow Orchestrator | 编排早晨、白天、晚上步骤 | 只能调度和创建确认请求 |
| Context Builder | 为每个 Agent 组装最小 Profile/Memory/Fact Pack | 只读并记录访问清单 |

现有 Agent 统一调整：

- 必须通过 Context Builder 获取长期上下文，不能自行扫描全部用户数据。
- 输出中必须区分“事实、推断、建议”。
- 使用记忆时记录 `memory_retrieval_logs`。
- 建议写业务数据时创建 `approval_requests`。
- 用户拒绝建议后，Agent 不得在同一条件下短期内重复提出。

## 9. 隐私与信任设计

### 9.1 用户拥有四项核心权利

1. 知道 AI 使用了什么：每个结果可查看 Profile、Memory 和业务数据范围。
2. 控制 AI 可以使用什么：按领域、敏感等级和 Agent 授权。
3. 更正 AI 对自己的理解：可编辑画像、纠正记忆、拒绝推断。
4. 要求系统忘记：停用或彻底删除记忆及向量表示。

### 9.2 默认隐私策略

- Profile 中的健康和财富字段默认 `explicit_only`。
- 身体照片默认不进入 Memory、不生成 embedding。
- 生理期原始记录不自动沉淀为长期记忆。
- 市场 Agent 不读取健康、自媒体私密草稿或无关日记。
- 自媒体 Agent 不读取详细基金持仓和生理期数据。
- 每次跨领域分析都要求明确产品理由和用户授权。

### 9.3 数据保留

- 工作流执行日志默认保留必要的状态和引用，不复制完整敏感上下文。
- AI Run 的原始输入按隐私策略设置保留期；长期只保留输入哈希、引用和产物。
- 被遗忘记忆立即停止检索；彻底删除进入可审计的删除流程。

## 10. V3 分阶段建议

V3 能力不建议全部进入第一版 MVP。

### Phase A：可控的长期上下文

- Profile Onboarding、目标、内容身份和偏好。
- 用户手动保存 Memory。
- Agent 读取最小 Profile Pack。
- AI 结果展示“建议依据”。

### Phase B：账号增长闭环

- 自媒体账号、账号指标快照、内容支柱和目标。
- 周/月成长统计。
- Account Growth Agent。
- 增长实验和复盘结论。

### Phase C：自动化编排

- Morning / Evening Workflow。
- Approval Center。
- 任务幂等、失败降级和成本控制。
- 白天事件触发和通知。

### Phase D：智能记忆治理

- Memory Proposal、证据、混合检索。
- 冲突检测、到期复核和遗忘。
- Profile Curator 与 Memory Curator。
- 完整的 Context 使用审计。

## 11. V3 验收标准

### Personal Profile

- 用户能查看和编辑 AI 当前使用的个人画像。
- AI 推断信息不会未经确认进入 active Profile。
- Profile 有版本历史，可解释每次变化。
- 不同 Agent 只能读取任务需要且已授权的字段。

### AI Memory

- 用户可以明确要求系统记住一项决定或风格。
- AI 提炼的记忆默认进入待确认状态。
- 用户能查看记忆的证据、使用历史、授权和有效期。
- 忘记后该记忆不再出现在任何新 AI 上下文中。
- 冲突记忆不会同时作为确定事实注入模型。

### 账号成长分析

- 用户能按账号长期记录并查看指标趋势。
- 账号统计能区分单条爆款和持续增长。
- 周/月报告展示数据周期、平台口径和数据完整性。
- AI 能说明结论依据，并在数据不足时拒绝过度推断。
- 实验结论由用户确认后才能进入 Memory。

### Daily Workflow

- 晨间简报和行动候选能在用户打开前准备完成。
- AI 失败时，任务和业务事实仍正常展示和记录。
- 所有 AI 写操作均经过 Approval Center。
- 同一自然日重复触发不会产生重复任务、产物或费用。
- 用户可关闭任意工作流、Agent、通知或敏感上下文访问。

## 12. 开发前最终确认项

- [ ] Personal Profile 首次 Onboarding 需要用户回答的最少问题。
- [ ] 哪些 Profile 字段允许行为推断，哪些只能用户声明。
- [ ] Memory 默认是否全部需要确认；V3 建议除明确“记住”外全部确认。
- [ ] 首期支持的自媒体平台和各平台指标口径。
- [ ] 账号成长分析的默认周期：建议周报轻量、月报完整。
- [ ] 早晨和晚间工作流默认启用状态及执行时间。
- [ ] 每日 AI 调用预算、失败重试次数和通知频率。
- [ ] 健康、财富和身体照片的逐项授权界面文案。

