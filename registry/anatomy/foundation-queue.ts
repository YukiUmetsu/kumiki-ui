/**
 * One queue for heavy CPU renders in a page (portraits, material swatches): each job runs after the current frame and
 * after the job before it, so a page full of renders paints at once and stays responsive while they fill in.
 */
let queue: Promise<void> = Promise.resolve();

/** Run `job` after the page paints and after every job queued before it. */
export function enqueueRender(job: () => void): Promise<void> {
  queue = queue.then(() => new Promise<void>(resolve => setTimeout(() => { try { job(); } finally { resolve(); } }, 0)));
  return queue;
}
