import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import type {
	AgentConfig,
	KnownAgent,
	ScanResult,
	ValidationResult,
	IdentificationResult,
} from "../shared/types";

const execAsync = promisify(exec);

const KNOWN_AGENTS: KnownAgent[] = [
	{
		id: "omp",
		name: "Oh My Pi",
		binaries: ["omp", "omp.exe", "omp.bunx"],
		icon: "omp",
		configPaths: ["~/.omp/config.json"],
		versionFlag: "--version",
	},
	{
		id: "cursor",
		name: "Cursor",
		binaries: ["cursor", "cursor.exe", "cursor.cmd"],
		icon: "cursor",
		configPaths: ["~/.cursor/config.json"],
		versionFlag: "--version",
	},
	{
		id: "cline",
		name: "Cline",
		binaries: ["cline", "cline.exe", "cline.cmd", "cline.ps1"],
		icon: "cline",
		configPaths: ["~/.cline/config.json"],
		versionFlag: "--version",
	},
	{
		id: "openclaude",
		name: "OpenClaude",
		binaries: [
			"openclaude",
			"openclaude.exe",
			"openclaude.cmd",
			"openclaude.ps1",
		],
		icon: "openclaude",
		configPaths: ["~/.openclaude/config.json"],
		versionFlag: "--version",
	},
	{
		id: "aider",
		name: "Aider",
		binaries: ["aider", "aider.exe", "aider.cmd"],
		icon: "aider",
		configPaths: ["~/.aider/config.yml"],
		versionFlag: "--version",
	},
	{
		id: "codex",
		name: "Codex CLI",
		binaries: ["codex", "codex.exe", "codex.cmd"],
		icon: "codex",
		configPaths: ["~/.codex/config.json"],
		versionFlag: "--version",
	},
	{
		id: "continue",
		name: "Continue",
		binaries: ["continue", "continue.exe", "continue.cmd"],
		icon: "continue",
		configPaths: ["~/.continue/config.json"],
		versionFlag: "--version",
	},
];

export function fingerprintAgent(agentPath: string): string {
	const normalized = path.normalize(agentPath).toLowerCase();
	return Buffer.from(normalized).toString("base64").slice(0, 16);
}

export async function validateAgent(
	agentPath: string,
): Promise<ValidationResult> {
	try {
		await fs.access(agentPath);
	} catch {
		return {
			valid: false,
			error: "File not found",
			executable: false,
			isDirectory: false,
		};
	}

	const stats = await fs.stat(agentPath);
	if (stats.isDirectory()) {
		return {
			valid: false,
			error: "Path is a directory",
			executable: false,
			isDirectory: true,
		};
	}

	const isExecutable =
		process.platform === "win32"
			? /\.(exe|bat|cmd)$/i.test(agentPath)
			: (stats.mode & 0o111) !== 0;

	if (!isExecutable) {
		return {
			valid: false,
			error: "File is not executable",
			executable: false,
			isDirectory: false,
		};
	}

	return {
		valid: true,
		executable: true,
		isDirectory: false,
	};
}

export async function identifyAgent(
	agentPath: string,
): Promise<IdentificationResult> {
	const filename = path.basename(agentPath).toLowerCase();

	for (const known of KNOWN_AGENTS) {
		if (known.binaries.some((b) => filename === b.toLowerCase())) {
			return {
				knownAgentId: known.id,
				suggestedName: known.name,
				suggestedIcon: known.icon,
				confidence: "high",
			};
		}
	}

	const nameWithoutExt = filename.replace(/\.(exe|bat|cmd)$/i, "");
	return {
		suggestedName: nameWithoutExt,
		suggestedIcon: "generic",
		confidence: "low",
	};
}

export async function findInPath(binary: string): Promise<string | null> {
	try {
		const cmd =
			process.platform === "win32" ? `where ${binary}` : `which ${binary}`;
		const { stdout } = await execAsync(cmd, { timeout: 3000 });
		const paths = stdout.trim().split("\n");
		return paths[0] || null;
	} catch {
		return null;
	}
}

async function checkLocation(
	dir: string,
	binary: string,
): Promise<string | null> {
	try {
		await fs.access(dir);
		const fullPath = path.join(dir, binary);
		await fs.access(fullPath);
		return fullPath;
	} catch {
		return null;
	}
}

function getScanLocations(): string[] {
	const home = process.env.HOME || process.env.USERPROFILE || "";

	if (process.platform === "win32") {
		return [
			path.join(process.env.LOCALAPPDATA || "", "Programs"),
			path.join(process.env.APPDATA || "", "npm"),
			path.join(home, "scoop", "shims"),
			path.join(process.env.ProgramData || "", "chocolatey", "bin"),
			path.join(home, ".bun", "bin"),
		].filter(Boolean);
	}

	if (process.platform === "darwin") {
		return [
			"/Applications",
			"/usr/local/bin",
			path.join(home, "Applications"),
			"/opt/homebrew/bin",
		];
	}

	return [
		"/usr/bin",
		"/usr/local/bin",
		path.join(home, ".local", "bin"),
		path.join(home, "bin"),
	];
}

export async function scanSystem(): Promise<ScanResult> {
	const startTime = Date.now();
	const agents: AgentConfig[] = [];
	const warnings: string[] = [];
	const locations = getScanLocations();
	let locationsScanned = 0;

	for (const known of KNOWN_AGENTS) {
		let foundPath: string | null = null;

		// Check PATH first
		for (const binary of known.binaries) {
			foundPath = await findInPath(binary);
			if (foundPath) break;
		}

		// Check common locations
		if (!foundPath) {
			for (const location of locations) {
				locationsScanned++;
				try {
					await fs.access(location);
				} catch {
					warnings.push(`Couldn't read ${location} — permission denied`);
					continue;
				}

				for (const binary of known.binaries) {
					foundPath = await checkLocation(location, binary);
					if (foundPath) break;
				}
				if (foundPath) break;
			}
		}

		if (foundPath) {
			agents.push({
				id: known.id,
				name: known.name,
				icon: known.icon,
				path: foundPath,
				cwd: process.env.HOME || process.env.USERPROFILE || "",
				source: "detected",
				fingerprint: fingerprintAgent(foundPath),
			});
		}
	}

	return {
		agents,
		warnings,
		locationsScanned,
		duration: Date.now() - startTime,
	};
}
