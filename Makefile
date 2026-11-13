.PHONY: up down logs reset

up:      ## Собрать и запустить
	docker compose up -d --build

down:    ## Остановить
	docker compose down

logs:    ## Логи приложения
	docker compose logs -f

reset:   ## Сбросить БД — при запуске данные создадутся заново
	docker compose down
	rm -f data/pharmacy.db
	docker compose up -d --build
