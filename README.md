# <CodeChat />

> **Code with strangers. Talk through code.**  
> *"You don't type messages. You code them."*

A public anonymous real-time code-chat web application where every message is written, validated, and rendered as real programming code in **C**, **C++**, **Python**, or **Java**.

---

## ⚡ Overview

CodeChat is an open-access live chat built specifically for software engineers, students, and enthusiasts.
There are **no accounts**, **no passwords**, and **no friction**. Enter any handle, select a language, and immediately communicate through code with everyone online in the global stream.

---

## 🚀 Key Features

- **Instant Anonymous Onboarding**: No signups, email, or passwords. Enter any handle (or get a randomized dev alias) and start chatting instantly.
- **Global Real-Time Chat**: Full-duplex WebSocket communication powered by Socket.IO.
- **Ephemeral 50-Message Limit**: The live chat maintains at most 50 messages. As new messages arrive, older ones are automatically pruned from memory and MongoDB.
- **Interactive Code Runner (Sandbox)**: Test-run code before sending to preview output and catch syntax errors.
- **Multi-Language Support**:
  - 🐍 **Python**: `print(...)`, loops, expressions
  - ⚡ **C++**: `cout << ... << endl;`, loops
  - ⚙️ **C**: `printf(...)`, loops
  - ☕ **Java**: `System.out.println(...)`, loops
- **Real-Time Online Counter**: Live `🟢 N CODERS ONLINE` indicator updating on connect, disconnect, and reconnect.
- **Developer-Centric Dark UI**: Built with JetBrains Mono, One Dark theme CodeMirror 6 editor, line numbering, syntax highlighting, and keyboard shortcuts (`Ctrl+Enter` to send).
- **Hardened Security**: Multi-tier AST and pattern-based static analysis sandbox protecting against Remote Code Execution (RCE), fork bombs, filesystem tampering, and infinite loops.

---

## 🏗️ Architecture

```text
                           INTERNET
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
       [ Vercel Frontend ]          [ Node.js + Socket.IO Backend ]
       React 18 + Vite              Express + WebSockets + AST Engine
       CodeMirror 6 Editor          Rate Limiting + Pruning Service
               │                             │
               └──────────────┬──────────────┘
                              ▼
                     [ MongoDB Atlas ]
                 Last 50 Messages Storage
```

---

## 🛡️ Secure Code Execution Architecture

### Why Arbitrary Code Cannot Be Executed Directly
In a public anonymous web application, allowing visitors to execute arbitrary system commands via Node.js (e.g. `child_process.exec(userCode)`) is catastrophic:
- Attackers could execute `rm -rf`, read `.env` secrets, steal credentials, or spawn cryptominers.
- Fork bombs (`:(){ :|:& };:`) or infinite loops could consume 100% CPU and crash the entire service.
- Socket exhaustion and disk-filling payloads could deny service to all other users.

### The CodeChat Sandboxing Solution
CodeChat employs a **zero-trust static analysis & AST sandbox**:
1. **Payload Boundaries**: Max 2,000 characters input, max 5,000 characters rendered output.
2. **Forbidden Pattern Interceptors**: Disallows dangerous system calls, file I/O, process spawners, and reflection (`system()`, `fork()`, `import os`, `subprocess`, `Runtime.getRuntime()`, etc.).
3. **Loop Bounds Evaluator**: Analyzes `for` and `while` loop conditions statically, estimating total iterations and rejecting any code with $> 20$ iterations or infinite loops.
4. **Isolated AST/Pattern Output Renderer**: Safely extracts the computed output without executing arbitrary binaries or exposing system threads.
5. **Rate Limiting**: Socket-level sliding window limiter restricts message throughput to at most 10 messages per 10 seconds per IP/socket.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, CodeMirror 6, `@uiw/react-codemirror` |
| **Styling** | Modern Vanilla CSS, Dark Developer Theme, Responsive Grid |
| **Real-Time** | Socket.IO Client & Server (WebSockets with polling fallback) |
| **Backend** | Node.js, Express |
| **Database** | MongoDB & Mongoose (with automated 50-document rolling cap) |
| **Security & Limits** | Static AST Validator, Express Rate Limit, Per-Socket Sliding Window |

---

## 📁 Project Structure

```text
codechat/
├── client/                     # Vite + React Frontend
│   ├── src/
│   │   ├── components/         # CodeEditor, MessageList, MessageBubble, ConnectionStatus
│   │   ├── pages/              # JoinPage, ChatPage
│   │   ├── hooks/              # useSocket
│   │   ├── services/           # socketService
│   │   ├── utils/              # constants
│   │   ├── App.jsx             # Main router & state manager
│   │   ├── main.jsx            # React root
│   │   └── index.css           # Global developer styles
│   ├── index.html              # HTML entry point
│   ├── package.json
│   ├── vercel.json             # Vercel deployment configuration
│   └── vite.config.js          # Vite configuration & dev proxy
│
├── server/                     # Node.js + Express + Socket.IO Backend
│   ├── controllers/            # roomController
│   ├── middleware/             # rateLimiter
│   ├── models/                 # Message (50-cap pruned), Room, User
│   ├── routes/                 # roomRoutes
│   ├── services/               # codeValidationService
│   ├── sockets/                # chatSocket
│   ├── test/                   # E2E & Socket integration tests
│   ├── utils/                  # constants
│   ├── validators/             # cValidator, cppValidator, pythonValidator, javaValidator, loopExtractor
│   ├── .env                    # Local environment variables
│   ├── package.json
│   └── server.js               # Entry point
│
├── .env.example
├── .gitignore
├── package.json                # Root orchestration package.json
└── README.md
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `server/.env`:

```ini
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/codechat

# CORS & Client URL
CLIENT_URL=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=10000
RATE_LIMIT_MAX_MESSAGES=10

# Code Execution Limits
MAX_CODE_LENGTH=2000
MAX_OUTPUT_LENGTH=5000
MAX_LOOP_ITERATIONS=20
VALIDATION_TIMEOUT_MS=1000
```

For production frontend deployments on Vercel, configure:
```ini
VITE_SERVER_URL=https://your-backend-service.com
```

---

## 💻 Local Development Setup

### 1. Prerequisites
- Node.js 18+ (tested on Node v20/v24)
- MongoDB instance (local or MongoDB Atlas connection URI)

### 2. Install Dependencies
```bash
# Server dependencies
cd server
npm install

# Client dependencies
cd ../client
npm install
```

### 3. Run Development Servers
In two separate terminals:

```bash
# Terminal 1: Start Backend Server (port 3001)
cd server
npm run dev
# or npm start

# Terminal 2: Start Frontend Dev Server (port 5173)
cd client
npm run dev
```

Open your browser at:
```text
http://localhost:5173/
```

---

## 🧪 Running Automated Tests

Run the full verification suites:

```bash
cd server

# 1. Comprehensive E2E Validation & Database Pruning Test
node test/e2e.test.js

# 2. Multi-Client Real-Time Socket.IO Test
node test/socket.test.js
```

---

## 🌐 Production Deployment

### Frontend (Vercel)
1. Push this repository to GitHub.
2. In Vercel, import the project and set:
   - **Root Directory**: `client`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Environment Variable**: `VITE_SERVER_URL` = `https://<your-backend-url>`
3. Deploy! Vercel handles global edge distribution and SSL automatically.

### Backend (Persistent Node.js Provider: Render / Railway / Fly.io)
Since Socket.IO requires persistent WebSocket connections:
1. Deploy the `server/` directory to Render, Railway, or Fly.io.
2. Set environment variables:
   - `NODE_ENV` = `production`
   - `PORT` = `3001` (or provider's dynamic `$PORT`)
   - `CLIENT_URL` = `https://<your-vercel-domain>.vercel.app`
   - `MONGODB_URI` = `mongodb+srv://<user>:<password>@cluster.mongodb.net/codechat`
3. Start command: `node server.js`

---

## 📄 License
MIT License. Created for developers everywhere.
