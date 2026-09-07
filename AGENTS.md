# Friend on Campus

Instructions for coding agents working in this repository. Read the AGENTS.md in
the folder you are working in as well.

## Structure

One folder per service at the top level: `user-service`, `supplier-service`,
`order-service`, `credit-service`. A nice-to-have feature that warrants its own
service becomes another folder at the same level. Core implementation stays
inside these folders.

`web-client` is the browser client. It owns no domain rules.

Work in the folder you were asked to work in. Do not change another service to
make your own change fit. If you need something from another service, say so
instead of reaching across the boundary.

The four service folders are still empty. No language, framework, database or
port has been decided for them. Do not assume one.

## Config and secrets

Every environment variable a service reads must appear in `.env.example` with a
safe placeholder, so teammates know what to set. Real values go in `.env`, which
is git-ignored. Never commit a real secret.

Nothing secret may reach `web-client`. Anything the browser can read is public.

`.gitignore` already covers `dist/`, `build/`, `out/`, the `.env` files, `*.pem`,
`*.key` and OS junk.

## Git

- Branch per requirement: `<requirement-id>-<slug>`, for example
  `F3.3.1-pickup-status`. Requirement ids come from the D1 backlog.
- Commit messages follow Conventional Commits: `feat:`, `fix:`, `docs:`,
  `chore:`.
- Pull request titles start with the requirement id.
- Work on a branch, not directly on `main`.

Individual contribution is graded, so keep commits attributable to the person who
did the work.

## Style

- Match the surrounding code. Do not reformat or restructure files you were not
  asked to change.
- Comments explain why something is the way it is, not what the line does. Keep
  them rare.
- Plain prose in comments and docs. No em dashes.
- Do not add dependencies, scripts, linters, CI or configuration that nobody
  asked for. If you think one is needed, propose it first.
- If code is reused from elsewhere, acknowledge the source. The course requires a
  declaration that the project is the team's own work.
