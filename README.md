# read-it-mcp

MCP (Model Context Protocol) server that wraps the **Cypress or JUnit** test → QA summary → **Xray Jira** workflow from [**read-it**](https://github.com/Daniel-Rodrigues-Nokia/read-it): create an Xray issue from a title and summary, assign it, link it to a parent ticket, and transition it to Closed. It is intended for use from **Visual Studio Code** with Copilot / agent features and a matching **skill** so the model summarizes tests first, then calls the tool once.

**Skills:** **Frontend** teams use **`SKILL-CYPRESS.md`**; **backend** teams use **`SKILL-JUNIT.md`** (both live under `skill/` in this repository).

## Relation to read-it

This repository is the MCP-oriented sibling of [read-it](https://github.com/Daniel-Rodrigues-Nokia/read-it). Use read-it for CLI-oriented workflows and environment setup details; use this server when you want the same Jira behavior exposed as a single MCP tool inside the editor.

## Prerequisites

- **Jira / Xray**: **Same `read-it.env` file as the read-it CLI**—same path on disk and the same variables. If read-it already works on your machine, you do not need a second env file or duplicate secrets for this MCP server. See [Configuration](#configuration).
- **VS Code**: MCP support enabled and a way to edit your MCP server list (for example **Settings → MCP** or the `mcp.json` fragment your team uses for stdio servers).

## Download & Run

Download the latest version from the [Releases](https://github.com/Daniel-Rodrigues-Nokia/read-it-mcp/releases) page.

## 1. Install the executable

The release asset **`sum-ts-mcp.zip`** contains the bundled entrypoint **`index.js`** (and a small `package.json` next to it). Unzip it, then move those files into a directory you control and keep that layout—for example `${HOME}/bin/sum-ts-mcp/`. In the next step, the MCP server’s `args` must point at **`index.js` in that same directory** (use the full path to that file).

## 2. Register the server in VS Code

Add a **stdio** server whose `args` use the path from step 1. Use a **Node** binary you are happy to run for this server (for example the same version you use with nvm).

Example (adapt `command` and the path in `args` to your machine):

```json
{
  "servers": {
    "summary-cypress-tests": {
      "type": "stdio",
      "command": "${env:HOME}/.nvm/versions/node/v22.14.0/bin/node",
      "args": ["${env:HOME}/bin/sum-ts-mcp/index.js"],
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

- **`command`**: Full path to `node`.
- **`args`**: First element is the full path to `index.js` in the directory you chose in step 1.
- **`cwd`**: `${workspaceFolder}` keeps the server rooted in the repo you have open; change if you need a fixed directory.

You can register a **second** server entry (for example `summary-junit-tests`) if you keep two unpacked directories—one for the Cypress-oriented build and one for the JUnit-oriented build—each with its own `index.js`.

Restart or reload the MCP connection in VS Code after saving.

## 3. Add the skill(s) to your project

Copy the skill file that matches your stack from this repository into your **target project’s** skills tree so the agent knows when and how to summarize tests before calling the MCP tool.

| Team         | Stack   | Copy from this repo      | Typical destination (yours may differ)                                                                                                                           |
| ------------ | ------- | ------------------------ | ----------------------------------------                                                                                                                         |
| **Frontend** | Cypress | `skill/SKILL-CYPRESS.md` | e.g. `<your-project>/.github/skills/cypress-xray-from-test/SKILL.                                                                                                |
| **Backend**  | JUnit   | `skill/SKILL-JUNIT.md`   | e.g. `<your-project>/.github/skills/junit-xray-from-test/SKILL.md`  |

Keep frontmatter consistent with discovery in your editor, for example:

- Cypress skill: `name: cypress-xray-from-test`
- JUnit skill: `name: junit-xray-from-test`

Each skill names the MCP server it expects (**`summary-cypress-tests`** vs **`summary-junit-tests`**). Align the server **key** in `mcp.json` with the identifier used in the skill, or adjust one side so they match.

## 4. Usage

With the server running and the appropriate skill present, you can prompt in natural language. For example:

> Grab this test **BP-13046** and summarize it. The original ticket is **BP-13655**.

- **Test reference** (here `BP-13046`): however your skill describes locating the test (ticket key in the title, file path, method name for JUnit, etc.).
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

