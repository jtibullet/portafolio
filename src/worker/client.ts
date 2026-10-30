import { JOBS, type JobInput, type JobName, type JobOutput } from './jobs';

/**
 * Runs heavy jobs in a single shared Web Worker so the UI thread stays responsive.
 * Falls back to running on the main thread where module workers are unavailable.
 */
let worker: Worker | null | undefined;
let nextId = 0;
const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();

function getWorker() {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<{ id: number; result?: unknown; error?: string }>) => {
      const job = pending.get(event.data.id);
      if (!job) return;
      pending.delete(event.data.id);
      if (event.data.error !== undefined) job.reject(new Error(event.data.error));
      else job.resolve(event.data.result);
    };
    worker.onerror = (event) => {
      // A crashed worker can't answer anything already queued; fail those jobs and stop using it
      console.error('Analysis worker failed, falling back to the main thread', event);
      pending.forEach(job => job.reject(new Error('Analysis worker failed')));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  } catch (e) {
    console.warn('Web Workers unavailable, computing on the main thread', e);
    worker = null;
  }
  return worker;
}

/** Starts the worker ahead of the first job, so its startup doesn't delay the first results. */
export function warmUpWorker() {
  if (typeof Worker !== 'undefined') getWorker();
}

export function runJob<K extends JobName>(job: K, input: JobInput<K>): Promise<JobOutput<K>> {
  const w = typeof Worker === 'undefined' ? null : getWorker();
  if (!w) return Promise.resolve((JOBS[job] as (input: JobInput<K>) => Promise<JobOutput<K>> | JobOutput<K>)(input));

  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, job, input });
  });
}
