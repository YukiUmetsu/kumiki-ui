/** External tools stay behind this bounded, shell-free process boundary. */
import { spawn } from 'node:child_process';
export async function runLocalTool(executable, args, { signal, timeoutMs = 120000, maximumOutputBytes = 4 * 1024 * 1024, cwd } = {}) {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let stdout = '', stderr = '', bytes = 0, failure;
    const stop = message => { failure ??= new Error(message); child.kill('SIGKILL'); };
    const abort = () => stop(`Image scene tool ${executable} aborted; no ready artifact was published.`);
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => stop(`Image scene tool ${executable} timed out after ${timeoutMs} ms; inspect the stage log before retrying.`), timeoutMs);
    const collect = (chunk, kind) => {
      bytes += chunk.length;
      if (bytes > maximumOutputBytes) { stop(`Image scene tool ${executable} output exceeded limit ${maximumOutputBytes} bytes.`); return; }
      if (kind === 'stdout') stdout += chunk.toString(); else stderr += chunk.toString();
    };
    child.stdout.on('data', chunk => collect(chunk, 'stdout')); child.stderr.on('data', chunk => collect(chunk, 'stderr'));
    child.on('error', error => { failure = new Error(`Cannot start image scene tool ${executable}: ${error.message}. Install the documented local toolchain.`); });
    child.on('close', code => {
      clearTimeout(timer); signal?.removeEventListener('abort', abort);
      if (failure) reject(failure);
      else if (code !== 0) reject(new Error(`Image scene tool ${executable} exited ${code}: ${stderr.slice(-8000)}. Correct the stage inputs before retrying.`));
      else resolve({ stdout, stderr });
    });
  });
}
