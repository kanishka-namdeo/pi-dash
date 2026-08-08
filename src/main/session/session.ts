import * as pty from 'node-pty';
import { SessionState } from '../../shared/types';

export class Session {
  readonly agentId: string;
  readonly cwd: string;

  state: SessionState = 'idle';
  pid: number | null = null;
  exitCode: number | null = null;

  private pty: pty.IPty | null = null;
  private dataCallbacks: Array<(data: string) => void> = [];
  private exitCallbacks: Array<(exitCode: number) => void> = [];

  private readonly shell?: string;
  private readonly shellArgs?: string;


  constructor(agentId: string, cwd: string, private readonly agentPath: string, shell?: string, shellArgs?: string) {
    this.agentId = agentId;
    this.cwd = cwd;
    this.shell = shell;
    this.shellArgs = shellArgs;
  }

  async spawn(): Promise<void> {
    try {
      const shell = this.shell || this.agentPath;
      const args = this.shellArgs ? this.shellArgs.split(/\s+/).filter(Boolean) : [];
      this.pty = pty.spawn(shell, args, {
        cwd: this.cwd,
        name: 'xterm-256color',
      });
      this.pid = this.pty.pid;
      this.state = 'running';

      this.pty.onData((data) => {
        for (const cb of this.dataCallbacks) {
          cb(data);
        }
      });

      this.pty.onExit(({ exitCode }) => {
        this.exitCode = exitCode;
        this.state = 'exited';
        for (const cb of this.exitCallbacks) {
          cb(exitCode);
        }
      });
    } catch (err) {
      this.state = 'exited';
      this.exitCode = 1;
      throw err;
    }
  }

  write(data: string): void {
    if (this.state !== 'running' || !this.pty) return;
    this.pty.write(data);
  }

  resize(cols: number, rows: number): void {
    if (!this.pty) return;
    this.pty.resize(cols, rows);
  }

  kill(): void {
    if (this.state === 'exited' || !this.pty) return;
    this.pty.kill();
  }

  onData(callback: (data: string) => void): void {
    this.dataCallbacks.push(callback);
  }

  onExit(callback: (exitCode: number) => void): void {
    this.exitCallbacks.push(callback);
  }
}
