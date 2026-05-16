# Complete UI Context for Hearly - Version 1

## Project Overview

**Hearly** is an **AI-powered voice focus tool for meetings** built as a Chrome extension. The project is a TypeScript-based React UI (99% TypeScript) that captures voice profiles, filters unwanted speakers, and provides meeting transcripts with multi-language support.

---

## 📁 Project Structure

```
hearly-extension/
├── src/
│   ├── popup.tsx                 # Main popup entry point
│   ├── vite-env.d.ts
│   ├── ai/                       # AI/ML integration
│   ├── audio/                    # Audio processing
│   ├── config/                   # Configuration files
│   ├── extension/                # Chrome extension logic
│   ├── features/                 # Feature modules
│   │   ├── enrollment/           # User enrollment flow
│   │   ├── history/              # Meeting transcripts history
│   │   ├── home/                 # Main dashboard
│   │   ├── settings/             # User settings
│   │   └── transcript/           # Transcript display
│   ├── hooks/                    # Custom React hooks
│   ├── services/                 # Business logic services
│   ├── store/                    # Zustand state management
│   ├── styles/                   # CSS files (popup.css)
│   └── ui/                       # Reusable UI components
│       ├── animations/           # Animation definitions
│       ├── branding/             # Logo & branding
│       ├── layouts/              # Layout wrappers
│       ├── navigation/           # Tab navigation
│       └── shared/               # Base components
├── public/
│   ├── manifest.json             # Chrome extension manifest
│   ├── hearly-logo.png
│   └── icons/
├── models/                       # ML models storage
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## 🎨 Design System & Colors

**Tailwind Configuration with Custom Hearly Palette:**

| Color | Value | Purpose |
|-------|-------|---------|
| **bg** | #000000 | Main background (black) |
| **surface** | #141414 | Secondary surface |
| **raised** | #1A1A1A | Raised surface elements |
| **panel** | #16181D | Panel background |
| **border** | #222222 | Border color |
| **accent** | #B5F03D | Lime green (primary CTA) |
| **purple** | #8B5CF6 | Secondary accent |
| **text** | #F0F0F0 | Primary text (light) |
| **secondary** | #9CA3AF | Secondary text |
| **tertiary** | #555555 | Tertiary text |
| **danger** | #E05252 | Error/danger state |

**Typography:** Inter font family (variable weight)

**Animations:** Wave bars, pulse rings, dot waves with multiple keyframe variations for different states (active, calm, idle)

---

## 🏗️ Core Architecture

### **State Management (Zustand)**

Three main stores:

```typescript
// enrollmentStore.ts
- isEnrolled: boolean
- userName: string
- phase: 'intro' | 'record' | 'done'
- voiceProfile: VoiceProfile | null
- actions: setPhase(), setProfile(), clearProfile()

// filterStore.ts
- isActive: boolean
- actions: setActive()

// transcriptStore.ts
- isEnabled: boolean
- entries: TranscriptEntry[]
- actions: setEnabled(), addEntry(), clearEntries()
```

### **Custom Hooks**

- `useEnrollment()` - Enrollment state & actions
- `useSettings()` - User settings persistence
- `useHistory()` - Transcript history management
- `useTranscript()` - Transcript handling
- `useVoiceFilter()` - Voice filtering control

### **Services**

- `storageService.ts` - Chrome storage API integration
- `voiceService.ts` - Voice processing
- `transcriptService.ts` - Transcript operations

---

## 🧩 UI Components

### **Shared Components (`ui/shared/`)**

- **Button.tsx** - CTA button with variants
- **Card.tsx** - Container component
- **Badge.tsx** - Status badges
- **Toggle.tsx** - Switch/toggle control
- **Modal.tsx** - Modal dialog wrapper
- **ProgressDots.tsx** - Step indicator
- **HearlyLogoMark.tsx** - Animated logo (SVG)
- **icons.tsx** - Icon collection

### **Layout Components (`ui/layouts/`)**

- **PopupLayout.tsx** - Main popup wrapper with tab navigation

### **Feature Components**

**Home (`features/home/`)**
- `UnenrolledHero` - Onboarding screen
- `EnrolledHomePanel` - Main dashboard
- `HearlyToggle` - Voice filter toggle
- `TranscriptToggle` - Transcript enable/disable
- `RoadmapModal` - Feature roadmap modal

**Enrollment (`features/enrollment/`)**
- `EnrollmentFlow` - Multi-step enrollment wizard

**History (`features/history/`)**
- `HistoryTab` - Past transcripts list

**Settings (`features/settings/`)**
- `SettingsTab` - User preferences & profile management

---

## 📊 Data Types

```typescript
// VoiceProfile
{
  id: string
  userName: string
  email?: string
  embedding: Float32Array (192 dimensions)
  enrolledAt: number (timestamp)
  isActive: boolean
}

// TranscriptEntry
{
  id: string
  speaker: 'you' | 'others'
  text: string
  language: 'en' | 'hi' | 'mr'
  category?: string
  timestamp: number
  sessionId: string
}

// AppSettings
{
  language: 'en' | 'hi' | 'mr'
  notifyNewVersions: boolean
  notifyEmails: boolean
  hearlyActive: boolean
  transcriptEnabled: boolean
}

// EnrollmentPhase
'intro' → 'record' → 'done'
```

---

## 🔌 Chrome Extension Setup

**Manifest V3:**
```json
{
  "name": "Hearly",
  "version": "1.0.0",
  "description": "AI-powered voice focus tool for meetings",
  "manifest_version": 3,
  "action": {
    "default_popup": "index.html"
  }
}
```

**Path Alias:**
```json
"@/*": ["src/*"]
```

---

## 🎯 Key UI Flows

1. **Unenrolled State**
   - Shows hero section with onboarding CTA
   - Triggers enrollment flow modal

2. **Enrollment**
   - Step 1: Introduction (intro phase)
   - Step 2: Voice recording (record phase)
   - Step 3: Completion (done phase)
   - Generates voice embedding (192-dim vector)

3. **Enrolled State**
   - Dashboard with user greeting
   - Filter toggle (enable/disable voice filtering)
   - Transcript toggle with latest entry preview
   - Roadmap preview modal

4. **Tabs**
   - **Home**: Dashboard & toggles
   - **History**: Past meeting transcripts (scrollable, language-aware)
   - **Settings**: Notifications, retraining, profile removal

---

## 🎬 Animation System

**Keyframes:**
- `waveBar` - Active speaking bars
- `waveBarFlow` - Smooth undulation (enrolled home)
- `hearlyDotWave` - Pulse dot animation
- `pulseRing` - Expanding ring effect
- `hearlyLogoBar` - Logo mark animation
- `hearlyVersionSnap` - Typography weight variation

**Box Shadows:**
- `hearly-glow` - Lime accent glow
- `hearly-btn-ambient` - Button ambient light
- `hearly-mic-ambient` - Mic tile glow
- `hearly-card` - Card shadow
- `hearly-cta` - CTA button shadow

---

## 🔧 Build & Dev Setup

- **Framework**: React 18.2 + TypeScript 5.3
- **Build Tool**: Vite 8.0
- **State**: Zustand 5.0
- **Styling**: Tailwind CSS 3.4 + PostCSS
- **Extension**: CRXJS Vite Plugin 2.4
- **Commands**:
  - `npm run dev` - Development server
  - `npm run build` - Production build
  - `npm run typecheck` - Type validation

---

## 💡 Backend Integration Points

### **Integration Architecture**

The UI is designed to integrate seamlessly with backend services. Here are the key integration points:

#### **1. Voice Enrollment Service**
- **Location**: `features/enrollment/` → `EnrollmentFlow`
- **Input**: Audio stream from microphone
- **Process**: Multi-step enrollment (intro → record → done)
- **Output**: Voice embedding (192-dimensional Float32Array)
- **Storage**: Persisted in `enrollmentStore` and Chrome storage
- **API Endpoint Required**: `POST /api/voice/enroll` → returns embedding vector

#### **2. Voice Filtering Service**
- **Location**: `features/home/` → `HearlyToggle` + `audio/` module
- **Input**: Meeting audio stream
- **Process**: Real-time voice filtering based on enrolled profile
- **Output**: Filtered audio (speaker's own voice removed)
- **State**: Controlled by `filterStore.isActive`
- **API Endpoint Required**: `POST /api/voice/filter` → returns filtered audio stream

#### **3. Transcript Processing Service**
- **Location**: `features/history/` → `HistoryTab` + `services/transcriptService.ts`
- **Input**: Audio stream + language preference
- **Process**: Convert audio to text, identify speaker, categorize
- **Output**: Structured `TranscriptEntry` objects
- **Supported Languages**: English ('en'), Hindi ('hi'), Marathi ('mr')
- **API Endpoint Required**: `POST /api/transcript/process` → returns transcript entries

#### **4. Storage Persistence Service**
- **Location**: `services/storageService.ts`
- **Current**: Uses Chrome storage API (local)
- **Required**: Sync layer for multi-device support
- **Data to Sync**:
  - User profile (voice embedding)
  - Settings preferences
  - Transcript history
  - Enrollment status
- **API Endpoint Required**: `POST/GET /api/storage/sync` → bi-directional sync

#### **5. Settings Management Service**
- **Location**: `features/settings/` → `SettingsTab`
- **Persisted Settings**:
  ```typescript
  {
    language: 'en' | 'hi' | 'mr'
    notifyNewVersions: boolean
    notifyEmails: boolean
    hearlyActive: boolean
    transcriptEnabled: boolean
  }
  ```
- **API Endpoint Required**: `POST /api/settings/save` → persist user preferences

### **Required Backend API Endpoints Summary**

| Endpoint | Method | Purpose | Input | Output |
|----------|--------|---------|-------|--------|
| `/api/voice/enroll` | POST | Voice enrollment | Audio stream | Float32Array (192-dim) |
| `/api/voice/filter` | POST | Filter audio | Audio stream + embedding | Filtered audio |
| `/api/transcript/process` | POST | Process audio to text | Audio stream + language | TranscriptEntry[] |
| `/api/storage/sync` | GET/POST | Sync user data | User ID + data | Synced profile |
| `/api/settings/save` | POST | Save preferences | AppSettings | Confirmation |

---

## 🔐 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Hearly UI (Chrome Extension)             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─ Enrollment Flow ────────────────────────────────────┐   │
│  │ User → Record Voice → Backend → Embedding ──┐        │   │
│  │                                              │        │   │
│  └──────────────────────────────────────────────┼────────┘   │
│                                                 │             │
│  ┌─ Home Dashboard ─────────────────────────────┼──────────┐ │
│  │ Show Profile ← ─ Enrollment Store ← ────────┘          │ │
│  │ Toggle Filter ─────► Filter Service (Real-time)        │ │
│  │ Toggle Transcript ─► Transcript Service (Real-time)    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─ History Tab ────────────────────────────────────────────┐│
│  │ Display Transcripts ← Transcript Store ← Backend API    ││
│  │ Multi-language Support (en, hi, mr)                    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌─ Settings Tab ────────────────────────────────────────────┐│
│  │ Language Preference ──────┐                               ││
│  │ Notifications Preference ─┼──► Settings Service (Sync)  ││
│  │ Profile Retraining ───────┤──► Re-enroll (Backend)      ││
│  │ Profile Removal ──────────┘──► Clear Store (Local)      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │      Backend Services (Node.js/Python)  │
        ├─────────────────────────────────────────┤
        │ • Voice Embedding Model (192-dim)       │
        │ • Audio Filtering Engine                │
        │ • Speech-to-Text Processor              │
        │ • Speaker Identification                │
        │ • Database (User Profiles)              │
        │ • Storage Sync Layer                    │
        └─────────────────────────────────────────┘
```

---

## 🚀 Development Guidelines for Backend Team

### **State Management Pattern**
All UI state is managed via Zustand stores. Backend should:
1. Provide REST APIs that the UI calls via fetch/axios
2. Emit updates that trigger Zustand store actions
3. Maintain data consistency with local storage

### **Error Handling**
- Network errors should trigger UI notifications
- Failed enrollments should revert to enrollment state
- Failed filters should disable filter toggle temporarily
- User should see clear error messages in UI

### **Performance Considerations**
- Voice filtering must be real-time (< 100ms latency)
- Transcript processing should show loading states
- Storage sync should batch updates (debounce)
- Large transcript histories should paginate/virtualize

### **Multi-Language Support**
Currently supporting: English (en), Hindi (hi), Marathi (mr)
- Backend must respect language preference from settings
- UI will handle all text rendering
- Backend handles transcript language detection & translation

### **Testing Integration**
Mock these services for UI testing:
```typescript
// Mock voice embedding
const mockEmbedding = new Float32Array(192).fill(0.5);

// Mock transcript entries
const mockTranscript: TranscriptEntry = {
  id: 'test-1',
  speaker: 'you',
  text: 'Sample transcript',
  language: 'en',
  timestamp: Date.now(),
  sessionId: 'session-1'
};
```

---

## 📚 Component Hierarchy

```
PopupApp (Main Entry)
│
├── PopupLayout (Wrapper with Tabs)
│   │
│   ├── Home Tab
│   │   ├── UnenrolledHero (if not enrolled)
│   │   │   └── Enrollment CTA
│   │   │
│   │   └── EnrolledHomePanel (if enrolled)
│   │       ├── User Greeting
│   │       ├── HearlyToggle (Voice Filter)
│   │       ├── TranscriptToggle (Transcript Control)
│   │       └── Roadmap Modal
│   │
│   ├── History Tab
│   │   └── HistoryTab
│   │       └── Transcript List (scrollable)
│   │
│   └── Settings Tab
│       └── SettingsTab
│           ├── Language Selection
│           ├── Notification Preferences
│           ├── Retraining Button
│           └── Profile Removal
│
└── Modals
    ├── EnrollmentFlow (conditional)
    └── RoadmapModal
```

---

## 🎯 Current Status & Roadmap

### **Completed (V1.0)**
- ✅ UI structure and component hierarchy
- ✅ Design system with Hearly branding
- ✅ State management (Zustand)
- ✅ Multi-tab navigation
- ✅ Enrollment flow UI
- ✅ Transcript history display
- ✅ Settings panel
- ✅ Multi-language support structure
- ✅ Animation system

### **Roadmap (V2.0)**
- 🔄 Backend API integration
- 🔄 Real-time voice filtering
- 🔄 Advanced transcript analytics
- 🔄 Meeting recording integration
- 🔄 Team collaboration features
- 🔄 Advanced settings & customization

---

## 💻 Setup Instructions

### **Installation**
```bash
cd hearly-extension
npm install
```

### **Development**
```bash
npm run dev
```

### **Production Build**
```bash
npm run build
```

### **Type Checking**
```bash
npm run typecheck
```

### **Chrome Extension Load**
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `hearly-extension/dist` folder (after build)

---

## 📖 Additional Resources

- **React Documentation**: https://react.dev
- **TypeScript Guide**: https://www.typescriptlang.org/docs/
- **Zustand Docs**: https://github.com/pmndrs/zustand
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Vite Guide**: https://vitejs.dev/guide/
- **Chrome Extension API**: https://developer.chrome.com/docs/extensions/

---

## 🤝 Contributing

When adding new features:
1. Create feature components in `src/features/[feature-name]/`
2. Add state management to appropriate store in `src/store/`
3. Use shared UI components from `src/ui/shared/`
4. Follow TypeScript strict mode
5. Document data types in `src/utils/types.ts`
6. Update this document with new integration points

---

**Last Updated**: May 16, 2026
**Version**: 1.0.0
**Language**: 99% TypeScript
