# AI Recruiter Dashboard

Advanced AI-powered interview platform for recruiters. Create, manage and evaluate candidate interviews with intelligent automation.

## Features

- **Interview Management**: Create, schedule and manage candidate interviews
- **AI-Powered Assessment**: Intelligent evaluation of candidate responses
- **Dashboard Analytics**: Comprehensive overview of recruitment metrics
- **Fitment Interviews**: Specialized interview types for role compatibility
- **Real-time Updates**: Live status tracking and notifications

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:8080`

### Build

```bash
npm run build
```

### Production Build (Development Mode)

```bash
npm run build:dev
```

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Framework**: ShadCN/UI with Radix UI
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **State Management**: TanStack React Query
- **Form Handling**: React Hook Form with Zod validation

## Project Structure

```
src/
├── components/
│   ├── dashboard/     # Dashboard-specific components
│   ├── layout/        # Layout components
│   └── ui/           # Reusable UI components
├── hooks/            # Custom React hooks
├── lib/              # Utility libraries
└── pages/            # Application pages
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run build:dev` - Development mode build
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## License

MIT