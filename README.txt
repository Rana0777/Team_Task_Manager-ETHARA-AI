TEAM TASK MANAGER

Live Application URL:
https://workspaceapi-server-production-b330.up.railway.app

GitHub Repository:
https://github.com/sreejameesa/team-task-manager


1. Project Overview

Team Task Manager is a full-stack web application for managing projects, team members, and tasks with role-based access control.

Admins can create projects, add or remove project members, create tasks, assign work, update project/task details, and view all users.

Members can log in, view only their assigned/visible projects, track project tasks, and update the status of tasks assigned to them.

The dashboard gives a quick overview of total projects, total tasks, tasks by status, overdue tasks, recent tasks, and the current user's assigned work.


2. Key Features

- Signup and login with JWT authentication
- Password hashing with bcrypt
- Admin and Member roles
- Project creation and management
- Project team/member management
- Task creation, assignment, priority, due dates, and status tracking
- Dashboard with overdue tasks, recent tasks, my tasks, and status breakdown
- REST API backend
- PostgreSQL database with relational schema
- Zod request/response validation
- React frontend with protected routes
- Railway deployment configuration included


3. Tech Stack

Frontend:
- React
- Vite
- TypeScript
- Wouter
- TanStack Query
- Tailwind CSS
- shadcn/ui style components

Backend:
- Node.js
- Express 5
- TypeScript
- JWT authentication
- bcryptjs
- Zod validation

Database:
- PostgreSQL
- Drizzle ORM

Tooling:
- pnpm workspace monorepo
- Drizzle Kit
- Orval generated API client
- Railway config-as-code


4. Demo Credentials

Admin:
Email: admin@demo.com
Password: admin123

Member 1:
Email: alice@demo.com
Password: member123

Member 2:
Email: bob@demo.com
Password: member123


5. Local Setup

Prerequisites:
- Node.js 24
- Corepack enabled
- PostgreSQL database
- pnpm via Corepack

Install dependencies:
corepack pnpm install

Required environment variables:
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your_secure_jwt_secret
NODE_ENV=development
PORT=3000

Push database schema:
corepack pnpm run db:push

Seed demo data:
corepack pnpm run db:seed

Build the app:
corepack pnpm run build

Start the production server:
corepack pnpm start

Health check:
GET /api/healthz


6. Railway Deployment

This repository includes railway.json with build and start commands.

Railway environment variables:
DATABASE_URL=<Railway PostgreSQL connection string>
JWT_SECRET=<secure random secret>
NODE_ENV=production

Deployment steps:
1. Push the repository to GitHub.
2. Create a new Railway project.
3. Add a PostgreSQL service.
4. Deploy the GitHub repository as the app service.
5. Set the app service environment variables listed above.
6. Let Railway run the build command:
   corepack pnpm run build
7. Railway starts the app with:
   corepack pnpm start
8. After deployment, run the database commands from Railway shell or local terminal with Railway env loaded:
   corepack pnpm run db:push
   corepack pnpm run db:seed
9. Open the public Railway URL and log in with the demo credentials.

The Express server serves both:
- REST API under /api
- Built React frontend for browser routes such as /login, /dashboard, /projects


7. API Endpoints

Base path:
/api

Health:
GET /healthz

Auth:
POST /auth/signup
POST /auth/login
GET /auth/me

Projects:
GET /projects
POST /projects
GET /projects/:id
PUT /projects/:id
DELETE /projects/:id
POST /projects/:id/members
DELETE /projects/:id/members/:userId

Tasks:
GET /tasks
GET /tasks?projectId=:id
GET /tasks?assigneeId=:id
GET /tasks?status=todo
GET /tasks?overdue=true
POST /tasks
GET /tasks/:id
PUT /tasks/:id
DELETE /tasks/:id

Users:
GET /users
GET /users/:id

Dashboard:
GET /dashboard


8. Role-Based Access Control

Admin permissions:
- Create projects
- Edit/delete projects
- Add/remove project members
- Create tasks
- Edit/delete tasks
- Assign tasks
- View all users
- View all projects and dashboard data

Member permissions:
- View projects where they are a member
- View tasks in visible projects
- Update status only for tasks assigned to them
- View their own dashboard data

Public signup creates Member accounts only. Admin accounts are created through seed/provisioning data.


9. Database Relationships

users:
- Stores user profile, email, password hash, role, created date

projects:
- Stores project name, description, owner, created date
- owner_id references users.id

project_members:
- Join table between projects and users
- project_id references projects.id
- user_id references users.id

tasks:
- Stores title, description, status, priority, due date, project, assignee, creator
- project_id references projects.id
- assignee_id references users.id
- created_by references users.id


10. Validation

The backend validates request bodies and route/query parameters using generated Zod schemas from the OpenAPI specification.

Examples:
- Invalid email format is rejected during signup.
- Password must be at least 6 characters.
- Task status must be one of todo, in_progress, done.
- Task priority must be one of low, medium, high.
- Assignees must be project members.
- Members can only update status for their assigned tasks.


11. Useful Commands

Install:
corepack pnpm install

Typecheck:
corepack pnpm run typecheck

Build:
corepack pnpm run build

Start:
corepack pnpm start

Push database schema:
corepack pnpm run db:push

Force push database schema:
corepack pnpm run db:push-force

Seed demo data:
corepack pnpm run db:seed


12. Submission Checklist

- Live URL: https://workspaceapi-server-production-b330.up.railway.app
- GitHub Repository Link: https://github.com/sreejameesa/team-task-manager
- README.txt: included
- Demo Video: To be recorded and uploaded separately
