#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/../backend"
python -m ruff check .
python -m mypy app
python -m pytest

cd ../frontend
npm run lint
npm run typecheck
npm run test
npm run build

cd ..
docker compose config --quiet
