const KNOWN_AGENTS: Record<string, {
  name: string;
  unixPaths: string[];
  windowsPaths: string[];
  defaultPath: string;
}> = {
  claude: {
    name: 'Claude Code',
    unixPaths: ['/usr/local/bin/claude', '~/.claude/bin/claude'],
    windowsPaths: ['C:\\Program Files\\Claude\\claude.exe', '%LOCALAPPDATA%\\Programs\\Claude\\claude.exe'],
    defaultPath: '/usr/local/bin/claude',
  },
  cursor: {
    name: 'Cursor',
    unixPaths: ['/Applications/Cursor.app', '~/.cursor/'],
    windowsPaths: ['C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Cursor\\'],
    defaultPath: '/Applications/Cursor.app',
  },
  aider: {
    name: 'Aider',
    unixPaths: ['/usr/local/bin/aider', '~/.local/bin/aider'],
    windowsPaths: ['C:\\Program Files\\Aider\\aider.exe'],
    defaultPath: '/usr/local/bin/aider',
  },
  omp: {
    name: 'OMP',
    unixPaths: ['/usr/local/bin/omp'],
    windowsPaths: ['C:\\Program Files\\OMP\\omp.exe'],
    defaultPath: '/usr/local/bin/omp',
  },
  copilot: {
    name: 'GitHub Copilot',
    unixPaths: ['/usr/local/bin/gh'],
    windowsPaths: ['C:\\Program Files\\GitHub CLI\\gh.exe'],
    defaultPath: '/usr/local/bin/gh',
  },
};

const isWindows = typeof process !== 'undefined' && process.platform === 'win32';

async function checkPathExists(path: string): Promise<boolean> {
  try {
    if (typeof window !== 'undefined' && (window as any).api?.fileExists) {
      return (window as any).api.fileExists(path);
    }
    return false;
  } catch {
    return false;
  }
}

async function checkWhich(command: string): Promise<string | null> {
  try {
    if (typeof window !== 'undefined' && (window as any).api?.which) {
      const result = await (window as any).api.which(command);
      return result || null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function resolveAgentPath(agentId: string): Promise<string> {
  const agent = KNOWN_AGENTS[agentId];
  if (!agent) {
    return agentId;
  }

  // Step 1: Check PATH using which/where
  const whichResult = await checkWhich(agentId);
  if (whichResult) {
    return whichResult;
  }

  // Step 2: Check known locations
  const paths = isWindows ? agent.windowsPaths : agent.unixPaths;
  for (const p of paths) {
    const exists = await checkPathExists(p);
    if (exists) {
      return p;
    }
  }

  // Step 3: Return default path
  return agent.defaultPath;
}
