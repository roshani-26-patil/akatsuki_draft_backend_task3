# Akatsuki's Draft — AI-Enabled Content Sharing Platform (Backend)

[![Node.js Version](https://img.shields.io/badge/Node.js-v20%2B%20%7C%20v24-brightgreen.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-v5.3-blue.svg)](https://expressjs.com/)
[![Mongoose](https://img.shields.io/badge/Mongoose-v9.1-emerald.svg)](https://mongoosejs.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)
[![Vitest](https://img.shields.io/badge/Tests-27%20Passing-success.svg)](https://vitest.dev/)

A functional, secure, and production-grade RESTful backend for **Akatsuki's Draft**: an AI-enabled content sharing platform built for **Nodevember 4.0**.

Akatsuki's Draft enables creators to draft stories and technical articles, refine their prose using state-of-the-art AI models, and submit their work for editorial review. Only posts thoroughly vetted and approved by platform administrators are published to the public feed.

---

## Table of Contents

1. [Features & Capabilities](#features--capabilities)
2. [Technology Stack](#technology-stack)
3. [Project Folder Structure](#project-folder-structure)
4. [Prerequisites](#prerequisites)
5. [Installation & Setup](#installation--setup)
6. [Environment Configuration (`.env`)](#environment-configuration-env)
7. [Starting the Application](#starting-the-application)
8. [Administrator Initialization](#administrator-initialization)
9. [API Endpoints Reference](#api-endpoints-reference)
10. [AI Content Improvement Architecture](#ai-content-improvement-architecture)
11. [Postman Collection & Testing Guide](#postman-collection--testing-guide)
12. [Automated Test Suite](#automated-test-suite)
13. [Security Architecture](#security-architecture)
14. [Troubleshooting & Common Errors](#troubleshooting--common-errors)

---

## Features & Capabilities

### User Features
- **Secure Registration & Login**: Password hashing with bcrypt, JWT Bearer tokens with configurable expiration, email format validation, and duplicate conflict detection.
- **Draft & Post Management**: Create posts, save incomplete ideas as drafts, update writing, or delete personal posts with server-enforced ownership checks.
- **Approval Submission**: Users can promote their drafts to `pending` status for administrator review. Normal users can never directly self-approve content.
- **AI-Powered Polishing**: Send a draft to the integrated AI engine (Google Gemini or OpenAI). The AI refines grammar, flow, vocabulary, and readability while preserving author intent, creating a **new draft** with complete attribution and leaving the original post intact.
- **Personal Dashboard**: Fetch user drafts and published posts with pagination, status filtering, and chronological sorting.

### Administrator Features
- **Review Queue**: View all articles submitted by platform creators awaiting review (`status: pending`) with pagination and creator details.
- **Editorial Approval**: Approve pending articles, publishing them immediately to the public discovery feed.
- **Editorial Rejection**: Reject articles that do not meet publication standards with optional custom editorial feedback and guidance.
- **Role Enforcement**: Strict database-backed authorization verification prevents any regular user from accessing or executing administrative operations.

### Public Post Exploration
- **Clean Discovery Feed**: Public users can explore exclusively **approved** articles (`status: approved`). Drafts, pending submissions, and rejected posts are shielded.
- **Search & Filter**: Full-text keyword search across titles, descriptions, and content, combined with category filtering.
- **Single Post View**: Public access to single approved posts by MongoDB ObjectId with creator attribution.

---

## Technology Stack

| Layer / Concern | Technology | Purpose |
| :--- | :--- | :--- |
| **Runtime** | Node.js (v20+ / v24) | High-performance asynchronous JavaScript runtime |
| **Framework** | Express.js v5 | Modern, minimalist web application framework |
| **Database** | MongoDB & Mongoose v9 | Document database with schema enforcement, indexes, and hooks |
| **Authentication** | JWT (`jsonwebtoken`) | Stateless token-based Bearer authentication |
| **Password Security**| `bcryptjs` | Salted password hashing (10 salt rounds) |
| **Security Headers** | `helmet` | Sets HTTP response headers protecting against common vulnerabilities |
| **Cross-Origin** | `cors` | Configurable whitelist for single-page applications and web clients |
| **Rate Limiting** | `express-rate-limit` | Rate limiters protecting auth, AI, and global API endpoints |
| **Input Validation** | `express-validator` | Strict request parameter, query, and body sanitization |
| **AI Integration** | `@google/generative-ai` & OpenAI REST | Native Google Gemini and OpenAI model interfaces |
| **Testing** | `vitest` & `supertest` | Fast, ES-module-native unit and integration testing suite |
| **Dev Tooling** | `nodemon` | Automatic server reload upon code change in development |

---

## Project Folder Structure

```
akatsukis-draft-backend/
├── src/
│   ├── config/
│   │   └── db.js                 # MongoDB connection and graceful shutdown handlers
│   ├── controllers/
│   │   ├── authController.js     # User registration, authentication, and profile
│   │   ├── postController.js     # Post CRUD, status transition, and public feed
│   │   ├── adminController.js    # Editorial review queue, approval, and rejection
│   │   └── aiController.js       # AI writing improvement controller
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT Bearer token validation and user hydration
│   │   ├── adminMiddleware.js    # Database-verified administrator role guard
│   │   ├── errorMiddleware.js    # Centralized error handler and 404 route catcher
│   │   └── validateRequest.js    # express-validator formatter and error dispatcher
│   ├── models/
│   │   ├── User.js               # User schema, password hashing hook, and safe serialization
│   │   └── Post.js               # Post schema, enum validation, indexes, and AI metadata
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth routes with rate limiting
│   │   ├── postRoutes.js         # /api/posts routes for creators and public readers
│   │   ├── adminRoutes.js        # /api/admin routes guarded by admin middleware
│   │   └── aiRoutes.js           # /api/ai routes with dedicated rate limiting
│   ├── services/
│   │   └── aiService.js          # Google Gemini & OpenAI integration and JSON validation
│   ├── app.js                    # Express application setup, security, and route mounting
│   └── server.js                 # Server entry point, port binding, and process lifecycle
├── scripts/
│   └── createAdmin.js            # Secure CLI script to create or promote administrator
├── tests/
│   ├── auth.test.js              # Authentication and authorization tests
│   ├── posts.test.js             # Post lifecycle, ownership, and public feed tests
│   ├── admin.test.js             # Editorial review, approval, and rejection tests
│   └── ai.test.js                # AI improvement workflow and draft preservation tests
├── postman/
│   └── Akatsukis_Draft_API.postman_collection.json  # Importable Postman collection
├── .env.example                  # Template with environment variable documentation
├── .env                          # Local environment configuration file
├── .gitignore                    # Excludes node_modules, .env, and sensitive artifacts
├── package.json                  # Dependencies, metadata, and execution scripts
└── README.md                     # Documentation
```

---

## Prerequisites

Ensure you have the following installed on your machine:

1. **Node.js**: Version `20.x` or `24.x` (LTS recommended). Check with:
   ```powershell
   node -v
   npm -v
   ```
2. **MongoDB**:
   - A local MongoDB instance running on `mongodb://127.0.0.1:27017` (via [MongoDB Community Server](https://www.mongodb.com/try/download/community) or Docker), **OR**
   - A free cloud database instance from [MongoDB Atlas](https://www.mongodb.com/atlas).
3. **AI Provider API Key (Optional for core APIs, required for live AI polish)**:
   - A [Google AI Studio Gemini API Key](https://aistudio.google.com/), or
   - An [OpenAI API Key](https://platform.openai.com/api-keys).

---

## Installation & Setup

1. **Clone or navigate to the repository folder**:
   ```powershell
   cd c:\Users\DELL\Documents\antigravity\joyful-faraday
   ```

2. **Install all dependencies**:
   ```powershell
   npm install
   ```

---

## Environment Configuration (`.env`)

A default `.env` file is generated in the root directory. If setting up from scratch, copy `.env.example`:

```powershell
Copy-Item .env.example .env
```

### Key Configuration Variables

| Variable | Description | Example / Recommended Value |
| :--- | :--- | :--- |
| `PORT` | HTTP server port | `5000` |
| `NODE_ENV` | Application environment mode | `development` or `production` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/akatsukis_draft` |
| `JWT_SECRET` | Secret key used to sign JWT tokens | At least 32 random characters |
| `JWT_EXPIRES_IN` | Token validity duration | `1d`, `7d`, `24h` |
| `CLIENT_URL` | Allowed origin for CORS | `http://localhost:3000` |
| `RATE_LIMIT_WINDOW_MS` | Window duration for rate limiting | `900000` (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | Global max requests per window | `200` |
| `AUTH_RATE_LIMIT_MAX_REQUESTS`| Max login/register attempts per window | `20` |
| `AI_RATE_LIMIT_MAX_REQUESTS` | Max AI polish requests per window | `10` |
| `AI_PROVIDER` | Configured AI provider | `gemini` (default) or `openai` |
| `AI_API_KEY` | Real API key for Google Gemini / OpenAI | `AIzaSy...` |
| `AI_MODEL` | Model version to execute | `gemini-1.5-flash` or `gpt-4o-mini` |
| `ADMIN_NAME` | Name for default administrator account | `Admin User` |
| `ADMIN_EMAIL` | Email for default administrator account | `admin@akatsukidraft.com` |
| `ADMIN_PASSWORD`| Strong password for administrator | `AdminSecurePassword123!` |

### Generating a Secure JWT Secret

Run the following command in PowerShell to generate a cryptographically secure 256-bit hexadecimal secret:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the generated string into `JWT_SECRET=` inside your `.env` file.

---

## Starting the Application

### Development Mode (with Nodemon hot-reload)
```powershell
npm run dev
```

### Production Mode
```powershell
npm start
```

When started, the console displays:
```
=======================================================
 Akatsuki's Draft API Server running
 Port:        http://localhost:5000
 Environment: development
 AI Provider: gemini
=======================================================
[Database] MongoDB connected: 127.0.0.1/akatsukis_draft
```

---

## Administrator Initialization

Platform rules prevent ordinary users from self-promoting to the `admin` role. To initialize an administrator, run the built-in CLI script:

### Method 1: Using `.env` Defaults
```powershell
npm run create-admin
```
This reads `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` from `.env`.

### Method 2: Passing Explicit CLI Arguments
```powershell
node scripts/createAdmin.js --email=leader@akatsukidraft.com --password=PainShinraTensei2026! --name="Pain"
```

If the email already exists in the database, the script securely promotes the user to `role: 'admin'`. If the user does not exist, it creates a new administrative user with a securely hashed password.

---

## API Endpoints Reference

All API responses follow a uniform, standardized JSON structure:

**Success Response Format**:
```json
{
  "success": true,
  "message": "Human-readable description of outcome",
  "data": { ... }
}
```

**Error Response Format**:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    { "field": "email", "message": "Please provide a valid email address" }
  ]
}
```

### 1. Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user (forces `user` role) |
| `POST` | `/api/auth/login` | Public | Authenticate user & issue signed JWT |
| `GET` | `/api/auth/me` | Authenticated | Retrieve authenticated user's profile |

#### Register Example: `POST /api/auth/register`
**Request Body**:
```json
{
  "name": "Itachi Uchiha",
  "email": "itachi@akatsukidraft.com",
  "password": "Sharing@n2026!"
}
```
**Response (`201 Created`)**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "6724ab10e9f29103c14a2b90",
      "name": "Itachi Uchiha",
      "email": "itachi@akatsukidraft.com",
      "role": "user",
      "createdAt": "2026-10-28T03:15:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2. Post Management Endpoints (`/api/posts`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/posts` | Authenticated | Create a draft or submit pending post |
| `GET` | `/api/posts/my-posts` | Authenticated | Get current user's posts & drafts |
| `PATCH` | `/api/posts/:id` | Authenticated (Owner) | Update post (content edits reset approval) |
| `DELETE`| `/api/posts/:id` | Authenticated (Owner) | Delete post permanently |
| `GET` | `/api/posts` | Public | Explore approved posts (paginated/filtered) |
| `GET` | `/api/posts/:id` | Public | View single approved post by ID |

#### Create Draft Example: `POST /api/posts`
**Header**: `Authorization: Bearer <userToken>`  
**Request Body**:
```json
{
  "title": "The True Meaning of Shinobi",
  "description": "Reflections on duty and self-sacrifice.",
  "content": "A true shinobi is one who endures even when all hope appears extinguished.",
  "category": "Philosophy",
  "status": "draft"
}
```
**Response (`201 Created`)**:
```json
{
  "success": true,
  "message": "Draft saved successfully",
  "data": {
    "post": {
      "_id": "6724ac98e9f29103c14a2b95",
      "title": "The True Meaning of Shinobi",
      "description": "Reflections on duty and self-sacrifice.",
      "content": "A true shinobi is one who endures even when all hope appears extinguished.",
      "category": "Philosophy",
      "status": "draft",
      "createdBy": {
        "_id": "6724ab10e9f29103c14a2b90",
        "name": "Itachi Uchiha",
        "email": "itachi@akatsukidraft.com"
      },
      "createdAt": "2026-10-28T03:16:00.000Z",
      "updatedAt": "2026-10-28T03:16:00.000Z"
    }
  }
}
```

> [!IMPORTANT]
> **Safety on Post Editing**: If a previously approved post is edited by its creator, the backend automatically sets its status back to `pending` (or `draft` if requested). This guarantees that unreviewed changes can **never** bypass editorial review.

---

### 3. Administrator Endpoints (`/api/admin`)

All routes require both `authenticate` and `requireAdmin` middleware.

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/posts/pending` | Admin Only | View all posts awaiting editorial review |
| `PATCH` | `/api/admin/posts/approve/:id` | Admin Only | Approve pending post for public viewing |
| `PATCH` | `/api/admin/posts/reject/:id` | Admin Only | Reject pending post with feedback |

#### Approve Post Example: `PATCH /api/admin/posts/approve/6724ac98e9f29103c14a2b95`
**Header**: `Authorization: Bearer <adminToken>`  
**Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Post approved successfully and is now publicly visible",
  "data": {
    "post": {
      "_id": "6724ac98e9f29103c14a2b95",
      "title": "The True Meaning of Shinobi",
      "status": "approved",
      "rejectionReason": null
    }
  }
}
```

---

### 4. AI Content Improvement (`/api/ai`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/ai/improve/:postId` | Authenticated (Owner) | Polish writing using AI and create new draft |

#### Workflow:
1. Validates that the post exists and belongs to the authenticated user.
2. Sends the title, description, and content to Google Gemini or OpenAI.
3. AI improves grammar, structure, tone, and vocabulary while preserving core meaning.
4. Generates a **new draft** with a distinct MongoDB ObjectId.
5. Populates `aiMetadata` (`isAiImproved: true`, `originalPostId: <id>`, `improvedAt: <Date>`).
6. Preserves the author's original post completely unchanged.

#### Example Response (`201 Created`):
```json
{
  "success": true,
  "message": "Post content improved successfully and saved as a new draft",
  "data": {
    "originalPostId": "6724ac98e9f29103c14a2b95",
    "improvedDraft": {
      "_id": "6724ae15e9f29103c14a2ba2",
      "title": "The Essence of a Shinobi: Sacrifice and Endurance",
      "description": "An analytical exploration of duty, resilience, and personal sacrifice.",
      "content": "Throughout history, the true definition of a shinobi has rested not upon martial prowess, but upon the capacity to endure adversity with steadfast determination...",
      "status": "draft",
      "aiMetadata": {
        "isAiImproved": true,
        "originalPostId": "6724ac98e9f29103c14a2b95",
        "originalTitle": "The True Meaning of Shinobi",
        "improvedAt": "2026-10-28T03:20:00.000Z"
      }
    }
  }
}
```

---

## Postman Collection & Testing Guide

An importable Postman collection is included in the project:
`postman/Akatsukis_Draft_API.postman_collection.json`.

### How to Import and Use:
1. Open **Postman**.
2. Click **Import** (top left) and select `postman/Akatsukis_Draft_API.postman_collection.json`.
3. The collection includes pre-configured collection variables:
   - `baseUrl`: Defaults to `http://localhost:5000`
   - `userToken`: Automatically captured on registration/login
   - `adminToken`: Automatically captured on admin login
   - `postId`, `approvedPostId`, `improvedDraftId`: Dynamically populated by test scripts
4. **Run the 16 sequential scenarios**:
   1. `Register User`
   2. `Log In User` (auto-saves `userToken`)
   3. `Get Current User Profile (/me)`
   4. `Create Draft Post` (auto-saves `postId`)
   5. `Get My Posts and Drafts`
   6. `Update Post (Edit Draft Content)`
   7. `Submit Post for Administrator Approval` (`status: pending`)
   8. `Log In Administrator` (auto-saves `adminToken`)
   9. `Admin View Pending Posts`
   10. `Admin Approve Pending Post` (`status: approved`)
   11. `Explore Approved Posts (Public Feed)`
   12. `Get Single Approved Post by ID`
   13. `Improve Post Content with AI` (creates new draft)
   14. `Admin Reject Pending Post` (verifies rejection reason)
   15. `Delete Post` (verifies owner deletion)
   16. `Security & Authorization Verifications` (verifies 403 on non-admin access and 400 on self-approval)

---

## Automated Test Suite

The automated test suite uses **Vitest** and **Supertest** for fast, deterministic, ES-module-native execution.

### Run All Tests:
```powershell
npm test
```

### Test Coverage Highlights:
- **`tests/auth.test.js`** (8 tests):
  - User registration with default `user` role (ignoring any injected `role: admin`).
  - Duplicate email conflict handling (`409 Conflict`).
  - Input validation rules (email format, minimum password length).
  - Login credential verification and JWT generation.
  - Profile retrieval via Bearer token and 401 unauthenticated guard.
- **`tests/posts.test.js`** (10 tests):
  - Draft creation and pending submission workflows.
  - Blocking normal users from creating self-approved posts (`400 Bad Request`).
  - User post isolation (`/my-posts`).
  - Ownership enforcement on updates and deletions (`403 Forbidden`).
  - Resetting approved posts to pending when modified by creator.
  - Shielding unapproved posts from the public exploration feed (`404 Not Found`).
- **`tests/admin.test.js`** (5 tests):
  - Guarding admin routes with 403 when accessed by regular users.
  - Reviewing the pending post queue.
  - State transitions: approving pending posts and clearing rejection notices.
  - Rejecting pending posts with custom editorial feedback.
  - Rejecting approval attempts on non-pending posts.
- **`tests/ai.test.js`** (4 tests):
  - Verifying post ownership prior to AI processing.
  - Handling missing or unconfigured AI credentials with `503 Service Unavailable`.
  - Creating a **new draft** with `aiMetadata` while preserving the original post.

---

## Security Architecture

1. **Password Safety**:
   - Passwords are never stored in plain text. Mongoose `pre('save')` hooks hash passwords using `bcryptjs` with 10 salt rounds.
   - `select: false` on the User schema ensures password hashes are never returned in queries or API payloads.
2. **Stateless JWT Authentication**:
   - Bearer tokens are signed with HMAC SHA-256 and verified for signature and expiration on every protected request.
   - User validity is checked against the database upon each request to prevent revoked or deleted accounts from authenticating.
3. **Database-Verified Role-Based Access Control (RBAC)**:
   - Authorization never trusts client-supplied roles in request bodies or query parameters.
   - The user role is fetched directly from the database record during authentication.
4. **Mass-Assignment Defense**:
   - Strict destructuring in controllers ensures users cannot inject forbidden attributes such as `role`, `createdBy`, or `status: 'approved'`.
5. **Security Headers & Defense-in-Depth**:
   - `helmet` applies headers: Content Security Policy, X-Content-Type-Options, Strict-Transport-Security, Frameguard, and X-XSS-Protection.
   - Request bodies are restricted to `1mb` to prevent payload injection attacks.
6. **Tiered Rate Limiting**:
   - Global rate limiter: 200 requests / 15 minutes.
   - Auth limiter: 20 login/register attempts / 15 minutes (mitigates brute-force attacks).
   - AI limiter: 10 requests / 15 minutes (protects quota and prevents API abuse).

---

## Troubleshooting & Common Errors

### 1. `connect ECONNREFUSED 127.0.0.1:27017`
- **Cause**: MongoDB is not running on your local machine.
- **Resolution**:
  - Start your local MongoDB service:
    ```powershell
    net start MongoDB
    ```
  - Or run MongoDB via Docker:
    ```powershell
    docker run -d -p 27017:27017 --name akatsuki-mongo mongo:latest
    ```
  - Or use a free cloud instance on [MongoDB Atlas](https://www.mongodb.com/atlas) and set `MONGODB_URI` in `.env`:
    ```ini
    MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/akatsukis_draft?retryWrites=true&w=majority
    ```

### 2. `AI service is not configured. Please set a valid AI_API_KEY...` (503)
- **Cause**: `AI_API_KEY` is empty or left as the placeholder in `.env`.
- **Resolution**:
  - Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/).
  - Add it to `.env`:
    ```ini
    AI_PROVIDER=gemini
    AI_API_KEY=AIzaSyYourActualKeyHere
    AI_MODEL=gemini-1.5-flash
    ```
  - Restart the application (`npm run dev`).

### 3. `Port 5000 is already in use` (EADDRINUSE)
- **Cause**: Another service or previous Node process is occupying port 5000.
- **Resolution**:
  - Change `PORT=5001` in `.env`, or
  - Free port 5000 in PowerShell:
    ```powershell
    Stop-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess -Force
    ```

---

## Summary of Completed Requirements

- [x] **Complete Node.js & Express.js architecture** in JavaScript (ES modules).
- [x] **Mongoose User & Post models** with validation, indexes, and AI metadata.
- [x] **JWT Authentication & bcryptjs password hashing**.
- [x] **Role-Based Authorization** (`user` vs `admin`) verified against MongoDB.
- [x] **Post Management**: Drafts, pending review, approved view, update ownership, and deletion.
- [x] **Editorial Approval Workflow**: Admin review queue, approval, and rejection feedback.
- [x] **Post-Editing Safeguard**: Content edits on approved articles reset status for review.
- [x] **AI Content Improvement**: Configurable Gemini & OpenAI service that saves a **new draft** while keeping the original intact.
- [x] **Security Headers & Rate Limiting**: Helmet, CORS, body limits, tiered rate limiters.
- [x] **Automated Test Suite**: 27 unit and integration tests passing with Vitest & Supertest.
- [x] **Postman Collection**: 16 end-to-end API testing requests with automatic variable extraction.
- [x] **Admin Script**: `npm run create-admin` CLI utility.
