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
| `reasoningApi` + `centerApi` | `.../reasoning-api/v1` | reasoning-service |

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

### 4.1 Informe razonado → Companion → conductas

`pages/ReasoningReportPage.js` orquesta las tres superficies. Los componentes
son `ReasonedReportView.jsx`, `TransformativeCompanionCard.jsx`,
`FeedbackControl.jsx` y, ya en Dashboard, `LearnedResponsesPanel.jsx`.

Al generar un informe, `POST /reasoning/report` devuelve un `job_id` de forma
inmediata. La página lo conserva en `sessionStorage` y consulta
`GET /reasoning/report-jobs/{job_id}` hasta completarlo; navegar fuera de la
página no cancela el informe y, al volver, el resultado se abre o queda en el
historial. No volver al contrato síncrono de esperar el informe en la petición.

```text
Informe V3
   ├─ feedback sobre recursos/formulaciones
   └─ Generar mensaje (Companion)
          ├─ rechazar/corregir una etapa
          └─ Adoptar esta respuesta
                    ↓
             conducta supervisable
                    ↓
       Lo he hecho / Pausar / Ya es mía / Retirar
```

Feedback visible en el informe:

| Control | Payload | Semántica |
|---|---|---|
| Esto no me ayudó | recurso: `incorrect` | Orientativo; no volver a presentarlo como algo eficaz. |
| No lo uses más | recurso: `exclude_from_companion` | Prohibición fuerte y reversible. |
| Esto no me representa | patrón/candidato: `verdict="rejected"` + texto literal | Prohibición fuerte de esa formulación. |
| La causa no es esa | causa: `verdict="rejected"` + texto literal | Igual que el rechazo de patrón, con `target_type="report_cause"`. |
| Deshacer | `resource_feedback=null` o `verdict=null` | Elimina la restricción activa sin borrar historial. |

`FeedbackControl` debe enviar `targetText` **exactamente como se muestra**: el
servidor deriva la clave estable desde esas palabras. Para etapas del Companion,
la identidad es `report_id:stage`:

- **Esto no me representa** guarda `verdict="rejected"`; al regenerar ese
  Companion, la etapa se omite o se formula de otra manera.
- **Corregir** solo está habilitado para `old_response` y
  `past_present_distinction`; guarda `verdict="corrected"` y
  `user_correction`, que pasa a ser la redacción prioritaria de esa etapa.
- **Deshacer** envía `verdict=null`.

Adopción:

```text
Adoptar esta respuesta
  → POST /reasoning/reports/{reportId}/companion/alternative-response/adopt
  → reasoning-service lee el Companion persistido
  → MCP create_learned_response
  → backend POST /v1/stats/behaviors
```

El frontend no envía una redacción libre al adoptar. Solo puede adoptarse una
`proposed_alternative_response` personalizada, con prudencia `full`; las
prácticas `generic_fallback` no son adoptables. La operación es idempotente por
`response_key`, no crea tareas/misiones ni cambia stats. Adoptar confirma la
conducta, **no** confirma las hipótesis del Companion.

En `LearnedResponsesPanel`:

| Acción | API/estado | Consecuencia |
|---|---|---|
| Lo he hecho | `POST /stats/behaviors/{key}/applications` | Registra un hecho y puede derivar `practicing`/`consolidating`. |
| Pausar | `status="paused"` | Detiene supervisión; no prohíbe reutilización. |
| Ya es mía | `status="integrated"` | Detiene supervisión porque ya no se necesita. |
| Retirar | `status="retired"` | Detiene supervisión y entra en `retired_behaviors` como prohibición fuerte. |
| Retomar | envía `status="active"` | Backend recalcula el estado con el historial y elimina la prohibición. |

El título de cada tarjeta es un resumen de presentación de hasta diez palabras,
calculado por `summarizeBehaviorTitle`; la `alternative_response` completa se
muestra una sola vez en la transformación respuesta anterior → adoptada o,
cuando no existe respuesta anterior, como detalle bajo el título. El resumen no
se persiste ni participa en `response_key` o personalización. Si la respuesta
completa ya cabe en el título, la transformación muestra «Respuesta adoptada»
en vez de duplicarla.

Nada de lo anterior borra aplicaciones ni reflexiones. La guía transversal,
incluidos RAG, read-model, consumidores y fallo seguro, está en
[`infra/virtus/docs/personalization-feedback-conductas.md`](../infra/virtus/docs/personalization-feedback-conductas.md).

### 4.2 Mi centro (pestaña del Mentor)

`presentation/components/reasoning/CenterView.jsx` es la superficie completa, y
vive como **pestaña de `MentorPage`** (entre "Mentor {perfil}" y "Desafíos"),
no como ruta propia: se sacó del nav superior para no saturarlo en anchos
intermedios. Por eso no monta su propio `<Layout>` — la página anfitriona posee
el shell. Si algún día vuelve a ser página, eso es lo único que hay que añadir.

Componentes: `GeneralCompassCard.jsx` (Brújula + `center_summary` + contexto
corporal), `CenterPanelCard.jsx` (×6) y `FinalReflectionCard.jsx`.

- **Las claves, etiquetas, iconos y orden de los seis paneles son del cliente**
  (`PANEL_META` en `CenterView.jsx`), nunca del LLM. El backend devuelve claves
  (`change`, `perspective`, `cycle`, `opposition`, `integration`, `balance`); la
  presentación es contrato de la app.
- **Generación asíncrona**: `POST /reasoning/center/generate` devuelve `job_id`
  y la vista consulta `GET /reasoning/center/jobs/{id}` hasta cerrarlo. Al
  cargar, si `active_jobs` trae un job `full`, retoma el polling — también con
  un centro ya existente, porque una regeneración completa corre sobre uno.
- **Regenerar el centro completo** (`centerApi.regenerateCenter`) **borra las
  notas guardadas de los seis paneles**. Va obligatoriamente detrás de un
  `AlertDialog` con acción destructiva; no lo llames sin confirmación explícita.
  Regenerar **un** panel (`regeneratePanel`) sí conserva su nota y además la
  usa como entrada del prompt.
- **Optimistic locking**: `patchPanel` y `regeneratePanel` envían
  `expected_revision`. Un `409` significa que el panel cambió por debajo —
  recarga, no reintentes con la misma revisión.
- **El texto de las evidencias no viene en el payload** (§11.3). `CenterPanelCard`
  lo pide bajo demanda con `centerApi.getEvidenceSnippet(id)` al desplegar, y
  no lo cachea entre sesiones. `snippet: null` es normal (check-ins corporales,
  o un registro que ya no existe): no lo trates como error.
- **Convertir una pregunta en acción** usa `agentApi.reviewHandoff(texto,
  actionType)` con `action_type` explícito, y reutiliza `useDrafts` +
  `TaskDraftModal`/`MissionDraftModal` ya existentes. No hay modal propio del
  centro.
- **Registrar reflexión** junto a la pregunta de cada panel abre un diálogo y usa
  el mismo `POST /reflections` del Diario. Envía solo `content` y la emoción
  opcional: queda como `reflection_type=journal` y el backend la etiqueta con
  el perfil persistido activo; no se envían la clave del panel ni
  `prompt_profile`.
- El historial del Diario usa `formatMentorHistoryResponseText`: si la respuesta
  incluía una propuesta confirmable, muestra solo la lectura breve y conserva
  el footer `📎 Registros:`. El texto persistido y el resultado recién creado no
  se recortan.
- El disclaimer de la medida general no es opcional: viaja siempre con el
  número.

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
