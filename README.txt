# 🚀 Team Task Manager (Full-Stack Project)

🔗 **Live Demo:** https://workspaceapi-server-production-b330.up.railway.app 
📦 **GitHub Repository:** https://github.com/Rana0777/Team_Task_Manager-ETHARA-AI

---

## 📌 Project Overview

**Team Task Manager** is a full-stack web application designed to manage projects, teams, and tasks efficiently using **role-based access control (RBAC)**.

It allows admins to manage projects and assign tasks, while members can track and update their assigned work. The application provides a real-time dashboard for productivity tracking and task monitoring.

---

## 🎯 Why This Project?

This project demonstrates:

* 🔐 Secure authentication using JWT & bcrypt
* 🧑‍🤝‍🧑 Role-Based Access Control (Admin & Member)
* ⚙️ Scalable backend architecture (REST API)
* 📊 Real-time dashboard with task insights
* 🗄️ Relational database design with PostgreSQL
* 🌐 Full-stack integration (Frontend + Backend + DB)

---

## ✨ Key Features

### 🔐 Authentication & Security

* User signup and login with JWT authentication
* Password hashing using bcrypt
* Protected routes on frontend

### 👥 Role-Based Access Control

* **Admin:**

  * Create/edit/delete projects
  * Add/remove team members
  * Assign and manage tasks
  * View all users and analytics

* **Member:**

  * View assigned projects
  * Update task status
  * Track personal dashboard

---

### 📁 Project Management

* Create and manage multiple projects
* Add/remove team members
* Track project progress

### ✅ Task Management

* Assign tasks with priority & deadlines
* Track task status (todo, in_progress, done)
* Filter tasks by project, user, or status
* Overdue task tracking

### 📊 Dashboard

* Total projects & tasks overview
* Task status breakdown
* Overdue tasks
* Recent activity
* Personal task tracking

---

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* TypeScript
* Wouter
* TanStack Query
* Tailwind CSS
* shadcn/ui

### Backend

* Node.js
* Express.js (v5)
* TypeScript
* JWT Authentication
* bcryptjs
* Zod validation

### Database

* PostgreSQL
* Drizzle ORM

### Tooling

* pnpm (monorepo setup)
* Orval API client
* Drizzle Kit
* Railway deployment

---

## 🧪 Demo Access

⚠️ *Demo credentials are intentionally not public for security reasons.*
👉 Please use signup or contact for test access.

---

## ⚙️ Local Setup Guide

### Prerequisites

* Node.js (v24 recommended)
* PostgreSQL
* Corepack enabled

---

### 1️⃣ Install Dependencies

```bash
corepack pnpm install
```

### 2️⃣ Setup Environment Variables

```env
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your_secure_jwt_secret
NODE_ENV=development
PORT=3000
```

### 3️⃣ Setup Database

```bash
corepack pnpm run db:push
corepack pnpm run db:seed
```

### 4️⃣ Run Application

```bash
corepack pnpm run build
corepack pnpm start
```

---

## 🚀 Deployment (Railway)

This project is fully deployable using Railway.

### Steps:

1. Push repo to GitHub
2. Create Railway project
3. Add PostgreSQL service
4. Deploy repo
5. Add environment variables
6. Run:

```bash
corepack pnpm run db:push
corepack pnpm run db:seed
```

---

## 🔗 API Overview

Base URL:

```
/api
```

### Auth

* POST `/auth/signup`
* POST `/auth/login`
* GET `/auth/me`

### Projects

* GET `/projects`
* POST `/projects`
* PUT `/projects/:id`
* DELETE `/projects/:id`

### Tasks

* GET `/tasks`
* POST `/tasks`
* PUT `/tasks/:id`
* DELETE `/tasks/:id`

### Dashboard

* GET `/dashboard`

---

## 🗄️ Database Design

* **users** → stores user data & roles
* **projects** → project details
* **project_members** → mapping users ↔ projects
* **tasks** → task details with assignment

---

## ✅ Validation & Data Integrity

* Request validation using Zod
* Strong type safety (TypeScript)
* Role-based permission checks
* Only valid members can be assigned tasks

---

## 📸 Screenshots (Add Your Images Here)

> Add screenshots of:

* Dashboard
* Project Page
* Task Management UI

---

## 📈 Future Improvements

* Notifications system
* Real-time updates (WebSockets)
* File attachments in tasks
* Activity logs
* AI-based task suggestions

---

## 👨‍💻 Author

**Yuvraj Singh**
📧 [yuvrajsingh857603@gmail.com](mailto:yuvrajsingh857603@gmail.com)

---

## ⭐ Final Note

This project reflects strong fundamentals in **full-stack development, backend design, and scalable architecture**, making it suitable for real-world team collaboration systems.

---

⭐ *If you like this project, consider giving it a star!*
