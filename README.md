# Quiz Learner – AI Powered Learning Platform

## Setup Instructions

### 1. Backend Setup
```bash
cd backend
npm install
```
Edit `.env` and add your MongoDB Atlas URI:
```
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/quizlearner
JWT_SECRET=your_secret_key
PORT=5000
```
```bash
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm start
```

### 3. Create Admin User
Register normally, then in MongoDB Atlas manually set `role: "admin"` for that user.

---

## Project Structure
```
quiz-learner/
├── backend/
│   ├── controllers/     # Business logic
│   ├── middleware/      # JWT auth middleware
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   └── server.js
└── frontend/
    └── src/
        ├── components/  # Reusable UI components
        ├── context/     # Auth context + theme
        ├── pages/
        │   ├── admin/
        │   ├── teacher/
        │   └── student/
        └── utils/       # Axios API calls
```

## API Endpoints
| Method | Route | Access |
|--------|-------|--------|
| POST | /api/auth/register | Public |
| POST | /api/auth/login | Public |
| GET | /api/users | Admin |
| GET | /api/quizzes | All |
| POST | /api/quizzes | Teacher |
| POST | /api/attempts | Student |
| POST | /api/ai/generate-questions | All |
