import type { PartySocket } from "partysocket";
import { usePartySocket } from "partysocket/react";

/**
 * Options for the useAgent hook
 * @template State Type of the Agent's state
 */
export type UseAgentOptions<State = unknown> = Omit<
  Parameters<typeof usePartySocket>[0],
  "party" | "room"
> & {
  /** Name of the agent to connect to */
  agent: string;
  /** Name of the specific Agent instance */
  name?: string;
  /** Called when the Agent's state is updated */
  onStateUpdate?: (state: State, source: "server" | "client") => void;
};

/**
 * React hook for connecting to an Agent
 * @template State Type of the Agent's state
 * @param options Connection options
 * @returns WebSocket connection with setState method
 */
export function useAgent<State = unknown>(
  options: UseAgentOptions<State>
): PartySocket & {
  agent: string;
  name: string;
  setState: (state: State) => void;
} {
  const agent = usePartySocket({
    prefix: "agents",
    party: options.agent,
    room: options.name || "default",
    ...options,
    onMessage: (message) => {
      if (typeof message.data === "string") {
        const parsedMessage = JSON.parse(message.data);
        if (parsedMessage.type === "cf_agent_state") {
          options.onStateUpdate?.(parsedMessage.state, "server");
          return;
        }
      }
      options.onMessage?.(message);
    },
  }) as PartySocket & {
    agent: string;
    name: string;
    setState: (state: State) => void;
  };

  agent.setState = (state: State) => {
    agent.send(JSON.stringify({ type: "cf_agent_state", state }));
    options.onStateUpdate?.(state, "client");
  };

  agent.agent = options.agent;
  agent.name = options.name || "default";

  // warn if agent or name isn't in lowercase
  if (agent.agent !== agent.agent.toLowerCase()) {
    console.warn(
      `Agent name: ${agent.agent} should probably be in lowercase. Received: ${agent.agent}`
    );
  }
  if (agent.name !== agent.name.toLowerCase()) {
    console.warn(
      `Agent instance name: ${agent.name} should probably be in lowercase. Received: ${agent.name}`
    );
  }

  return agent;
}
