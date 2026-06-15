# 🎨 Atelier: Premium AI Platform

🚀 **[Experience the Live App Here](https://kaif-atelier-ai.vercel.app/)** 

---

> 🔒 **Security & Architecture Note**  
> This public repository serves as a demonstration of the platform's architecture, UI/UX, and core front-end capabilities. For security and proprietary reasons, sensitive business logic, payment gateway webhooks, database schemas, and proprietary AI algorithms are maintained in a separate private repository deployed to production. **As a result, cloning this repository will not yield a functional local build, as critical backend files have been intentionally redacted.**

---

## 🌟 Overview
Atelier is a state-of-the-art, independent AI platform designed with a focus on contextual intelligence and premium user experience. This repository showcases the architectural foundation, modern interface design, and front-end component structure of the application.

## ✨ Front-End Logic & UI Capabilities
While the backend is hidden, this repository demonstrates advanced front-end engineering, including:

- **Persistent Chat UI Logic:** Dynamic grouping of chat sessions (Today / Previous 7 Days / Older) with seamless state management.
- **Typewriter Rendering Engine:** Custom streaming-style typewriter effects for assistant messages, complete with animated typing dots and skeleton loaders.
- **CreditGuard Interceptor:** A front-end middleware mechanism that elegantly intercepts insufficient balance states (402 errors) and triggers the dynamic upgrade modal without breaking the user experience.
- **Interactive Feedback System:** Front-end implementation of the Reinforcement Learning from Human Feedback (RLHF) UI, allowing users to rate responses (Thumbs Up/Down) seamlessly.
- **Fluid Animations:** Heavy integration with Framer Motion to provide a dynamic, living interface with subtle micro-animations that enhance user engagement.

## 🛠️ Technology Stack
- **Core:** React, TypeScript, TanStack Start, Vite
- **Styling:** Vanilla CSS & TailwindCSS (Architected for Maximum Aesthetic Control)
- **Interactivity:** Framer Motion

## 📂 Exploring the Showcase
You are welcome to explore the codebase to view the structural implementation of the user interface:
- `/src/components`: Contains the core modular UI elements, including the `CreditGuard`, chat visualizers, and modals.
- `/src/routes`: Demonstrates the application's blazing-fast, file-based routing structure.

*Note: Directories and files related to database connectivity, AI gateways, and billing webhook logic have been scrubbed to protect proprietary business logic.*

---
*Designed & Engineered by Sheikh Kaif Sadiq*
