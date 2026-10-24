import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export type ServiceState = "Running" | "Stopped" | "Starting" | "Error";

export interface ServiceInfo {
  state: ServiceState;
  url: string;
  version?: string;
  error?: string;
  isManaged: boolean;
  canManage: boolean;
  pid?: number;
}

class ServiceManager {
  private ollamaProcess: ChildProcess | null = null;
  private comfyProcess: ChildProcess | null = null;
  private ollamaState: ServiceState = "Stopped";
  private comfyState: ServiceState = "Stopped";
  private ollamaLastError: string | null = null;
  private comfyLastError: string | null = null;
  private ollamaStartingPromise: Promise<boolean> | null = null;
  private comfyStartingPromise: Promise<boolean> | null = null;

  // Configuration
  public ollamaUrl: string = "http://127.0.0.1:11434";
  public comfyUrl: string = "http://127.0.0.1:8188";

  /**
   * Safe probe of an HTTP endpoint with a strict timeout
   */
  private async probeEndpoint(url: string, timeoutMs = 2000): Promise<{ ok: boolean; data?: any; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        let data: any = null;
        try {
          data = await res.json();
        } catch {
          data = null;
        }
        return { ok: true, data };
      }
      return { ok: false, error: `HTTP ${res.status} ${res.statusText}` };
    } catch (err: any) {
      return { ok: false, error: err.message || "Connection refused" };
    }
  }

  /**
   * Find binary executable safely across PATH and standard user directories
   */
  private findExecutable(name: string): string | null {
    const home = os.homedir();
    const candidates = [
      name,
      path.join(home, ".local", "bin", name),
      path.join("/usr", "local", "bin", name),
      path.join("/usr", "bin", name),
      path.join("/bin", name),
      path.join("/opt", name, "bin", name),
    ];

    for (const cand of candidates) {
      try {
        if (cand === name) {
          // Check in current PATH using standard which check or fs.accessSync
          const pathDirs = (process.env.PATH || "").split(path.delimiter);
          for (const dir of pathDirs) {
            const fullPath = path.join(dir, name);
            if (fs.existsSync(fullPath)) {
              fs.accessSync(fullPath, fs.constants.X_OK);
              return fullPath;
            }
          }
        } else if (fs.existsSync(cand)) {
          fs.accessSync(cand, fs.constants.X_OK);
          return cand;
        }
      } catch {
        // Continue searching
      }
    }
    return null;
  }

  /**
   * Find ComfyUI main script directory safely
   */
  private findComfyScript(): { pythonPath: string; scriptPath: string } | null {
    const home = os.homedir();
    const scriptCandidates = [
      path.join(home, "ComfyUI", "main.py"),
      path.join(home, "project", "ComfyUI", "main.py"),
      path.join(home, ".localapp", "ComfyUI", "main.py"),
      path.join("/opt", "ComfyUI", "main.py"),
      path.join(process.cwd(), "ComfyUI", "main.py"),
    ];

    let foundScript: string | null = null;
    for (const cand of scriptCandidates) {
      if (fs.existsSync(cand)) {
        foundScript = cand;
        break;
      }
    }

    if (!foundScript) {
      return null;
    }

    // Find Python
    const pythonCandidates = [
      path.join(home, ".local", "comfyenv", "bin", "python"),
      path.join(home, "ComfyUI", ".venv", "bin", "python"),
      path.join(home, ".venv", "bin", "python"),
      "python3",
      "python",
    ];

    let foundPython = "python3";
    for (const py of pythonCandidates) {
      if (py.startsWith("/") && fs.existsSync(py)) {
        foundPython = py;
        break;
      }
    }

    return { pythonPath: foundPython, scriptPath: foundScript };
  }

  /**
   * Get Ollama status
   */
  public async getOllamaStatus(): Promise<ServiceInfo> {
    if (this.ollamaStartingPromise) {
      return {
        state: "Starting",
        url: this.ollamaUrl,
        isManaged: !!this.ollamaProcess,
        canManage: true,
      };
    }

    const probe = await this.probeEndpoint(`${this.ollamaUrl}/api/version`, 1500);
    if (probe.ok) {
      this.ollamaState = "Running";
      this.ollamaLastError = null;
      return {
        state: "Running",
        url: this.ollamaUrl,
        version: probe.data?.version,
        isManaged: !!this.ollamaProcess,
        canManage: true,
        pid: this.ollamaProcess?.pid,
      };
    }

    if (this.ollamaProcess && !this.ollamaProcess.killed) {
      this.ollamaState = "Error";
      return {
        state: "Error",
        url: this.ollamaUrl,
        error: this.ollamaLastError || "Ollama process running but API not responding",
        isManaged: true,
        canManage: true,
        pid: this.ollamaProcess.pid,
      };
    }

    if (this.ollamaLastError) {
      return {
        state: "Error",
        url: this.ollamaUrl,
        error: this.ollamaLastError,
        isManaged: false,
        canManage: true,
      };
    }

    this.ollamaState = "Stopped";
    return {
      state: "Stopped",
      url: this.ollamaUrl,
      isManaged: false,
      canManage: true,
    };
  }

  /**
   * Get ComfyUI status
   */
  public async getComfyStatus(): Promise<ServiceInfo> {
    if (this.comfyStartingPromise) {
      return {
        state: "Starting",
        url: this.comfyUrl,
        isManaged: !!this.comfyProcess,
        canManage: true,
      };
    }

    const probe = await this.probeEndpoint(`${this.comfyUrl}/system_stats`, 1500);
    if (probe.ok) {
      this.comfyState = "Running";
      this.comfyLastError = null;
      return {
        state: "Running",
        url: this.comfyUrl,
        isManaged: !!this.comfyProcess,
        canManage: true,
        pid: this.comfyProcess?.pid,
      };
    }

    // Try alternate endpoint /object_info
    const probe2 = await this.probeEndpoint(`${this.comfyUrl}/object_info`, 1500);
    if (probe2.ok) {
      this.comfyState = "Running";
      this.comfyLastError = null;
      return {
        state: "Running",
        url: this.comfyUrl,
        isManaged: !!this.comfyProcess,
        canManage: true,
        pid: this.comfyProcess?.pid,
      };
    }

    if (this.comfyProcess && !this.comfyProcess.killed) {
      this.comfyState = "Error";
      return {
        state: "Error",
        url: this.comfyUrl,
        error: this.comfyLastError || "ComfyUI process running but API not responding",
        isManaged: true,
        canManage: true,
        pid: this.comfyProcess.pid,
      };
    }

    if (this.comfyLastError) {
      return {
        state: "Error",
        url: this.comfyUrl,
        error: this.comfyLastError,
        isManaged: false,
        canManage: true,
      };
    }

    this.comfyState = "Stopped";
    return {
      state: "Stopped",
      url: this.comfyUrl,
      isManaged: false,
      canManage: true,
    };
  }

  /**
   * Start Ollama safely
   */
  public async startOllama(): Promise<{ success: boolean; state: ServiceState; message?: string }> {
    const current = await this.getOllamaStatus();
    if (current.state === "Running") {
      return { success: true, state: "Running", message: "Ollama is already running." };
    }

    const executable = this.findExecutable("ollama");
    if (!executable) {
      this.ollamaLastError = "Ollama binary not found in PATH or standard directories.";
      return {
        success: false,
        state: "Error",
        message: "Ollama binary not found on host. Please install Ollama or ensure it is in PATH.",
      };
    }

    try {
      this.ollamaState = "Starting";
      this.ollamaLastError = null;

      // Spawn 'ollama serve'
      const proc = spawn(executable, ["serve"], {
        env: { ...process.env, OLLAMA_HOST: "127.0.0.1:11434" },
        stdio: ["ignore", "pipe", "pipe"],
      });

      this.ollamaProcess = proc;

      proc.stdout?.on("data", (d) => {
        const out = d.toString();
        if (out.includes("Error") || out.includes("fatal")) {
          this.ollamaLastError = out.trim();
        }
      });

      proc.stderr?.on("data", (d) => {
        const err = d.toString();
        if (err.includes("Error") || err.includes("address already in use")) {
          this.ollamaLastError = err.trim();
        }
      });

      proc.on("exit", (code) => {
        this.ollamaProcess = null;
        if (code !== 0 && code !== null) {
          this.ollamaState = "Error";
          if (!this.ollamaLastError) {
            this.ollamaLastError = `Ollama process exited with code ${code}`;
          }
        } else {
          this.ollamaState = "Stopped";
        }
      });

      // Poll until running or timeout (up to 8 seconds)
      const startPromise = (async () => {
        for (let i = 0; i < 16; i++) {
          await new Promise((r) => setTimeout(r, 500));
          const p = await this.probeEndpoint(`${this.ollamaUrl}/api/version`, 1000);
          if (p.ok) {
            this.ollamaState = "Running";
            this.ollamaLastError = null;
            return true;
          }
        }
        return false;
      })();

      this.ollamaStartingPromise = startPromise;
      const started = await startPromise;
      this.ollamaStartingPromise = null;

      if (started) {
        return { success: true, state: "Running", message: "Ollama started successfully." };
      } else {
        return {
          success: false,
          state: "Error",
          message: this.ollamaLastError || "Ollama started but failed to respond on port 11434 within timeout.",
        };
      }
    } catch (err: any) {
      this.ollamaState = "Error";
      this.ollamaLastError = err.message;
      return { success: false, state: "Error", message: err.message };
    }
  }

  /**
   * Stop Ollama safely
   */
  public async stopOllama(): Promise<{ success: boolean; state: ServiceState; message?: string }> {
    if (this.ollamaProcess) {
      try {
        this.ollamaProcess.kill("SIGTERM");
        await new Promise((r) => setTimeout(r, 1000));
        if (this.ollamaProcess && !this.ollamaProcess.killed) {
          this.ollamaProcess.kill("SIGKILL");
        }
      } catch (err: any) {
        console.error("Error stopping managed Ollama:", err);
      }
      this.ollamaProcess = null;
    }

    // Verify endpoint is closed
    const probe = await this.probeEndpoint(`${this.ollamaUrl}/api/version`, 1000);
    if (!probe.ok) {
      this.ollamaState = "Stopped";
      this.ollamaLastError = null;
      return { success: true, state: "Stopped", message: "Ollama stopped." };
    }

    return {
      success: false,
      state: "Running",
      message: "Ollama is running externally (system service or outside this manager) and cannot be stopped.",
    };
  }

  /**
   * Start ComfyUI safely
   */
  public async startComfy(): Promise<{ success: boolean; state: ServiceState; message?: string }> {
    const current = await this.getComfyStatus();
    if (current.state === "Running") {
      return { success: true, state: "Running", message: "ComfyUI is already running." };
    }

    const scriptInfo = this.findComfyScript();
    if (!scriptInfo) {
      this.comfyLastError = "ComfyUI repository or main.py not found on host.";
      return {
        success: false,
        state: "Error",
        message: "ComfyUI installation not found. Please install ComfyUI or run it on port 8188.",
      };
    }

    try {
      this.comfyState = "Starting";
      this.comfyLastError = null;

      const proc = spawn(scriptInfo.pythonPath, [scriptInfo.scriptPath, "--listen", "127.0.0.1", "--port", "8188", "--cpu"], {
        cwd: path.dirname(scriptInfo.scriptPath),
        stdio: ["ignore", "pipe", "pipe"],
      });

      this.comfyProcess = proc;

      proc.stdout?.on("data", (d) => {
        const out = d.toString();
        if (out.includes("Error:") || out.includes("Traceback")) {
          this.comfyLastError = out.trim().slice(0, 300);
        }
      });

      proc.stderr?.on("data", (d) => {
        const err = d.toString();
        if (err.includes("Error:") || err.includes("address already in use")) {
          this.comfyLastError = err.trim().slice(0, 300);
        }
      });

      proc.on("exit", (code) => {
        this.comfyProcess = null;
        if (code !== 0 && code !== null) {
          this.comfyState = "Error";
          if (!this.comfyLastError) {
            this.comfyLastError = `ComfyUI process exited with code ${code}`;
          }
        } else {
          this.comfyState = "Stopped";
        }
      });

      // Poll until running or timeout (up to 15 seconds)
      const startPromise = (async () => {
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 500));
          const p = await this.probeEndpoint(`${this.comfyUrl}/system_stats`, 1000);
          if (p.ok) {
            this.comfyState = "Running";
            this.comfyLastError = null;
            return true;
          }
        }
        return false;
      })();

      this.comfyStartingPromise = startPromise;
      const started = await startPromise;
      this.comfyStartingPromise = null;

      if (started) {
        return { success: true, state: "Running", message: "ComfyUI started successfully." };
      } else {
        return {
          success: false,
          state: "Error",
          message: this.comfyLastError || "ComfyUI started but failed to respond on port 8188 within timeout.",
        };
      }
    } catch (err: any) {
      this.comfyState = "Error";
      this.comfyLastError = err.message;
      return { success: false, state: "Error", message: err.message };
    }
  }

  /**
   * Stop ComfyUI safely
   */
  public async stopComfy(): Promise<{ success: boolean; state: ServiceState; message?: string }> {
    if (this.comfyProcess) {
      try {
        this.comfyProcess.kill("SIGTERM");
        await new Promise((r) => setTimeout(r, 1000));
        if (this.comfyProcess && !this.comfyProcess.killed) {
          this.comfyProcess.kill("SIGKILL");
        }
      } catch (err: any) {
        console.error("Error stopping managed ComfyUI:", err);
      }
      this.comfyProcess = null;
    }

    const probe = await this.probeEndpoint(`${this.comfyUrl}/system_stats`, 1000);
    if (!probe.ok) {
      this.comfyState = "Stopped";
      this.comfyLastError = null;
      return { success: true, state: "Stopped", message: "ComfyUI stopped." };
    }

    return {
      success: false,
      state: "Running",
      message: "ComfyUI is running externally and cannot be stopped by this process.",
    };
  }
}

export const serviceManager = new ServiceManager();
