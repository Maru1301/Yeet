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

IMAGE="yeet:latest"

# ── 1. Validate ───────────────────────────────────────────────────────────────
if [[ -z "${API_KEY:-}" ]]; then
  echo "ERROR: API_KEY is not set."
  echo "       Copy local-env.sh.example → local-env.sh and fill in your key."
  exit 1
fi

# ── 2. Select cluster context ─────────────────────────────────────────────────
if [[ -n "${KIND_CLUSTER:-}" ]]; then
  echo ">>> Using kind cluster '${KIND_CLUSTER}'..."
  if ! kind get clusters 2>/dev/null | grep -q "^${KIND_CLUSTER}$"; then
    echo ">>> Creating kind cluster '${KIND_CLUSTER}'..."
    kind create cluster --name "${KIND_CLUSTER}"
  fi
  kubectl config use-context "kind-${KIND_CLUSTER}"
  USE_KIND=1
else
  echo ">>> Using Docker Desktop Kubernetes (docker-desktop)..."
  kubectl config use-context docker-desktop
  USE_KIND=0
fi

# ── 3. Build Docker image ─────────────────────────────────────────────────────
if [[ -z "${SKIP_BUILD:-}" ]]; then
  echo ">>> Building Docker image ${IMAGE}..."
  docker build -t "${IMAGE}" .

  if [[ "${USE_KIND}" == "1" ]]; then
    echo ">>> Loading image into kind..."
    kind load docker-image "${IMAGE}" --name "${KIND_CLUSTER}"
  fi
fi

# ── 4. Create TLS certificate for local HTTPS (requires mkcert) ──────────────
if ! kubectl get secret yeet-tls &>/dev/null; then
  echo ">>> Generating TLS cert with mkcert..."
  # Get Windows %TEMP% directly from PowerShell (avoids Git Bash path conversion issues).
  CERT_DIR_WIN=$(powershell.exe -NoProfile -Command '$env:TEMP' | tr -d '\r\n')
  powershell.exe -NoProfile -Command "
    mkcert -install
    mkcert -cert-file '${CERT_DIR_WIN}\yeet-tls.crt' -key-file '${CERT_DIR_WIN}\yeet-tls.key' yeet.example.com
    kubectl create secret tls yeet-tls --cert='${CERT_DIR_WIN}\yeet-tls.crt' --key='${CERT_DIR_WIN}\yeet-tls.key'
    Remove-Item '${CERT_DIR_WIN}\yeet-tls.crt', '${CERT_DIR_WIN}\yeet-tls.key'
  "
fi

# ── 5. Create k8s Secret from local-env.sh values ────────────────────────────
# Real values never touch any file on disk — only live in the Secret object.
echo ">>> Applying k8s secret..."
kubectl create secret generic yeet-secret \
  --from-literal=api-key="${API_KEY}" \
  --from-literal=mongo-uri="${MONGO_URI:-mongodb://mongo:27017}" \
  --save-config --dry-run=client -o yaml | kubectl apply -f -

# ── 6. Apply infrastructure manifests ─────────────────────────────────────────
echo ">>> Applying infrastructure..."
kubectl apply -f k8s/pvc.yaml
kubectl apply -f k8s/mongo.yaml

# ── 7. Apply deployment ───────────────────────────────────────────────────────
echo ">>> Applying deployment..."
sed "s|image: yeet:latest|image: ${IMAGE}|g" k8s/deployment.yaml \
  | kubectl apply -f -

kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# ── 8. Wait for rollout ───────────────────────────────────────────────────────
echo ">>> Waiting for rollout..."
kubectl rollout status deployment/mongo --timeout=120s
kubectl rollout status deployment/yeet  --timeout=120s

echo ""
echo "✓ Deployed."
