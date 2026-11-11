#!/bin/sh
set -e

python manage.py migrate --noinput

if [ "${SEED_SAMPLE_DATA:-false}" = "true" ]; then
    python manage.py seed_books --if-empty
fi

exec "$@"
