# Deployment

Relay runs in Kubernetes from one Helm chart, [`deploy/helm/relay`](../deploy/helm/relay). Why this setup: [ADR 0004](decisions/0004-cloud-deployment.md). The same chart and the same images run on a laptop (k3d) and in the cloud (k3s on EC2); only the values files differ (N6.2). Docker Compose stays the quickest way to run everything for development.

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

## Cloud (AWS, k3s on EC2)

[`deploy/terraform`](../deploy/terraform) creates one EC2 instance (t3.xlarge, Singapore) with k3s, in its own VPC with a fixed public address. Traefik inside k3s answers on ports 80 and 443: HTTPS with a Let's Encrypt certificate from cert-manager, plain HTTP redirects to it. SSH and the Kubernetes API only accept the address terraform was run from. The images come from GHCR, where CI publishes them with the tag `dev` after every merge into `dev`.

Needs the AWS CLI with the SSO profile `relay`, `terraform`, `helm`, `kubectl`, and an SSH key in `~/.ssh/relay-aws` (`ssh-keygen -t ed25519 -f ~/.ssh/relay-aws -N ""`).

Once:

```bash
aws sso login --profile relay
export AWS_PROFILE=relay
terraform -chdir=deploy/terraform init
terraform -chdir=deploy/terraform apply
deploy/scripts/cloud-kubeconfig.sh
```

`deploy/ghcr.env` holds a GitHub token that may read the private images (classic token with only `read:packages`):

```
GHCR_USERNAME=<github user>
GHCR_TOKEN=<token>
```

Deploy, and again after every merge into `dev`:

```bash
deploy/scripts/deploy.sh
MAILBOX_AUTH="relay:$(grep '^MAILPIT_PASSWORD=' deploy/cloud-secrets.env | cut -d= -f2)" \
  deploy/scripts/smoke-test.sh https://$(terraform -chdir=deploy/terraform output -raw hostname)
```

On the first run `deploy.sh` writes random passwords to `deploy/cloud-secrets.env`: the administrator's is `ADMIN_PASSWORD`, Mailpit under `/mail/` asks for the user `relay` and `MAILPIT_PASSWORD`. Both `.env` files stay out of Git. `deploy.sh` also installs cert-manager; the first certificate takes about a minute.

The instance costs money only while it runs. Stop it after testing:

```bash
deploy/scripts/cloud.sh stop
deploy/scripts/cloud.sh start
deploy/scripts/cloud.sh status
deploy/scripts/cloud.sh restart
```

`restart` makes the services pull the newest `dev` images. It runs on the instance through AWS Systems Manager, so it needs neither SSH nor the Kubernetes API. Changes to the chart itself (values, templates) still go out with `deploy.sh`.

If nobody uses the instance for 4 hours (CPU below 10 %), the CloudWatch alarm `relay-idle-stop` stops it, so a forgotten instance does not use up the budget. Start it again with `cloud.sh start`.

### From GitHub Actions

Without any AWS access of your own: Actions → **cloud** → Run workflow, then pick `start`, `stop`, `status` or `restart` (shown once the workflow is on `main`). After every merge into `dev`, CI publishes the images and then runs `restart`, so a running instance always serves the current integration state (continuous deployment). A stopped instance is left alone.

GitHub Actions gets into AWS with a short-lived OpenID Connect token instead of stored keys, and only workflows on `dev` and `main` may use the role. The workflows need one repository variable, the role from terraform:

```bash
gh variable set AWS_ROLE_ARN --body "$(terraform -chdir=deploy/terraform output -raw github_role_arn)"
```

When kubectl or `deploy.sh` cannot reach the cluster, your public address has changed (other Wi-Fi, and the NUS network changes it often). Run `terraform -chdir=deploy/terraform apply` once more, so SSH and kubectl accept the new address. The app itself stays reachable for everyone.

## Who may reach whom

From outside only ports 80 and 443 lead in, and only to Traefik; every Service in the cluster is internal (`ClusterIP`). Inside the cluster, `templates/network-policies.yaml` rebuilds the two networks of `compose.yaml`: nothing gets in unless a rule allows it.

| Pod | Accepts connections from |
|---|---|
| web-client (`public: true`) | Traefik, the load test |
| services | the web client and the other services |
| each database | only the services that list it in `waitFor` |
| RabbitMQ | the services |
| Mailpit | Traefik (`/mail/`), the services (SMTP) |
| cert-manager's check pod | Traefik, so the certificate can be renewed |

A new service that uses a database therefore has to list it in `waitFor`, or the database refuses it.

## Autoscaling (N6.3)

Every stateless service (`autoscaling` in `values.yaml`) has a HorizontalPodAutoscaler. It follows N6.3: when a service's load stays above 70 % of what one instance asks for (its CPU request) for 2 minutes, Kubernetes starts another instance, one at a time, up to 4. After 5 minutes of low load the extra instances are removed again. Databases and the broker keep one instance each.

```bash
kubectl --kubeconfig ~/.kube/relay-aws.yaml -n relay get hpa
deploy/scripts/loadtest.sh
```

`loadtest.sh` runs k6 as a Job inside the cluster: 20 virtual users ask for their profile through the gateway for 5 minutes. Meanwhile it records the load and instance count of each service every 15 seconds and finally the scaling events, so the run ends up in `docs/evidence/` as proof.

## Before a demo

1. `aws sso login --profile relay`, then `deploy/scripts/cloud.sh start` about 15 minutes before (or Actions → cloud → start).
2. Run the smoke test against the HTTPS address. It registers a test account, so do it before the audience watches, not during.
3. Log in as the administrator (`admin`, `ADMIN_PASSWORD` from `deploy/cloud-secrets.env`). Verification codes for new accounts are in Mailpit under `/mail/`.
4. To show the autoscaling live: `kubectl --kubeconfig ~/.kube/relay-aws.yaml -n relay get hpa -w` in one terminal and `HOLD=3m AFTER_SECONDS=0 deploy/scripts/loadtest.sh` in another. The first extra instance appears about 2.5 minutes after the start. The run from `docs/evidence/` is the backup if there is no time.
5. Afterwards `deploy/scripts/cloud.sh stop`. If you forget, the idle alarm stops the instance after 4 hours.

## Freezing the submitted state

`dev` moves with every merge. For the submission, deploy the commit that was handed in with its fixed image tags, so the demonstrated system matches the code:

```bash
IMAGE_TAG=sha-$(git rev-parse --short=7 HEAD) deploy/scripts/deploy.sh
```

Use a commit on `dev` or `main` whose CI run has published the images.

## Adding a service

1. Add an entry under `services` in `deploy/helm/relay/values.yaml` (port, health path, `waitFor`, `secretEnv`, `env`). The comments there explain each field. The service name becomes the host name, so URLs from `compose.yaml` keep working.
2. If it has a database, add it under `databases` with `kind: mongo` or `kind: postgres`.
3. Add the service name to `SERVICES` in `deploy/scripts/local-up.sh`.
