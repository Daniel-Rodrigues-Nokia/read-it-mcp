# read-it-mcp

MCP (Model Context Protocol) server that wraps the Cypress test → QA summary → **Xray Jira** workflow from [**read-it**](https://github.com/Daniel-Rodrigues-Nokia/read-it): create an Xray issue from a title and summary, assign it, link it to a parent ticket, and transition it to Closed. It is intended for use from **Visual Studio Code** with Copilot / agent features and a matching **skill** so the model summarizes tests first, then calls the tool once.

## Relation to read-it

This repository is the MCP-oriented sibling of [read-it](https://github.com/Daniel-Rodrigues-Nokia/read-it). Use read-it for CLI-oriented workflows and environment setup details; use this server when you want the same Jira behavior exposed as a single MCP tool inside the editor.

## Prerequisites

- **Jira / Xray**: **Same `read-it.env` file as the read-it CLI**—same path on disk and the same variables. If read-it already works on your machine, you do not need a second env file or duplicate secrets for this MCP server. See [Configuration](#configuration).
- **VS Code**: MCP support enabled and a way to edit your MCP server list (for example **Settings → MCP** or the `mcp.json` fragment your team uses for stdio servers).

## 1. Install the executable (SEA)

Build or obtain the **single-executable application (SEA)** bundle for this server (see [Node.js SEA](https://nodejs.org/api/single-executable-applications.html); same idea as packaging read-it’s MCP if you already do that). Copy the resulting script/binary into a directory you control, for example:

```bash
mkdir -p "${HOME}/bin"
cp /path/to/your-built-mcp.sea.js "${HOME}/bin/read-it-mcp.js"
```

Adjust the source path to match whatever your SEA build produces. The important part is a **stable path** and the filename you use in VS Code `args` (here **`read-it-mcp.js`**).

## 2. Register the server in VS Code

Add a **stdio** server whose `args` point at the file from step 1. Use a **Node** binary that matches what you built against (for example the same version you use with nvm).

Example (adapt `command` to your machine; server id and script name match the keys below):

```json
{
  "servers": {
    "sum-cypress-tests": {
      "type": "stdio",
      "command": "${env:HOME}/.nvm/versions/node/v22.14.0/bin/node",
      "args": ["${env:HOME}/bin/read-it-mcp.js"],
      "cwd": "${workspaceFolder}",
      "dev": {
        "debug": {
          "type": "node"
        }
      }
    }
  },
  "inputs": []
}
```

Notes:

- **`command`**: Full path to `node` (nvm, fnm, system Node, etc.).
- **`args`**: First element must be the SEA (or bundled entry) you copied in step 1 (for example `${env:HOME}/bin/read-it-mcp.js`).
- **`cwd`**: `${workspaceFolder}` keeps the server rooted in the repo you have open; change if you need a fixed directory.

Restart or reload the MCP connection in VS Code after saving.

## 3. Add the skill to your project

Copy **`skill/SKILL.md`** from this repository into your **target project’s** skills tree so the agent knows when and how to summarize Cypress tests before calling the MCP tool.

Example destination (yours may differ):

```text
<your-project>/.github/skills/cypress-xray-from-test/SKILL.md
```

The frontmatter `name: cypress-xray-from-test` should stay consistent with how your editor discovers skills.

## 4. Usage

With the server running and the skill present, you can prompt in natural language. For example:

> Grab this test **BP-13046** and summarize it. The original ticket is **BP-13655**.

- **Test reference** (here `BP-13046`): however your skill describes locating the Cypress test (ticket key in the test title, path, etc.).
- **Original / parent ticket** (`BP-13655`): maps to the `fromTicket` argument for linking in Jira.

The skill instructs the agent to **finish the QA summary first**, then invoke the MCP tool **`complete_xray_workflow_from_summary`** once with `title`, `summary`, and `fromTicket`.

## Configuration

This MCP server loads **the same `read-it.env` credentials file** that [read-it](https://github.com/Daniel-Rodrigues-Nokia/read-it) uses: same filename, same directory convention (on Linux, typically **`~/.config/read-it.env`**, i.e. the OS user config dir plus `read-it.env`, as [documented in read-it](https://github.com/Daniel-Rodrigues-Nokia/read-it#configuration)). Anyone who has already set up read-it can use this MCP version without creating or maintaining a separate env file.

The variables in that file are the same as in read-it:

- `JIRA_URL`
- `JIRA_PROJECT`
- `JIRA_EPIC`
- `JIRA_USER`
- `JIRA_API_KEY`

