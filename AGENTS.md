# Friend on Campus

Instructions for coding agents working in this repository. Read the AGENTS.md in the folder you are working in as well.

## Structure

One folder per service at the top level: `user-service`, `supplier-service`, `order-service`, `credit-service`. A nice-to-have feature that warrants its own service becomes another folder at the same level. Core implementation stays inside these folders.

`web-client` is the browser client. It owns no domain rules.

Work in the folder you were asked to work in. Do not change another service to make your own change fit. If you need something from another service, say so instead of reaching across the boundary.

`user-service` is implemented in Node.js and TypeScript with Express and MongoDB. The other service folders have no stack decided yet. Do not assume one; each service may choose its own.

Host ports in `compose.yaml`: user-service 3001, supplier-service 3002, order-service 3003, credit-service 3004. Inside the compose network services reach each other by service name, for example `http://user-service:3000`.

## Authentication and authorization

The user-service is the only authority on who is logged in and what they may do. Every other service asks it for each protected request, through `POST /internal/authorize` with the session token and the role the operation needs. The contract, the role rules and an example are in `user-service/README.md`, section "Authorizing requests in another service".

- Never decide access from a token or cookie yourself, and never keep your own copy of roles.
- Fail closed: if the user-service does not answer with `authorized`, refuse.
- Check the role before looking anything up, so a refusal does not reveal whether an object exists.

## Config and secrets

Every environment variable a service reads must appear in `.env.example` with a safe placeholder, so teammates know what to set. Real values go in `.env`, which is git-ignored. Never commit a real secret.

Nothing secret may reach `web-client`. Anything the browser can read is public.

`.gitignore` already covers `dist/`, `build/`, `out/`, the `.env` files, `*.pem`, `*.key` and OS junk.

## Git

The full workflow is in `docs/workflow.md`. The parts that matter when you touch the repository:

- Every change belongs to a Linear issue (`REL-<n>`). Requirement issues carry the requirement id from the D1 backlog in their title, for example `F3.3.1 ...`. Check the backlog before changing behaviour and name the requirement in the pull request.
- Branch off `dev`, never off `main`. Name the branch `<type>/rel-<n>-<short-description>` with type `feat`, `fix` or `chore`, for example `feat/rel-42-reserve-credits`. The `rel-<n>` part links the branch to the Linear issue.
- Commit messages: `<type>: <short description>` with type `feat`, `fix`, `chore`, `docs`, `refactor` or `test`.
- Pull requests target `dev`, use the same title format, and fill in the template (Linear issue and requirement id).

Individual contribution is graded, so keep commits attributable to the person who did the work.

## Style

- Match the surrounding code. Do not reformat or restructure files you were not asked to change.
- Comments explain why something is the way it is, not what the line does. Keep them rare.
- Plain prose in comments and docs. No em dashes.
- Do not add dependencies, scripts, linters, CI or configuration that nobody asked for. If you think one is needed, propose it first.
- If code is reused from elsewhere, acknowledge the source. The course requires a declaration that the project is the team's own work.
