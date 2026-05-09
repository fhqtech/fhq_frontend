# Recruiter Assist Flow.ai - Full Stack Project Overview

## 🎯 Project Description
A comprehensive recruitment platform that combines candidate management with AI-powered interview capabilities. The system integrates an existing candidate portal with a sophisticated AI interview system extracted from the aestim-ai-accounting project.

## 🏗️ Architecture Overview

### Frontend (React/TypeScript)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Shadcn/ui components
- **Styling**: Tailwind CSS
- **Animations**: GSAP & Framer Motion
- **State Management**: React hooks and context
- **Port**: 8080

### Backend (Python/Flask)
- **Framework**: Flask with microservices architecture
- **Database**: Google Firestore (NoSQL)
- **Authentication**: JWT with Google OAuth
- **Port**: 8082

## 📁 Project Structure

```
recruiter-assist-flowdotai/
├── src/
│   ├── components/
│   │   ├── interview/          # AI Interview System
│   │   │   ├── InterviewSession.tsx
│   │   │   ├── InterviewPreCheck.tsx
│   │   │   ├── LiveAudioStreamer.tsx
│   │   │   ├── CartesiaSpeaker.tsx
│   │   │   ├── ConversationPanel.tsx
│   │   │   ├── AudioControls.tsx
│   │   │   └── AiInterviewer.tsx
│   │   └── ui/                 # Shadcn UI components
│   ├── pages/
│   │   ├── CandidatePortal.tsx
│   │   ├── interview/
│   │   │   ├── InterviewPreCheckPage.tsx
│   │   │   ├── InterviewSessionPage.tsx
│   │   │   └── InterviewThankYouPage.tsx
│   │   └── auth/
│   ├── hooks/
│   │   └── useConversationOrchestrator.ts
│   ├── types/
│   │   └── interview.ts
│   └── assets/
├── public/
│   └── recorder-worklet.js     # Audio processing worklet
└── backend/
    └── services/
        └── candidate_invitation_service/
```

## 🚀 Key Features

### 1. Candidate Portal
- **Dashboard**: Overview of all interviews and candidate information
- **Profile Management**: Display candidate details, LinkedIn, resume
- **Interview Management**: View active and completed interviews
- **Quick Stats**: Total interviews, active processes, completion status

### 2. AI Interview System
- **Pre-Interview Check**: System compatibility and audio/video testing
- **Real-time Interview**: AI-powered conversational interviews
- **Audio Processing**: WebSocket-based speech-to-text with echo cancellation
- **Text-to-Speech**: Cartesia TTS integration for AI responses
- **Conversation Management**: State-driven interview flow

### 3. Authentication System
- **JWT-based**: Secure token authentication
- **Google OAuth**: Social login integration
- **Protected Routes**: Route-level access control

## 🔌 API Integrations

### External Services
- **LLM Backend**: `https://fhq-02.app.n8n.cloud/webhook/accounting-mvp`
- **WebSocket STT**: `wss://stt-testing-tool-python-906200611749.us-central1.run.app/ws`
- **Cartesia TTS**: `sk_car_98EsWvHuR1FNnD6kAjArbc`

### Internal APIs
- **Base URL**: `http://localhost:8082`
- **Candidate Service**: Candidate management and invitations
- **Interview Service**: Interview data and state management

## 🎨 UI/UX Design

### Design System
- **Color Scheme**: Modern dark/light theme support
- **Typography**: Tailwind CSS typography
- **Icons**: Lucide React icons
- **Components**: Shadcn/ui component library

### Interview Interface
- **AI Avatar**: Visual representation of AI interviewer
- **Audio Controls**: Device selection, volume monitoring
- **Conversation Panel**: Real-time transcript display
- **Status Indicators**: Interview state visualization

## 🔧 Technical Implementation

### Real-time Features
- **WebSocket Connections**: Live audio streaming for STT
- **Audio Worklet**: Browser-based audio processing
- **State Management**: Conversation orchestrator pattern
- **Echo Cancellation**: Advanced audio feedback prevention

### Database Schema (Firestore)
```javascript
candidates: {
  id: string,
  name: string,
  email: string,
  phone?: string,
  location?: string,
  linkedin?: string,
  resume_url?: string,
  interviews: Interview[],
  currentInterviewId?: string,
  createdAt: string
}

interviews: {
  interviewId: string,
  status: 'scheduling' | 'applied' | 'in-progress' | 'completed' | 'failed',
  addedAt: string,
  result?: string,
  title?: string,
  description?: string,
  duration?: number,
  type?: string
}
```

## 🌊 User Flow

### Candidate Journey
1. **Access Portal**: Via invitation link with JWT token
2. **Dashboard View**: See available interviews and profile
3. **Interview Selection**: Click "Take Interview" on available interviews
4. **Pre-Check**: System compatibility and permissions
5. **Interview Session**: AI-powered conversational interview
6. **Completion**: Thank you page and return to portal

### Interview States
- **Applied/Scheduling**: Shows "Take Interview" button (displayed as clean interface)
- **In Progress**: Shows "Continue" button
- **Completed**: Shows "View Results" (when available)
- **Failed**: Shows "Review" option

## 🔒 Security Features
- **JWT Token Validation**: Secure API access
- **CORS Configuration**: Cross-origin request handling
- **Input Sanitization**: XSS prevention
- **Secure Audio Handling**: Privacy-conscious audio processing

## 📱 Responsive Design
- **Mobile-First**: Optimized for all device sizes
- **Tablet Support**: Enhanced layout for medium screens
- **Desktop Experience**: Full-featured interface

## 🧪 Development Setup

### Prerequisites
- Node.js 18+
- Python 3.8+
- Google Cloud account (for Firestore)

### Frontend Setup
```bash
cd recruiter-assist-flowdotai
npm install
npm run dev  # Runs on port 8080
```

### Backend Setup
```bash
cd recruiter-assist-flowdotai-backend
source venv/bin/activate
python app.py  # Runs on port 8082
```

## 🌟 Recent Integrations

### Aestim AI Interview System
- **Complete Integration**: Full interview functionality ported
- **Audio System**: Real-time speech processing
- **Conversation AI**: Advanced LLM-powered interviews
- **UI/UX**: Professional interview interface

### Key Improvements
- **Removed Scheduling UI**: Clean, simple "Take Interview" interface
- **Working Endpoints**: Connected to functional aestim backend services
- **Status Management**: Smart status display (scheduling → hidden)
- **Error Handling**: Robust connection and audio error management

## 🚀 Production Readiness

### Current Status
- ✅ Frontend fully functional
- ✅ Backend services operational
- ✅ AI interview system integrated
- ✅ Real-time audio processing
- ✅ Authentication system
- ✅ Responsive design

### Next Steps
- [ ] Production deployment configuration
- [ ] Environment variable management
- [ ] Performance optimization
- [ ] Comprehensive testing suite
- [ ] API documentation
- [ ] User onboarding flow

## 📊 Performance Features
- **Lazy Loading**: Components loaded on demand
- **Audio Optimization**: Efficient WebSocket connections
- **State Caching**: Minimized API calls
- **Asset Optimization**: Vite-powered build optimization

---

*Last Updated: January 2025*
*Project Status: Active Development*