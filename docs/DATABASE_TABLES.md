# MVP 数据库表清单

数据库共 26 张用户业务表，不包含 Supabase 自带的 Auth、Storage 和系统 Schema。

## Profile 与 Daily OS

| 表 | 用途 |
| --- | --- |
| `profiles` | 用户基础画像和每日时间偏好 |
| `profile_goals` | 用户长期及领域目标 |
| `tasks` | 任务事实记录 |
| `daily_pages` | 每日工作流状态 |
| `daily_focus_items` | 用户确认的今日重点快照 |
| `daily_reviews` | 晚间手工复盘与 AI 摘要关联 |

## AI 与确认

| 表 | 用途 |
| --- | --- |
| `ai_jobs` | 待执行 AI 任务 |
| `ai_runs` | 每次 AI 调用及用量状态 |
| `ai_artifacts` | 用户可见的版本化 AI 产物 |
| `ai_artifact_sources` | AI 产物引用来源 |
| `approval_requests` | AI 写入业务数据前的确认请求 |

## 自媒体

| 表 | 用途 |
| --- | --- |
| `media_accounts` | 自媒体账号基础信息 |
| `media_inspirations` | 每日灵感 |
| `media_viral_materials` | 爆款素材 |
| `media_material_analyses` | 热点、视频拆解和二创分析版本 |
| `media_topics` | 选题库 |
| `media_topic_sources` | 选题与灵感、素材的来源关系 |
| `media_publications` | 已发布内容 |
| `media_publication_metrics` | 作品指标历史快照 |
| `media_content_reviews` | 单条作品内容复盘 |

## Memory Lite

| 表 | 用途 |
| --- | --- |
| `memory_items` | 用户确认或待确认的长期记忆 |
| `memory_evidence` | 记忆的事实来源 |

## Health Lite

| 表 | 用途 |
| --- | --- |
| `health_water_logs` | 饮水流水 |
| `health_exercise_plans` | 运动计划 |
| `health_exercise_logs` | 实际运动记录 |
| `health_body_measurements` | MVP 体重记录 |

## 安全状态

- 所有 26 张表均启用 Row Level Security。
- 用户只能通过 `auth.uid()` 访问属于自己的记录。
- `anon` 仅获得只读 Data API 权限，RLS 会阻止匿名读取用户数据。
- `authenticated` 获得基础增删改查权限，实际数据范围仍由 RLS 限制。
- Migration 不包含任何 Seed 或测试数据。
