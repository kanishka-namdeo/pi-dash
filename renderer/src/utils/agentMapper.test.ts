import { describe, it, expect } from "vitest";
import { agentConfigToAgent } from "./agentMapper";
import type { AgentConfig } from "../../../src/shared/types";

describe("agentConfigToAgent", () => {
	it("maps Claude Code config correctly", () => {
		const config: AgentConfig = {
			id: "claude",
			name: "Claude Code",
			icon: "claude",
			path: "/usr/local/bin/claude",
			cwd: "/usr/local/bin",
			source: "detected",
		};

		const result = agentConfigToAgent(config);

		expect(result.id).toBe("claude");
		expect(result.name).toBe("Claude Code");
		expect(result.short).toBe("CL");
		expect(result.color).toBe("#1e3a5f");
		expect(result.textColor).toBe("#60a5fa");
		expect(result.status).toBe("idle");
		expect(result.progress).toBe(0);
	});

	it("maps unknown agent config correctly", () => {
		const config: AgentConfig = {
			id: "unknown-agent",
			name: "Unknown Agent",
			icon: "bot",
			path: "/usr/local/bin/unknown",
			cwd: "/usr/local/bin",
			source: "manual",
		};

		const result = agentConfigToAgent(config);

		expect(result.id).toBe("unknown-agent");
		expect(result.name).toBe("Unknown Agent");
		expect(result.short).toBe("UN");
		expect(result.status).toBe("idle");
		expect(result.progress).toBe(0);
	});
});
