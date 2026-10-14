#!/bin/sh
# nginx runtime uses the same validated origin as the backend. Never print supplied configuration.
set -eu
invalid() { echo 'APP_PUBLIC_URL must be an HTTPS origin or an HTTP loopback origin without a path' >&2; exit 1; }
task_origin=${APP_PUBLIC_URL:-}
printf '%s\n' "$task_origin" | grep -Eq '^(https?)://([A-Za-z0-9.-]+|\[[0-9A-Fa-f:]+\])(:[0-9]+)?$' || invalid
PUBLIC_SCHEME=${task_origin%%://*}
task_raw_authority=${task_origin#*://}
task_host=$(printf '%s' "$task_raw_authority" | sed -E 's/:[0-9]+$//')
case "$task_host" in
    localhost|127.0.0.1|'[::1]') ;;
    *) [ "$PUBLIC_SCHEME" = https ] || invalid ;;
esac
task_explicit_port=$(printf '%s' "$task_raw_authority" | sed -nE 's/^(.*\]|[^:]+):([0-9]+)$/\2/p')
if [ -n "$task_explicit_port" ]; then
    awk -v port="$task_explicit_port" 'BEGIN { exit !(port >= 1 && port <= 65535) }' || invalid
    PUBLIC_PORT=$(awk -v port="$task_explicit_port" 'BEGIN { printf "%d", port }')
else
    case "$PUBLIC_SCHEME" in https) PUBLIC_PORT=443 ;; http) PUBLIC_PORT=80 ;; esac
fi
case "$PUBLIC_SCHEME:$PUBLIC_PORT" in
    http:80|https:443) PUBLIC_AUTHORITY=$task_host ;;
    *) PUBLIC_AUTHORITY=$task_host:$PUBLIC_PORT ;;
esac
PUBLIC_AUTHORITY_ALIAS=
if [ "$task_raw_authority" != "$PUBLIC_AUTHORITY" ]; then
    PUBLIC_AUTHORITY_ALIAS="\"$task_raw_authority\" 1;"
fi
export PUBLIC_SCHEME PUBLIC_AUTHORITY PUBLIC_PORT PUBLIC_AUTHORITY_ALIAS
envsubst '${PUBLIC_SCHEME} ${PUBLIC_AUTHORITY} ${PUBLIC_PORT} ${PUBLIC_AUTHORITY_ALIAS}' < /opt/stockpilot/nginx.conf.template > /etc/nginx/conf.d/default.conf
