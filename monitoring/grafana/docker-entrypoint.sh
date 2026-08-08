#!/bin/sh
set -e

if [ -n "$GF_SECURITY_ADMIN_PASSWORD_FILE" ] && [ -f "$GF_SECURITY_ADMIN_PASSWORD_FILE" ]; then
  grafana cli admin reset-admin-password --password-from-stdin < "$GF_SECURITY_ADMIN_PASSWORD_FILE"
fi

exec /run.sh
