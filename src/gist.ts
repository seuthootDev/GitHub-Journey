export interface GistOctokitLike {
  rest: {
    gists: {
      update(params: { gist_id: string; files: Record<string, { content: string }> }): Promise<unknown>;
    };
  };
}

export async function updateGist(
  octokit: GistOctokitLike,
  gistId: string,
  filename: string,
  content: string
): Promise<void> {
  await octokit.rest.gists.update({ gist_id: gistId, files: { [filename]: { content } } });
}
