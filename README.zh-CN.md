# RemAgents

面向 Rem 项目的 pi-web subagent profiles —— 一组按**工作流阶段**（取证 →
方案决策 → 代码编写 → 代码Review → 编译与测试验证 → 调试 → Git 整理提交）
组织的 [pi-web](https://github.com/agegr/pi-web) 内置 subagent 配置，围绕
**决策 / 执行边界**构建：主会话只持决策上下文，执行者自包含并回传有界、
带证据的报告。

> **English version**: [README.md](README.md)

两份语言版本保持精确同步 —— 一句话简介与各 profile 自身的 `description` /
`display_name` 保持一致；profile 变更时，两份文件在同一改动中同步更新。

## 内容

| profile | 显示名 | 工作流阶段 | 工具 | 聚焦 |
|---|---|---|---|---|
| `recon` | Repo Recon | 事实取证 | 只读 | 只读取证：解析可查证的事实，返回 `file:line` 事实清单而非散文 |
| `grill` | Plan & Decision | 决策分析 | 只读 | batch-grill-with-docs：决策图 + 带推荐答案的待决问题前沿 |
| `author` | Code Authoring | 代码编写 + 测试编写 | 全量 | 实现一个已定案的工作单元，以编译受影响 target 自验证 |
| `review` | Code Review | 统一风格代码Review | 只读 | cpp 最佳实践清单、BDD 测试树分层审查、测试完备性、代码库一致性 |
| `verify` | Build & Test | 编译 + 无头测试 | 全量 | 测试完备性关卡、编译、无头跑测试；日志落盘 |
| `debug` | Debugging | 运行时根因 | 全量 | 调试器驱动的证据链、根因、修复建议 |
| `git` | Git & Commit | 子模块更新 + 提交 | 全量 | 子模块同步/推送、单职责提交、历史整理、构建+测试关卡 |
| `skill-authoring` | Skill Authoring | 元能力（维护技能） | 全量 | 技能写作、公开化、MCP 服务器编写、知识沉淀 |

## 边界模型

切分轴是**上下文体积 × 决策耦合度**，不是"思考 / 执行"：探索既是思考、
也是最大的上下文负担；而执行本身内含决策（commit 拆分、修复策略、测试用例
选择）。

| | 决策耦合低 | 决策耦合高 |
|---|---|---|
| **体积高** | 委派（构建、测试、git、批量检索） | 拆步：取证放执行者，判断留主会话 |
| **体积低** | 主会话直接做（委派是净成本） | 主会话直接做 |

三层结构：

1. **主会话 = 决策账本。** 目标、约束、验收标准、决策日志、计划、事实地图、
   工件指针。它**不**持构建日志、大文件正文、完整 diff。
2. **执行者 = 三契约。** *Brief 进*（OBJECTIVE / SCOPE / CONSTRAINTS /
   ACCEPTANCE / REPORT）、*执行规则*（技能、自验证循环、允许/禁止动作、
   停止条件）、*报告出*（下列有界骨架）。
3. **工件落盘。** `<cwd>/.agents/runs/<run-id>/` 存放 `brief.md`、`state.md`、
   `*.log`、`report.md` —— 隔离在上下文压缩与后台执行下依然可恢复。

### 报告契约

子代理的最终消息是唯一回传通道，会原样进入父会话上下文，因此限制在 ~40 行：

```
RESULT:   done | blocked | failed
CHANGES:  <file:line，或 none>
EVIDENCE: <命令 + 关键输出行 + 退出码>
RISKS:
NEXT:
DETAIL:   <run-dir 路径>
```

每个断言都带证据；日志写入 run 目录并按路径引用，绝不粘贴。失败必须归因到
**brief 缺陷 / 执行缺陷 / 环境缺陷**。

## 工作原理

- pi-web 从 `~/.pi/agent/agents/*.md`（**全局**）、`<cwd>/.agents/agents/*.md`
  （**workspace**）或 `<cwd>/.pi/agents/*.md`（**项目**）加载 profile；
  优先级：builtin < global < workspace < project。
- 每个 profile 是带 YAML frontmatter 的 markdown：`tools`（白名单：
  read/bash/edit/write/grep/find/ls）、`load_skills`、`load_extensions`、
  `enabled`、`inherit_context`、`run_in_background`，可选 `model`/
  `thinking`/`max_turns`，正文即 systemPrompt。
- 主会话通过 Agent 工具以 `subagent_type` 委派。
- `load_skills`/`load_extensions`：子代理加载项目的技能集合（如 Rem 技能及
  私有配套）与扩展工具（MCP，如 Rider 文本搜索），由项目的 `skills` 设置配置。

## 安装

1. 启用 pi-web 内置 subagent：`~/.pi/agent/agents/settings.json` →
   `builtInEnabled: true`。
2. 把本仓库的 `agents/` 链接到项目的 **workspace** 作用域。Windows 示例
   （junction 无需管理员权限）：

   ```powershell
   New-Item -ItemType Junction -Path "<cwd>\.agents\agents" -Target "<repo路径>\agents"
   ```

3. 可选：再把 run 目录链接上，使约定文档与运行产物共享同一路径：

   ```powershell
   New-Item -ItemType Junction -Path "<cwd>\.agents\runs" -Target "<repo路径>\runs"
   ```

4. 重启或 reload pi-web 会话，Agent 工具即可识别新 profile。
5. 项目特定值（构建路径、测试前缀、插件清单）**不在本仓库** —— 它们位于
   项目的私有配套技能中，profile 仅按名引用。

## 注意事项

- profile 仅在会话 `cwd` 恰为项目作用域目录时可见 —— pi-web 不做祖先目录
  回溯。
- 没有 profile 固定模型：执行者默认继承父会话的模型，除非 Agent 调用用
  `model`/`thinking` 参数覆盖。
- `verify` 与 `git` 默认 `run_in_background: true`；完成后父会话会收到最终
  报告通知。
- `runs/` 下只有约定文档与模板被追踪；运行产物（`<run-id>/brief.md`、
  `state.md`、`*.log`、`report.md`）被 gitignore，仅存本地。
- `tools/validate-profiles.mjs` 用 pi-web 真实解析器校验 profile：frontmatter
  回退、scope、报告骨架字段，以及 `runs/` 产物守卫。机器路径来自
  `tools/validate.local.json` —— 每个克隆复制一次
  `tools/validate.local.example.json`（该文件 gitignored）；也可用
  `--pi-web`/`--cwd` 或 `PI_WEB_ROOT`/`PROJECT_CWD`。
- 可选：安装本地 pre-push 门禁（`git config core.hooksPath .githooks`），
  推送前自动校验。退出码 2（路径未配置）**跳过**而非阻断；
  `git push --no-verify` 是故意留的绕过口。

## License

MIT
