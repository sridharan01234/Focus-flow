# FocusFlow - AI-Powered Task Management

A Next.js task management application designed for users with ADHD, featuring AI-powered task prioritization and real-time notifications.

## ✨ Features

- 🔐 **Google Authentication** - Secure sign-in with Firebase Auth
- 📝 **Task Management** - Create, update, and organize tasks
- 🤖 **AI Prioritization** - Intelligent task scheduling using Google Genkit
- 🔔 **Real-time Notifications** - Instant updates across all devices using Pusher
- � **Push Notifications** - Get notified on your iPhone and mobile devices
- �📅 **Smart Scheduling** - AI understands current date/time for better recommendations
- 🎨 **Modern UI** - Clean interface with Radix UI components
- 📲 **PWA Support** - Installable on home screen, works like a native app

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Firebase account
- Google AI API key (for Genkit)
- Pusher account (free tier works)

### Installation

1. Clone and install dependencies:
```bash
npm install
```

2. Set up environment variables (see `.env.example`):
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

3. **Get Pusher credentials** - [Follow the Quick Start Guide](docs/QUICKSTART.md)

4. Start the development server:
```bash
npm run dev
```

Visit http://localhost:9002

## 📚 Documentation

- **[Quick Start Guide](docs/QUICKSTART.md)** - Get up and running in 5 minutes
- **[Push Notifications for iPhone](docs/PUSH_QUICKSTART.md)** - 5-minute mobile setup
- **[Pusher Setup](docs/PUSHER_SETUP.md)** - Complete notification setup guide
- **[iPhone Push Guide](docs/IPHONE_PUSH_NOTIFICATIONS.md)** - Detailed iOS setup
- **[AI Date/Time Fix](docs/AI_DATETIME_FIX.md)** - How AI uses current date
- **[Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md)** - Full technical details

## 🔧 Configuration

### Required Environment Variables

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Google AI (Genkit)
GOOGLE_GENAI_API_KEY=

# Pusher (Real-time Notifications)
PUSHER_APP_ID=
PUSHER_SECRET=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=

# Push Notifications (Mobile)
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

## 🎯 Recent Updates

### Push Notifications for iPhone & Mobile 📱
- Receive notifications on your phone when tasks change
- Works on iPhone (iOS 16.4+) in Safari
- Install as home screen PWA for best experience
- Firebase Cloud Messaging integration

### Real-time Notifications with Pusher
- Instant notifications across all connected devices
- Notifications for task add/update/delete/prioritize operations
- User-specific channels for security

### AI Date/Time Context Fix
- AI now receives current date: **October 30, 2025**
- Proper temporal awareness for scheduling
- More accurate task prioritization

## 🛠️ Development

```bash
# Run dev server
npm run dev

# Run Genkit (AI) in watch mode
npm run genkit:watch

# Type checking
npm run typecheck

# Build for production
npm run build
```

## 📱 Usage

1. **Sign in** with your Google account
2. **Add tasks** using the task form
3. **Prioritize** with AI to get intelligent scheduling
4. **Manage** tasks with status updates
5. **Get notified** in real-time across devices

## 🏗️ Architecture

- **Frontend**: Next.js 15, React 18, TypeScript
- **Backend**: Next.js API Routes, Firebase Functions
- **Database**: Cloud Firestore
- **Auth**: Firebase Authentication
- **AI**: Google Genkit with Gemini
- **Real-time**: Pusher Channels
- **UI**: Radix UI, Tailwind CSS

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please read the documentation before submitting PRs.
