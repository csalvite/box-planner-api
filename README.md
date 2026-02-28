# 🥊 Box Planner API

Box Planner is a backend API for planning and managing boxing training sessions.
It allows trainers and admins to create reusable training blocks, exercises, and complete trainings, with real authentication and role-based access control.

This project is designed as a real-world, production-ready API, not a tutorial demo.

---

## ✨ Features

### Authentication & Authorization

- Authentication handled by Supabase Auth
- JWT verification in NestJS
- Role-based access control:
  - admin
  - trainer
- Secure admin-only endpoints

### Users & Roles

- Admins can create new users (trainers or admins)
- Users are stored in Supabase Auth
- Roles managed in a profiles table
- Temporary password strategy (planned migration to email invitations)

### Training Domain

- Blocks
  - Reusable training blocks
  - Categorized (warm-up, technique, cardio, etc.)
  - Automatic duration calculation

- Exercises
  - Exercises inside blocks
  - Ordering support
  - Automatic block duration recalculation

- Trainings
  - Complete training sessions composed of blocks
  - Support for personal and group trainings
  - Block ordering inside trainings
  - Automatic total duration calculation

---

## 🧱 Tech Stack

### Backend

- Node.js
- NestJS
- TypeScript

### Database & Authentication

- Supabase (PostgreSQL)
- Supabase Auth
- JWT (HS256 – Legacy Secret)

### ORM

- Prisma
  - Connected to an existing Supabase database
  - Schema mapped to real tables
  - No destructive migrations

---

## 🗂️ Project Structure

src/
├── auth/
├── admin/
├── blocks/
├── exercises/
├── trainings/
├── prisma/
└── app.module.ts

---

## 🔐 Authentication Flow

1. Users authenticate via Supabase Auth (email + password)
2. Supabase returns a JWT (access_token)
3. The frontend sends:
   Authorization: Bearer <access_token>
4. The API verifies the token using SUPABASE_JWT_SECRET
5. User identity (sub) is extracted and used in all queries

---

## 🛠️ Environment Variables

Create a .env file in the project root:

SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
SUPABASE_JWT_SECRET=<legacy_jwt_secret>

Important:

- SUPABASE_SERVICE_ROLE_KEY must never be exposed to the frontend.
- It is only used internally by the API for admin actions.

---

## 🧪 Local Development

Install dependencies:
npm install

Start the API in development mode:
npm run start:dev

The API will run on:
http://localhost:3001

---

## 🔑 Login (Postman / Frontend)

POST https://<project-ref>.supabase.co/auth/v1/token?grant_type=password

Headers:
apikey: <anon_public_key>
Content-Type: application/json

Body:
{
"email": "user@example.com",
"password": "password"
}

Use the returned access token in API requests:
Authorization: Bearer <access_token>

---

## 🚧 Roadmap

- Replace temporary passwords with email invitations
- Add /me endpoint for frontend integration
- Connect frontend (Next.js) to the API
- Media uploads via Supabase Storage
- API documentation with Swagger
- Automated tests

---

## 🎯 Purpose

This project was built as a portfolio-grade backend to demonstrate:

- Clean NestJS architecture
- Real authentication and authorization
- Prisma with an existing database
- Secure admin workflows
- Business-driven API design

---
