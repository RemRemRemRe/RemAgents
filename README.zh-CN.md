# RemAgents

面向 Rem 项目的 pi-web subagent profiles —— 一组按**工作流阶段**（方案决策 →
代码编写 → 代码Review → 编译与测试验证 → 调试 → Git 整理提交）组织的
[pi-web](https://github.com/agegr/pi-web) 内置 subagent 配置，让主会话把每个
阶段委派给聚焦的、技能感知的子代理。

> **English version**: [README.md](README.md)

两份语言版本保持精确同步 —— 一句话简介与各 profile 自身的 `description` /
`display_name` 保持一致；profile 变更时，两份文件在同一改动中同步更新。

## 内容

| profile | 显示名 | 工作流阶段 | 工具 | 聚焦 |
|---|---|---|---|---|
| `grill` | Plan & Decision | 方案决策 | 只读 | batch-grill-with-docs：探索、决策图建模、返回问题批次 |
| `author` | Code Authoring | 代码编写 + 测试编写 | 全量 | UE C++ 编写、BDD spec、TDD、重构、Rem 专属技能 |
| `review` | Code Review | 统一风格代码Review | 只读 | cpp 最佳实践清单、BDD 测试树分层审查、测试完备性、代码库一致性 |
| `verify` | Build & Test | 编译 + 无头测试 | 全量 | 提交工作流验证关卡：测试完备性检查、编译、无头跑测试 |
| `debug` | Debugging | 运行时根因 | 全量 | Rider 实时调试、调试器驱动分析 |
| `git` | Git & Commit | 子模块更新 + 提交 | 全量 | 子模块同步/推送、单职责提交、历史整理、构建+测试关卡 |
| `skill-authoring` | Skill Authoring | 元能力（维护技能） | 全量 | 技能写作、公开化、MCP 服务器编写、知识沉淀 |

## 工作原理

- pi-web 从 `<cwd>/.pi/agents/*.md`（**项目作用域**）或
  `~/.pi/agent/agents/*.md`（**全局作用域**）加载 profile；优先级：
  builtin < global < workspace < project。
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
2. 把本仓库的 `agents/` 链接到项目作用域。Windows 示例（junction 无需管理员
   权限）：

   ```powershell
   New-Item -ItemType Junction -Path "<cwd>\.pi\agents" -Target "<repo路径>\agents"
   ```

3. 重启或 reload pi-web 会话，Agent 工具即可识别新 profile。
4. 项目特定值（构建路径、测试前缀、插件清单）**不在本仓库** —— 它们位于
   项目的私有配套技能中，profile 仅按名引用。

## 注意事项

- profile 仅在会话 `cwd` 恰为项目作用域目录时可见 —— pi-web 不做祖先目录
  回溯。
- `grill` profile 固定了模型/思考级别作为建议；可通过 Agent 工具的
  `model`/`thinking` 参数按次覆盖。

## License

MIT
