# The A Cappella Workshop

## Overview

The A Cappella Workshop is a modern web application for a summer a cappella music camp targeting middle-school students (rising 6th-9th graders). The system provides a complete registration and payment solution featuring a marketing website, interactive cart functionality, and Stripe payment processing with webhook verification.

The application serves as both a promotional platform showcasing camp information and staff, and a functional registration system that handles camp week selection, payment processing, and registration management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query for server state, local storage for cart persistence
- **Design System**: Dark blue theme with glassmorphism effects, gradient accents from indigo to sky to teal

### Backend Architecture
- **Server Framework**: Express.js with TypeScript
- **Development Setup**: Vite middleware integration for hot reloading in development
- **Session Management**: Express sessions with PostgreSQL session store
- **Payment Processing**: Stripe integration with webhook verification
- **Data Validation**: Zod schemas for type-safe data validation

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Session Storage**: PostgreSQL session store using connect-pg-simple
- **Development Storage**: In-memory storage class for development/testing
- **Client Storage**: localStorage for cart persistence

### Authentication and Authorization
- **Session-based Authentication**: Express sessions for user state management
- **No User Authentication**: Public registration system without user accounts
- **Payment Verification**: Stripe webhook signature verification for payment confirmation

### External Service Integrations
- **Payment Gateway**: Stripe for payment processing and checkout sessions
- **Webhook Security**: Stripe webhook endpoint signature verification
- **Email Notifications**: Planned integration (currently placeholder)
- **Font Services**: Google Fonts integration for typography
- **Development Tools**: Replit-specific tooling and error handling

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18+ with TypeScript support
- **Build Tools**: Vite for development and production builds, esbuild for server bundling
- **Database**: PostgreSQL via Neon Database serverless adapter
- **ORM**: Drizzle ORM with PostgreSQL dialect

### UI and Styling
- **Component Library**: shadcn/ui built on Radix UI primitives
- **Styling**: Tailwind CSS with PostCSS processing
- **Icons**: Lucide React icon library
- **Fonts**: Google Fonts (Architects Daughter, DM Sans, Fira Code, Geist Mono)

### Payment Processing
- **Stripe Integration**: Stripe API for payment processing
- **React Stripe**: React Stripe.js for frontend payment components
- **Webhook Handling**: Raw body parsing for Stripe webhook verification

### Development and Utilities
- **Replit Integration**: Replit-specific development tools and error handling
- **Form Handling**: React Hook Form with Hookform resolvers
- **Date Utilities**: date-fns for date manipulation
- **Utility Libraries**: clsx and class-variance-authority for conditional styling