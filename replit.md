# FuelFinder

## Overview

FuelFinder is a personal activity tracking Progressive Web App (PWA) that helps users log daily activities and discover what energizes or drains them. Users record activities with engagement/energy ratings on a 5-point Likert scale, optional flow state indicators, feelings selection, and contextual tags using the AEIOU framework (Activities, Environments, Interactions, Objects, Users). The app provides analytics insights, streak tracking, and push notification reminders.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, built with Vite
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode via next-themes)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **State Management**: React Query (TanStack Query) for server state, React Context for auth state
- **Routing**: React Router v6 with client-side navigation

### PWA Implementation
- **Service Worker**: VitePWA plugin with injectManifest strategy for custom service worker (`src/sw.ts`)
- **Offline Support**: Workbox precaching for static assets
- **Push Notifications**: Web Push API integration with scheduled reminders stored in Supabase
- **Install Prompt**: Custom install page with platform-specific instructions (iOS, Android, Desktop)

### Data Layer
- **Backend**: Supabase (PostgreSQL database with Row Level Security)
- **Authentication**: Supabase Auth with email/password flow
- **Tables**: 
  - `activities` - stores activity logs with ratings, tags, and AEIOU details
  - `user_tags` - user-customizable tag library by category
  - `user_preferences` - UI preferences (hide topics, hide flow toggle)
  - `notification_schedules` - push notification scheduling configuration
  - `push_subscriptions` - Web Push subscription storage

### Key Design Patterns
- **Custom Hooks**: Business logic encapsulated in hooks (`useActivities`, `useStreak`, `usePushNotifications`, `useUserTags`, etc.)
- **Component Composition**: Reusable form components (LikertScale, TagInput, FeelingsSection, AEIOUSection)
- **Pull-to-Refresh**: Native-like refresh gesture on mobile
- **Confetti Celebrations**: Visual feedback for streaks and milestones using canvas-confetti

### Activity Data Model
Activities capture:
- Name and timestamp
- Engagement level (1-5 Likert scale)
- Energy level (1-5 Likert scale)
- Flow state boolean
- Topics tags (user-defined categories)
- Feelings (pleasant/unpleasant emotion vocabulary)
- AEIOU contextual tags (activities, environments, interactions, objects, users)
- Free-form notes

## External Dependencies

### Supabase (Required)
- PostgreSQL database for all persistent data
- Authentication service for user management
- Edge Functions for push notification delivery
- Environment variables needed: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Web Push Notifications
- VAPID keys required for push subscription
- Server-side scheduler (Supabase Edge Function or cron) triggers notifications based on user schedules

### Third-Party Libraries
- **date-fns**: Date manipulation and formatting
- **canvas-confetti**: Celebration animations
- **zod**: Form validation schemas
- **embla-carousel-react**: Carousel component for UI
- **sonner**: Toast notifications

### Development
- Node.js with npm for package management
- Vite dev server runs on port 5000
- TypeScript with relaxed strict mode settings