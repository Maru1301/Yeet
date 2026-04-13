#!/usr/bin/env bash
# deploy-local.sh — build and deploy to a local kind cluster
#
# Prerequisites:
#   - Docker Desktop running
#   - kind   (https://kind.sigs.k8s.io)
#   - kubectl
#
# Usage:
#   export API_KEY=AIza...
#   ./deploy-local.sh
#
# Optional:
#   KIND_CLUSTER=my-cluster ./deploy-local.sh   (default: yeet)
#   SKIP_BUILD=1 ./deploy-local.sh              (skip docker build + kind load)

set -euo pipefail

# ── Load local secrets if present ────────────────────────────────────────────
if [[ -f "$(dirname "$0")/local-env.sh" ]]; then
  # shellcheck source=local-env.sh.example
  source "$(dirname "$0")/local-env.sh"
fi

CLUSTER="${KIND_CLUSTER:-yeet}"
IMAGE="yeet:local"

# ── 1. Validate ───────────────────────────────────────────────────────────────
if [[ -z "${API_KEY:-}" ]]; then
  echo "ERROR: API_KEY is not set."
  echo "       Copy local-env.sh.example → local-env.sh and fill in your key."
  exit 1
fi

# ── 2. Create kind cluster if it doesn't exist ────────────────────────────────
if ! kind get clusters 2>/dev/null | grep -q "^${CLUSTER}$"; then
  echo ">>> Creating kind cluster '${CLUSTER}'..."
  kind create cluster --name "${CLUSTER}"
fi
kubectl config use-context "kind-${CLUSTER}"

# ── 3. Build Docker image and load into kind ──────────────────────────────────
if [[ -z "${SKIP_BUILD:-}" ]]; then
  echo ">>> Building Docker image ${IMAGE}..."
  docker build -t "${IMAGE}" .

  echo ">>> Loading image into kind (no registry needed)..."
  kind load docker-image "${IMAGE}" --name "${CLUSTER}"
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
kubectl rollout status deployment/yeet --timeout=120s
kubectl rollout status deployment/mongo --timeout=120s

# ── 7. Port-forward so you can open the app in your browser ──────────────────
echo ""
echo "✓ Deployed. Opening port-forward on http://localhost:8080"
echo "  Press Ctrl+C to stop."
echo ""
kubectl port-forward service/yeet 8080:80
