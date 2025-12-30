# 🏃‍♂️ AthletiQ AI - Intelligent Training Log

A full-stack MERN application for athletes to log workouts, visualize performance trends, and receive personalized training advice using Google Gemini AI.

## ✨ Key Features
- **AI Coach Intelligence:** Get daily, weekly, and monthly performance insights powered by Google Gemini.
- **Interactive Dashboard:** Visualize volume trends and activity mix with dynamic charts.
- **Smart Logging:** Log Runs, Lifts, Swims, and more with auto-date locking (future dates blocked).
- **Contribution Heatmap:** GitHub-style tracking of your workout consistency.
- **Reports:** Export your training history to PDF.
- **Bulk Import:** Support for CSV file uploads.
- **Responsive UI:** Modern "Glassmorphism" dark mode interface.

## 🛠️ Tech Stack
- **Frontend:** React.js, Vite, Tailwind CSS, Recharts, Lucide Icons
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Atlas)
- **AI:** Google Gemini API

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js installed on your machine
- A MongoDB Atlas account (to get your Database connection string)
- A Google AI Studio API Key (for the AI features)

### 2. Installation

**Clone the repository:**
```bash

cd athlete-ai-app

cd server
npm install

cd ../client
npm install
```

### 3. Configuration (⚠️ Important)
You must set up your credentials for the app to work. The app will not start without these.

- Navigate to the server/ folder.

- Create a new file named .env.

- Copy the contents below and paste them into your .env file, replacing the placeholders with your actual keys.

```bash
# Your MongoDB Connection String
MONGO_URI=

# Your Google Gemini API Key 
GEMINI_API_KEY=

# Server Port
PORT=5000
```
### 4. Running the App
You need to run the Backend and Frontend in two separate terminals.

1. Terminal 1 ( Backend )
```bash
cd server
node server.js
```
Output should say: "MongoDB Connected"

2. Terminal 2 ( Frontend )
```bash
cd client
npm run dev
```
Open the URL shown (usually http://localhost:5173)
