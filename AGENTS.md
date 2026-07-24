# Frontend Web (React) — Guía Operativa para Agentes de Código

Objetivo: poder implementar un cambio de UI sin releer todo `frontend/`.
Complementa al [AGENTS.md raíz](../AGENTS.md) (arquitectura de servicios) y a
[frontend-mobile/AGENTS.md](../frontend-mobile/AGENTS.md) (la app Flutter espejo).

## 1) Stack y estado

- React 18 + Vite + TailwindCSS + shadcn/ui + axios + react-router-dom + `sonner` (toasts) + `date-fns`.
- **No hay store global** (ni Redux ni Zustand). El estado vive en:
  - **Hooks-viewmodel** en `src/presentation/viewmodels/*.js` (`useAgentChat`, `useDrafts`, `useProjects`, `useCalendar`, `useMissions`, …). Aquí va la lógica de datos + llamadas API.
  - **React Context** para transversales: `src/context/AuthContext`, tema de perfil (`src/theme/useProfileTheme`).
  - `useState` local para UI puntual.

## 2) Estructura

```
src/
  pages/                       # una por ruta (MentorPage, CalendarPage, ProjectsPage, …)
  components/                  # componentes de dominio (TaskModal, *DraftModal, Layout)
  components/ui/               # primitivas shadcn (button, dialog, card, badge, collapsible, alert-dialog…)
  presentation/components/     # componentes por área (calendar/, projects/, character/, reasoning/…)
  presentation/viewmodels/     # hooks-viewmodel (estado + API)
  lib/                         # api.js (axios), utils puros (projectItems.js, taskDomains.js, profileUtils.js)
  theme/                       # semanticTokens.js, profileThemes.js
  App.js                       # rutas (react-router)
```

## 3) Capa API — `src/lib/api.js`

Tres instancias axios, una por backend, cada una con interceptor que inyecta
`Bearer localStorage.token` y redirige a `/login` en 401:

| export | baseURL | va a |
|---|---|---|
| `api` (default) + `tasksApi`, `projectsApi`, `missionsApi`, `statsApi`… | `${VITE_BACKEND_URL}/api/v1` | backend |
| `agentApi` | `.../agent-api/v1` | agent-service |
| `reasoningApi` | `.../reasoning-api/v1` | reasoning-service |

**Proxy (Traefik):** stripea `/api`, `/agent-api`, `/reasoning-api`, así que el
backend recibe `/v1/...` (p. ej. `/api/v1/projects` → backend `/v1/projects`).
Añadir un endpoint = añadir un método al objeto API correspondiente; no hace
falta tocar rutas.

## 4) Flujo del Mentor: chat → draft → modal de confirmación

Es el patrón central y reutilizable de la app:

1. `useAgentChat` mantiene los **toggles de modo** (`deepReasoning`, `userDataQa`,
   `projectPlan`), **mutuamente excluyentes** (espejan `validate_exclusive_explicit_modes`
   de agent-service). `sendMessage` llama `agentApi.chat(msg, sessionId, deep, qa, plan)`.
2. La respuesta puede traer `draft_id` + `ui_action`. `sendMessage` mapea
   `ui_action.action` → tipo de draft:
   `SHOW_TASK_CONFIRMATION_MODAL`→`task`, `SHOW_MISSION_CONFIRMATION_MODAL`→`mission`,
   `SHOW_PROJECT_CONFIRMATION_MODAL`→`project`.
3. `useDrafts` abre el modal correcto y confirma vía `agentApi.confirmDraft({draft_id, confirmed, edited_data})`.
4. `MentorPage` cablea todo (toggles, banner de "propuesta pendiente", modales).

**Para añadir un modo/toggle nuevo:** tócalo en `useAgentChat` (estado + exclusividad + arg a `chat`), en `MentorPage` (Switch) y en `agentApi.chat` (nuevo flag en el body). El backend debe aceptar el flag.

**Para añadir un modal de draft nuevo:** crea `components/XDraftModal.js` (mira `MissionDraftModal.js`/`ProjectDraftModal.js`), añade el tipo en `useAgentChat` (map de `ui_action.action`), y los handlers `confirmX/rejectX` + `showXDraftModal` en `useDrafts`, y renderízalo en `MentorPage`. El `edited_data` que envías reemplaza secciones completas del draft; el backend revalida invariantes.

## 5) Items, tareas y proyectos

- Tareas/rutinas viven en `items` (`item_type=task`, `task_kind=task|routine`). `tasksApi` → `/items`.
- **Proyectos** (feature "Modo Plan", ver [raíz §Modo Plan](../AGENTS.md)): `projectsApi` → `/projects` (list/get devuelven `children` + `metrics` ya calculadas). Página `/proyectos` (`ProjectsPage.js`) con `useProjects`; `presentation/components/projects/ProjectCard.jsx` (expand/collapse) + `ProjectItemRow.jsx`. **Editar un hijo reutiliza `TaskModal`** (los hijos son items normales) y en `onSaved` refresca proyectos.
- Helpers de presentación compartidos (estado, recurrencia, fechas, task-vs-routine): `lib/projectItems.js`.

## 6) Tokens de estado y perfiles

- Estado de item: `theme/semanticTokens.js` (`TASK_STATUS_COLORS`) sobre CSS vars `--status-todo|in-progress|done|blocked|failed`. Labels: Pendiente / En progreso / Finalizado…
- Perfiles de mentor (`stoic|spiritual|calm|performance|student`): `theme/profileThemes.js` (`PROFILE_THEMES[id].primary/soft`) + `lib/profileUtils.js` (`getProfileName/Emoji`).
- Componentes theme-aware (claro/oscuro) vía las CSS vars; no hardcodear colores.

## 7) Añadir una página

1. `pages/NuevaPage.js` envuelta en `<Layout>`.
2. Ruta protegida en `App.js` (`<ProtectedRoute>`).
3. Entrada de navegación en `components/Layout.js` (`navItems`, con icono `lucide-react`).

## 8) Verificación

```bash
cd frontend
pnpm build           # compila (Vite) — falla si hay imports/JSX rotos
npx vitest run       # suite completa (jsdom)
```
Si tocas la firma de `agentApi.chat` u otros contratos, revisa los tests en
`src/__tests__/` que fijan argumentos (p. ej. `MentorPageUserDataQa.test.jsx`).
