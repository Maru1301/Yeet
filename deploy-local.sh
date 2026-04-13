#!/usr/bin/env bash
# deploy-local.sh — build and deploy to a local Kubernetes cluster
#
# Supports two modes (auto-detected):
#   docker-desktop  — Docker Desktop built-in Kubernetes (default when active)
#   kind            — kind cluster (set KIND_CLUSTER to opt in)
#
# Prerequisites:
#   - Docker Desktop with Kubernetes enabled  OR  kind + kubectl
#
# Usage:
#   ./deploy-local.sh
#
# Optional env overrides (or set in local-env.sh):
#   KIND_CLUSTER=my-cluster ./deploy-local.sh   (force kind mode)
#   SKIP_BUILD=1 ./deploy-local.sh              (skip docker build)

set -euo pipefail

# ── Load local secrets if present ────────────────────────────────────────────
if [[ -f "$(dirname "$0")/local-env.sh" ]]; then
  # shellcheck source=local-env.sh.example
  source "$(dirname "$0")/local-env.sh"
fi

LOCAL_REGISTRY="${LOCAL_REGISTRY:-localhost:5000}"
IMAGE="${LOCAL_REGISTRY}/yeet:local"

# ── 1. Validate ───────────────────────────────────────────────────────────────
if [[ -z "${API_KEY:-}" ]]; then
  echo "ERROR: API_KEY is not set."
  echo "       Copy local-env.sh.example → local-env.sh and fill in your key."
  exit 1
fi

# ── 2. Select cluster context ─────────────────────────────────────────────────
if [[ -n "${KIND_CLUSTER:-}" ]]; then
  # Explicit kind mode
  echo ">>> Using kind cluster '${KIND_CLUSTER}'..."
  if ! kind get clusters 2>/dev/null | grep -q "^${KIND_CLUSTER}$"; then
    echo ">>> Creating kind cluster '${KIND_CLUSTER}'..."
    kind create cluster --name "${KIND_CLUSTER}"
  fi
  kubectl config use-context "kind-${KIND_CLUSTER}"
  USE_KIND=1
else
  # Docker Desktop Kubernetes
  echo ">>> Using Docker Desktop Kubernetes (docker-desktop)..."
  kubectl config use-context docker-desktop
  USE_KIND=0
fi

# ── 3. Build Docker image ─────────────────────────────────────────────────────
if [[ -z "${SKIP_BUILD:-}" ]]; then
  echo ">>> Building Docker image ${IMAGE}..."
  docker build -t "${IMAGE}" .

  if [[ "${USE_KIND}" == "1" ]]; then
    # kind has its own image store — must load explicitly
    echo ">>> Loading image into kind..."
    kind load docker-image "${IMAGE}" --name "${KIND_CLUSTER}"
  else
    # Docker Desktop Kubernetes uses containerd, which has a separate image
    # store from Docker. Push to a local registry so containerd can pull it.
    echo ">>> Pushing image to local registry (${LOCAL_REGISTRY})..."
    if ! docker push "${IMAGE}" 2>/dev/null; then
      echo "ERROR: Could not push to ${LOCAL_REGISTRY}."
      echo "       Make sure the local registry is running:"
      echo "         docker run -d -p 5000:5000 --restart=always --name local-registry registry:2"
      echo "       And add it as an insecure registry in Docker Desktop → Settings → Docker Engine:"
      echo '         "insecure-registries": ["localhost:5000"]'
      exit 1
    fi
  fi
fi

# ── 4. Apply infrastructure manifests ─────────────────────────────────────────
echo ">>> Applying infrastructure..."
kubectl apply -f k8s/pvc.yaml
kubectl apply -f k8s/mongo.yaml
kubectl apply -f k8s/mongo-secret.yaml

# ── 5. Replace __API_KEY__ token and apply deployment ─────────────────────────
# sed pipes into kubectl apply — the real key is never written to disk.
echo ">>> Applying deployment (replacing __API_KEY__ token)..."
sed "s|__API_KEY__|${API_KEY}|g" k8s/deployment.yaml \
  | sed "s|image: yeet:latest|image: ${IMAGE}|g" \
  | kubectl apply -f -

kubectl apply -f k8s/service.yaml

# ── 6. Wait for rollout ───────────────────────────────────────────────────────
echo ">>> Waiting for rollout..."
kubectl rollout status deployment/mongo --timeout=120s
kubectl rollout status deployment/yeet  --timeout=120s

# ── 7. Port-forward so you can open the app in your browser ──────────────────
echo ""
echo "✓ Deployed. Opening port-forward on http://localhost:8080"
echo "  Press Ctrl+C to stop."
echo ""
kubectl port-forward service/yeet 8080:80
