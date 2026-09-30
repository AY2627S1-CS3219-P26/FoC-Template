# CS3219 — Software Design and Architecture (AY2627 Sem 1)

## Friend on Campus (FoC)

**Friend on Campus (FoC)** is a peer-to-peer campus errand platform where students can request items to be collected from stores or facilities on campus, and other students can fulfil (and deliver) those requests. The platform runs on a closed credit economy — credits cannot be bought, withdrawn, or exchanged for money, and only circulate within the platform.

---

## Team Members

| Name | Role |
| ----- | ----- |
| Your Name | Your ownership |
| Your Name | Your ownership |
| Your Name | Your ownership |
| Your Name | Your ownership |
| Your Name | Your ownership |

---

## Running the system

Requires only Docker. From the repository root:

    docker compose up --build

| Component | URL |
| --- | --- |
| user-service | http://localhost:3001 |
| Mailpit (local email inbox) | http://localhost:8025 |

No `.env` is needed for local use; every variable has a development default in `compose.yaml`. The first administrator is `admin` with the password `change-me` unless `ADMIN_PASSWORD` is set. To override values, copy `.env.example` to `.env`.

`docker compose down -v` stops everything and deletes the local data.

## Development Workflow

Work is tracked in Linear (team `REL`). Every backlog requirement is an issue there, branches are cut from `dev` as `feat/rel-<n>-...`, and changes come back through a pull request into `dev`. Branch, commit and PR conventions and the Linear structure are described in [`docs/workflow.md`](docs/workflow.md).

---

## Repository Structure

This repository follows a **one-service-per-folder** structure: each microservice (`user-service/`, `supplier-service/`, `order-service/`, `credit-service/`) lives in its own top-level folder.

The browser client (`web-client/`) sits alongside them as a peer folder.

```text
.
├── user-service/
├── supplier-service/
├── order-service/
├── credit-service/
├── <n2h-service>/
├── web-client/
└── README.md
```

- Any **nice-to-have (N2H)** feature that warrants its own service should be added as an **additional folder** at the same level, following the same per-service structure.
- Files for agentic coding tools (e.g. agent configs, prompts, skills) may be added as needed, but must still **respect the one-service-per-folder skeleton** for core implementation.
- `web-client/` carries **no `-service` suffix on purpose**: it owns no bounded context, no data store and no API. It is a peer *deployable*, not a peer *service*. Its design system and the rules for working on it are documented in `web-client/DESIGN.md` and `web-client/AGENTS.md`.

---
