# IFN636 Coding Challenge Platform

A small web app for IFN636. Admins publish Python challenges. Learners submit a GitHub repo and commit. Admins review the attempt and send a result.

Live demo (EC2, no domain):

http://54.153.224.151

If the instance is stopped and started again, the public IP may change.

## Stack

- Frontend: React + Vite
- Backend: Express
- Database: MongoDB Atlas
- Deploy: Ubuntu EC2, Nginx on port 80, PM2

## Roles

| Role | What they can do |
|------|------------------|
| Learner | Register, browse published challenges, submit attempts, view review history |
| Admin | Challenge management, review queue |
| Admin Manager | Same as Admin, and can reassign a locked review |
| Super Admin | Seeded staff account only. Cannot manage challenges or open the review queue |

## Pages

Learner

- `/login` learner login
- `/register` create a learner account
- `/` published challenges
- `/challenges/:id` challenge details and submit form
- `/history` my attempts
- `/reviews` my review results

Admin

- `/admin` admin login
- `/admin/dashboard` dashboard
- `/admin/challenges` challenge list
- `/admin/create` create or edit a challenge
- `/admin/review-queue` pending and reviewed attempts

## Local setup

Need Node 22 and a MongoDB Atlas URI.

### 1. Backend env

Create `backend/.env` (do not commit this file):

```
PORT=5001
MONGO_URI=<your Atlas connection string>
JWT_SECRET=<a long random string>
SUPER_ADMIN_EMAIL=<email>
SUPER_ADMIN_PASSWORD=<password>
ADMIN_MANAGER_EMAIL=<email>
ADMIN_MANAGER_PASSWORD=<password>
ADMIN_EMAIL=<email>
ADMIN_PASSWORD=<password>
```

Optional mail (if `SMTP_HOST` is missing, the review email is printed in the backend log):

```
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

### 2. Seed accounts (first time only)

```bash
cd backend
npm install
npm run seed:admin
npm run seed:staff
```

Do not run seed again if the accounts already exist.

### 3. Run

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

- Learner: http://localhost:5173/login
- Admin: http://localhost:5173/admin

Vite proxies `/api` to `http://localhost:5001`. Frontend code uses relative paths like `/api/auth/login`, so the same build works behind Nginx.

## How a review works

1. Learner submits a repo link, commit link, explanation and test evidence.
2. Only a published challenge accepts new attempts. Max 10 attempts.
3. Admin clicks Start Review. The attempt is locked. The learner cannot submit or cancel while it is under review.
4. The assigned reviewer submits PASS or REVISION REQUIRED, with feedback.
5. PASS completes the challenge. REVISION REQUIRED on attempts 1-9 lets the learner try again. Attempt 10 without PASS is final failed.
6. Extra admin comments can be added later. The first decision and feedback stay unchanged.

## Production notes

On EC2 the public URL is port 80 only.

- Nginx `/` -> frontend on `127.0.0.1:3000`
- Nginx `/api/` -> backend on `127.0.0.1:5001`
- Do not open 3000 or 5001 on the security group
- SSH 22 should be limited to your IP
- Atlas Network Access must allow the EC2 public IP `/32`

PM2 process names:

- `ccp-backend`
- `ccp-frontend`

Health check: `/api/health` returns `{"status":"ok"}`.
