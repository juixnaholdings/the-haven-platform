up:
	docker compose -f infra/compose.yaml up --build

down:
	docker compose -f infra/compose.yaml down

migrate:
	docker compose -f infra/compose.yaml run --rm backend python manage.py migrate

makemigrations:
	docker compose -f infra/compose.yaml run --rm backend python manage.py makemigrations

createsuperuser:
	docker compose -f infra/compose.yaml run --rm backend python manage.py createsuperuser
