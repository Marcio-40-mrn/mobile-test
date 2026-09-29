#!/usr/bin/env bash
# Sobe um arquivo para o AWS Device Farm e espera o processamento terminar.
# Usado (via `source`) pelos steps de mobile_test.yml que sobem app, pacote de
# testes e testspecs — o mesmo fluxo em três lugares, um único código.
#
#   ARN=$(df_upload <nome> <tipo> <arquivo>)
#
# create-upload → PUT no S3 pré-assinado → poll get-upload até SUCCEEDED.
# IMPORTANTE: todo log vai para stderr (>&2). Só o ARN sai no stdout — senão o
# $(df_upload ...) captura as linhas de progresso junto e o schedule-run recebe
# um "arn" inválido (ValidationException: Invalid arn ...).
# Requer PROJECT_ARN no ambiente.
df_upload() {
  local name="$1" type="$2" file="$3"
  local resp arn url status i
  resp=$(aws devicefarm create-upload --project-arn "$PROJECT_ARN" \
    --name "$name" --type "$type" --query 'upload.{arn:arn,url:url}' --output json)
  arn=$(echo "$resp" | jq -r .arn)
  url=$(echo "$resp" | jq -r .url)
  curl -sS -T "$file" "$url"
  for i in $(seq 1 20); do
    status=$(aws devicefarm get-upload --arn "$arn" --query 'upload.status' --output text)
    echo "$name: $status ($i/20)" >&2
    [ "$status" = "SUCCEEDED" ] && { echo "$arn"; return 0; }
    [ "$status" = "FAILED" ] && { echo "::error::Upload $name falhou" >&2; return 1; }
    sleep 10
  done
  echo "::error::Timeout no upload $name" >&2
  return 1
}
