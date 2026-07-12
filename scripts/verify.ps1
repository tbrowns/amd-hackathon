$ErrorActionPreference = "Stop"

Push-Location "$PSScriptRoot\..\backend"
try {
    python -m ruff check .
    python -m mypy app
    python -m pytest
}
finally {
    Pop-Location
}

Push-Location "$PSScriptRoot\..\frontend"
try {
    npm run lint
    npm run typecheck
    npm run test
    npm run build
}
finally {
    Pop-Location
}

Push-Location "$PSScriptRoot\.."
try {
    docker compose config --quiet
}
finally {
    Pop-Location
}
