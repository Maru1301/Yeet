.PHONY: build frontend backend

build: frontend backend

frontend:
	cd client-app && npm install && npm run build:Release

backend:
	go build -o Yeet/yeet.exe .
