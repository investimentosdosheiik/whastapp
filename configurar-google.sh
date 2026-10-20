#!/usr/bin/env bash
# Execute no Cloud Shell do proprietário do projeto. Não cria chaves JSON.
set -euo pipefail
trap 'echo "Configuração interrompida. Envie apenas a mensagem de erro, sem tokens ou senhas." >&2' ERR
impulso_project='optical-branch-512203-j3'
impulso_account="impulso@${impulso_project}.iam.gserviceaccount.com"
impulso_pool='impulso-vercel'
impulso_provider='whastapp'
impulso_issuer='https://oidc.vercel.com/investimentosdosheiik'
impulso_audience='https://vercel.com/investimentosdosheiik'
impulso_subject='owner:investimentosdosheiik:project:whastapp:environment:production'
impulso_condition="assertion.sub == '${impulso_subject}' && assertion.project_id == 'prj_PIXvBb97YEJTzcSAejwCI0rLk8NW'"

printf '%s\n' 'Esta configuração permite que somente o whastapp em PRODUÇÃO use a conta impulso.'
printf '%s\n' 'Ela habilita APIs, cria uma federação restrita e concede Workload Identity User nessa conta.'
printf '%s\n' 'Não altera a política que bloqueia chaves JSON nem concede papéis administrativos.'
read -r -p 'Digite AUTORIZAR para continuar: ' impulso_confirmation
[[ "$impulso_confirmation" == 'AUTORIZAR' ]] || exit 1

impulso_number="$(gcloud projects describe "$impulso_project" --format='value(projectNumber)')"
[[ "$impulso_number" =~ ^[0-9]{6,20}$ ]]
gcloud iam service-accounts describe "$impulso_account" --project="$impulso_project" --format='value(email)'
gcloud services enable iam.googleapis.com cloudresourcemanager.googleapis.com iamcredentials.googleapis.com sts.googleapis.com sheets.googleapis.com --project="$impulso_project"

impulso_pools="$(gcloud iam workload-identity-pools list --location=global --project="$impulso_project" --format='value(name)')"
if ! printf '%s\n' "$impulso_pools" | grep -Fxq "projects/${impulso_number}/locations/global/workloadIdentityPools/${impulso_pool}"; then
 gcloud iam workload-identity-pools create "$impulso_pool" --location=global --project="$impulso_project" --display-name='Impulso Vercel'
fi
impulso_providers="$(gcloud iam workload-identity-pools providers list --workload-identity-pool="$impulso_pool" --location=global --project="$impulso_project" --format='value(name)')"
while IFS= read -r impulso_existing; do
 [[ -z "$impulso_existing" || "$impulso_existing" == "projects/${impulso_number}/locations/global/workloadIdentityPools/${impulso_pool}/providers/${impulso_provider}" ]] || {
  echo 'O pool já contém outro provedor. Acesso não concedido; revise antes de reutilizar.' >&2
  exit 1
 }
done <<< "$impulso_providers"
if ! printf '%s\n' "$impulso_providers" | grep -Fxq "projects/${impulso_number}/locations/global/workloadIdentityPools/${impulso_pool}/providers/${impulso_provider}"; then
 gcloud iam workload-identity-pools providers create-oidc "$impulso_provider" \
  --workload-identity-pool="$impulso_pool" --location=global --project="$impulso_project" \
  --display-name='whastapp Production' --issuer-uri="$impulso_issuer" \
  --allowed-audiences="$impulso_audience" --attribute-mapping='google.subject=assertion.sub' \
  --attribute-condition="$impulso_condition"
fi
# Não reutilizar silenciosamente uma federação existente com regras diferentes.
impulso_config="$(gcloud iam workload-identity-pools providers describe "$impulso_provider" --workload-identity-pool="$impulso_pool" --location=global --project="$impulso_project" --format=json)"
python3 -c 'import json,sys; p=json.loads(sys.argv[1]); assert p.get("state")=="ACTIVE" and not p.get("disabled"); assert p["oidc"]["issuerUri"]==sys.argv[2]; assert p["oidc"]["allowedAudiences"]==[sys.argv[3]]; assert p["attributeMapping"]=={"google.subject":"assertion.sub"}; assert p["attributeCondition"]==sys.argv[4], "Federação existente diferente. Não foi concedido acesso à conta."' "$impulso_config" "$impulso_issuer" "$impulso_audience" "$impulso_condition"

gcloud iam service-accounts add-iam-policy-binding "$impulso_account" \
 --project="$impulso_project" --role='roles/iam.workloadIdentityUser' --condition=None \
 --member="principal://iam.googleapis.com/projects/${impulso_number}/locations/global/workloadIdentityPools/${impulso_pool}/subject/${impulso_subject}" --quiet

printf '\n%s\n' 'CONFIGURACAO CONCLUIDA — pode enviar somente estas quatro linhas:'
printf 'GCP_PROJECT_NUMBER=%s\n' "$impulso_number"
printf 'GCP_SERVICE_ACCOUNT_EMAIL=%s\n' "$impulso_account"
printf 'GCP_WORKLOAD_IDENTITY_POOL_ID=%s\n' "$impulso_pool"
printf 'GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=%s\n' "$impulso_provider"
