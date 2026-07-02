# Argo CD deployment (`argo/`)

GitOps manifests so this SDK app is auto-discovered by the Topia SDK-apps
ApplicationSet. No per-repo `Application` manifest and no CI workflow live here:
app creation is owned by the appset; image build + sync is owned by a
Terraform-templated CI workflow.

```
argo/
  services/<svc>/   one dir per independent Deployment (Deployment+Service+Ingress)
  overlays/dev/     per service: ConfigMap (<svc>-config), SealedSecret (<svc>-secrets,
                    ciphertext only), KEDA scaler, keda-ns interceptor Ingress; drops
                    the direct Ingress; maps the image to the shared dev ECR
  envs/dev/config.json   ApplicationSet generator params (incl. services[])
```

**Secrets:** no plaintext is committed. Each `<svc>-sealedsecret.yaml` holds only
ciphertext (sealed against the dev cluster cert, strict scope, namespace `sdk-apps-dev`); the
in-cluster sealed-secrets controller unseals it into `Secret <svc>-secrets`, consumed by
the Deployment via `envFrom`. Non-secret env (incl. the public `INTERACTIVE_KEY`) lives
in the committed `<svc>-config` ConfigMap. Argo owns both — CI only builds the image and
triggers the sync.

This repo is **single-service**.

## Services (dev)

| Service | Host(s) (kept from ECS) | Health |
| ------- | ----------------------- | ------ |
| `poll0` | poll0-dev-topia.topia-rtsdk.com | `/api/system/health` |

## Two shapes the `services[]` contract supports

- **Independent deployments, same code** (separate keys / "different environments
  of the same app"): multiple `services[]` entries. Each renders its own Deployment
  + Service + `<svc>-config`/`<svc>-secrets` + HTTPScaledObject + interceptor Ingress,
  and **scales to zero independently**. Each may pin its own `image` (defaults to the
  shared `sdk-example:<repo>`), so one can run a different tag than another.
- **Same deployment, multiple URLs** (shared keys, true aliases): a single `services[]`
  entry with multiple `hosts`. One Deployment; the HTTPScaledObject lists all hosts and
  the interceptor Ingress gets one rule per host. It scales as a unit — to zero only
  when *all* its hosts are idle. Use this only for genuine aliases; if two URLs should
  scale independently, make them two services.

## `envs/dev/config.json` fields

| Field | Meaning |
| ----- | ------- |
| `app` | Repo name (image tag on the shared dev ECR `sdk-example`). |
| `env` | Env slug; matches the folder + an `overlays/<env>/`. |
| `clusterName` | Registered Argo spoke name (`Topia-dev-SDK-Apps`). **Verify casing.** |
| `clusterType` | `eks`. |
| `namespace` | Destination namespace (`sdk-apps-dev`). |
| `services[]` | `name` (resource id + config/secret prefix), `image` (per-service, default `sdk-example:<repo>`), `hosts[]` (URLs), `health`. |

## Cluster prerequisites

- AWS Load Balancer Controller (shared `sdk-apps` ALB group).
- KEDA + KEDA HTTP Add-on (the interceptor that wakes apps).
- Deploy role RBAC: create configmaps/secrets + patch deployments in `sdk-apps-dev`.

## Render locally

```sh
kubectl kustomize argo/overlays/dev
```
