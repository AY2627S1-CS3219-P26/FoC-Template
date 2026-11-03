# Deployment

Relay runs in Kubernetes from one Helm chart, [`deploy/helm/relay`](../deploy/helm/relay). The same chart and the same images run on a laptop (k3d) and in the cloud (k3s on EC2); only the values files differ (N6.2). Docker Compose stays the quickest way to run everything for development.

## Local Kubernetes (k3d)

Needs Docker Desktop with at least 12 GB of memory, plus `k3d`, `helm` and `kubectl` (`brew install k3d helm kubernetes-cli`).

```bash
deploy/scripts/local-up.sh
```

The script creates the cluster `relay` on the first run, builds the images with `docker compose build`, imports them into the cluster and installs the chart into the namespace `relay`. Run it again after a code change. The app is on <http://localhost:8081>, Mailpit on <http://localhost:8081/mail/>. It runs next to `docker compose up`, which keeps port 8080.

```bash
deploy/scripts/smoke-test.sh
```

checks the system from the outside: gateway, a refused anonymous request, a closed `/internal` route, and a new student who registers, reads the code in Mailpit, verifies, logs in and fetches the own profile.

Useful commands:

```bash
kubectl --context k3d-relay -n relay get pods
kubectl --context k3d-relay -n relay logs deploy/user-service
k3d cluster delete relay
```

## Adding a service

1. Add an entry under `services` in `deploy/helm/relay/values.yaml` (port, health path, `waitFor`, `secretEnv`, `env`). The comments there explain each field. The service name becomes the host name, so URLs from `compose.yaml` keep working.
2. If it has a database, add it under `databases` with `kind: mongo` or `kind: postgres`.
3. Add the service name to `SERVICES` in `deploy/scripts/local-up.sh`.
