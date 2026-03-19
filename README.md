# Frontend - virtus Calendar

React application for the virtus Calendar project.

## 🏗️ Architecture Overview

This frontend follows **Clean Architecture** principles with **MVVM pattern** to facilitate future migration to mobile platforms (Android/iOS).

### Directory Structure

```
src/
├── domain/              # Business logic layer (portable to Kotlin/Swift)
│   ├── models/          # Domain entities
│   ├── usecases/        # Business use cases
│   └── repositories/    # Repository interfaces
│
├── presentation/        # Presentation layer
│   ├── viewmodels/      # State management (custom hooks)
│   │   ├── useCharacter.js
│   │   ├── useMissions.js
│   │   ├── useAgentChat.js
│   │   ├── useDrafts.js
│   │   ├── useArena.js
│   │   ├── usePvPBattles.js
│   │   ├── useEmotions.js
│   │   ├── useDashboard.js
│   │   └── useCalendar.js
│   │
│   └── components/      # UI components
│       ├── character/   # Character page components
│       │   ├── CharacterStats.js
│       │   └── MissionsList.js
│       ├── arena/       # Arena page components
│       │   ├── LeaderboardCard.js
│       │   ├── MissionCard.js
│       │   ├── SubmissionsList.js
│       │   ├── PlayerProfileModal.js
│       │   └── ReportModal.js
│       ├── emotions/    # Emotions page components
│       │   ├── EmotionCalendar.js
│       │   ├── RecentEmotionsCard.js
│       │   ├── AddEmotionModal.js
│       │   ├── EditEmotionModal.js
│       │   └── DayDetailModal.js
│       ├── dashboard/   # Dashboard page components
│       │   ├── KPICard.js
│       │   ├── StatusDistributionChart.js
│       │   ├── StatusBarChart.js
│       │   ├── TimeseriesChart.js
│       │   └── EventsList.js
│       └── calendar/    # Calendar page components
│           ├── CalendarNavigation.js
│           ├── ViewSelector.js
│           ├── CalendarGrid.js
│           └── StatusLegend.js
│
├── pages/               # Page components
│   ├── CharacterPage.js   # 312 lines (refactored)
│   ├── ArenaPage.js       # 250 lines (refactored)
│   ├── EmotionsPage.js    # 180 lines (refactored)
│   ├── DashboardPage.js   # 156 lines (refactored)
│   └── CalendarPage.js    # 93 lines (refactored)
│
├── components/          # Shared UI components
│   ├── Layout.js
│   ├── TaskModal.js
│   ├── TaskDraftModal.js
│   ├── EmotionDraftModal.js
│   └── ui/              # shadcn/ui components
│
├── lib/                 # API clients & utilities
│   ├── api.js           # Main API client
│   ├── emotionApi.js
│   └── arenaApi.js
│
├── context/             # React contexts
│   └── AuthContext.js
│
└── hooks/               # Shared custom hooks
    └── use-toast.js
```

## 🎯 Refactoring Strategy

### Problem
- **CharacterPage.js**: 1,474 lines (unmaintainable)
- Business logic mixed with UI
- Difficult to test
- Nearly impossible to port to mobile

### Solution
- **Separation of Concerns**: Custom hooks for state management
- **Component Composition**: Small, focused components
- **Portable Logic**: ViewModels easily convertible to Kotlin/Swift

### Comparison: Before vs After

| Metric | CharacterPage | ArenaPage | EmotionsPage | DashboardPage | CalendarPage |
|--------|---------------|-----------|--------------|---------------|--------------|
| **Original lines** | 1,474 | 805 | 778 | 514 | 349 |
| **Refactored lines** | 312 | 250 | 180 | 156 | 93 |
| **Reduction** | -79% | -69% | -77% | -70% | -73% |
| **Number of files** | 1 → 8 | 1 → 9 | 1 → 8 | 1 → 7 | 1 → 6 |
| **Lines per file (avg)** | 1,474 → 95 | 805 → 90 | 778 → 110 | 514 → 90 | 349 → 75 |
| **Testability** | ❌ → ✅ | ❌ → ✅ | ❌ → ✅ | ❌ → ✅ | ❌ → ✅ |
| **Mobile portability** | 0% → 60-70% | 0% → 60-70% | 0% → 60-70% | 0% → 60-70% | 0% → 60-70% |

**Total impact:**
- **3,920 lines → 991 lines** (-75% reduction)
- **5 monolithic files → 38 modular files**
- **Average file size: 784 lines → 95 lines** (-88%)

## 📦 Custom Hooks (ViewModels)

### useCharacter
Manages character state and operations:
```javascript
const { character, loading, fetchCharacter, fetchStatsHistory } = useCharacter();
```

**Portable to Kotlin:**
```kotlin
class CharacterViewModel : ViewModel() {
    val character: StateFlow<Character?>
    val loading: StateFlow<Boolean>
    fun fetchCharacter()
    fun fetchStatsHistory(days: Int)
}
```

### useMissions
Manages missions state and operations:
```javascript
const {
  missions,
  generateMissions,
  completeMission,
  deleteMission,
  ...
} = useMissions();
```

### useAgentChat
Manages agent chat interactions:
```javascript
const {
  chatMessage,
  chatResponse,
  chatLoading,
  sendMessage
} = useAgentChat();
```

### useDrafts
Manages draft confirmations (tasks + emotions):
```javascript
const {
  showTaskDraftModal,
  showEmotionDraftModal,
  confirmTaskDraft,
  confirmEmotionDraft,
  ...
} = useDrafts();
```

### useArena
Manages arena info and room leaderboard:
```javascript
const {
  loading,
  arenaInfo,
  roomInfo,
  sortedLeaderboard,
  membersWithScores,
  refresh
} = useArena();
```

**Portable to Kotlin:**
```kotlin
class ArenaViewModel : ViewModel() {
    val loading: StateFlow<Boolean>
    val arenaInfo: StateFlow<ArenaInfo?>
    val roomInfo: StateFlow<RoomInfo?>
    val sortedLeaderboard: StateFlow<List<LeaderboardEntry>>
    val membersWithScores: StateFlow<List<MemberWithScore>>
    fun refresh()
}
```

### usePvPBattles
Manages PvP battles, submissions, and voting:
```javascript
const {
  mission,
  submissions,
  results,
  userHasVoted,
  showSubmissionForm,
  submissionText,
  handleSubmit,
  handleVote,
  handleReport,
  ...
} = usePvPBattles();
```

**Portable to Kotlin:**
```kotlin
class PvPBattlesViewModel : ViewModel() {
    val mission: StateFlow<Mission?>
    val submissions: StateFlow<List<Submission>>
    val results: StateFlow<Results?>
    val userHasVoted: StateFlow<Boolean>
    suspend fun submitReflection(text: String, imageBase64: String?)
    suspend fun vote(targetUserId: Int)
    suspend fun reportSubmission(submissionId: Int, reason: String)
}
```

### useEmotions
Manages emotions tracking and calendar navigation:
```javascript
const {
  view,
  currentDate,
  entries,
  groupedEntries,
  daysInRange,
  handlePrev,
  handleNext,
  createEmotion,
  updateEmotion,
  deleteEmotion,
  ...
} = useEmotions();
```

**Portable to Kotlin:**
```kotlin
class EmotionsViewModel : ViewModel() {
    val view: StateFlow<ViewType>
    val currentDate: StateFlow<Date>
    val entries: StateFlow<List<Emotion>>
    val groupedEntries: StateFlow<Map<String, List<Emotion>>>
    val daysInRange: StateFlow<List<Date>>
    fun navigatePrev()
    fun navigateNext()
    suspend fun createEmotion(payload: EmotionPayload)
    suspend fun updateEmotion(id: Int, payload: EmotionPayload)
    suspend fun deleteEmotion(id: Int)
}
```

### useDashboard
Manages dashboard statistics and events:
```javascript
const {
  summary,
  timeseries,
  loading,
  range,
  setRange,
  taskEvents,
  eventsLoading,
  ...
} = useDashboard();
```

**Portable to Kotlin:**
```kotlin
class DashboardViewModel : ViewModel() {
    val summary: StateFlow<TaskSummary?>
    val timeseries: StateFlow<List<TimeseriesData>>
    val loading: StateFlow<Boolean>
    val range: StateFlow<String>
    val taskEvents: StateFlow<List<TaskEvent>>
    val eventsLoading: StateFlow<Boolean>
    fun setRange(range: String)
    fun setEventsDate(date: String)
    fun setEventType(type: String)
    fun clearEventFilters()
    suspend fun refreshStats()
    suspend fun refreshEvents()
}
```

### useCalendar
Manages calendar view and task interactions:
```javascript
const {
  view,
  tasks,
  calendarRef,
  currentTitle,
  calendarEvents,
  handlePrev,
  handleNext,
  handleEventDrop,
  ...
} = useCalendar();
```

**Portable to Kotlin:**
```kotlin
class CalendarViewModel : ViewModel() {
    val view: StateFlow<ViewType>
    val tasks: StateFlow<List<Task>>
    val currentTitle: StateFlow<String>
    val calendarEvents: StateFlow<List<CalendarEvent>>
    val loading: StateFlow<Boolean>
    fun navigatePrev()
    fun navigateNext()
    fun navigateToToday()
    fun changeView(view: ViewType)
    suspend fun moveTask(taskId: Int, newDate: Date, reason: String)
    suspend fun resizeTask(taskId: Int, newEndDate: Date, reason: String)
}
```

## 🧩 Reusable Components

### CharacterStats
Displays character statistics with progress bars.

**Props:**
- `character`: Character object with stats

**Portable to Jetpack Compose:**
```kotlin
@Composable
fun CharacterStats(character: Character) {
    // UI implementation
}
```

### MissionsList
Displays missions with action buttons.

**Props:**
- `missions`: Array of missions
- `onGenerateMissions`: Callback
- `onSelectMission`: Callback
- `onDeleteMission`: Callback

### LeaderboardCard
Displays room leaderboard with rankings.

**Props:**
- `roomInfo`: Room data
- `arenaInfo`: Current user info
- `membersWithScores`: Sorted members
- `onPlayerClick`: Player click callback

### MissionCard (Arena)
Displays daily arena mission with submission form.

**Props:**
- `mission`: Mission data
- `showSubmissionForm`: Boolean
- `submissionText`: Controlled value
- `onSubmit`: Submit callback
- ...other form handlers

### SubmissionsList
Displays arena submissions/reflexiones with voting.

**Props:**
- `mission`: Mission data
- `submissions`: Array of submissions
- `userHasVoted`: Boolean
- `onVote`: Vote callback
- `onReport`: Report callback

### EmotionCalendar
Displays emotions in calendar view (month/week/day).

**Props:**
- `view`: 'month' | 'week' | 'day'
- `currentDate`: Date object
- `daysInRange`: Array of dates
- `groupedEntries`: Emotions grouped by date
- `onDayClick`: Day click callback
- `onEmojiClick`: Emoji click callback

### RecentEmotionsCard
Displays recent emotions in sidebar.

**Props:**
- `recentEntries`: Array of recent emotions

### AddEmotionModal / EditEmotionModal / DayDetailModal
Modals for creating, editing, and viewing emotions by day.

**Props:** Standard modal props (open, onOpenChange, onSubmit, etc.)

### KPICard
Displays key performance indicator with icon and value.

**Props:**
- `title`: KPI label
- `value`: Numeric value
- `subtitle`: Optional subtitle
- `icon`: Lucide icon component
- `iconColor`: Icon color
- `iconBg`: Icon background color

### StatusDistributionChart / StatusBarChart / TimeseriesChart
Recharts components for visualizing task statistics.

**Props:** 
- `summary`: Task summary data
- `timeseries`: Time-series data

### EventsList
Filtered list of task events with date and type filters.

**Props:**
- `taskEvents`: Array of events
- `eventsLoading`: Loading state
- `eventsDate`, `setEventsDate`: Date filter
- `eventType`, `setEventType`: Type filter
- `clearEventFilters`: Clear filters callback

### CalendarNavigation / ViewSelector / CalendarGrid / StatusLegend
Calendar page components for navigation, view selection, FullCalendar grid, and status legend.

**Props:** Various navigation and event handling callbacks

## 🚀 Getting Started

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

## 🧪 Testing

```bash
npm test                    # Run tests
npm test -- --coverage      # Run with coverage
```

## 📱 Mobile Migration

See [MOBILE-MIGRATION.md](./MOBILE-MIGRATION.md) for detailed instructions on converting this codebase to Android (Kotlin) and iOS (Swift).

**Key Benefits of Current Architecture:**
- ✅ Business logic separated from UI (60-70% reusable)
- ✅ ViewModels map 1:1 to mobile ViewModels
- ✅ Components map to Composables/SwiftUI Views
- ✅ Repository pattern ready for platform-specific implementations

## 📚 Additional Resources

- [Create React App Documentation](https://facebook.github.io/create-react-app/docs/getting-started)
- [React Documentation](https://reactjs.org/)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Mobile Migration Guide](./MOBILE-MIGRATION.md)

## 🔧 Environment Variables

Create a `.env` file in the project root:

```bash
REACT_APP_BACKEND_URL=http://localhost:3000
```

For Docker deployment, this is automatically set via `docker-compose.yml`.

## 🏛️ Architecture Principles

### 1. Separation of Concerns
Each layer has a single responsibility:
- **Domain**: Pure business logic (no UI, no API)
- **Presentation**: UI state management
- **Components**: Visual representation only

### 2. Dependency Inversion
Higher layers don't depend on lower layers:
- Use cases depend on repository **interfaces**
- Repository implementations depend on API clients

### 3. Single Responsibility
Each file has one job:
- `useCharacter.js`: Character state only
- `CharacterStats.js`: Display stats only
- `api.js`: API communication only

### 4. Composition over Inheritance
Build complex UIs from simple components:
```javascript
<CharacterPage>
  <CharacterStats />
  <MissionsList />
  <AgentChat />
</CharacterPage>
```

## 📊 Code Metrics

### File Size Targets
- **Hooks**: 50-200 lines
- **Components**: 50-150 lines
- **Pages**: 100-300 lines

### Current Status
✅ `useCharacter.js`: 71 lines  
✅ `useMissions.js`: 298 lines  
✅ `useAgentChat.js`: 68 lines  
✅ `useDrafts.js`: 147 lines  
✅ `CharacterStats.js`: 131 lines  
✅ `MissionsList.js`: 196 lines  
✅ `CharacterPageRefactored.js`: 312 lines  
❌ `CharacterPage.js` (original): 1,474 lines → **needs migration**

## 🎯 Next Steps

1. **Migrate Remaining Pages**:
   - `ArenaPage.js` (805 lines) → split into hooks + components
   - `EmotionsPage.js` (777 lines) → split into hooks + components
   - `DashboardPage.js` (513 lines) → split into hooks + components

2. **Add Domain Layer**:
   - Create domain models (`Character.js`, `Mission.js`, `Task.js`)
   - Create use cases (`GetCharacterUseCase.js`, `CompleteMissionUseCase.js`)
   - Create repository interfaces

3. **TypeScript Migration**:
   - Convert `.js` → `.ts` for type safety
   - Define interfaces for all models
   - Easier conversion to Kotlin/Swift

4. **Testing**:
   - Unit tests for hooks (80% coverage target)
   - Component tests with React Testing Library
   - E2E tests with Cypress

## 🤝 Contributing

When adding new features:

1. **Create a custom hook** if managing state
2. **Create a component** if rendering UI
3. **Keep files small** (< 300 lines)
4. **Document with JSDoc** comments
5. **Think mobile-first** (can this be ported?)

### Example: Adding a New Feature

**❌ Don't:**
```javascript
// Adding 500 lines to CharacterPage.js
function CharacterPage() {
  // 1,974 lines of mixed logic + UI
}
```

**✅ Do:**
```javascript
// 1. Create hook (50-100 lines)
export const useNewFeature = () => {
  // Logic here
}

// 2. Create component (50-100 lines)
export const NewFeatureComponent = () => {
  const { data, actions } = useNewFeature();
  return <UI />
}

// 3. Use in page (5-10 lines)
function CharacterPage() {
  return (
    <>
      <CharacterStats />
      <MissionsList />
      <NewFeatureComponent />  {/* ← Just add here */}
    </>
  );
}
```

---

## 🔔 Sistema de Notificaciones en Tiempo Real

### Arquitectura Overview

El sistema de notificaciones usa **WebSocket** para comunicación bidireccional en tiempo real con el `worker-service` backend:

```
┌─────────────────┐         WebSocket (ws://)        ┌──────────────────┐
│                 │ ←──────────────────────────────→ │                  │
│   Frontend      │   ping/pong every 30s            │  worker-service    │
│   React App     │   notifications JSON             │  (port 8008)     │
│                 │   auto-reconnect (max 10)        │                  │
└─────────────────┘                                  └──────────────────┘
        │                                                     ↑
        │ Browser Notifications API                          │
        │ (silent mode for LOW priority)                     │
        ↓                                                     │
┌─────────────────┐                                  ┌──────────────────┐
│  Native OS      │                                  │   RabbitMQ       │
│  Notification   │                                  │   (notification_ │
│  (sound/banner) │                                  │    users queue)  │
└─────────────────┘                                  └──────────────────┘
```

### Sistema de Prioridades

El sistema clasifica notificaciones en **4 niveles** basados en tiempo restante hasta `limit_time`:

| Priority | Time Left | Color | Icon | Sound | Timeout | Behavior |
|----------|-----------|-------|------|-------|---------|----------|
| **URGENT** | ≤ 5 min | Red (bg-red-50 border-red-300) | AlertTriangle | ✅ Enabled | 5s | Invasive, auto-expand |
| **HIGH** | 6-10 min | Orange (bg-orange-50 border-orange-300) | AlertCircle | ✅ Enabled | 5s | Important, visible |
| **MEDIUM** | 11-15 min | Yellow (bg-yellow-50 border-yellow-300) | Clock | ✅ Enabled | 5s | Normal, standard |
| **LOW** | 16-30 min | Blue (bg-blue-50 border-blue-300) | Info | ❌ **Silent** | 3s | Non-invasive, no sound |

**Característica clave**: Las notificaciones **LOW** no emiten sonido (`silent: true` en Browser Notifications API) y se auto-descartan más rápido (3s vs 5s).

### Componentes del Sistema

#### 1. NotificationContext (`src/contexts/NotificationContext.js`)

**Propósito**: Global state management para notificaciones

**Estado**:
```javascript
{
  notifications: [
    {
      id: "unique-id",
      type: "TASK_DUE_SOON",
      user_id: "demo",
      task_id: "task-123",
      task_title: "Estudiar estoicismo",
      priority: "high",  // urgent | high | medium | low
      task_progress: 50,
      limit_time: "2026-02-07T16:00:00Z",
      minutes_left: 8,
      timestamp: Date.now(),
      read: false
    }
  ],
  isConnected: false  // WebSocket connection status
}
```

**Métodos**:
- `addNotification(notification)` - Añadir nueva notificación al array
- `markAsRead(id)` - Marcar una como leída
- `markAllAsRead()` - Marcar todas como leídas
- `removeNotification(id)` - Eliminar notificación específica
- `clearAll()` - Limpiar todas las notificaciones

**Persistencia**: El array `notifications` se guarda automáticamente en `localStorage` para sobrevivir recargas de página.

#### 2. useWebSocket (`src/hooks/useWebSocket.js`)

**Propósito**: Gestionar conexión WebSocket con auto-reconnect

**Características**:
- Conexión automática al montar (si usuario autenticado)
- **Ping/Pong keep-alive**: Envía `{type: "ping"}` cada 30s
- **Auto-reconnect**: Máximo 10 intentos, intervalo de 5s
- **Browser Notifications**: Invoca API nativa cuando recibe mensaje
- **Silent mode para LOW**: `options.silent = true` si `priority === "low"`

**Ciclo de vida**:
```javascript
1. Component mount → connect()
2. WebSocket open → setIsConnected(true)
3. Receive message → addNotification() + showBrowserNotification()
4. WebSocket close → setIsConnected(false) → attempt reconnect
5. Component unmount → cleanup()
```

**Código clave (silent mode)**:
```javascript
const showBrowserNotification = (notification) => {
  if (Notification.permission === "granted") {
    const options = {
      body: `${notification.task_title}\n${notification.minutes_left} min restantes`,
      icon: "/logo192.png",
      badge: "/logo192.png",
      tag: notification.task_id,
      requireInteraction: notification.priority === "urgent",
      silent: notification.priority === "low"  // ← NO SOUND for LOW priority
    };
    new Notification(`⏰ ${priority.toUpperCase()}`, options);
  }
};
```

#### 3. NotificationBell (`src/components/NotificationBell.js`)

**Propósito**: Bell icon en header con badge de unread count

**UI Elements**:
- **Bell icon** (Lucide React `Bell`)
- **Red badge**: Muestra número de no leídas (máx "9+")
- **Yellow indicator**: Si `!isConnected`, muestra dot amarillo
- **Dropdown toggle**: Click para abrir `NotificationPanel`

**Interacción**:
```javascript
<button onClick={() => setIsOpen(!isOpen)}>
  <Bell className="h-5 w-5" />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5">
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  )}
</button>
```

#### 4. NotificationPanel (`src/components/NotificationPanel.js`)

**Propósito**: Dropdown panel con lista de notificaciones

**Features**:
- **Priority icons**: AlertTriangle (urgent), AlertCircle (high), Clock (medium), Info (low)
- **Priority colors**: Red, Orange, Yellow, Blue borders
- **Progress bar**: Si `task_progress` existe, muestra barra visual
- **Actions**:
  - Mark individual as read (CheckCircle icon)
  - Remove individual (X icon)
  - Mark all as read (bottom button)
  - Clear all (bottom button)
- **Empty state**: "No hay notificaciones" cuando array vacío
- **Ordenamiento**: Más recientes primero (por `timestamp`)

#### 5. NotificationToast (`src/components/NotificationToast.js`)

**Propósito**: Toasts animados para notificaciones recientes

**Lógica de filtrado**:
```javascript
// Solo muestra notificaciones unread + creadas hace < 5 segundos
const recentNotifications = notifications.filter(
  n => !n.read && (Date.now() - n.timestamp < 5000)
);
```

**Auto-dismiss**:
- **LOW priority**: 3 segundos
- **Other priorities**: 5 segundos

**Animación**: `animate-slide-in-right` (Tailwind custom animation)

```javascript
// tailwind.config.js
keyframes: {
  'slide-in-right': {
    from: { transform: 'translateX(100%)', opacity: '0' },
    to: { transform: 'translateX(0)', opacity: '1' }
  }
}
```

#### 6. NotificationPermissionBanner (`src/components/NotificationPermissionBanner.js`)

**Propósito**: Banner para solicitar permiso de Browser Notifications API

**Estados**:
- `default` → Muestra banner con botón "Activar notificaciones"
- `granted` → No muestra nada (oculto)
- `denied` → Muestra banner con mensaje "denegadas" y link a settings

**Flujo**:
```javascript
1. User clicks "Activar notificaciones"
2. Notification.requestPermission()
3. Browser muestra prompt nativo
4. User acepta → permission = "granted" → banner desaparece
5. User rechaza → permission = "denied" → muestra instrucciones
```

### Integración en Layout

El sistema está integrado en `src/components/Layout.js`:

```javascript
<NotificationSystem>
  <Layout>
    <header>
      <NotificationPermissionBanner />  {/* Top banner */}
      <div className="flex items-center gap-3">
        <NotificationBell />  {/* Bell icon with badge */}
        <DropdownMenu>...</DropdownMenu>
      </div>
    </header>
    <main>{children}</main>
  </Layout>
</NotificationSystem>
```

Y wrapeado en `src/App.js`:

```javascript
<AuthProvider>
  <NotificationSystem>  {/* Provides NotificationContext */}
    <Router>
      <Routes>...</Routes>
    </Router>
  </NotificationSystem>
</AuthProvider>
```

### Variables de Entorno

Crear `.env.local` en la raíz del frontend:

```bash
# WebSocket connection to worker-service
REACT_APP_WS_URL=ws://localhost:8008/ws/notifications

# Para producción:
# REACT_APP_WS_URL=wss://api.yourdomain.com/ws/notifications
```

### Testing Manual del Sistema

#### 1. Verificar WebSocket Connection

Abrir **DevTools → Console**:

```javascript
// Check WebSocket connection
const ws = new WebSocket("ws://localhost:8008/ws/notifications?user_id=demo");
ws.onopen = () => console.log("✅ Connected");
ws.onmessage = (event) => console.log("📩 Message:", JSON.parse(event.data));
ws.onerror = (error) => console.error("❌ Error:", error);
```

#### 2. Verificar Browser Notifications Permission

```javascript
// Check permission status
console.log("Permission:", Notification.permission);  // "default" | "granted" | "denied"

// Request permission
Notification.requestPermission().then(permission => {
  console.log("New permission:", permission);
});

// Test notification
if (Notification.permission === "granted") {
  new Notification("Test", {
    body: "This is a test notification",
    silent: true  // Test silent mode
  });
}
```

#### 3. Crear Alertas de Prueba

Desde el **scheduler-service container**:

```bash
docker compose exec -T scheduler-service python3 -c "
from psycopg import PostgresClient
from datetime import datetime, timedelta

client = PostgresClient('postgresql://postgres:postgres@postgres:5432/')
db = client['calendar_db']
alerts = db['user_alerts']

# Crear 4 alertas con diferentes prioridades
test_alerts = [
    {'minutes': 3, 'priority': 'urgent'},
    {'minutes': 8, 'priority': 'high'},
    {'minutes': 13, 'priority': 'medium'},
    {'minutes': 20, 'priority': 'low'}
]

for alert in test_alerts:
    alerts.insert_one({
        'user_id': 'demo',
        'task_id': f'test-task-{alert[\"priority\"]}',
        'limit_time': datetime.utcnow() + timedelta(minutes=alert['minutes']),
        'status': 'pending',
        'created_at': datetime.utcnow()
    })

print(f'✅ Created {len(test_alerts)} test alerts')
"
```

#### 4. Monitorear Logs

Ver logs en tiempo real:

```bash
# Worker agent logs (WebSocket + RabbitMQ)
docker compose logs -f worker-service

# Scheduler logs (cron + priority calculation)
docker compose logs -f scheduler-service
```

**Logs esperados (worker-service)**:
```
✅ WebSocket client connected: user_id=demo (1 active connections)
📩 Notification received from queue: task_id=test-task-urgent priority=urgent
📤 Broadcasting to user demo: 1 active connections
```

#### 5. Verificar UI

1. **Notificación LOW (azul, sin sonido)**:
   - Color: Fondo azul claro, borde azul
   - Icono: Info (ℹ️)
   - Sonido: ❌ NO (silent mode)
   - Timeout: 3 segundos

2. **Notificación URGENT (roja, con sonido)**:
   - Color: Fondo rojo claro, borde rojo
   - Icono: AlertTriangle (⚠️)
   - Sonido: ✅ SÍ
   - Timeout: 5 segundos
   - Require interaction: ✅ (no se auto-cierra en ciertas plataformas)

### Troubleshooting

#### Problema: WebSocket no conecta

**Verificaciones**:
```bash
# 1. worker-service está corriendo?
docker compose ps worker-service

# 2. Puerto 8008 abierto?
curl http://localhost:8008/health

# 3. CORS configurado?
docker compose logs worker-service | grep CORS
```

**Solución**:
- Verificar `REACT_APP_WS_URL` en `.env.local`
- Verificar `CORS_ORIGINS=http://localhost:3000` en worker-service

#### Problema: Notificaciones no muestran sonido

**Verificaciones**:
1. Browser permission granted? → DevTools: `Notification.permission`
2. Priority es LOW? → Verifica campo `priority` en payload
3. Tab activo? → Browser notifications solo suenan si tab está en background

**Solución**:
- Si LOW priority → Es comportamiento esperado (`silent: true`)
- Si otra priority → Verificar permisos del browser

#### Problema: Badge muestra número incorrecto

**Verificaciones**:
```javascript
// DevTools Console
const { notifications } = useNotificationContext();
console.log("Unread count:", notifications.filter(n => !n.read).length);
```

**Solución**:
- Verificar que `markAsRead()` actualiza campo `read`
- Verificar que `localStorage` no tiene datos corruptos
- Clear localStorage: `localStorage.removeItem("notifications")`

#### Problema: Notificaciones duplicadas

**Causa**: Múltiples tabs abiertos, cada uno con WebSocket connection

**Comportamiento esperado**: worker-service soporta múltiples conexiones por usuario. Cada tab recibirá la misma notificación.

**Solución (opcional)**:
- Implementar `BroadcastChannel` API para comunicación entre tabs
- Tab principal maneja WebSocket, otras tabs escuchan via BroadcastChannel

### Referencias

- **WebSocket API**: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- **Notifications API**: https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API
- **Browser Permissions**: https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API
- **Lucide React Icons**: https://lucide.dev/guide/packages/lucide-react
- **Tailwind CSS Animations**: https://tailwindcss.com/docs/animation

### Siguientes Mejoras (Phase 2+)

⚠️ **STRATEGIC NOTE**: El verdadero valor de notificaciones está en **móvil (iOS/Android)**, no en web. Ver **[MOBILE-MIGRATION-NOTIFICATIONS.md](./MOBILE-MIGRATION-NOTIFICATIONS.md)** para análisis completo de portabilidad y priorización.

**Phase 2 (Web Foundation - HIGH ROI)** ✅ **DO THESE**:
- [x] **Browser title badge** (30 min) - Quick win
- [ ] **Context enrichment** (3 hrs) - Related tasks, overload detection, smart suggestions ⭐ 100% reusable mobile
- [ ] **Notification history** (3 hrs) - PostgreSQL persistence, analytics ⭐ 100% reusable mobile
- [ ] **User settings** (4 hrs) - Mute, DND hours, priority preferences ⭐ 100% reusable mobile

**Phase 3 (Mobile-First)** ⏸️ **SKIP WEB, DO MOBILE ONLY**:
- [ ] ❌ **Service Worker** - Complejo en web, nativo con APNs/FCM en móvil
- [ ] ❌ **Custom audio files** - Browsers limitan control, móvil tiene control total
- [ ] ✅ **Native push notifications** (iOS APNs + Android FCM) - Critical for mobile
- [ ] ✅ **Local notifications** - Offline reminders sin conexión
- [ ] ✅ **Action buttons** - Mark done, snooze desde notificación

**Portability**: Phase 1 + Phase 2 = **~90% backend reusable** en iOS/Android  
**Web investment**: ~10.5 hours → **9.5 hours portable** to mobile (90% ROI)

---

**Last Updated**: February 12, 2026  
**Version**: 1.2.0 (Phase 1 Complete + Strategic Phase 2/3 Roadmap)  
**Author**: David (with AI assistance)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## 🎨 UI Theme (Virtus Premium)

The frontend now uses a premium-serious stoic visual system with global tokens in `src/index.css`.

### Core tokens
- Light: `--bg #F4F1EC`, `--card #FFFFFF`, `--text #1E1E1E`, `--muted #6B6B6B`, `--gold #C6A75E`.
- Dark: `--bg #0F0F0F`, `--card #1A1A1A`, `--text #EAEAEA`, `--muted #A0A0A0`, `--gold #D4AF37`.

### Typography
- Headings: `Playfair Display` with serif fallback.
- Body/UI: `Inter` with system-ui fallback.

### Theme behavior
- `ThemeProvider` (`next-themes`) is mounted in `App.js`.
- `ThemeToggle` persists user preference in `localStorage` under `virtus-theme`.
- Default respects `prefers-color-scheme`.

### How to extend
1. Add or adjust CSS variables in `src/index.css` (`:root` + `.dark`).
2. Reuse semantic Tailwind tokens (`bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`).
3. Prefer shared components: `Button`, `Card`, `SectionHeader`, `StatRow`, `ThemeToggle`.

### Brand logo from repo file
1. Add your logo file to: `frontend/public/assets/virtus-logo.png`
2. Restart frontend (`yarn --cwd frontend start`) if it is already running.
3. `VirtusBrand` will load that file automatically and show it next to `Disciplina • Claridad • Virtud`.
4. If the file is missing or broken, the component falls back to the built-in SVG glyph.

