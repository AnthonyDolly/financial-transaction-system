# Financial Transaction System

## Overview
A robust, enterprise-grade financial transaction backend system built with Node.js, TypeScript, Express, PostgreSQL (Prisma), Kafka, Redis, JWT Auth, GraphQL, and advanced security. Designed for extensibility, auditability, and real-time analytics.

## Features
- **RESTful API** (Express.js)
- **GraphQL API** (Apollo Server, TypeGraphQL)
- **PostgreSQL** (Prisma ORM)
- **Kafka** (Event-driven architecture)
- **Redis** (Caching, rate limiting)
- **JWT Authentication & RBAC**
- **Audit Logging & Security Alerts**
- **Dashboards & Analytics**
- **Notification System** (Email, SMS, Push)
- **Comprehensive Testing** (Jest, Supertest, E2E)
- **CI/CD** (GitHub Actions, Docker)
- **OWASP Security Best Practices**

## Architecture
- Layered: API Gateway, Services, Data Access, Infrastructure
- Event-driven: Kafka for all critical events (transactions, audit, notifications)
- GraphQL and REST endpoints for all business domains
- Centralized error handling, logging, and validation

## Local Setup
1. **Clone the repo:**
   ```sh
   git clone <repo-url>
   cd financial-transaction-system
   ```
2. **Copy environment template:**
   ```sh
   cp env-template.txt .env
   # Edit .env with your local/Dev credentials
   ```
3. **Start Docker services (Postgres, Redis, Kafka):**
   ```sh
   docker-compose up -d
   ```
4. **Install dependencies:**
   ```sh
   npm install
   ```
5. **Run Prisma migrations & generate client:**
   ```sh
   npx prisma migrate dev
   npx prisma generate
   ```
6. **Start the app (dev):**
   ```sh
   npm run dev
   ```

## Running Tests
- **Unit tests:**
  ```sh
  npm run test:unit
  ```
- **E2E tests:**
  ```sh
  npm run test:e2e
  ```
- **Coverage report:**
  ```sh
  npm run test:coverage
  ```

## API Documentation
- **REST:**
  - Swagger UI: [http://localhost:3000/docs](http://localhost:3000/docs)
- **GraphQL:**
  - Playground: [http://localhost:3000/graphql](http://localhost:3000/graphql)

## 🚀 Despliegue en Producción

### Configuración Rápida

1. **Configurar variables de entorno:**
   ```sh
   cp env.prod.example .env
   # Editar .env con tus credenciales de producción
   ```

2. **Generar certificados SSL:**
   ```sh
   mkdir -p nginx/ssl
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
       -keyout nginx/ssl/key.pem \
       -out nginx/ssl/cert.pem \
       -subj "/C=ES/ST=Madrid/L=Madrid/O=Financial System/OU=IT/CN=tu-dominio.com"
   ```

3. **Desplegar automáticamente:**
   ```sh
   make prod-deploy
   ```

### Comandos de Producción

#### Usando Makefile (Recomendado)
```bash
# Despliegue y monitoreo
make prod-deploy     # Despliegue completo a producción
make health          # Health check de servicios
make status          # Estado de todos los servicios
make stats           # Estadísticas de Docker
make logs-app        # Logs de la aplicación

# Mantenimiento
make backup          # Backup de volúmenes
make restore         # Restaurar desde backup
make clean           # Limpiar contenedores e imágenes
make prune           # Limpiar recursos no utilizados

# Utilidades
make shell           # Acceder al shell del contenedor app
make db-shell        # Acceder al shell de PostgreSQL
make redis-shell     # Acceder al shell de Redis
make env-check       # Verificar variables de entorno

# Comandos rápidos
make quick-dev       # Inicio rápido para desarrollo
make quick-prod      # Inicio rápido para producción
make quick-stop      # Parar todos los servicios
```

#### Usando NPM Scripts (Desarrollo Local)
```bash
# Desarrollo local
npm run dev          # Desarrollo con nodemon
npm run build        # Compilar TypeScript
npm start            # Ejecutar aplicación compilada

# Testing
npm test             # Ejecutar tests unitarios
npm run test:coverage # Tests con cobertura
npm run test:e2e     # Tests end-to-end

# Calidad de código
npm run lint         # Linting y auto-fix
npm run format       # Formatear código
npm run type-check   # Verificar tipos TypeScript

# Base de datos
npm run db:migrate   # Ejecutar migraciones
npm run db:generate  # Generar cliente Prisma
npm run db:studio    # Abrir Prisma Studio
npm run db:seed      # Poblar datos de ejemplo
```

### Documentación Completa

Para información detallada sobre despliegue, monitoreo y mantenimiento, consulta:
- **[Makefile](Makefile)** - Comandos Docker unificados
- **`make help`** - Ver todos los comandos disponibles

## 🌐 Endpoints de Producción

- **Health Check:** `https://tu-dominio.com/health`
- **API Docs:** `https://tu-dominio.com/docs`
- **GraphQL:** `https://tu-dominio.com/graphql`
- **API Base:** `https://tu-dominio.com/api/v1`

## 🔧 Comandos de Docker

```sh
# Desarrollo
make dev-up
make dev-down
make dev-logs

# Producción
make prod-up
make prod-down
make prod-logs

# O usar comandos rápidos
make quick-dev    # Inicio rápido para desarrollo
make quick-prod   # Inicio rápido para producción
make quick-stop   # Parar todos los servicios
```

## 📊 Monitoreo

### Health Checks
- **Aplicación:** `curl https://tu-dominio.com/health`
- **PostgreSQL:** `docker compose -f docker-compose.prod.yml exec postgres pg_isready`
- **Redis:** `docker compose -f docker-compose.prod.yml exec redis redis-cli ping`

### Logs
```sh
# Logs en tiempo real
make logs-app

# Logs específicos
make logs-app    # Logs de la aplicación
make logs-db     # Logs de PostgreSQL
make logs-redis  # Logs de Redis

# Estado general
make status      # Estado de todos los servicios
make health      # Health check completo
make stats       # Estadísticas de Docker
```

## 🗄️ Backup y Recuperación

### Backup y Restauración
```sh
# Backup manual
make backup

# Restaurar backup
make restore

# Limpiar recursos no utilizados
make prune
```

## 🔒 Seguridad

### Configuraciones Recomendadas
1. **Cambiar todas las contraseñas por defecto**
2. **Usar certificados SSL reales**
3. **Configurar firewall**
4. **Monitorear logs regularmente**
5. **Configurar backup automático**

### Variables Críticas
```bash
# ¡OBLIGATORIO CAMBIAR EN PRODUCCIÓN!
JWT_SECRET=tu_super_secreto_jwt_aqui_minimo_32_caracteres
JWT_REFRESH_SECRET=tu_super_secreto_jwt_refresh_aqui_minimo_32_caracteres
POSTGRES_PASSWORD=tu_contraseña_postgres_segura
REDIS_PASSWORD=tu_contraseña_redis_segura
```

## 🚨 Troubleshooting

### Problemas Comunes
1. **Aplicación no inicia:** Verificar logs con `make logs-app`
2. **Base de datos no conecta:** Verificar variables de entorno con `make env-check`
3. **Redis no conecta:** Verificar configuración de Redis con `make logs-redis`
4. **Migraciones pendientes:** Ejecutar `make db-migrate`
5. **Datos de ejemplo:** Ejecutar `make db-seed`

### Logs de Debug
```sh
# Ver logs de la aplicación
make logs-app

# Ver logs de PostgreSQL
make logs-db

# Ver logs de Redis
make logs-redis

# Estado general de servicios
make status

# Health check completo
make health
```

## 📞 Soporte

- **Logs:** `/app/logs/app.log`
- **Documentación API:** `https://tu-dominio.com/docs`
- **Health Check:** `https://tu-dominio.com/health`
- **GraphQL Playground:** `https://tu-dominio.com/graphql`

---

**⚠️ IMPORTANTE**: Siempre prueba en un entorno de staging antes de desplegar a producción.
- Run migrations on Azure DB:
```sh
DATABASE_URL=<azure-db-url> npx prisma migrate deploy
```

### 6. **CI/CD (Optional)**
- Use `.github/workflows/ci.yml` for automated build, test, and deploy.

## Security Checklist (OWASP)
- [x] HTTPS enforced
- [x] JWT with strong secrets & expiry
- [x] Rate limiting (Redis)
- [x] Input validation (Zod)
- [x] SQL injection protection (Prisma)
- [x] XSS/CSRF protection (Helmet, CORS)
- [x] Audit logs for all sensitive actions
- [x] Role-based access control
- [x] Secure headers (Helmet)
- [x] Secrets managed via Azure Key Vault (recommended)

## Troubleshooting & FAQ
- **DB connection errors:** Check `.env` and Azure firewall rules
- **Kafka not available:** App will degrade gracefully, but enable for full features
- **Tests fail:** Ensure Docker services are running, and `.env` is correct
- **App Service errors:** Check logs in Azure Portal, verify env vars

## Contribution Guide
- Fork, branch, and PR workflow
- Write tests for new features
- Follow code style (ESLint, Prettier)
- Document new endpoints in Swagger/GraphQL

## 🎯 Nueva Estructura de Comandos

### 📋 **Separación de Responsabilidades**

#### 🛠️ **npm scripts** - Desarrollo Local
- **Construcción:** `npm run build`, `npm start`
- **Desarrollo:** `npm run dev`
- **Testing:** `npm test`, `npm run test:coverage`
- **Calidad:** `npm run lint`, `npm run format`
- **Base de datos:** `npm run db:migrate`, `npm run db:studio`

#### 🐳 **Makefile** - Docker y Producción
- **Desarrollo:** `make dev-up`, `make dev-down`
- **Producción:** `make prod-deploy`, `make prod-up`
- **Monitoreo:** `make health`, `make status`, `make logs-app`
- **Mantenimiento:** `make backup`, `make clean`, `make prune`

### 🚀 **Flujos de Trabajo Recomendados**

#### Desarrollo Local
```bash
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

#### Desarrollo con Docker
```bash
make quick-dev
# o
make dev-up
make dev-logs
```

#### Producción
```bash
make prod-deploy
make health
make logs-app
```

### 📚 **Documentación Adicional**
- **[COMMANDS_GUIDE.md](COMMANDS_GUIDE.md)** - Guía completa de comandos
- **[MAKEFILE_GUIDE.md](MAKEFILE_GUIDE.md)** - Documentación del Makefile
- **[FINAL_SUMMARY.md](FINAL_SUMMARY.md)** - Resumen de la refactorización

---

**💡 Tip:** Usa `make help` para ver todos los comandos disponibles.

For more details, see the PRD.md and code comments. 