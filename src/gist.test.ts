import { describe, it, expect, vi } from 'vitest';
import { updateGist } from './gist';

describe('updateGist', () => {
  it('PATCHes the gist with the given filename and content', async () => {
    const update = vi.fn().mockResolvedValue({});
    const octokit = { rest: { gists: { update } } };
    await updateGist(octokit as any, 'abc123', 'journey.md', 'hello world');
    expect(update).toHaveBeenCalledWith({ gist_id: 'abc123', files: { 'journey.md': { content: 'hello world' } } });
  });
});
