// ScopeBridge AI — GitHub API connector (server-side only)
import { env } from "@/lib/env";

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string;
  url: string;
  defaultBranch: string;
  openIssuesCount: number;
  updatedAt: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: string;
  labels: string[];
  assignee: string | null;
  createdAt: string;
  url: string;
}

export interface GitHubPR {
  number: number;
  title: string;
  body: string;
  state: string;
  isDraft: boolean;
  labels: string[];
  createdAt: string;
  url: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export interface GitHubRepoContext {
  repo: GitHubRepo;
  readme: string;
  openIssues: GitHubIssue[];
  openPRs: GitHubPR[];
  recentCommits: GitHubCommit[];
}

const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_SCOPES = "repo,read:user,user:email";

export function buildGitHubAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID(),
    redirect_uri: `${env.NEXT_PUBLIC_APP_URL()}/api/integrations/github/callback`,
    scope: GITHUB_SCOPES,
    state,
  });
  return `${GITHUB_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGitHubCode(code: string): Promise<{
  accessToken: string;
  scope: string;
}> {
  const res = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID(),
      client_secret: env.GITHUB_CLIENT_SECRET(),
      code,
      redirect_uri: `${env.NEXT_PUBLIC_APP_URL()}/api/integrations/github/callback`,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub token exchange failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    scope: string;
    error?: string;
    error_description?: string;
  };

  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description ?? data.error}`);
  }

  return {
    accessToken: data.access_token,
    scope: data.scope,
  };
}

async function githubFetch<T>(
  accessToken: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${GITHUB_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub API error ${res.status} on ${path}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function getAuthenticatedUser(accessToken: string): Promise<{
  login: string;
  id: number;
  name: string;
  email: string;
}> {
  const data = await githubFetch<{
    login: string;
    id: number;
    name: string | null;
    email: string | null;
  }>(accessToken, "/user");

  return {
    login: data.login,
    id: data.id,
    name: data.name ?? data.login,
    email: data.email ?? "",
  };
}

export async function listRepos(accessToken: string): Promise<GitHubRepo[]> {
  const data = await githubFetch<
    Array<{
      id: number;
      name: string;
      full_name: string;
      description: string | null;
      html_url: string;
      default_branch: string;
      open_issues_count: number;
      updated_at: string;
    }>
  >(accessToken, "/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator");

  return data.map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    description: r.description ?? "",
    url: r.html_url,
    defaultBranch: r.default_branch,
    openIssuesCount: r.open_issues_count,
    updatedAt: r.updated_at,
  }));
}

export async function getRepoContext(
  accessToken: string,
  owner: string,
  repo: string
): Promise<GitHubRepoContext> {
  const [repoData, openIssues, openPRs, recentCommits, readmeData] =
    await Promise.allSettled([
      githubFetch<{
        id: number;
        name: string;
        full_name: string;
        description: string | null;
        html_url: string;
        default_branch: string;
        open_issues_count: number;
        updated_at: string;
      }>(accessToken, `/repos/${owner}/${repo}`),
      getOpenIssues(accessToken, owner, repo),
      getOpenPRs(accessToken, owner, repo),
      getRecentCommits(accessToken, owner, repo, 20),
      githubFetch<{ content: string }>(
        accessToken,
        `/repos/${owner}/${repo}/readme`
      ),
    ]);

  const repoInfo =
    repoData.status === "fulfilled"
      ? {
          id: repoData.value.id,
          name: repoData.value.name,
          fullName: repoData.value.full_name,
          description: repoData.value.description ?? "",
          url: repoData.value.html_url,
          defaultBranch: repoData.value.default_branch,
          openIssuesCount: repoData.value.open_issues_count,
          updatedAt: repoData.value.updated_at,
        }
      : {
          id: 0,
          name: repo,
          fullName: `${owner}/${repo}`,
          description: "",
          url: `https://github.com/${owner}/${repo}`,
          defaultBranch: "main",
          openIssuesCount: 0,
          updatedAt: new Date().toISOString(),
        };

  let readme = "";
  if (readmeData.status === "fulfilled") {
    try {
      readme = Buffer.from(readmeData.value.content, "base64").toString("utf-8");
    } catch {
      readme = "";
    }
  }

  return {
    repo: repoInfo,
    readme,
    openIssues: openIssues.status === "fulfilled" ? openIssues.value : [],
    openPRs: openPRs.status === "fulfilled" ? openPRs.value : [],
    recentCommits: recentCommits.status === "fulfilled" ? recentCommits.value : [],
  };
}

export async function getOpenIssues(
  accessToken: string,
  owner: string,
  repo: string
): Promise<GitHubIssue[]> {
  const data = await githubFetch<
    Array<{
      number: number;
      title: string;
      body: string | null;
      state: string;
      labels: Array<{ name: string }>;
      assignee: { login: string } | null;
      created_at: string;
      html_url: string;
      pull_request?: unknown;
    }>
  >(accessToken, `/repos/${owner}/${repo}/issues?state=open&per_page=50`);

  // Exclude pull requests (they also appear in the issues endpoint)
  return data
    .filter((i) => !i.pull_request)
    .map((i) => ({
      number: i.number,
      title: i.title,
      body: i.body ?? "",
      state: i.state,
      labels: i.labels.map((l) => l.name),
      assignee: i.assignee?.login ?? null,
      createdAt: i.created_at,
      url: i.html_url,
    }));
}

export async function getOpenPRs(
  accessToken: string,
  owner: string,
  repo: string
): Promise<GitHubPR[]> {
  const data = await githubFetch<
    Array<{
      number: number;
      title: string;
      body: string | null;
      state: string;
      draft: boolean;
      labels: Array<{ name: string }>;
      created_at: string;
      html_url: string;
    }>
  >(accessToken, `/repos/${owner}/${repo}/pulls?state=open&per_page=50`);

  return data.map((p) => ({
    number: p.number,
    title: p.title,
    body: p.body ?? "",
    state: p.state,
    isDraft: p.draft,
    labels: p.labels.map((l) => l.name),
    createdAt: p.created_at,
    url: p.html_url,
  }));
}

export async function getRecentCommits(
  accessToken: string,
  owner: string,
  repo: string,
  limit = 20
): Promise<GitHubCommit[]> {
  const data = await githubFetch<
    Array<{
      sha: string;
      commit: {
        message: string;
        author: { name: string; date: string };
      };
      html_url: string;
    }>
  >(accessToken, `/repos/${owner}/${repo}/commits?per_page=${limit}`);

  return data.map((c) => ({
    sha: c.sha.slice(0, 7),
    message: c.commit.message.split("\n")[0],
    author: c.commit.author?.name ?? "unknown",
    date: c.commit.author?.date ?? "",
    url: c.html_url,
  }));
}

export async function createIssue(
  accessToken: string,
  owner: string,
  repo: string,
  title: string,
  body: string,
  labels?: string[]
): Promise<{ id: number; number: number; url: string }> {
  const data = await githubFetch<{
    id: number;
    number: number;
    html_url: string;
  }>(accessToken, `/repos/${owner}/${repo}/issues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, body, ...(labels?.length ? { labels } : {}) }),
  });

  return { id: data.id, number: data.number, url: data.html_url };
}
