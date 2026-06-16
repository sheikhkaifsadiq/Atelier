# 🎨 Atelier: Premium AI Context Platform

<div align="center">
  <a href="https://kaif-atelier-ai.vercel.app/" target="_blank">
    <img src="https://img.shields.io/badge/Live_Demo-kaif--atelier--ai.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
  </a>
  <img src="https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/OpenAI_API-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI API" />
</div>

<br />

Atelier is a state-of-the-art independent AI context platform. It is engineered to deliver a fluid, latency-free chat experience while maintaining strict programmatic controls over API credit usage and prompt engineering variables.

---

> ### 🔒 Security & Intellectual Property Note
> This repository is a public showcase of advanced front-end logic, UI/UX systems engineering, and interactive streaming states. **To protect proprietary AI training prompts, backend API keys, payment webhooks, and database schemas, the live backend engine operates on a secure, private repository.** Critical components like the typewriter engine and client-side interceptors are fully open-sourced here, while proprietary LLM tuning code is redacted.

---

## ✨ Features & Capabilities Demoed Here

*   **⚡ Streamwriter Typewriter Rendering Engine**
    *   Smooth React rendering loop that buffers incoming LLM stream chunks.
    *   Eliminates visual "flicker" and integrates typing states + micro-skeleton loaders.
*   **🛡️ CreditGuard Client Interceptor**
    *   Client-side middleware that blocks unauthorized requests if token credits are exhausted.
    *   Saves server resources and prevents token cost runaways.
*   **📂 Contextual Session Organizer**
    *   Date-aware categorization logic dynamically grouping chats into *Today*, *Previous 7 Days*, and *Older*.
    *   Optimized list rendering for seamless navigation.

---

## 🛠️ Tech Stack & Design Architecture

| Layer | Technology | Key Implementation |
| :--- | :--- | :--- |
| **Framework** | Next.js 14 (App Router) | High-performance React framework driving modern streaming routes. |
| **Styling** | Tailwind CSS + Radix UI | Modular, accessible primitives styled with fluid utility classes. |
| **State** | React Context & Hooks | Lightweight, fast state synchronization for active chat sessions. |

---

## 📐 Streaming UX Architecture

```mermaid
sequenceDiagram
    participant User as React Client UI
    participant Interceptor as CreditGuard Interceptor
    participant Server as Private Proxy Server
    participant OpenAI as OpenAI Streaming API

    User->>Interceptor: Submit Prompt
    Note over Interceptor: Validate local session credits
    Interceptor->>Server: Send Request (Secure API)
    Server->>OpenAI: Request Chat Completion (Stream)
    OpenAI-->>Server: Stream Chunks
    Server-->>User: Stream Buffered Chunks
    Note over User: Buffering in Typewriter Engine (Fluent UI)
```

---

## ⚙️ Running Locally (Frontend Only)

1. Clone this repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
