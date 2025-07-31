# Product Requirements Document (PRD)

## 📘 Overview

**Proyecto:** Sistema de Transacciones Financieras para una Fintech
**Objetivo:** Crear un backend robusto en Node.js con TypeScript para gestionar transacciones entre usuarios, integrando eventos Kafka, autenticación JWT, prácticas de seguridad OWASP y uso de PostgreSQL como base de datos.

## 🧩 Core Features

### 1. Autenticación y Autorización

* Registro y Login con JWT
* Recuperación de contraseña
* Middleware de protección por rol (Admin / Usuario)

### 2. Gestión de Usuarios

* CRUD completo de usuarios
* Asignación de roles y perfiles

### 3. Gestión de Cuentas

* Creación de cuentas bancarias con saldos iniciales
* Relación 1:1 entre usuario y cuenta

### 4. Transacciones

* Endpoint para transferencias entre cuentas
* Validación de saldo
* Publicación de eventos con Kafka (`transaction.created`, `transaction.completed`)
* Confirmación de transacciones mediante Kafka Consumer

### 5. Auditoría y Logs

* Persistencia de eventos críticos
* Endpoint GraphQL para consultar logs y auditoría

### 6. Seguridad

* Validaciones de input (Zod o express-validator)
* OWASP Top 10 mitigation:

  * Inyección SQL: uso de ORM (Prisma o TypeORM)
  * Autenticación rota: expiración y revocación de tokens
  * Exposición de datos sensibles: sanitización y encriptación

### 7. Documentación de API

* Swagger (OpenAPI)
* Colección Postman exportable

### 8. Testing

* Unitarios con Jest (servicios y validadores)
* Integración: flujo de autenticación y transacción

## 🧑‍💻 User Experience (UX)

La API será consumida por un cliente frontend o móvil. Se prioriza:

* Respuestas claras y estructuradas
* Documentación navegable vía Swagger
* Respuestas rápidas (<500ms en endpoints críticos)

## 🏛️ Technical Architecture

* **Backend:** Node.js + TypeScript (Express.js)
* **Base de datos:** PostgreSQL
* **Mensajería:** Kafka (Apache o Confluent Cloud)
* **ORM:** Prisma (recomendado por tipado)
* **Autenticación:** JWT + Bcrypt
* **Testing:** Jest + Supertest
* **Contenedores:** Docker + Docker Compose
* **Cache opcional:** Redis
* **GraphQL:** Apollo Server (para consultas avanzadas de logs)

## 🛣️ Development Roadmap

| Fase     | Tareas                                                          |
| -------- | --------------------------------------------------------------- |
| Semana 1 | Setup del proyecto, configuración base, docker, Prisma, Swagger |
| Semana 2 | Módulo de usuarios y autenticación JWT                          |
| Semana 3 | Módulo de cuentas + pruebas                                     |
| Semana 4 | Transacciones + integración con Kafka Producer                  |
| Semana 5 | Kafka Consumer + sistema de auditoría                           |
| Semana 6 | Documentación, testing, hardening de seguridad (OWASP)          |

## 🔗 Logical Dependency Chain

1. Auth debe estar listo antes que cualquier módulo protegido.
2. Usuario debe estar listo antes de crear cuentas.
3. Cuentas deben estar listas antes de habilitar transacciones.
4. Transacciones dependen de Kafka (producer y consumer).

## ⚠️ Risks and Mitigations

| Riesgo              | Mitigación                                       |
| ------------------- | ------------------------------------------------ |
| Kafka no responde   | Cola de respaldo en base de datos / retry policy |
| Fallos de seguridad | Auditoría OWASP, pruebas de penetración básicas  |
| Errores de saldo    | Transacciones atómicas y bloqueos en BD          |

## 📎 Appendix

### Endpoints Principales (REST)

**Auth:**

* POST `/auth/register`
* POST `/auth/login`

**Usuarios:**

* GET `/users`
* GET `/users/:id`

**Cuentas:**

* POST `/accounts`
* GET `/accounts/:id`

**Transacciones:**

* POST `/transactions`
* GET `/transactions/:id`

**Auditoría (GraphQL):**

* `query { logs(userId: ID!): [Log] }`

### Kafka Topics

* `transaction.created`
* `transaction.completed`

---

Este PRD cubre todos los requisitos de la oferta laboral para Backend Engineer con Node.js, y es ideal como proyecto completo de portafolio.
