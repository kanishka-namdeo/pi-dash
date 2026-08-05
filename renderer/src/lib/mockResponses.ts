export type AgentResponseTemplate = {
  patterns: RegExp[];
  responses: string[];
  delay: { min: number; max: number };
};

const claudeTemplates: AgentResponseTemplate[] = [
  {
    patterns: [/^help$/i],
    responses: [
      '\x1b[1mAvailable commands:\x1b[0m\n\n  \x1b[36mhelp\x1b[0m     — Show this help message\n  \x1b[36mls\x1b[0m       — List files in current directory\n  \x1b[36mcat\x1b[0m      — Display file contents\n  \x1b[36mnpm\x1b[0m      — Node package manager\n  \x1b[36mgit\x1b[0m      — Version control\n\nType any command and I\'ll explain what it does.',
    ],
    delay: { min: 300, max: 800 },
  },
  {
    patterns: [/^ls(\s|$)/],
    responses: [
      '\x1b[1mDirectory listing:\x1b[0m\n\n  \x1b[34md\x1b[0m src/\n  \x1b[34md\x1b[0m node_modules/\n  \x1b[32m-\x1b[0m package.json    \x1b[90m1.2KB\x1b[0m\n  \x1b[32m-\x1b[0m tsconfig.json   \x1b[90m856B\x1b[0m\n  \x1b[32m-\x1b[0m README.md       \x1b[90m2.4KB\x1b[0m',
    ],
    delay: { min: 200, max: 500 },
  },
];

const cursorTemplates: AgentResponseTemplate[] = [
  {
    patterns: [/^help$/i],
    responses: ['\x1b[1mCommands:\x1b[0m help | ls | cat | npm | git'],
    delay: { min: 100, max: 300 },
  },
  {
    patterns: [/^ls(\s|$)/],
    responses: ['src/  node_modules/  package.json  tsconfig.json  README.md'],
    delay: { min: 100, max: 200 },
  },
];

const copilotTemplates: AgentResponseTemplate[] = [
  {
    patterns: [/^help$/i],
    responses: ['\x1b[1mI can help with:\x1b[0m\n\n• help — show commands\n• ls — list files\n• cat — read files\n\nWhat would you like to do?'],
    delay: { min: 200, max: 400 },
  },
  {
    patterns: [/^ls(\s|$)/],
    responses: ['\x1b[34msrc/\x1b[0m  \x1b[34mnode_modules/\x1b[0m  package.json  tsconfig.json  README.md\n\nWould you like me to show you a file?'],
    delay: { min: 150, max: 350 },
  },
];

const templatesByAgent: Record<string, AgentResponseTemplate[]> = {
  claude: claudeTemplates,
  cursor: cursorTemplates,
  copilot: copilotTemplates,
};

const fallbackResponses: Record<string, AgentResponseTemplate> = {
  claude: {
    patterns: [],
    responses: ['\x1b[33mCommand not recognized.\x1b[0m Try \x1b[36mhelp\x1b[0m to see available commands.'],
    delay: { min: 200, max: 400 },
  },
  cursor: {
    patterns: [],
    responses: ['\x1b[33mUnknown command.\x1b[0m Try: help'],
    delay: { min: 100, max: 200 },
  },
  copilot: {
    patterns: [],
    responses: ['\x1b[33mHmm, I don\'t recognize that.\x1b[0m Maybe try \x1b[36mhelp\x1b[0m?'],
    delay: { min: 150, max: 300 },
  },
};

export function getMockResponse(
  agentId: string,
  input: string
): { response: string; delay: { min: number; max: number } } {
  const templates = templatesByAgent[agentId] || [];

  for (const template of templates) {
    if (template.patterns.some(pattern => pattern.test(input))) {
      const response = template.responses[Math.floor(Math.random() * template.responses.length)];
      return { response, delay: template.delay };
    }
  }

  // Fallback
  const fallback = fallbackResponses[agentId] || fallbackResponses.claude;
  const response = fallback.responses[0];
  return { response, delay: fallback.delay };
}
