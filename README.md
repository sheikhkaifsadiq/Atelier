# Atelier: The Next-Generation Enterprise AI Platform

🚀 **Live Demo:** [https://kaif-atelier-ai.vercel.app/](https://kaif-atelier-ai.vercel.app/)

Atelier is an enterprise-grade AI chatbot platform designed for seamless performance, dynamic styling, and an unparalleled developer experience. It is built entirely on modern web primitives for high scalability and responsiveness.

## 🚀 Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) with [Vite](https://vitejs.dev/)
- **Runtime**: [Bun](https://bun.sh/) (ultra-fast JS runtime and package manager)
- **UI Library**: React 19
- **Styling**: Tailwind CSS & Radix UI primitives
- **Database**: PostgreSQL (via Supabase)
- **Deployment**: Vercel

## ✨ Key Features

- **Blazing Fast Performance**: Powered by Bun and Vite, offering near-instant cold starts and rapid HMR.
- **SSR & SEO Optimized**: Full server-side rendering support with TanStack Router.
- **Enterprise Security**: Built-in authentication, route guards, and secure API architecture.
- **Modern UI/UX**: Designed with a sleek, minimalistic interface, fluid animations, and highly accessible components.
- **AI Integration**: Robust AI context handling, conversational memory, and streaming responses out of the box.

## 🛠 Getting Started

### 1. Prerequisites
Ensure you have the following installed on your machine:
- [Node.js 20+](https://nodejs.org/) or [Bun 1.0+](https://bun.sh/)
- Git

### 2. Installation
Clone the repository and install dependencies using Bun:
```bash
git clone https://github.com/sheikhkaifsadiq/atelier.git
cd atelier
bun install
```

### 3. Environment Variables
Copy the `.env.example` file to create your local `.env` and fill in the required keys:
```bash
cp .env.example .env
```
*(Make sure to add your database credentials and API keys as required by the application).*

### 4. Run Development Server
Start the development server with hot-module replacement (HMR):
```bash
bun run dev
```
The application will be accessible at `http://localhost:3000` (or `3001` if occupied).

## 🚢 Deployment

This project is optimized for deployment on Vercel. 
1. Link the project to Vercel: `vercel link`
2. Push your environment variables: `vercel env pull .env.local`
3. Deploy: `vercel --prod`

## 📄 License
This project is proprietary and intended for enterprise use.
