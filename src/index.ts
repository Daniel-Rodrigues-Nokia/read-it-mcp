import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";
import { Jira } from "./jira.js";

const server = new McpServer({
  name: "summary-cypress-tests",
  version: "1.0.0",
});

server.registerTool(
  "complete_xray_workflow_from_summary",
  {
    title: "Create Xray ticket from summary and finish workflow",
    description:
      "Creates the Xray JIRA issue from title + summary, assigns the configured user, links it to the parent issue (fromTicket → new ticket), then transitions the new ticket to Closed. Call once after you have produced summary and title in chat. Abort semantics: stops at first API failure and returns isError with details.",
    inputSchema: {
      title: z
        .string()
        .min(1)
        .describe(
          "Short Xray issue summary line (derived from the Cypress test)",
        ),
      summary: z
        .string()
        .min(1)
        .describe(
          "Non-technical description body (same text you would pass to create-jira-ticket-for-cypress-test-summary)",
        ),
      fromTicket: z
        .string()
        .min(1)
        .describe(
          "Parent JIRA issue key (bug / improvement / task) for linkTickets(fromTicket, newXrayKey)",
        ),
    },
  },
  async ({ title, summary, fromTicket }) => {
    const jira = Jira.getInstance();

    const [newTicketID, createErr] = await jira.createTicket(title, summary);
    if (createErr != null || !newTicketID) {
      return {
        content: [
          {
            type: "text",
            text: `create_ticket failed: ${createErr?.message ?? "unknown error"}`,
          },
        ],
        isError: true,
      };
    }

    const [, assignErr] = await jira.assignTicketToUser(newTicketID);
    if (assignErr != null) {
      return {
        content: [
          {
            type: "text",
            text: `Ticket ${newTicketID} was created but assign failed: ${assignErr.message}. You may need to assign or clean up manually.`,
          },
        ],
        isError: true,
      };
    }

    const [, linkErr] = await jira.linkTickets(fromTicket, newTicketID);
    if (linkErr != null) {
      return {
        content: [
          {
            type: "text",
            text: `Ticket ${newTicketID} was created and assigned but link failed: ${linkErr.message}.`,
          },
        ],
        isError: true,
      };
    }

    const [, closeErr] = await jira.transitionTo(newTicketID, "Closed");
    if (closeErr != null) {
      return {
        content: [
          {
            type: "text",
            text: `Ticket ${newTicketID} was created, assigned, and linked but transition to Closed failed: ${closeErr.message}.`,
          },
        ],
        isError: true,
      };
    }

    const payload = {
      xrayTicketId: newTicketID,
      linkedTo: fromTicket,
      stepsCompleted: ["create", "assign", "link", "close"],
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(payload, null, 2),
        },
      ],
    };
  },
);

const main = async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("summary-cypress-tests MCP ready (stdio)");
};

main().catch((error) => {
  console.error("Fatal error in main", error);
  process.exit(1);
});
