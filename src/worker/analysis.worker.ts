/// <reference lib="webworker" />
import { JOBS, type JobName } from './jobs';

/** Runs one job per message and replies with the same id. */
self.onmessage = async (event: MessageEvent<{ id: number; job: JobName; input: unknown }>) => {
  const { id, job, input } = event.data;
  try {
    const result = await (JOBS[job] as (input: unknown) => unknown)(input);
    self.postMessage({ id, result });
  } catch (e) {
    self.postMessage({ id, error: e instanceof Error ? e.message : String(e) });
  }
};
