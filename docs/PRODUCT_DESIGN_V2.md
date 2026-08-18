# Kiki Personal OS 完整产品设计 V2

> 状态：开发前确认稿  
> 本文补充并替代 `PROJECT_PLAN.md` 中的数据库、Dashboard、AI Agent 与页面路由设计。技术架构和 MVP 原则继续沿用原规划。

## 1. 设计原则

### 1.1 产品原则

- Kiki 不是各类数据的展示柜，而是每天早晚都会使用的行动工作台。
- 早晨帮助用户理解今天、安排今天；晚上帮助用户记录今天、复盘今天。
- 首页首先回答“我现在应该做什么”，其次才展示统计数据。
- 用户的原始记录是事实层；系统计算是指标层；AI 输出是建议层，三层不能混存或互相覆盖。
- 健康与投资分析只提供趋势观察、风险提醒和行动选项，不提供医疗诊断或确定性交易指令。

### 1.2 数据原则

- 所有长期用户数据包含 `id`、`user_id`、`created_at`、`updated_at`；可编辑实体按需增加 `deleted_at`。
- 时间点记录使用 `recorded_at`，自然日记录使用 `record_date`，数据库时间统一存 UTC，按用户时区解释自然日。
- 金额使用 `numeric(20, 4)`，份额使用 `numeric(24, 8)`；身体数据使用适当精度的 `numeric`。
- AI 结果单独版本化保存，永不覆盖灵感、素材、身体记录、持仓流水等原始数据。
- 文件只在数据库保存 Storage 路径和元数据；身体照片使用私有 Bucket 与短时签名 URL。
- 频繁变化的平台指标、症状和外部数据可使用 JSONB 承载扩展字段，但核心可查询指标必须使用明确列。
- 所有业务表启用 RLS，用户只能访问 `user_id = auth.uid()` 的数据；共享字典表仅允许读取。

## 2. 数据库总体分层

```text
身份与偏好
├── profiles
├── user_preferences
└── notification_preferences

每日工作台
├── tasks
├── daily_pages
├── daily_focus_items
└── daily_reviews

长期事实数据
├── 自媒体域
├── 技能学习域
├── 身体管理域
└── 财富管理域

AI 与资讯
├── information_sources
├── source_items
├── ai_jobs
├── ai_runs
├── ai_artifacts
├── ai_artifact_sources
└── ai_feedback
```

### 2.1 公共身份与偏好

#### `profiles`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | uuid PK | 对应 Supabase Auth 用户 ID |
| `display_name` | text | 显示名称 |
| `timezone` | text | 默认 `Asia/Shanghai` |
| `locale` | text | 默认 `zh-CN` |
| `onboarding_completed_at` | timestamptz | 完成初始化时间 |
| `created_at` / `updated_at` | timestamptz | 审计时间 |

#### `user_preferences`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | uuid PK/FK | 用户 |
| `morning_start_time` | time | 晨间模式起始时间 |
| `evening_start_time` | time | 晚间模式起始时间 |
| `daily_calorie_target` | integer nullable | 用户自行设置的每日目标 |
| `daily_water_target_ml` | integer nullable | 饮水目标 |
| `briefing_topics` | jsonb | 关注行业和关键词 |
| `dashboard_modules` | jsonb | 首页模块顺序与开关 |
| `ai_personalization_enabled` | boolean | 是否允许 AI 使用个人历史数据 |
| `updated_at` | timestamptz | 更新时间 |

## 3. 每日工作台数据结构

Dashboard 既聚合长期数据，也保存“今天的计划、完成状态和复盘”，从而形成每日闭环。

### 3.1 `tasks`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `title` | text | 任务标题 |
| `notes` | text nullable | 备注 |
| `status` | enum | `todo / doing / done / cancelled` |
| `priority` | enum | `low / medium / high` |
| `scheduled_date` | date nullable | 安排日期 |
| `scheduled_time` | time nullable | 安排时间 |
| `due_at` | timestamptz nullable | 截止时间 |
| `source_type` | text | `manual / media / learning / health / wealth / ai` |
| `source_id` | uuid nullable | 来源实体 ID，不做跨表外键 |
| `completed_at` | timestamptz nullable | 完成时间 |
| `sort_order` | integer | 当日排序 |
| 审计字段 | timestamptz | 创建、更新、软删除 |

### 3.2 `daily_pages`

每位用户每天一条，代表某天工作台状态，不复制各模块明细。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `page_date` | date | 用户时区下的日期 |
| `intention` | text nullable | 今日意图 |
| `energy_level_morning` | smallint nullable | 1～5 |
| `mood_morning` | smallint nullable | 1～5 |
| `morning_opened_at` | timestamptz nullable | 首次进入晨间模式 |
| `evening_opened_at` | timestamptz nullable | 首次进入晚间模式 |
| `review_completed_at` | timestamptz nullable | 完成复盘时间 |
| 唯一约束 |  | `(user_id, page_date)` |

### 3.3 `daily_focus_items`

保存用户确认的“今日重点”，避免 AI 每次刷新后改变计划。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` / `daily_page_id` | uuid | 归属 |
| `title` | text | 重点事项 |
| `item_type` | enum | `task / fitness / media / learning / custom` |
| `source_id` | uuid nullable | 可关联任务、运动计划或选题 |
| `origin` | enum | `user / ai_suggested` |
| `status` | enum | `planned / done / skipped` |
| `sort_order` | integer | 顺序 |

### 3.4 `daily_reviews`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` / `daily_page_id` | uuid | 归属 |
| `wins` | text nullable | 今天做得好的事 |
| `challenges` | text nullable | 阻碍与问题 |
| `learnings` | text nullable | 今日收获 |
| `tomorrow_note` | text nullable | 给明天的提醒 |
| `energy_level_evening` | smallint nullable | 1～5 |
| `mood_evening` | smallint nullable | 1～5 |
| `ai_summary_artifact_id` | uuid nullable | AI 复盘摘要 |
| `created_at` / `updated_at` | timestamptz | 审计时间 |

## 4. 自媒体长期数据库

### 4.1 每日灵感

#### `media_inspirations`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `title` | text | 灵感标题 |
| `content` | text nullable | 灵感内容 |
| `source_url` | text nullable | 来源链接 |
| `source_platform` | text nullable | 平台 |
| `inspiration_date` | date | 归属日期 |
| `status` | enum | `inbox / selected / converted / archived` |
| `converted_topic_id` | uuid nullable | 转化后的选题 |
| `is_completed` | boolean | 当日处理是否完成 |
| `completed_at` | timestamptz nullable | 完成时间 |
| 审计字段 | timestamptz | 创建、更新、软删除 |

### 4.2 爆款素材库

#### `media_viral_materials`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `platform` | text | 来源平台 |
| `content_type` | enum | `video / image / article / post / other` |
| `title` | text | 素材名称 |
| `source_url` | text nullable | 原链接 |
| `author_name` | text nullable | 作者 |
| `published_at` | timestamptz nullable | 原发布时间 |
| `captured_at` | timestamptz | 收藏时间 |
| `content_snapshot` | text nullable | 用户保存的文本快照 |
| `thumbnail_path` | text nullable | 缩略图 Storage 路径 |
| `duration_seconds` | integer nullable | 视频时长 |
| `notes` | text nullable | 手工备注 |
| `status` | enum | `inbox / analyzed / used / archived` |
| 审计字段 | timestamptz | 创建、更新、软删除 |

#### `media_metric_snapshots`

保存某个素材在不同时间点的表现，不能只保存最新数字。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` / `material_id` | uuid | 归属 |
| `captured_at` | timestamptz | 指标采集时间 |
| `views` / `likes` / `comments` | bigint nullable | 核心指标 |
| `shares` / `saves` | bigint nullable | 核心指标 |
| `followers_gained` | bigint nullable | 涨粉 |
| `extra_metrics` | jsonb | 平台特有指标 |
| `source` | enum | `manual / api` |

#### `media_material_analyses`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` / `material_id` | uuid | 归属 |
| `analysis_type` | enum | `hotspot / video_breakdown / recreation_plan` |
| `version` | integer | 同一分析可多版本 |
| `result` | jsonb | Hook、结构、情绪、受众、爆点、二创方案等 |
| `ai_artifact_id` | uuid | 对应 AI 产物 |
| `created_at` | timestamptz | 生成时间 |

### 4.3 选题库

#### `media_topics`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `title` | text | 选题标题 |
| `angle` | text nullable | 内容切入角度 |
| `audience` | text nullable | 目标受众 |
| `content_format` | text nullable | 内容形式 |
| `platforms` | text[] | 计划平台 |
| `status` | enum | `idea / planned / scripting / producing / published / archived` |
| `priority` | enum | 优先级 |
| `scheduled_at` | timestamptz nullable | 计划发布时间 |
| `source_inspiration_id` | uuid nullable | 来源灵感 |
| `source_material_id` | uuid nullable | 来源素材 |
| 审计字段 | timestamptz | 创建、更新、软删除 |

#### `media_topic_assets`

统一保存某选题下的标题候选、文案素材、脚本和备注。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` / `topic_id` | uuid | 归属 |
| `asset_type` | enum | `title / copy / script / note / link` |
| `title` | text nullable | 名称 |
| `content` | text | 内容 |
| `origin` | enum | `manual / ai` |
| `ai_artifact_id` | uuid nullable | AI 来源 |
| `sort_order` | integer | 顺序 |
| 审计字段 | timestamptz | 创建、更新 |

#### `media_tags` 与 `media_entity_tags`

- `media_tags`：`id`、`user_id`、`name`、`color`；`(user_id, name)` 唯一。
- `media_entity_tags`：`tag_id`、`entity_type`、`entity_id`；用于给灵感、素材、选题和复盘加标签。

### 4.4 内容发布与复盘

#### `media_publications`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `topic_id` | uuid nullable | 来源选题 |
| `platform` | text | 发布平台 |
| `title` | text | 发布标题 |
| `content_url` | text nullable | 内容链接 |
| `published_at` | timestamptz | 发布时间 |
| `content_snapshot` | text nullable | 发布版本文本 |
| `duration_seconds` | integer nullable | 视频时长 |
| 审计字段 | timestamptz | 创建、更新、软删除 |

#### `media_publication_metrics`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` / `publication_id` | uuid | 归属 |
| `recorded_at` | timestamptz | 数据记录时间 |
| `views` / `likes` / `comments` | bigint nullable | 基础指标 |
| `shares` / `saves` | bigint nullable | 基础指标 |
| `followers_gained` | bigint nullable | 涨粉 |
| `avg_watch_seconds` | numeric nullable | 平均观看时长 |
| `completion_rate` | numeric nullable | 完播率 0～1 |
| `click_through_rate` | numeric nullable | 点击率 0～1 |
| `extra_metrics` | jsonb | 平台扩展指标 |

#### `media_content_reviews`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` / `publication_id` | uuid | 归属 |
| `metric_snapshot_id` | uuid nullable | 分析所依据的数据快照 |
| `manual_summary` | text nullable | 用户主观复盘 |
| `goal` | text nullable | 本次内容目标 |
| `result` | text nullable | 实际结果 |
| `problems` | text nullable | 手工问题记录 |
| `next_actions` | text nullable | 手工改进动作 |
| `ai_artifact_id` | uuid nullable | AI 复盘结果 |
| `reviewed_at` | timestamptz | 复盘时间 |

## 5. 技能学习长期数据库

### 5.1 `learning_skills`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `name` | text | 技能名称 |
| `category` | enum | `shooting / editing / ai_tools / other` |
| `description` | text nullable | 学习目标 |
| `status` | enum | `planned / active / paused / completed / archived` |
| `target_hours` | numeric nullable | 目标学习时长 |
| `target_date` | date nullable | 目标日期 |
| 审计字段 | timestamptz | 创建、更新、软删除 |

### 5.2 `learning_tutorials`

教程收藏表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `skill_id` | uuid nullable | 所属技能 |
| `title` | text | 教程标题 |
| `url` | text nullable | 收藏地址 |
| `platform` | text nullable | 来源平台 |
| `author` | text nullable | 作者 |
| `content_type` | enum | `video / article / course / book / other` |
| `duration_minutes` | integer nullable | 时长 |
| `status` | enum | `saved / learning / completed / archived` |
| `progress_percent` | smallint | 0～100 |
| `saved_at` / `completed_at` | timestamptz nullable | 收藏与完成时间 |
| `notes` | text nullable | 简短备注 |
| 审计字段 | timestamptz | 创建、更新、软删除 |

### 5.3 `learning_sessions`

每次学习的事实记录，是累计时长与连续学习天数的来源。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `skill_id` | uuid | 所属技能 |
| `tutorial_id` | uuid nullable | 关联教程 |
| `started_at` / `ended_at` | timestamptz | 起止时间 |
| `duration_minutes` | integer | 有效学习分钟数 |
| `content_learned` | text nullable | 学习内容 |
| `reflection` | text nullable | 学习记录或心得 |
| `progress_delta` | smallint nullable | 本次进度变化 |
| `created_at` / `updated_at` | timestamptz | 审计时间 |

### 5.4 `learning_progress_snapshots`

长期保存技能进度变化，不能只在技能表保存当前百分比。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` / `skill_id` | uuid | 归属 |
| `recorded_on` | date | 记录日期 |
| `progress_percent` | smallint | 0～100 |
| `level` | text nullable | 自定义阶段或等级 |
| `total_minutes` | integer | 截至当时的累计时长 |
| `note` | text nullable | 阶段说明 |
| 唯一约束 |  | `(skill_id, recorded_on)` |

### 5.5 `learning_notes`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `skill_id` / `tutorial_id` | uuid nullable | 可选关联 |
| `title` | text | 笔记标题 |
| `content` | text | 笔记内容 |
| `created_at` / `updated_at` / `deleted_at` | timestamptz | 审计字段 |

## 6. 身体管理长期数据库

### 6.1 身体指标

#### `health_body_measurements`

体重和三围允许同一次或分开记录，未测字段保持空值。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `measured_at` | timestamptz | 测量时间 |
| `weight_kg` | numeric(6,2) nullable | 体重 |
| `waist_cm` | numeric(6,2) nullable | 腰围 |
| `hip_cm` | numeric(6,2) nullable | 臀围 |
| `chest_cm` | numeric(6,2) nullable | 胸围 |
| `body_fat_percent` | numeric(5,2) nullable | 可选体脂率 |
| `measurement_context` | enum | `morning / evening / other` |
| `notes` | text nullable | 备注 |
| `created_at` / `updated_at` | timestamptz | 审计时间 |

#### `health_posture_records`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `recorded_at` | timestamptz | 拍摄时间 |
| `comparison_group_id` | uuid nullable | 同组对比 |
| `manual_observation` | text nullable | 用户观察 |
| `ai_artifact_id` | uuid nullable | AI 趋势观察，不是诊断 |
| `created_at` / `updated_at` / `deleted_at` | timestamptz | 审计字段 |

#### `health_posture_photos`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` / `posture_record_id` | uuid | 归属 |
| `storage_path` | text | 私有文件路径 |
| `view_type` | enum | `front / left / right / back / other` |
| `mime_type` / `file_size` | text / bigint | 文件元数据 |
| `width` / `height` | integer nullable | 尺寸 |
| `captured_at` | timestamptz | 原始拍摄时间 |

### 6.2 饮水与生理期

#### `health_water_logs`

- `id`、`user_id`、`amount_ml`、`logged_at`、`source(manual/quick_add)`、`created_at`。
- 首页今日饮水量通过当天流水求和，不直接覆盖累计值。

#### `health_menstrual_cycles`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `start_date` / `end_date` | date | 周期起止，进行中时结束为空 |
| `notes` | text nullable | 周期备注 |
| `created_at` / `updated_at` | timestamptz | 审计时间 |

#### `health_cycle_daily_logs`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `cycle_id` | uuid nullable | 可自动归入周期 |
| `log_date` | date | 日期 |
| `flow_level` | enum nullable | `spotting / light / medium / heavy` |
| `symptoms` | text[] | 症状标签 |
| `pain_level` | smallint nullable | 0～10 |
| `mood` | text nullable | 心情 |
| `notes` | text nullable | 备注 |
| 唯一约束 |  | `(user_id, log_date)` |

### 6.3 饮食与热量

#### `health_meals`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `eaten_at` | timestamptz | 用餐时间 |
| `meal_type` | enum | `breakfast / lunch / dinner / snack / other` |
| `title` | text nullable | 餐次名称 |
| `photo_path` | text nullable | 可选餐食图片 |
| `notes` | text nullable | 备注 |
| 审计字段 | timestamptz | 创建、更新、软删除 |

#### `health_food_entries`

一顿饭包含多个食物条目。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` / `meal_id` | uuid | 归属 |
| `food_name` | text | 食物名称 |
| `quantity` / `unit` | numeric / text | 数量与单位 |
| `calories_kcal` | numeric nullable | 热量 |
| `protein_g` / `carbs_g` / `fat_g` | numeric nullable | 营养素 |
| `calculation_source` | enum | `manual / database / ai_estimate` |
| `confidence` | numeric nullable | AI 估算置信信息 |
| `created_at` / `updated_at` | timestamptz | 审计时间 |

#### `health_meal_plans`

- `id`、`user_id`、`plan_date`、`meal_type`、`title`、`description`。
- 目标字段：`target_calories_kcal`、`protein_g`、`carbs_g`、`fat_g`。
- 状态：`planned / eaten / skipped`；可关联实际 `meal_id`。

#### `health_energy_daily_summaries`

每日热量记录快照，原始来源仍是食物和运动流水。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `summary_date` | date | 日期 |
| `intake_kcal` | numeric | 摄入热量 |
| `exercise_burn_kcal` | numeric | 运动消耗 |
| `target_intake_kcal` | numeric nullable | 当日目标快照 |
| `calculation_version` | text | 计算规则版本 |
| `calculated_at` | timestamptz | 计算时间 |
| 唯一约束 |  | `(user_id, summary_date)` |

该表是可重建缓存，用于趋势和首页性能，不能替代原始饮食与运动记录。

### 6.4 运动

#### `health_exercise_plans`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `plan_date` | date | 计划日期 |
| `exercise_type` | text | 运动类型 |
| `title` | text | 计划名称 |
| `target_duration_minutes` | integer nullable | 目标时长 |
| `target_calories_kcal` | numeric nullable | 目标消耗 |
| `status` | enum | `planned / completed / skipped` |
| `exercise_log_id` | uuid nullable | 实际运动记录 |
| 审计字段 | timestamptz | 创建、更新 |

#### `health_exercise_logs`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `exercise_type` | text | 运动类型 |
| `started_at` | timestamptz | 开始时间 |
| `duration_minutes` | integer | 时长 |
| `intensity` | enum nullable | `low / medium / high` |
| `distance_km` | numeric nullable | 可选距离 |
| `calories_burned_kcal` | numeric nullable | 估算消耗 |
| `calculation_source` | enum | `manual / wearable / formula` |
| `notes` | text nullable | 备注 |
| `created_at` / `updated_at` | timestamptz | 审计时间 |

## 7. 财富管理长期数据库

### 7.1 基金和行业字典

#### `wealth_funds`

共享基金基础信息，无 `user_id`。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | uuid | 主键 |
| `fund_code` | text unique | 基金代码 |
| `fund_name` | text | 基金名称 |
| `fund_type` | text | 基金类型 |
| `currency` | text | 币种 |
| `status` | text | 状态 |
| `metadata` | jsonb | 扩展信息 |

#### `wealth_industries`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | uuid | 主键 |
| `parent_id` | uuid nullable | 支持多级行业分类 |
| `classification_system` | text | 分类体系和版本 |
| `industry_code` | text | 行业代码 |
| `industry_name` | text | 行业名称 |
| `level` | smallint | 分类层级 |
| 唯一约束 |  | `(classification_system, industry_code)` |

#### `wealth_fund_industries`

- `fund_id`、`industry_id`、`weight_percent`、`as_of_date`、`source`。
- 组合唯一键：`(fund_id, industry_id, as_of_date)`，保存历史行业暴露。

### 7.2 账户、交易与持仓

#### `wealth_accounts`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `name` | text | 账户名称 |
| `institution` | text nullable | 平台或机构 |
| `currency` | text | 币种 |
| `is_active` | boolean | 是否使用 |
| 审计字段 | timestamptz | 创建、更新、软删除 |

#### `wealth_fund_transactions`

交易流水是持仓成本和份额的事实来源。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `account_id` / `fund_id` | uuid | 账户与基金 |
| `transaction_type` | enum | `buy / sell / dividend_cash / dividend_reinvest / fee / adjustment` |
| `transaction_at` | timestamptz | 交易时间 |
| `units` | numeric(24,8) nullable | 份额 |
| `unit_price` | numeric(20,8) nullable | 单价 |
| `gross_amount` | numeric(20,4) | 总额 |
| `fee_amount` | numeric(20,4) | 手续费 |
| `currency` | text | 币种 |
| `notes` | text nullable | 备注 |
| 审计字段 | timestamptz | 创建、更新、软删除 |

#### `wealth_position_snapshots`

用于长期查看某日持仓状态，并支持手动录入初始持仓。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `account_id` / `fund_id` | uuid | 账户与基金 |
| `snapshot_date` | date | 快照日期 |
| `units` | numeric(24,8) | 持有份额 |
| `average_cost` | numeric(20,8) nullable | 平均成本 |
| `market_value` | numeric(20,4) nullable | 市值 |
| `unrealized_pnl` | numeric(20,4) nullable | 未实现盈亏 |
| `source` | enum | `calculated / manual / imported` |
| `calculated_at` | timestamptz | 计算时间 |
| 唯一约束 |  | `(account_id, fund_id, snapshot_date)` |

#### `wealth_fund_navs`

- `fund_id`、`nav_date`、`nav`、`accumulated_nav`、`source`、`fetched_at`。
- 唯一键：`(fund_id, nav_date)`。

### 7.3 市场分析记录

#### `wealth_market_snapshots`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | uuid | 主键 |
| `market_date` | date | 数据日期 |
| `scope_type` | enum | `market / industry / fund` |
| `industry_id` / `fund_id` | uuid nullable | 分析范围 |
| `metrics` | jsonb | 涨跌、估值、资金流等来源数据 |
| `source` | text | 数据来源 |
| `data_as_of` | timestamptz | 数据截至时间 |
| `created_at` | timestamptz | 入库时间 |

#### `wealth_market_analyses`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `user_id` | uuid | 主键与用户 |
| `analysis_date` | date | 分析日期 |
| `scope_type` | enum | `portfolio / market / industry / fund` |
| `scope_id` | uuid nullable | 行业、基金或账户 ID |
| `title` | text | 标题 |
| `user_notes` | text nullable | 用户记录 |
| `market_snapshot_ids` | uuid[] | 使用的数据快照 |
| `ai_artifact_id` | uuid nullable | AI 分析产物 |
| `data_as_of` | timestamptz | 数据截至时间 |
| `created_at` / `updated_at` | timestamptz | 审计时间 |

## 8. AI Agent 设计

### 8.1 Agent 平台数据表

#### `ai_jobs`

保存待执行任务：`id`、`user_id`、`agent_type`、`trigger_type`、`scheduled_for`、`input_refs`、`status`、`attempt_count`、`deduplication_key`、`created_at`。

#### `ai_runs`

保存每次实际调用：`id`、`job_id`、`user_id`、`agent_type`、`model`、`prompt_version`、`input_hash`、`status`、`input_tokens`、`output_tokens`、`latency_ms`、`error_code`、`started_at`、`completed_at`。

#### `ai_artifacts`

保存用户可见产物：`id`、`user_id`、`run_id`、`artifact_type`、`title`、`summary`、`content` JSONB、`version`、`generated_at`、`expires_at`、`supersedes_id`。

#### `ai_artifact_sources`

保存引用关系：`artifact_id`、`source_type`、`source_id`、`source_url`、`source_title`、`published_at`、`data_as_of`、`citation_order`。

#### `ai_feedback`

保存用户反馈：`id`、`user_id`、`artifact_id`、`rating`、`feedback_type`、`comment`、`created_at`。

### 8.2 Agent 清单

| Agent | 触发方式 | 输入 | 自动生成内容 | 是否自动写业务数据 |
| --- | --- | --- | --- | --- |
| 每日简报 Agent | 每日定时 + 手动重试 | 关注主题、已抓取资讯、来源时间 | AI、光伏新能源、自媒体趋势、市场摘要、今日关注点 | 只写简报产物，不修改任务 |
| 热点分析 Agent | 素材保存后手动触发；后续可批量 | 素材快照、指标、同类来源 | 热点背景、受众、情绪、传播原因、时效窗口 | 只写分析，用户确认后才能转为选题 |
| 视频拆解 Agent | 用户点击“拆解” | 视频文本/转写、标题、时长、指标 | Hook、段落时间轴、叙事结构、镜头/节奏、CTA、可复用模板 | 只写拆解结果 |
| 二创方案 Agent | 用户点击生成 | 素材拆解、用户账号定位、目标平台 | 新角度、标题候选、脚本大纲、拍摄建议、风险提示 | 用户确认后可创建选题及资产 |
| 内容复盘 Agent | 用户录入指标后触发 | 发布内容、指标快照、历史基线、内容目标 | 表现判断、问题定位、假设、下次实验和行动清单 | 只写复盘；行动需用户确认转任务 |
| 身体趋势 Agent | 每周/每月或用户手动触发 | 体重、三围、饮水、饮食、运动趋势；默认不读取照片 | 变化趋势、记录完整性、生活习惯观察、可选行动 | 不修改健康记录，不诊断 |
| 体态对比 Agent | 用户明确选择照片并同意后触发 | 选定的前后照片与时间 | 可观察差异、拍摄一致性提醒 | 不保存推断为医学结论 |
| 市场分析 Agent | 数据更新后手动或定时 | 市场快照、基金行业暴露、用户持仓 | 市场观察、组合暴露、风险点、情景分析 | 不创建交易，不输出确定买卖指令 |
| 每日行动 Agent | 晨间首次打开或手动刷新 | 任务、运动计划、选题状态、昨日复盘 | 今日重点候选、健身提醒、自媒体行动建议 | 先以建议卡展示，用户确认后写入今日重点 |
| 晚间复盘 Agent | 用户完成晚间记录后触发 | 今日任务、健康记录、自媒体动作、用户复盘 | 一日总结、未完成原因模式、明日建议 | 只写复盘摘要；建议不自动排期 |

### 8.3 自动化等级

- L0 纯计算：饮水总量、热量汇总、持仓份额、任务完成率。使用确定性代码，不调用 AI。
- L1 AI 只读分析：读取数据并生成简报、趋势或复盘，不改变业务事实。
- L2 AI 建议操作：生成任务、选题或计划草稿，必须由用户确认后写入。
- L3 自动执行：自动发布、自动交易、自动修改健康方案。当前产品不支持。

### 8.4 Agent 执行约束

1. 定时任务先采集并校验来源，再调用模型；没有可靠来源时明确显示“暂无数据”。
2. 相同用户、日期、Agent 类型使用幂等键，防止重复扣费和重复产物。
3. 所有输出经过结构 Schema 校验；失败进入可重试状态，不保存半成品为完成结果。
4. 每个产物显示生成时间、数据截至时间、来源和免责声明。
5. AI 创建任何任务、选题、计划前均展示预览并要求用户确认。
6. 身体照片默认不进入通用 AI 上下文；只有用户明确选择时才用于单次体态对比。
7. 市场 Agent 不访问用户未授权的数据，不基于过期数据描述“当前行情”。

## 9. Dashboard 每日使用场景

### 9.1 时间与状态逻辑

首页不是两套独立页面，而是同一路由 `/` 下的状态化工作台：

- 晨间模式：从用户设定的晨间时间至晚间时间，默认首屏展示“理解今天 + 安排今天”。
- 晚间模式：晚间时间后，默认首屏展示“记录今天 + 复盘今天”。
- 用户可以随时手动切换“早晨 / 晚上”，不强制依赖系统时间。
- 首次进入当天时创建 `daily_pages`，但不会自动创建任务或修改计划。

### 9.2 早晨打开

首屏按以下顺序组织：

1. 问候与日期：显示晨间状态快速选择（精力、心情）和今日意图。
2. 今日 AI 简报：3～5 条最重要摘要、数据截至时间、来源入口；可进入完整简报。
3. 今日重点任务：最多 3 项重点，支持从任务中选择、排序和完成。
4. 健身计划：今日运动类型、目标时长、开始记录；没有计划时提供快速安排。
5. 自媒体行动建议：由每日行动 Agent 根据灵感、待分析素材、选题状态和昨日复盘给出 1～3 个可执行建议。
6. 快捷记录：新增任务、记灵感、喝水、记饮食、开始运动。

“生成今日计划”流程：AI 提供重点候选 → 用户勾选和调整 → 保存到 `daily_focus_items`。AI 不自动占用用户的一天。

### 9.3 白天快速使用

- 首页头部提供固定的“快速添加”按钮。
- 完成任务后即时更新今日进度，但不弹出复杂复盘。
- 饮水采用常用容量一键记录。
- 灵感支持只填一句话，详细整理可留到晚上。
- 运动计划可直接进入计时或完成记录。

### 9.4 晚上打开

首屏按以下顺序组织：

1. 今日完成概览：重点任务、运动、自媒体行动和基础记录完成情况。
2. 数据缺口提醒：只提示用户设置为重要的项目，例如今天尚未记录饮水或运动；不制造负罪感。
3. 快捷数据记录：体重/三围、饮水、饮食、运动、自媒体数据、学习记录。
4. 今日复盘表单：做得好的、遇到的问题、今日收获、给明天的话，支持极简和完整两种模式。
5. AI 今日总结：用户提交记录后生成，明确区分事实、观察和明日建议。
6. 明日收件箱：可将未完成重点或 AI 建议确认后移入明日任务。

### 9.5 首页卡片的数据来源

| 卡片 | 事实来源 | AI 来源 |
| --- | --- | --- |
| 今日简报 | `source_items` | 每日简报 Agent 产物 |
| 今日重点 | `tasks`、`daily_focus_items` | 每日行动 Agent 候选 |
| 健身计划 | `health_exercise_plans` | 可选建议，不自动保存 |
| 自媒体行动 | 灵感、素材、选题、复盘 | 每日行动 Agent 产物 |
| 今日完成概览 | 各模块当天事实记录 | 无需 AI |
| 数据缺口 | 用户偏好与当天记录 | 无需 AI |
| AI 今日总结 | 当天事实与用户复盘 | 晚间复盘 Agent 产物 |

## 10. 完整页面路由设计

### 10.1 路由约定

- `new` 是独立全屏移动表单；简单记录也可由底部 Sheet 打开，但 URL 保持可直达。
- `[id]` 为详情页，编辑优先使用 `[id]/edit`，避免详情页状态含糊。
- 列表筛选使用 Query String，例如 `?status=active&tag=xxx`。
- “早晨/晚上”是 Dashboard 状态，不拆成两个 URL；可使用 `/?mode=morning` 手动切换。

### 10.2 认证、初始化和系统

| 路由 | 页面 | 主要能力 |
| --- | --- | --- |
| `/login` | 登录 | 邮箱或第三方登录 |
| `/auth/callback` | 登录回调 | 完成 Supabase 会话 |
| `/onboarding` | 首次设置 | 时区、关注主题、日程与隐私偏好 |
| `/offline` | 离线页 | 说明可用和不可用能力 |
| `/settings` | 设置首页 | 设置入口 |
| `/settings/profile` | 个人资料 | 名称、语言、时区 |
| `/settings/dashboard` | Dashboard 设置 | 时间、模块排序、记录提醒 |
| `/settings/ai` | AI 设置 | 个性化、数据授权、关注主题 |
| `/settings/notifications` | 通知设置 | 简报和记录提醒 |
| `/settings/privacy` | 隐私与数据 | 导出、保留、删除与图片权限 |

### 10.3 Dashboard 与任务

| 路由 | 页面 | 主要能力 |
| --- | --- | --- |
| `/` | 每日 Dashboard | 晨间、白天和晚间模式 |
| `/day/[date]` | 历史每日页 | 查看某天计划、记录与复盘 |
| `/day/[date]/review` | 每日复盘 | 填写或编辑复盘 |
| `/tasks` | 任务列表 | 今日、计划、已完成筛选 |
| `/tasks/new` | 新建任务 | 创建任务 |
| `/tasks/[id]` | 任务详情 | 查看任务与来源 |
| `/tasks/[id]/edit` | 编辑任务 | 修改任务 |

### 10.4 AI 秘书

| 路由 | 页面 | 主要能力 |
| --- | --- | --- |
| `/assistant` | AI 秘书首页 | 今日简报和近期 AI 产物 |
| `/assistant/briefings` | 简报历史 | 按日期和类型筛选 |
| `/assistant/briefings/[id]` | 简报详情 | 摘要、全文、来源和反馈 |
| `/assistant/ai-news` | AI 动态 | 专题历史 |
| `/assistant/solar` | 光伏新能源 | 专题历史 |
| `/assistant/media-trends` | 自媒体趋势 | 专题历史 |
| `/assistant/markets` | 投资市场 | 专题历史 |
| `/assistant/runs/[id]` | AI 任务状态 | 生成中、失败原因和重试 |
| `/assistant/preferences` | 简报偏好 | 来源、主题、频率和时间 |

### 10.5 自媒体

| 路由 | 页面 | 主要能力 |
| --- | --- | --- |
| `/media` | 自媒体总览 | 今日行动、漏斗与快捷入口 |
| `/media/inspirations` | 每日灵感 | 日期、状态、标签筛选 |
| `/media/inspirations/new` | 新建灵感 | 快速或完整录入 |
| `/media/inspirations/[id]` | 灵感详情 | 查看、完成、转选题 |
| `/media/inspirations/[id]/edit` | 编辑灵感 | 修改内容 |
| `/media/materials` | 爆款素材库 | 平台、内容类型、状态筛选 |
| `/media/materials/new` | 新增素材 | 链接、快照、指标录入 |
| `/media/materials/[id]` | 素材详情 | 指标历史、热点分析、视频拆解 |
| `/media/materials/[id]/edit` | 编辑素材 | 修改原始资料 |
| `/media/materials/[id]/analysis` | 素材分析 | 多版本热点分析与拆解 |
| `/media/materials/[id]/recreate` | 二创方案 | 生成、选择并转成选题 |
| `/media/topics` | 选题库 | 状态看板或列表 |
| `/media/topics/new` | 新建选题 | 手动新建 |
| `/media/topics/[id]` | 选题工作区 | 标题、素材、脚本、状态 |
| `/media/topics/[id]/edit` | 编辑选题 | 修改基本信息 |
| `/media/publications` | 已发布内容 | 内容及最新指标 |
| `/media/publications/new` | 录入发布内容 | 关联选题和平台 |
| `/media/publications/[id]` | 发布详情 | 指标时间线和复盘 |
| `/media/publications/[id]/metrics/new` | 录入内容数据 | 新增指标快照 |
| `/media/reviews` | 内容复盘历史 | 筛选和对比 |
| `/media/reviews/new` | 新建复盘 | 选择发布内容和指标 |
| `/media/reviews/[id]` | 复盘详情 | 手工复盘与 AI 建议 |
| `/media/library` | 内容资产库 | 标题、文案、脚本和链接 |
| `/media/tags` | 标签管理 | 标签增删改 |

### 10.6 技能学习

| 路由 | 页面 | 主要能力 |
| --- | --- | --- |
| `/learning` | 学习 Dashboard | 今日学习、进度和连续记录 |
| `/learning/skills` | 技能列表 | 分类和状态筛选 |
| `/learning/skills/new` | 新建技能 | 目标和计划 |
| `/learning/skills/[id]` | 技能详情 | 教程、记录、笔记与趋势 |
| `/learning/skills/[id]/edit` | 编辑技能 | 修改目标和状态 |
| `/learning/tutorials` | 教程收藏 | 类型、平台和状态筛选 |
| `/learning/tutorials/new` | 收藏教程 | 录入链接与信息 |
| `/learning/tutorials/[id]` | 教程详情 | 进度和关联学习记录 |
| `/learning/tutorials/[id]/edit` | 编辑教程 | 修改资料 |
| `/learning/sessions` | 学习记录 | 时间线与统计 |
| `/learning/sessions/new` | 新增学习记录 | 时长、内容、心得 |
| `/learning/sessions/[id]` | 学习记录详情 | 查看与编辑 |
| `/learning/progress` | 学习进度 | 技能趋势和阶段快照 |
| `/learning/notes` | 学习笔记 | 搜索和筛选 |
| `/learning/notes/new` | 新建笔记 | 关联技能或教程 |
| `/learning/notes/[id]` | 笔记详情 | 查看笔记 |
| `/learning/notes/[id]/edit` | 编辑笔记 | 修改笔记 |

### 10.7 身体管理

| 路由 | 页面 | 主要能力 |
| --- | --- | --- |
| `/health` | 身体 Dashboard | 今日记录、目标和趋势摘要 |
| `/health/measurements` | 体重与三围 | 趋势图和记录列表 |
| `/health/measurements/new` | 新增身体数据 | 体重、三围、体脂 |
| `/health/measurements/[id]/edit` | 编辑身体数据 | 修正记录 |
| `/health/posture` | 体态记录 | 时间线和对比组 |
| `/health/posture/new` | 新增体态记录 | 上传多角度照片 |
| `/health/posture/[id]` | 体态详情 | 私有照片和观察 |
| `/health/posture/compare` | 体态对比 | 选择两组记录，按需 AI 分析 |
| `/health/water` | 饮水 | 今日进度与历史 |
| `/health/water/new` | 饮水记录 | 快速或自定义容量 |
| `/health/cycle` | 生理期 | 周期日历与预测提示 |
| `/health/cycle/log` | 每日记录 | 流量、症状、疼痛和心情 |
| `/health/nutrition` | 饮食与热量 | 当日摄入、目标与餐次 |
| `/health/nutrition/meals/new` | 新增饮食 | 餐次和食物条目 |
| `/health/nutrition/meals/[id]` | 餐食详情 | 营养和估算来源 |
| `/health/nutrition/plans` | 饮食规划 | 日/周计划 |
| `/health/nutrition/plans/new` | 新增饮食计划 | 营养目标 |
| `/health/calories` | 热量记录 | 摄入、运动消耗和趋势 |
| `/health/exercise` | 运动 | 计划、历史与统计 |
| `/health/exercise/plans/new` | 新增运动计划 | 类型、时长和目标 |
| `/health/exercise/logs/new` | 新增运动记录 | 实际运动数据 |
| `/health/exercise/logs/[id]` | 运动详情 | 查看和编辑 |
| `/health/trends` | 身体趋势 | 指标趋势与 AI 周/月分析 |

### 10.8 财富管理

| 路由 | 页面 | 主要能力 |
| --- | --- | --- |
| `/wealth` | 财富 Dashboard | 总持仓、变化、行业暴露和提醒 |
| `/wealth/accounts` | 投资账户 | 账户列表 |
| `/wealth/accounts/new` | 新建账户 | 账户信息 |
| `/wealth/accounts/[id]` | 账户详情 | 持仓和流水 |
| `/wealth/funds` | 基金持仓 | 当前持仓和观察基金 |
| `/wealth/funds/search` | 基金搜索 | 按代码或名称查找 |
| `/wealth/funds/[id]` | 基金详情 | 净值、持仓、交易和行业暴露 |
| `/wealth/transactions` | 交易流水 | 筛选与导出 |
| `/wealth/transactions/new` | 新增交易 | 买入、卖出、分红和调整 |
| `/wealth/transactions/[id]/edit` | 编辑交易 | 修正流水 |
| `/wealth/positions` | 持仓快照 | 历史仓位与成本 |
| `/wealth/industries` | 行业分类 | 行业层级和基金暴露 |
| `/wealth/industries/[id]` | 行业详情 | 数据趋势与分析历史 |
| `/wealth/market` | 市场动态 | 数据截至时间与来源 |
| `/wealth/analyses` | 市场分析记录 | 组合、市场、行业、基金筛选 |
| `/wealth/analyses/new` | 新建分析 | 选择范围和数据快照 |
| `/wealth/analyses/[id]` | 分析详情 | 事实数据、AI 观察、风险与来源 |

### 10.9 全局入口

| 路由 | 页面 | 主要能力 |
| --- | --- | --- |
| `/search` | 全局搜索 | 搜索任务、灵感、素材、选题、笔记 |
| `/quick-add` | 快捷新增 | 任务、灵感、饮水、饮食、运动、学习 |
| `/notifications` | 通知中心 | 简报完成、提醒和 AI 任务状态 |

## 11. 导航信息架构

手机底部导航固定五项：

1. 首页：每日工作台。
2. AI 秘书：简报及所有 AI 产物。
3. 自媒体：当前最核心的生产模块。
4. 身体：高频记录模块。
5. 更多：技能学习、财富管理、设置。

全局悬浮“＋”打开快捷记录 Sheet。桌面端可切换为左侧导航，但路由保持一致。

## 12. 开发确认清单

开始开发前建议确认以下决策：

- [ ] Dashboard 的晨间和晚间默认切换时间。
- [ ] 首期自媒体重点平台及必须记录的指标。
- [ ] AI 简报允许使用的资讯源和市场数据源。
- [ ] 首期是否启用体态照片 AI 对比，或仅做安全存储与人工对比。
- [ ] 基金采用完整交易流水，还是先以手动持仓快照启动。
- [ ] 身体、投资数据是否允许进入个性化 AI 上下文，默认建议关闭后逐项授权。
- [ ] MVP 路由范围仍按原计划收敛，其余路由作为长期蓝图分阶段实现。

