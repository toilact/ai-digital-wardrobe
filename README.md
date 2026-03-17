<p align="center">
  <img loading="lazy" src="https://via.placeholder.com/180x180.png?text=AI+Digital+Wardrobe" alt="AI Digital Wardrobe Logo" height="150">
</p>

<h1 align="center">AI Digital Wardrobe</h1>

<p align="center">
  An AI-powered digital wardrobe platform that helps users digitize personal clothing items, manage outfit inventories, and receive context-aware styling suggestions based on their wardrobe, body profile, and usage scenarios.
</p>

<p align="center">
  <a href="#-quick-start"><strong>Get Started »</strong></a>
  <br/>
  <br/>
  <a href="#-features">✨ Features</a>
  |
  <a href="#-system-architecture">🏗️ Architecture</a>
  |
  <a href="#-project-structure">📦 Project Structure</a>
  |
  <a href="#-environment-variables">🔐 Environment</a>
  |
  <a href="#-license">📄 License</a>
</p>

<p align="center">
  <img loading="lazy" src="https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js&logoColor=white" alt="Next.js"/>
  <img loading="lazy" src="https://img.shields.io/badge/FastAPI-0.115.0-009688?logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img loading="lazy" src="https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore%20%7C%20Storage-ffca28?logo=firebase&logoColor=black" alt="Firebase"/>
  <img loading="lazy" src="https://img.shields.io/badge/AI-MobileSAM%20%7C%20CLIP%20%7C%20Gemini-blueviolet" alt="AI Stack"/>
  <img loading="lazy" src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker Compose"/>
  <img loading="lazy" src="https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript"/>
</p>

---

## ✨ Overview

**AI Digital Wardrobe** is a full-stack fashion technology platform designed to make wardrobe management smarter, more visual, and more practical in daily life.

Instead of treating clothing as static photos in a gallery, the system turns a personal wardrobe into structured digital data. Users can upload clothing images, extract individual items with AI-powered segmentation, organize them into categories, and receive outfit suggestions tailored to specific contexts such as going to school, work, dating, traveling, or attending events.

The project combines:

- **Computer vision** for clothing extraction and labeling
- **Generative AI** for styling guidance and outfit recommendation
- **User profile intelligence** for body-aware personalization
- **Cloud-based data persistence** for wardrobe, account, and conversation history management

---

## 🌟 Why this project matters

Choosing clothes is a repeated daily decision. Most users already own enough items, but struggle to:

- remember what they actually have
- combine pieces effectively
- dress appropriately for a context
- make use of their wardrobe before buying more

AI Digital Wardrobe addresses that gap by connecting wardrobe data, user body metrics, and contextual fashion assistance into one experience.

---

## 🚀 Core Features

### 1. Digital wardrobe management

- Upload clothing images from the browser
- Extract single garments from source images
- Save wardrobe items to the user account
- Browse wardrobe as a categorized visual collection
- Delete items when no longer needed

### 2. AI-powered clothing parsing

- Image cutout service built with **FastAPI**
- Supports **MobileSAM**-based segmentation
- Falls back to **GrabCut/product auto mask** when prompt-based segmentation is not available
- Returns clean PNG cutouts and optional mask metadata
- Auto-labels items into categories such as:
  - Áo
  - Quần
  - Váy
  - Đầm
  - Giày
  - Khác

### 3. Smart outfit suggestion

- AI stylist chat for natural fashion interaction
- Outfit recommendation based on:
  - occasion
  - destination
  - weather
  - style preference
  - selected wardrobe items
  - user body profile
- Supports both:
  - conversational fashion support
  - structured outfit generation flow
- Can generate accompanying visual outfit output through external image generation flow

### 4. Personalized onboarding

Users can provide body-related information to improve recommendation quality:

- gender
- age
- height
- weight
- bust
- waist
- hip

This enables more realistic and context-aware styling suggestions.

### 5. Authentication and account system

- Email/password authentication
- Google sign-in
- Firebase-backed account/session flow
- User profile persistence in Firestore
- Sync utilities for legacy/local-auth scenarios

### 6. Forgot password via email verification

- Username-based reset flow
- Secure 6-digit verification code
- Expiration handling
- Wrong-attempt limiting
- Password update through Firebase Admin
- Email delivery via SMTP/Nodemailer

### 7. Chat history persistence

- Stores conversation history per user
- Supports conversation title, timestamps, and message image references
- Keeps wardrobe stylist interaction reusable across sessions

### 8. VIP subscription flow

- Free and VIP plans
- VIP monthly plan
- Manual payment confirmation flow
- Admin approval workflow
- VIP expiration management
- Different daily outfit-generation limits by plan

---

## 🧠 AI Pipeline

### Clothing parsing flow

1. User uploads a clothing image
2. Web app sends the image to the AI service
3. AI service performs segmentation using:
   - **MobileSAM**
   - or fallback **GrabCut**
4. The cutout image is converted into PNG
5. Auto-labeling predicts garment category with **CLIP**
6. Web app lets the user confirm before saving
7. Final wardrobe item is stored in cloud database/media storage

### Outfit recommendation flow

1. User opens the wardrobe stylist
2. User sends a fashion request in natural language
3. System checks context and user profile
4. Gemini-based styling logic determines whether:
   - the message is general chat
   - or an outfit generation request
5. Selected wardrobe items are analyzed
6. A styling note and selected outfit are returned
7. Optional generated image is produced through external image generation integration

---

## 🛠️ Tech Stack

### Frontend

- **Next.js 16**
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **React Icons**

### Backend / AI Service

- **FastAPI**
- **Uvicorn**
- **Python 3.10**
- **OpenCV**
- **Pillow**
- **NumPy**
- **PyTorch (CPU build)**

### AI / ML

- **MobileSAM** for interactive segmentation
- **GrabCut fallback** for automatic cutout
- **open_clip_torch / CLIP** for garment category prediction
- **Gemini** for stylist intelligence and structured outfit reasoning
- External image generation API for visual outfit rendering

### Platform Services

- **Firebase Auth**
- **Firestore**
- **Firebase Storage**
- **Firebase Admin SDK**
- **Cloudinary**
- **Nodemailer**
- **Docker Compose**

---

## 🏗️ System Architecture

```text
┌───────────────────────────────────────────────────────────────┐
│                        Next.js Frontend                       │
│  - Auth UI                                                   │
│  - Dashboard                                                 │
│  - Wardrobe Upload                                           │
│  - Wardrobe Browser                                          │
│  - Stylist Chat                                              │
│  - VIP / Payment UI                                          │
└───────────────┬───────────────────────────────────────────────┘
                │
                │ HTTP / API Routes
                ▼
┌───────────────────────────────────────────────────────────────┐
│                    Next.js Server Routes                      │
│  - /api/wardrobe/*                                            │
│  - /api/outfit-suggest                                        │
│  - /api/chat-history                                          │
│  - /api/auth/forgot-password/*                                │
│  - /api/vip/*                                                 │
└───────────────┬───────────────────────────────┬───────────────┘
                │                               │
                │                               │
                ▼                               ▼
┌──────────────────────────────┐   ┌────────────────────────────┐
│        Firebase Stack         │   │      AI FastAPI Service    │
│  - Auth                       │   │  - /parse                  │
│  - Firestore                  │   │  - /cutout                 │
│  - Storage                    │   │  - /label                  │
│  - Admin SDK                  │   │  - /health                 │
└──────────────────────────────┘   └──────────────┬─────────────┘
                                                  │
                                                  ▼
                                   ┌────────────────────────────┐
                                   │    CV / AI Components      │
                                   │  - MobileSAM               │
                                   │  - GrabCut fallback        │
                                   │  - CLIP auto-label         │
                                   │  - Gemini styling logic    │
                                   └────────────────────────────┘