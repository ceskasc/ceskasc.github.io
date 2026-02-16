import { mkdir, writeFile } from "node:fs/promises";

const username = process.env.GITHUB_USERNAME || "ceskasc";
const token = process.env.GITHUB_TOKEN || "";
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": `${username}-portfolio-updater`,
};
if (token) {
  headers.Authorization = `Bearer ${token}`;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }
  return response.json();
}

function pickProfile(profile) {
  return {
    login: profile.login,
    avatar_url: profile.avatar_url,
    html_url: profile.html_url,
    bio: profile.bio,
    location: profile.location,
    followers: profile.followers,
    following: profile.following,
    public_repos: profile.public_repos,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };
}

function pickRepo(repo) {
  return {
    name: repo.name,
    description: repo.description,
    language: repo.language,
    html_url: repo.html_url,
    homepage: repo.homepage,
    stargazers_count: repo.stargazers_count,
    forks_count: repo.forks_count,
    pushed_at: repo.pushed_at,
    fork: repo.fork,
    archived: repo.archived,
  };
}

async function main() {
  const [profileRaw, reposRaw] = await Promise.all([
    fetchJson(`https://api.github.com/users/${username}`),
    fetchJson(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated&direction=desc&type=owner`),
  ]);

  const repos = reposRaw.filter((repo) => !repo.fork && !repo.archived).map(pickRepo);
  const payload = {
    generated_at: new Date().toISOString(),
    username,
    profile: pickProfile(profileRaw),
    repos,
  };

  await mkdir("data", { recursive: true });
  await writeFile("data/github.json", JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`Updated data/github.json with ${repos.length} repositories`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
