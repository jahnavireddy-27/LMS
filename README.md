# Personalized Learning Management System (LMS)

A full-stack Learning Management System designed to support course discovery, user authentication, enrollment management, and personalized learning experiences.

Built using **Next.js, TypeScript, Node.js, Express, MongoDB, and Redis**, the application follows a separate frontend and backend architecture with RESTful APIs.

## Overview

The Personalized Learning Management System provides a centralized platform for managing online learning activities. It supports user authentication, course management, student enrollment, and course recommendations.

The application is structured as a monorepo, with independently organized frontend and backend applications.

## Features

### Authentication and User Management
- User registration and login.
- Password hashing for secure credential storage.
- Session-based authentication.
- Authentication middleware for protecting API routes.
- Role-based access control for administrative operations.
- Rate limiting for authentication endpoints.

### Course Management
- Create and manage courses through administrative APIs.
- Retrieve available courses.
- Update and manage course information.
- Support for course-related data management.

### Enrollment Management
- Enroll users in courses.
- Manage course enrollment records.
- Track enrollment and learning progress.

### Personalized Recommendations
- Course recommendation functionality through a dedicated recommendations API.
- Uses available user and course information to support personalized course discovery.

### Backend and Infrastructure
- RESTful API architecture using Express.js.
- MongoDB integration with Mongoose models.
- Redis integration.
- Centralized error-handling middleware.
- Input validation and request handling.
- Docker-based application configuration.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Backend | Node.js, Express.js, TypeScript |
| Database | MongoDB, Mongoose |
| Caching / Supporting infrastructure | Redis |
| Authentication | Password hashing, session-based authentication |
| Containerization | Docker, Docker Compose |
| Testing | Node.js test suite |

## Project Structure

```text
LMS/
│
├── client/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   └── backend-status.tsx
│   │   └── lib/
│   │       └── api.ts
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── scripts/
│   │   ├── utils/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── test/
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── .dockerignore
├── .gitignore
├── docker-compose.yml
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

Ensure the following tools are installed:

- Node.js
- npm
- Docker and Docker Compose
- MongoDB
- Redis

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/jahnavireddy-27/LMS.git
cd LMS
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment variables**

Refer to the example environment files:

- `client/.env.example`
- `server/.env.example`

Create corresponding `.env` files and configure the required application settings, database connection, Redis connection, and authentication secrets.

Do not commit actual environment files or credentials.

**4. Start the application using Docker Compose**

```bash
docker compose up --build
```

Use the configured service ports and environment variables to access the frontend and backend.

## Backend API

The backend exposes RESTful endpoints organized into the following route modules:

| Route module | Responsibility |
|---|---|
| Authentication | User registration and login |
| Courses | Course-related operations |
| Enrollments | Course enrollment management |
| Recommendations | Course recommendations |
| Admin | Administrative operations |
| Health | Application health checks |

## Testing

The backend includes tests covering:

- Password utility functionality.
- Input validation.
- API integration.

Run the test suite using the scripts configured in the server's `package.json`.

<img width="1464" height="803" alt="image" src="https://github.com/user-attachments/assets/0b35e4ef-d107-4cd4-9bf2-7e7313ed9387" />

<img width="1466" height="838" alt="image" src="https://github.com/user-attachments/assets/2fd91587-d030-4178-afb6-3b7d297f5622" />

<img width="1466" height="883" alt="image" src="https://github.com/user-attachments/assets/d08df869-a956-4ce5-9a00-49f8a4ad8ca4" />

<img width="1468" height="707" alt="image" src="https://github.com/user-attachments/assets/2b594b6d-1559-4e77-9bc9-3c04633009ab" />

<img width="1470" height="846" alt="image" src="https://github.com/user-attachments/assets/9157a678-8f18-4b08-81fd-46a81590dcda" />

<img width="1466" height="840" alt="image" src="https://github.com/user-attachments/assets/e62b3e0c-e2dc-48f0-b963-fe9517adf771" />





