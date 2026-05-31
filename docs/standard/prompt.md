# Harness Engineering Prompts

本文档沉淀两类可复用提示词：

- 项目级模板提示词：用于把一个成熟项目的 harness engineering 提炼成可迁移模板。
- 示例项目提示词：用于把本仓库的 harness engineering 迁移到 Go 项目 `user-profile-be`。

参考思想：[阿里文章](https://mp.weixin.qq.com/s/rlIyIIZOXFObNIXbPI7gDg)中的应用 Owner 模式。

## 提炼原则

迁移 harness engineering 时，不要把源项目当成“文件模板仓库”，而要把它当成“工程操作系统样本”。可迁移的是流程、状态机、证据、门禁和反馈回路；不可直接迁移的是业务知识、技术栈细节、历史 runs 和项目专属风险判断。

推荐按四层拆分：

1. Owner 调度层：Application Owner、十阶段流程、人工确认点、失败回退。
2. 证据门禁层：OpenSpec、run ledger、YAML schema、change manifest、evidence checksum、review findings。
3. 事件触发层：可选 Git hooks、安装脚本、hook bypass 规则。
4. 项目知识层：目标项目的架构、模块、protected paths、测试/构建/部署命令、baseline specs。

## 项目级模板提示词

适用场景：已经有一个项目具备较完整的 `.harness`、OpenSpec、阶段 skill、证据 ledger、门禁脚本，希望把它抽象成另一个项目可复用的 harness engineering 模板。

```text
你是项目级 Harness Engineering 架构师。请从一个成熟项目中提炼可迁移的 harness engineering 模板，并为目标项目生成落地方案。

输入：
- 源项目路径：<source_project_path>
- 目标项目路径：<target_project_path>
- 源项目 harness 目录：<source_project_path>/.harness
- 源项目 OpenSpec 目录：<source_project_path>/openspec
- 源项目 hook 目录：<source_project_path>/.harness/hooks
- 目标项目主要语言/框架：<target_stack>
- 目标项目核心服务/模块：<target_modules>
- 目标项目默认验证命令：<target_verify_commands>

目标：
1. 保留源项目中可复用的 harness 方法论，而不是复制源项目业务知识。
2. 迁移项目级 Application Owner 模式：
   Requirement Analysis -> Requirement Review -> Coding Implementation -> Code Review -> Unit Test Writing -> Unit Test Review -> Pre-merge Packaging -> CI Validation -> Deployment Verification -> User Confirmation and Archive。
3. 生成目标项目自己的 `.harness` 结构、OpenSpec baseline、protected path policy、验证脚本、状态脚本、负例测试、可选 Git hooks 和 golden samples。
4. 让后续需求可以用一句话触发：
   按 harness 流程实现 <需求>，先给我用中文写的 proposal/design/specs/tasks 确认。

必须遵守：
1. 先阅读源项目的 `.harness/README.md`、`.harness/agents/application-owner.md`、`.harness/workflows/HARNESS_WORKFLOW.md`、`.harness/scripts/verify.sh`、`.harness/scripts/harness-status.sh`、`.harness/scripts/start-change.sh`、`.harness/scripts/test-harness.sh`、`.harness/scripts/install-hooks.sh`、`.harness/hooks/README.md`。
2. 再阅读目标项目的 README、依赖文件、目录结构、构建脚本、部署配置、测试入口和已有 docs。
3. 不要直接复制源项目的业务 specs、wiki、历史 runs、Java/Maven/MyBatis 等项目专属规则。
4. 保留通用 harness 资产：
   - `.harness/agents`
   - `.harness/hooks`
   - `.harness/rules`
   - `.harness/skills`
   - `.harness/wiki`
   - `.harness/runs`
   - `.harness/incidents`
   - `.harness/mcp`
   - `.harness/policies`
   - `.harness/schemas`
   - `.harness/scripts`
   - `.harness/templates`
   - `.harness/workflows`
5. 为目标项目重写：
   - `.harness/agents/application-owner.md`
   - `.harness/README.md`
   - `.harness/policies/protected-paths.yaml`
   - `.harness/wiki/*`
   - OpenSpec baseline specs
   - 验证命令和 CI/test/deploy 说明
6. 可选 Git hooks 只能作为本地安全网，不替代十阶段流程、CI/MR 门禁和人工确认：
   - 只能通过 `.harness/scripts/install-hooks.sh` 显式设置 `core.hooksPath=.harness/hooks`，默认不偷偷启用。
   - `pre-commit` 运行 quick harness gate，并透传 `HARNESS_CHANGE_ID`、`HARNESS_DIFF_BASE`。
   - `pre-push` 优先推断 push base；有 change-id 时运行 `--strict-run`，无 active change-id 时退回 quick gate，避免 docs/harness-only push 被误拦。
   - `prepare-commit-msg` 只追加注释形式的 change-id、status 和 verify 提示，不改用户正文。
   - 支持 `HARNESS_HOOK_BYPASS=1` 临时绕过，并要求在 pre-merge 或 review 摘要说明原因。
7. 在改业务代码之前，先给我迁移 proposal/design/specs/tasks 确认；这四类工件的叙述正文必须用中文写，OpenSpec 结构关键字、文件名、命令、代码标识、API 字段和常见技术缩写可以保留英文。

目标产物：
1. `.harness/README.md`：说明人如何使用 harness。
2. `.harness/agents/application-owner.md`：目标项目 Owner Agent 画像。
3. `.harness/workflows/HARNESS_WORKFLOW.md`：十阶段流程、产物、门禁、失败回退、人工确认点。
4. `.harness/policies/protected-paths.yaml`：目标项目 protected path 矩阵。
5. `.harness/scripts/start-change.sh`：一键生成 OpenSpec change、run 目录、run_state、summary、intake 和阶段模板。
6. `.harness/scripts/harness-status.sh`：显示当前 stage、缺失产物、open MUST_FIX、推荐下一步。
7. `.harness/scripts/verify.sh`：校验 OpenSpec、run_state、summary、manifest、evidence、review findings、protected path policy。
8. `.harness/scripts/test-harness.sh`：用负例证明 schema、checksum、review findings、protected path 门禁会失败。
9. `.harness/scripts/install-hooks.sh`：支持安装、查看状态、卸载 hooks。
10. `.harness/hooks/pre-commit`：提交前运行 quick harness gate。
11. `.harness/hooks/pre-push`：存在 change-id 时运行 strict-run gate；没有 active change-id 时退回 quick gate。
12. `.harness/hooks/prepare-commit-msg`：给提交信息追加注释形式的 change-id、status、verify 提示。
13. `.harness/hooks/README.md`：说明 hooks 的安装、状态查看、卸载、绕过和定位。
14. OpenSpec baseline specs：覆盖目标项目最核心的 5-8 个业务/运行能力。
15. Golden samples：至少一个普通需求样例，一个 protected path 样例。

验收标准：
1. 不改业务代码也能运行 harness 自检。
2. `.harness/scripts/verify.sh --strict-run` 能验证 golden sample。
3. `.harness/scripts/test-harness.sh` 能证明负例会失败。
4. `harness-status.sh` 能告诉 agent 下一阶段该读什么、做什么、缺什么。
5. `install-hooks.sh --status` 能显示本地 Git hook 接入状态，且 hook 默认必须显式安装。
6. `test-harness.sh` 覆盖 hook shell 校验、`install-hooks.sh --status`、`prepare-commit-msg` change-id hint、hook bypass、pre-push quick fallback。
7. `pre-push` 不会因为 docs/harness-only 改动且没有 active change-id 而误拦，但行为代码变更仍会由 `verify.sh` 要求 OpenSpec 和 run evidence。
8. 文档能让人知道：提需求只需要说“按 harness 流程实现 <需求>，先给我用中文写的 proposal/design/specs/tasks 确认。”
```

## user-profile-be 示例提示词

适用场景：把本仓库 `ab-test-platform-be` 当前的 harness engineering 迁移到 Go 项目 `/Users/jinhong.huang/release/code/gitlab/user-profile-be`。

```text
你是项目级 Harness Engineering 架构师。请把下面源项目中的 harness engineering 方法迁移到 Go 项目 user-profile-be。

源项目：
- /Users/jinhong.huang/release/code/gitlab/ab-test-platform-be

目标项目：
- /Users/jinhong.huang/release/code/gitlab/user-profile-be

参考目录：
- 源 harness：/Users/jinhong.huang/release/code/gitlab/ab-test-platform-be/.harness
- 源 OpenSpec：/Users/jinhong.huang/release/code/gitlab/ab-test-platform-be/openspec
- 目标 docs：/Users/jinhong.huang/release/code/gitlab/user-profile-be/docs
- 目标 Go module：/Users/jinhong.huang/release/code/gitlab/user-profile-be/go.mod

目标项目画像：
- Go 1.18 module，module 名称为 `profile`。
- 服务目录包括：
  - `persona_server`
  - `persona_api_server`
  - `persona_sync_server`
  - `persona_pn_server`
  - `server`
- 常见业务/基础设施目录包括：
  - `apis`
  - `common`
  - `model`
  - `db`
  - `res`
  - `deploy`
  - `script`
  - `tools`
  - `docs`
- 主要依赖包括 Gin、Redis、MySQL、XORM、Kafka、HBase、Hive、Trino、KMS、Prometheus、protobuf。

请按以下要求执行：
1. 保留 ab-test-platform-be 中成熟的 harness 架构思想：
   - Application Owner Agent
   - OpenSpec 作为需求事实源
   - `.harness/runs` 作为十阶段执行证据
   - YAML schema 作为机器可判定门禁
   - protected path policy 作为高风险路径控制
   - golden sample 和 negative tests 作为 harness 自证机制
   - optional Git hooks 作为本地事件触发层
2. 不要复制 ab-test-platform-be 的业务知识：
   - 不复制 AB Test、SPEX、Spring Boot、Maven、MyBatis、Java module 的项目专属内容。
   - 只复用通用流程、目录、schema、脚本思路和文档结构。
3. 为 user-profile-be 重写 `.harness/agents/application-owner.md`，描述 Go 项目的真实结构、风险路径、验证方式和人工确认点。
4. 为 user-profile-be 设计 protected path policy，至少覆盖：
   - `deploy/`
   - `persona_*_server/conf/`
   - `persona_*_server/Dockerfile`
   - `db/*.sql`
   - `apis/`
   - `model/`
   - `res/`
   - `common/schema`
   - `common/protos`
   - `go.mod`
   - `go.sum`
   - `vendor/modules.txt`
5. 把验证命令改成 Go 项目可用的形式。优先探测项目已有脚本；如果没有明确脚本，默认使用：
   - `go test -mod=vendor ./...`
   - 必要时补充 `go test ./...`
   - 如发现项目已有 build/test/deploy 脚本，以项目脚本为准。
6. 建立 user-profile-be 的 baseline specs，优先覆盖：
   - service-startup-and-runtime-config
   - persona-query-api
   - group-and-tag-management
   - profile-data-sync
   - database-schema-and-model-contract
   - deployment-packaging
   - observability-and-alerting
7. 生成至少两个 golden samples：
   - 一个普通 Go API 或业务逻辑变更样例。
   - 一个 protected path 样例，例如 `db`、`deploy` 或 `conf` 变更，必须体现人工确认和回滚说明。
8. 保留 `.codex/skills/codex-owner/SKILL.md` 作为 Codex 入口，但内容改成 user-profile-be 的十阶段 Owner 调度。
9. 增加可选 Git hooks：
   - `pre-commit` 运行快速 harness gate，并透传 `HARNESS_CHANGE_ID`、`HARNESS_DIFF_BASE`。
   - `pre-push` 尽量推断 push base；存在 change-id 时运行 `verify.sh --strict-run`，没有 active change-id 时退回轻量 gate，避免 docs/harness-only push 被误拦。
   - `prepare-commit-msg` 追加注释形式的 change-id、status 和 verify 提示，不改用户正文。
   - `install-hooks.sh` 支持安装、`--status`、`--uninstall`，并且只能显式设置 `core.hooksPath=.harness/hooks`，不要偷偷启用。
   - 支持 `HARNESS_HOOK_BYPASS=1` 临时绕过，绕过原因写入 pre-merge 或 review 摘要。
10. 先不要改业务代码。先生成迁移用的 proposal/design/specs/tasks 给我确认；这四类工件的叙述正文必须用中文写，OpenSpec 结构关键字、文件名、命令、代码标识、API 字段和常见技术缩写可以保留英文。

完成后的目标效果：
1. 在 user-profile-be 中，需求方只需要说：
   按 harness 流程实现 <需求>，先给我用中文写的 proposal/design/specs/tasks 确认。
2. Agent 能自动创建 OpenSpec change 和 `.harness/runs/<change-id>/`。
3. Agent 会按十阶段推进，并在需求确认、protected path、pre-merge、deploy、final archive 等边界等待人工确认。
4. `harness-status.sh` 能告诉接手 agent 当前阶段、缺失产物、open MUST_FIX 和推荐下一步。
5. `verify.sh --strict-run` 能阻止跳阶段、缺证据、checksum 不一致、Open MUST_FIX、protected path 缺确认等问题。
```

## 后续需求提示词

迁移完成后，业务方在目标项目中提需求时推荐使用：

```text
按 harness 流程实现 <需求>，先给我用中文写的 proposal/design/specs/tasks 确认。
```

涉及高风险路径时推荐补充：

```text
请特别检查 deploy/conf/db/api/model/common/res/go.mod/go.sum/vendor 这些 protected paths，并在 design 中说明影响、回滚和验证方式。
```
