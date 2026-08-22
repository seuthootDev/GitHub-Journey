import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';

describe('update-journey-gist workflow', () => {
  const doc = load(readFileSync('.github/workflows/update-journey-gist.yml', 'utf8')) as any;

  it('is triggered by push, schedule, and manual dispatch', () => {
    const triggers = Object.keys(doc.on);
    expect(triggers).toContain('push');
    expect(triggers).toContain('schedule');
    expect(triggers).toContain('workflow_dispatch');
  });

  it('runs the CLI with the required secrets and variables as env', () => {
    const job = doc.jobs['update-gist'];
    const runStep = job.steps.find((s: any) => typeof s.run === 'string' && s.run.includes('npm run cli'));
    expect(runStep).toBeTruthy();
    expect(runStep.env).toMatchObject({
      GH_TOKEN: '${{ secrets.GH_TOKEN }}',
      GIST_ID: '${{ secrets.GIST_ID }}',
      USERNAME: '${{ vars.USERNAME }}',
    });
  });
});
