Set-Location "$PSScriptRoot/../../backend"
python -m venv .venv
. .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt pytest pytest-django ruff black
python manage.py migrate
python manage.py setup_roles
