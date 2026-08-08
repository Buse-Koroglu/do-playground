#!/bin/sh
set -e

DB_PASSWORD=${cat "$DB_PASSWORD_FILE"}
export DATA_SOURCE_NAME="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=disable"

exec /bin/postgres_exporter 
