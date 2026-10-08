.PHONY: dev build up down install

# Start the development environment (starts database and turbo dev)
dev: up
	pnpm run dev

# Build the monorepo
build:
	pnpm run build

# Start Docker containers (Postgres database)
up:
	docker compose up -d

# Stop Docker containers
down:
	docker compose down

# Install dependencies
install:
	pnpm install

# Migrate database
migrate:
	pnpm --filter @repo/database run db:push || (cd packages/database && npx prisma migrate dev)
