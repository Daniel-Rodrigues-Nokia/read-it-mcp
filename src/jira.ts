import { loadEnvFile } from "node:process";

type Transition = {
  type: string;
  transitions: {
    id: string;
    name: string;
    description: string;
    opsbarSequence: string;
    to: string;
  }[];
};

type Fields = {
  project: { key: string };
  summary: string;
  issuetype: { name: "Xray Test" };
  description: string;
  customfield_12790: string;
};

type LinkTickets = {
  type: { name: string };
  inwardIssue: { key: string };
  outwardIssue: { key: string };
};

type AssignTicket = {
  name: string;
};

type CreateTicket = {
  fields: Fields;
};

const envPath = "/home/danirodr/.config/read-it.env";

export class Jira {
  static #instance: Jira | null = null;
  static #url: string;
  static #project: string;
  static #epic: string;
  static #user: string;
  static #pat: string;

  private constructor() {
    // load .env file first
    loadEnvFile(envPath);

    const { JIRA_URL, JIRA_PROJECT, JIRA_EPIC, JIRA_USER, JIRA_API_KEY } =
      process.env;

    if (!JIRA_URL) throw Error("[Fail]: JIRA_URL variable was not found.");
    if (!JIRA_PROJECT)
      throw Error("[Fail]: JIRA_PROJECT variable was not found.");
    if (!JIRA_EPIC) throw Error("[Fail]: JIRA_EPIC variable was not found.");
    if (!JIRA_USER) throw Error("[Fail]: JIRA_USER variable was not found.");
    if (!JIRA_API_KEY)
      throw Error("[Fail]: JIRA_API_KEY variable was not found.");

    Jira.#url = JIRA_URL;
    Jira.#project = JIRA_PROJECT;
    Jira.#epic = JIRA_EPIC;
    Jira.#user = JIRA_USER;
    Jira.#pat = JIRA_API_KEY;
  }

  private static async doFetch<T>(
    endpoint: string,
    options: Omit<RequestInit, "headers">,
    noBody = false,
  ) {
    const headers = new Headers();

    headers.set("Content-type", "application/json");
    headers.set("Authorization", `Bearer ${Jira.#pat}`);

    try {
      const url = `${Jira.#url}/rest/${endpoint}`;
      const response = await fetch(url, { headers, ...options });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`[Fail]: ${response.status} ${text}`);
      }

      if (noBody) {
        return [null as T, null] as const;
      }

      return [(await response.json()) as T, null] as const;
    } catch (error) {
      return [null, error as Error] as const;
    }
  }

  private async getAllTransitions(ticketID: string, state: string) {
    const [transition, error] = await Jira.doFetch<Transition>(
      `api/latest/issue/${ticketID}/transitions`,
      {
        method: "GET",
      },
    );

    if (error != null) return [null, error] as const;

    const matchedTransition = transition.transitions.find(
      ({ name }) => name.trim().toLowerCase() === state.trim().toLowerCase(),
    );

    if (matchedTransition == null) {
      return [
        null,
        new Error(`failed to find transition state ${state}`),
      ] as const;
    }

    return [matchedTransition, null] as const;
  }

  public static getInstance() {
    if (Jira.#instance === null) {
      Jira.#instance = new Jira();
    }

    return Jira.#instance;
  }

  public async createTicket(title: string, desc: string) {
    const payload: CreateTicket = {
      fields: {
        project: { key: Jira.#project },
        summary: title,
        issuetype: { name: "Xray Test" },
        description: desc,
        customfield_12790: Jira.#epic, // NOTE: use this custom field to set an Epic link to the xray ticket
      },
    };

    const [resp, error] = await Jira.doFetch<{ key: unknown }>(
      "api/latest/issue",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );

    if (error != null) return [null, error] as const;

    return [String(resp.key), null] as const;
  }

  public async assignTicketToUser(ticketID: string) {
    const payload: AssignTicket = {
      name: Jira.#user,
    };

    const [_, error] = await Jira.doFetch<null>(
      `api/latest/issue/${ticketID}/assignee`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
      true,
    );

    if (error != null) return [null, error] as const;

    return [null, null] as const;
  }

  public async linkTickets(fromTicket: string, toTicket: string) {
    const payload: LinkTickets = {
      type: { name: "Is a test for" },
      inwardIssue: { key: fromTicket },
      outwardIssue: { key: toTicket },
    };

    const [_, error] = await Jira.doFetch<null>(
      `api/latest/issueLink`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true,
    );

    if (error != null) return [null, error] as const;

    return [null, null] as const;
  }

  public async transitionTo(ticketID: string, state: string) {
    const [transition, transError] = await this.getAllTransitions(
      ticketID,
      state,
    );

    if (transError != null) {
      return [null, transError];
    }

    const payload = {
      transition: { id: transition.id },
    };

    const [_, error] = await Jira.doFetch<null>(
      `api/latest/issue/${ticketID}/transitions`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true,
    );

    if (error != null) return [null, error] as const;

    return [null, null] as const;
  }
}
