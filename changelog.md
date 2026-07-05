# Frontend Changelog

# This changelog is a reference for the changes made to the frontend that need to be applied to the mobile app in the future.

## [Sprint-8] Dashboard por dominio y dominios de drafts — 2026-07-05

- Added the first Dashboard chart, `Tareas totales por dominio`, with clickable totals that open the matching task list.
- Fixed the overdue KPI/list mismatch by sharing one filter instead of mixing backend and frontend definitions.
- Domain names are normalized to the canonical taxonomy, including accent variants; missing values are grouped as `Otro`.
- Task, mission and challenge/routine draft forms now always carry an editable, validated domain.

---

## [Sprint-7] Notificaciones del Mentor — 2026-07-05

- Replaced the inactive proactive auto-apply setting with `Notificaciones del Mentor`.
- Added `mentor_notifications_enabled` to the user settings contract.
- The switch controls LLM-generated automatic notifications such as NightlyReview and reflection follow-ups, without affecting task or mission reminders.
- `proactive-orchestrator-service` has been retired; mission expiry reminders now come from `scheduler-service` during the final hour before `expires_at`.
- Scheduled notifications are withheld for users whose latest successful login is older than three days.
- Mobile should expose the same preference and default it to enabled when the field is absent.

---

## [Sprint-6] Mentor Background Dashboard — 2026-03-27

### Summary
Dashboard now includes a dedicated `Mentor` tab backed directly by `proactive-orchestrator-service`. The tab shows the active mentor profile, mentor KPIs, objective cards, coverage/progress charts, recent proposal episodes, and manual controls to pause, hide, restore, reprioritize, or mark objectives/items as achieved.

Important source-of-truth note:
- The mentor tab intentionally reads from `/proactive-api/v1/mentor/*`, avoiding stale projections and ensuring the UI reflects the latest regenerated mentor profile.

---

### New files

| File | Description |
|------|-------------|
| `frontend/src/presentation/components/dashboard/MentorDashboardTab.js` | Full mentor dashboard tab UI. Renders profile header, KPI row, progress/episode charts, coverage/evidence charts, objective cards, recent episodes feed, and hidden-object restore controls. |

---

### Frontend modified files

#### `frontend/src/pages/DashboardPage.js`
- Added a new `Mentor` tab to the Dashboard tab set.
- Wired the page to render `MentorDashboardTab`.
- Passed mentor state and patch handlers from `useDashboard` into the new tab:
  - `mentorDashboard`
  - `mentorProfile`
  - `mentorLoading`
  - `mentorActionKey`
  - `updateMentorObjective`
  - `updateMentorItem`

#### `frontend/src/presentation/viewmodels/useDashboard.js`
- Added mentor-specific state:
  - `mentorDashboard`
  - `mentorProfile`
  - `mentorLoading`
  - `mentorActionKey`
- Added `fetchMentorDashboard()` which loads in parallel:
  - `GET /proactive-api/v1/mentor/dashboard`
  - `GET /proactive-api/v1/mentor/profile`
- The mentor tab refreshes automatically on mount and whenever the dashboard date range changes.
- Added mutation handlers:
  - `updateMentorObjective(objectiveKey, patch, actionKey?)`
  - `updateMentorItem(itemKey, patch, actionKey?)`
- After each objective/item patch, the hook refetches the mentor dashboard and profile so charts, KPIs, and cards stay in sync.

#### `frontend/src/lib/api.js`
- Added proactive mentor endpoints under `proactiveApi`:
  - `getMentorProfile()`
  - `getMentorDashboard(params)`
  - `getMentorEpisodes(params)`
  - `patchMentorObjective(objectiveKey, data)`
  - `patchMentorItem(itemKey, data)`
- Note: `graphAnalyticsApi.getMentorDashboard()` and `getMentorObjectiveDetail()` may still exist for graph analytics, but the Dashboard mentor UI does not use them as its primary source.

#### `frontend/src/presentation/components/dashboard/MentorDashboardTab.js`
- Added mentor profile header showing:
  - active mentor profile name and emoji
  - profile description
  - policy caps (`max_active_objectives`, `max_items_per_objective`)
  - last profile update timestamp
- Added KPI row:
  - active objectives
  - covered items
  - consistent items
  - stalled items
  - proposal acceptance rate + average objective progress
- Added charts:
  - progress timeseries
  - episode timeseries
  - coverage by objective
  - evidence mix
- Added objective cards with:
  - title, status badge, optional pinned priority badge
  - summary and domains
  - progress and coverage bars
  - next gap and last signal timestamp
- Added item rows inside each objective with:
  - item status badge
  - strategy type badge
  - progress and coverage bars
  - last signal timestamp
- Added manual controls for objectives:
  - set priority (`auto` or `1..max_active_objectives`)
  - pause / reactivate
  - mark as achieved
  - hide
- Added manual controls for items:
  - change status
  - mark as achieved
  - hide
- Added hidden elements restore panel:
  - restore hidden objectives
  - restore hidden items
- Added recent episodes feed showing:
  - status
  - proposal family / suggestion type
  - summary/message
  - linked objective title when available
  - proposal cluster and timestamp

---

### Backend API dependency for mobile

The mobile app will need these proactive mentor endpoints:

- `GET /proactive-api/v1/mentor/profile`
- `GET /proactive-api/v1/mentor/dashboard?days_back=<n>`
- `GET /proactive-api/v1/mentor/episodes?objective_key=&days_back=&limit=`
- `PATCH /proactive-api/v1/mentor/objectives/{objective_key}`
- `PATCH /proactive-api/v1/mentor/items/{item_key}`

Current Dashboard usage:
- The mentor UI uses `days_back` derived from the Dashboard range selector (`7`, `30`, `90`).
- Objective/item patches are optimistic only in the sense of showing a busy state; the canonical post-patch state is always reloaded from backend.

Patch examples:

```json
{ "pinned_priority": 2 }
```

```json
{ "status": "paused" }
```

```json
{ "hidden": true }
```

```json
{ "hidden": false }
```

---

### Mobile migration notes

- Add a `Mentor` section/tab inside Dashboard rather than a separate page first.
- Use `GET /proactive-api/v1/mentor/dashboard` as the main dataset for visualizations and KPI cards.
- Load `GET /proactive-api/v1/mentor/profile` alongside it to power hidden-item restoration and manual control state.
- Keep the active mentor profile label visible (`stoic`, `spiritual`, `calm`, `performance`, `student`).
- Include at minimum:
  - KPI row
  - objective coverage chart
  - progress chart
  - objective cards with item list
  - recent episodes feed
  - manual controls for hide/pause/achieved/priority
- Do not introduce a separate projected analytics service as the source of truth for the mentor tab unless a future product decision explicitly changes the architecture.

---

## [Sprint-5] Proactive Suggestions Page — 2026-03-10

### Summary
The Proactive Suggestions page now supports confirming `new_task` and `new_mission` suggestions through their respective edit modals before creating them, mirroring the agent-service confirmation flow. Confirming a `new_task` opens `TaskDraftModal`; confirming a `new_mission` opens `MissionDraftModal`. All other suggestion families (edit, split, insight) continue to confirm directly.

---

### New files

None. Reuses existing `TaskDraftModal` and `MissionDraftModal` components.

---

### Frontend modified files

#### `frontend/src/pages/ProactiveSuggestionsPage.js`
- Added `import MissionDraftModal from '../components/MissionDraftModal'`
- Added state: `const [newMissionModal, setNewMissionModal] = useState(null)`
- Extended `handleConfirm` to detect `proposal_family === 'new_mission'` → `setNewMissionModal(suggestion)` (same pattern already in place for `new_task` → `setNewTaskModal`)
- Added `handleNewMissionModalConfirm(missionPayload)` — calls `proactiveApi.confirm(id, { task_data: missionPayload })`, updates suggestion list, shows toast
- Added `buildNewMissionDraftData(suggestion)` — maps `draft_payload` fields to `MissionDraftModal`-compatible format:
  - `data.title`, `data.description` from `draft_payload`
  - `data.mission_type`, `data.difficulty`, `data.estimated_minutes`, `data.target_stats`, `data.stat_rewards`, `data.start_date`, `data.due_date`, `data.related_to`
- Added `MissionDraftModal` render at bottom of component (mirrors `TaskDraftModal` render)
- `handleNewTaskModalConfirm` and `handleNewMissionModalConfirm` both `throw err` on failure so the modal stays open on API error

---

### Backend API dependency for mobile

Confirm endpoint already supports optional body:

- `POST /proactive/suggestions/{id}/confirm`
  - Body (optional): `{ "task_data": { ... } }`
  - When `task_data` is provided and `proposal_family === "new_task"`, uses it to override the stored `draft_payload` before calling `create_task`
  - When `task_data` is provided and `proposal_family === "new_mission"`, uses it to call `create_mission`

---

### Mobile migration notes

- For `new_task` suggestions: show an editable task form pre-filled from `suggestion.draft_payload` before confirming
- For `new_mission` suggestions: show an editable mission form pre-filled from `suggestion.draft_payload` before confirming
- Submit the edited payload as `task_data` in the confirm request body
- For all other families (edit, split, insight): confirm directly with empty body

---

## [Sprint-4] Canonical Stats Evolution & Date Ranges — 2026-03-07

### Summary
The stats evolution charts now use a single backend source of truth: `GET /api/v1/stats/evolution`. Character and Dashboard no longer reconstruct history from partial endpoints client-side. Users can choose both quick presets and explicit `from_date` / `to_date` ranges for reflection-only, mission-only, and combined stats evolution charts.

---

### New files

| File | Description |
|------|-------------|
| `frontend/src/lib/dateRangeUtils.js` | Shared helpers to build preset date ranges and normalize `YYYY-MM-DD` input values. |
| `frontend/src/presentation/components/stats/StatsDateRangeControls.js` | Reusable date range control block used by all stats evolution charts. Includes preset buttons plus start/end date inputs. |

---

### Frontend modified files

#### `frontend/src/lib/api.js`
- Added `statsApi.getEvolution(params)` for `GET /stats/evolution`.

#### `frontend/src/presentation/viewmodels/useCharacter.js`
- Reflection stats chart now loads from `/stats/evolution?source=reflections`.
- `fetchStatsHistory()` accepts `days`, `fromDate`, and `toDate`.

#### `frontend/src/presentation/viewmodels/useMissions.js`
- Mission evolution chart now loads from `/stats/evolution?source=missions`.
- Replaced the chart-only mission events source with canonical mission stats history.

#### `frontend/src/presentation/viewmodels/useDashboard.js`
- Dashboard total stats chart now loads from `/stats/evolution?source=all`.
- Added controlled date-range state:
  - `totalStatsFromDate`
  - `totalStatsToDate`
  - preset handlers for quick ranges and custom ranges

#### `frontend/src/presentation/components/character/StatsHistoryChart.js`
- Reflection chart now renders the canonical cumulative `history` series from backend.
- Added reusable date-range controls (`fromDate`, `toDate`, presets).

#### `frontend/src/presentation/components/character/MissionEvolutionChart.js`
- Mission chart no longer derives its curve from `/events/missions`.
- It now renders mission-only cumulative history from `/stats/evolution?source=missions`.
- Replaced single-day filtering with explicit start/end date range controls.

#### `frontend/src/presentation/components/dashboard/TotalStatsEvolutionChart.js`
- Dashboard total chart no longer merges reflection and mission sources in frontend.
- It now renders the combined cumulative history returned by `/stats/evolution?source=all`.
- Added explicit date range controls on top of preset buttons.

#### `frontend/src/pages/CharacterPage.js`
- Character charts now manage independent date ranges for:
  - diary/reflection stats evolution
  - mission stats evolution
- Quick range buttons update the visible `from_date` / `to_date` window.

#### `frontend/src/pages/DashboardPage.js`
- Dashboard total stats chart now consumes the unified stats evolution dataset.
- Added start/end date control wiring for the chart.

#### `frontend/src/__tests__/StatCharts.test.js`
- Updated chart helper tests to the new history-based data shape instead of event-based reconstruction.

---

### Backend API dependency for mobile

New canonical endpoint for stats evolution:

- `GET /api/v1/stats/evolution`
  - query params:
    - `source=missions|reflections|all`
    - `from_date=YYYY-MM-DD`
    - `to_date=YYYY-MM-DD`
    - `days=<n>` as fallback when explicit dates are not provided

Response shape:

```json
{
  "source": "all",
  "from_date": "2026-03-01",
  "to_date": "2026-03-07",
  "stats": ["claridad", "disciplina", "serenidad"],
  "daily_changes": [
    { "date": "2026-03-01", "claridad": 1, "disciplina": 0, "serenidad": 0 }
  ],
  "history": [
    { "date": "2026-03-01", "claridad": 1, "disciplina": 0, "serenidad": 0 }
  ],
  "summary": {
    "event_counts": { "missions": 2, "reflections": 1, "total": 3 },
    "net_changes": { "claridad": 3, "disciplina": -1, "serenidad": 2 }
  }
}
```

Contract note:
- `source=all` already excludes mission-linked reflections to avoid double counting mission stat impact in combined charts.

---

### Mobile migration notes

- Replace any chart-specific local reconstruction of mission/reflection stat history with `/stats/evolution`.
- Keep quick presets like `7d / 30d / 90d`, but store and send explicit `from_date` / `to_date`.
- Use:
  - `source=reflections` for diary-only evolution
  - `source=missions` for mission-only evolution
  - `source=all` for dashboard total evolution
 
---

## [Sprint-3] Reflection Emotion Snapshot Migration — 2026-03-07

Standalone emotion pages and modals were removed. Emotional labels now live only
as optional `emotion_snapshot` data inside diary/reflection entries on
`CharacterPage`.

Valid frontend pieces:
- `EmotionPicker` inside the reflection form.
- Reflection history rendering of `reflection.emotion_snapshot`.
- Follow-up notifications sourced from `reflection_id`.

## [Sprint-2] Profile-Aware Stats & Mission Engine — 2026-03-06

### Summary
Character stats are now profile-specific (5 stats per profile). Dashboard and Character charts are profile-aware and ignore legacy stoic-only data when another profile is active. Diary UI no longer shows the current profile next to historical mentor responses, avoiding misleading relabeling of old entries.

---

### New files

| File | Description |
|------|-------------|
| `shared/shared/models/character_stats.py` | Per-profile stat definitions: `PROFILE_STATS_MAP`, `PROFILE_STATS_INFO`, helpers `get_profile_stats`, `get_default_stats`, `get_stats_info`, `normalize_stats_for_profile`. |
| `backend/tests/test_character_stats_profile.py` | 25 tests covering `PROFILE_STATS_MAP`, `PROFILE_STATS_INFO`, `build_character_payload`, and `normalize_stats_for_profile`. |
| `backend/tests/test_mission_draft_increment.py` | 17 tests covering the missions-only-increment constraint on `DraftMission.stat_rewards` and the `MissionContext.profile` field. |

---

### Modified files

#### `backend/models/character.py`
- Removed hardcoded `CharacterStats` Pydantic model (5 stoic fields).
- `CharacterResponse.stats` is now `Dict[str, int]` (profile-aware).
- Added `profile: str = "stoic"` field to `CharacterResponse`.

#### `backend/models/mission_engine_models.py`
- `MissionContext.character_stats` changed from `CharacterStats` to `Dict[str, int]`.
- Added `MissionContext.profile: str = "stoic"`.
- `DraftMission` now enforces `stat_rewards` values `>= 1` via `@field_validator` (missions only increment stats).
- Added `DraftMission.primary_stat: Optional[str]`.
- Changed `DraftMission.domain` default from `"Hábitos"` (unicode) to `"Habitos"`.

#### `backend/services/character_service.py`
- `build_character_payload(user_id, profile="stoic")` — uses `get_default_stats(profile)` instead of hardcoded stoic dict.
- Payload now includes `"profile"` key.
- `get_or_create_character(user_id, profile="stoic")` — passes profile when creating new character.
- `update_character_stats` — only updates stats valid for the user's profile.

#### `backend/routes/character.py`
- `GET /character` returns `profile` field alongside `stats: Dict[str, int]`.
- `GET /character/stats-info` is now profile-aware — fetches user's profile from DB, returns `PROFILE_STATS_INFO[profile]`.
- `GET /character/stats-history` is now dynamic (no hardcoded stoic stat keys).

#### `backend/services/mission_engine.py`
- Stats are normalized for the user's active profile via `normalize_stats_for_profile`.
- System prompt builds a `stats_block` using `get_stats_info(profile)` for proper labels.
- Passes `valid_stats` list to prompt so LLM uses only profile-valid stat names.
- `DraftMission.primary_stat` is set to the first target stat.

#### `backend/utils/mission_templates/*.yaml` (performance, student, calm, spiritual)
- All `target_stats` updated to use the correct profile-specific stat names instead of stoic stats.
  - **performance**: `constancia_fisica`, `potencia`, `resistencia`, `movilidad`, `recuperacion`
  - **student**: `consistencia_academica`, `concentracion`, `comprension`, `retencion`, `gestion_del_tiempo`
  - **calm**: `presencia_suave`, `descanso`, `regulacion_emocional`, `equilibrio_mental`
  - **spiritual**: `coherencia_interna`, `presencia`, `compasion`, `trascendencia_practica`, `conexion`

#### `agent-service/graph/subgraphs/mission_agent.py`
- `mission_generator_node`: friction-to-stat mapping falls back to profile-valid stat if stoic stat not in current profile.
- `mission_validator_node`: `VALID_STATS` is derived from `character_stats.keys()` (not hardcoded stoic set).

---

### Frontend modified files

#### `frontend/src/lib/statUtils.js`
- Added shared helpers for stat labels and colors:
  - `formatStatLabel(statKey, statsInfo)`
  - `getStatColor(statKey)`
- Keeps stoic legacy colors as fallback while supporting non-stoic stat names.

#### `frontend/src/presentation/viewmodels/useCharacter.js`
- Added `statsInfo` state and `fetchStatsInfo()` (`GET /character/stats-info`).
- `calculateReflectionKPIs()` is now profile-aware via `statsInfo`, so diary KPI cards ignore reflections from incompatible legacy stat sets.

#### `frontend/src/presentation/viewmodels/reflectionKpiUtils.js`
- New helper to calculate diary KPI totals filtered to the active profile stat set.

#### `frontend/src/presentation/viewmodels/useDashboard.js`
- `fetchTotalStatsData()` now loads `statsInfo` alongside history and mission events.
- Exposes `statsInfo` so dashboard charts can render profile-aware legends and filter stale stat keys.

#### `frontend/src/presentation/viewmodels/useMissions.js`
- Mission drafts/confirm flow now preserves `prompt_profile`.
- Mission list normalization keeps `stat_penalties` available for new missions.

#### `frontend/src/presentation/components/character/CharacterStats.js`
- Accepts `statsInfo` and renders labels dynamically from the active profile metadata.

#### `frontend/src/presentation/components/character/StatsHistoryChart.js`
- Reflection stat chart derives stat keys dynamically from returned history data.
- Accepts `statsInfo` for profile-aware labels in legend and tooltip.

#### `frontend/src/presentation/components/character/MissionEvolutionChart.js`
- Mission chart now filters rendered stat series to the active profile stat set.
- Prevents legacy mission events with stoic stats from polluting charts when another profile is active.

#### `frontend/src/presentation/components/character/MissionsList.js`
- Mission reward and penalty badges use profile-aware labels.
- Failure penalties render explicitly as `Si fallas:` with negative formatting.

#### `frontend/src/presentation/components/dashboard/TotalStatsEvolutionChart.js`
- Total stats chart combines reflections + mission events using only active-profile stats.
- Ignores historical/legacy stat keys from other profiles to avoid mixed-series charts.

#### `frontend/src/components/MissionDraftModal.js`
- Draft mission UI uses profile-aware stat labels in the confirmation modal.

#### `frontend/src/pages/CharacterPage.js`
- Loads `statsInfo` with the rest of Character data.
- Passes `statsInfo` to Character/Mission/Reflection chart components.
- Diary card title simplified to `Diario`.
- Live diary response and reflection history now show `Mentor:` without appending the current profile name.

#### `frontend/src/pages/DashboardPage.js`
- Passes `statsInfo` to `TotalStatsEvolutionChart`.

#### `frontend/src/__tests__/StatCharts.test.js`
- New tests for profile-aware filtering in mission and dashboard stat charts.

#### `frontend/src/__tests__/ReflectionKpiUtils.test.js`
- New tests for diary KPI filtering by active profile.

---

### Backend API changes

#### `GET /api/v1/character`
Response now includes `profile` field:
```json
{
  "user_id": "...",
  "stats": { "autodominio": 0, "claridad": 0, ... },
  "profile": "stoic",
  "level": 1,
  "level_title": "...",
  "total_points": 0,
  "missions_completed": 0,
  "missions_failed": 0
}
```

#### `GET /api/v1/character/stats-info`
Now returns the stats for the user's active profile (not always stoic):
```json
{
  "potencia": { "name": "Potencia", "description": "..." },
  "resistencia": { "name": "Resistencia", "description": "..." },
  ...
}
```

---

## [PR-6] Dynamic Prompt Profile Selection — 2026-03-04

### Summary
Users can now choose their mentor profile from Settings. The selected profile propagates to all backend and agent-service LLM calls, adapting tone, focus and mission templates accordingly.

Five profiles available: `stoic` (default), `spiritual`, `calm`, `performance`, `student`.

---

### New files

| File | Description |
|------|-------------|
| `frontend/src/components/PromptProfileSettings.js` | Card component with 5 profile options (emoji + name + description). Renders a selectable button list + save button. Props: `currentProfile`, `loading`, `saving`, `onSelect`, `onSave`. |

---

### Modified files

#### `frontend/src/lib/api.js`
Added `userSettingsApi` export at the bottom of the file, before `export default api`:

```js
// User Settings API (prompt profile selection)
export const userSettingsApi = {
  getSettings: () => api.get('/user/settings'),
  saveSettings: (data) => api.patch('/user/settings', data),
};
```

Endpoint contract:
- `GET /api/v1/user/settings` → `{ prompt_profile: string, resolved_prompt_profile: string, updated_at: string | null }`
- `PATCH /api/v1/user/settings` body: `{ prompt_profile: string }` → same shape

---

#### `frontend/src/pages/SettingsPage.js`
Full rewrite of the page to add prompt profile section above notification settings.

Key changes:
1. Added imports: `PromptProfileSettings`, `userSettingsApi`
2. Added state: `promptProfile` (string, default `'stoic'`), `profileLoading` (bool), `profileSaving` (bool)
3. Added `loadPromptProfile()` called in `useEffect` alongside `loadSettings()` — reads `resolved_prompt_profile` from API, falls back to `'stoic'` silently on error
4. Added `savePromptProfile()` — calls `userSettingsApi.saveSettings({ prompt_profile })`, shows toast
5. Updated page title from `"Ajustes de notificaciones"` to `"Ajustes"` and updated subtitle
6. Rendered `<PromptProfileSettings>` above `<NotificationSettings>` inside the layout

---

### Backend API endpoints (implemented in `backend/`)

These endpoints must be mirrored in any mobile app:

#### `GET /api/v1/user/settings`
- Auth: Bearer JWT required
- Response 200:
```json
{
  "prompt_profile": "stoic",
  "resolved_prompt_profile": "stoic",
  "updated_at": null
}
```
- `resolved_prompt_profile` is the validated value (invalid profiles fallback to `"stoic"`)

#### `PATCH /api/v1/user/settings`
- Auth: Bearer JWT required
- Body:
```json
{ "prompt_profile": "calm" }
```
- Response 200: same shape as GET
- Valid values: `stoic`, `spiritual`, `calm`, `performance`, `student`
- Invalid values are silently normalized to `"stoic"`

---

### Profile definitions (for display in mobile UI)

| id | name (ES) | emoji | description (ES) |
|----|-----------|-------|------------------|
| `stoic` | Estoico | ⚖️ | Autodominio y voluntad. Marco Aurelio como mentor: claridad, ejecución y control de lo que está en tu mano. |
| `spiritual` | Espiritual | 🌿 | Propósito y coherencia interior. Guía que conecta tus acciones con tus valores más profundos. |
| `calm` | Calma | 🌊 | Recuperación sin presión. Para momentos de agotamiento: pasos pequeños, sin sermones de rendimiento. |
| `performance` | Rendimiento | ⚡ | Hábitos físicos y consistencia corporal. El cuerpo como herramienta de la voluntad. |
| `student` | Estudiante | 📚 | Aprendizaje y carrera. Deep work, estudio sistemático y progreso académico medible. |

---

### UX notes
- Profile selection is immediate (local state), save is explicit (button tap)
- On load error, silently defaults to `stoic` — never blocks the settings screen
- The active profile shows an `"activo"` label next to the name
- Save shows a success/error toast
- Section renders above notification settings in the same page (`/settings` route)

---

### Backend / agent-service changes (reference for mobile)

All changes below were implemented to support this feature. Mobile only needs the two API endpoints above — the rest is server-side.

#### New backend files
- `backend/models/user_settings.py` — `UserSettingsUpdate`, `UserSettingsResponse`, `VALID_PROFILES`
- `backend/services/profile_settings_service.py` — `get_effective_prompt_profile(user_id)` async helper
- `backend/routes/user_settings.py` — GET + PATCH `/api/v1/user/settings`

#### Modified backend files
- `backend/config/database.py` — added `user_preferences_collection`
- `backend/server.py` — registered `user_settings` router
- `backend/utils/prompt_loader.py` — added `profile` param + 3-level fallback chain
- `backend/services/ai_service.py` — removed module-level prompt constants, added `profile` param
- `backend/services/reflection_service.py` — removed module-level prompt constants, added `profile` param
- `backend/services/mission_engine.py` — removed module-level prompt constants, added `profile` param
- `backend/services/mission_service.py` — propagates `profile` to engine
- `backend/routes/reflections.py` — resolves profile per request via `get_effective_prompt_profile`
- `backend/routes/missions.py` — resolves profile per request via `get_effective_prompt_profile`
- `backend/models/mission_engine_models.py` — added `prompt_profile: str = "stoic"` to `MissionTemplate`
- `backend/utils/opensearch_missions.py` — `index_mission_template` and `search_mission_templates` support `prompt_profile` filter with stoic fallback
- `backend/utils/mission_templates_seed.py` — existing templates tagged `stoic`; added 32 new templates for spiritual (8), calm (8), performance (8), student (8)

#### New agent-service files
- `agent-service/tests/test_task_agent_profile.py`
- `agent-service/tests/test_review_agent_profile.py`

#### Modified agent-service files
- `agent-service/utils/prompt_loader.py` — same profile fallback chain as backend
- `agent-service/models/state.py` — added `prompt_profile: str` to `GraphState`
- `agent-service/tools/backend_client.py` — added `get_user_settings()` method
- `agent-service/graph/nodes/state_builder.py` — fetches profile once per session, stores in state
- `agent-service/graph/subgraphs/task_agent.py` — dynamic prompt loading per call
- `agent-service/graph/subgraphs/review_agent.py` — dynamic prompt loading per call
- `agent-service/graph/subgraphs/mission_agent.py` — dynamic prompt loading per call

#### Prompt file structure (new)
```
{service}/prompts/profiles/
  stoic/          ← base profile, all prompt types
  spiritual/      ← system.txt (personality) + user.txt (same as stoic)
  calm/           ← same structure
  performance/    ← same structure
  student/        ← same structure
```
Fallback chain: profile → stoic → (legacy, now removed)

#### New backend test files
- `backend/tests/test_user_settings.py` (8 tests)
- `backend/tests/test_prompt_loader_profile.py` (8 tests)

---

## [PR-6 follow-up] Dynamic mentor name + mission profile badge — 2026-03-04

### Summary
Mentor label now reflects the active profile everywhere in the UI. Active missions show a profile badge so users can identify which profile generated each mission. Fixed a bug where missions were generated with stoic content regardless of the selected profile.

---

### New files

| File | Description |
|------|-------------|
| `frontend/src/lib/profileUtils.js` | Shared utility with profile display data (names + emojis). Imported by all components that show a profile-aware label. |

```js
export const PROFILE_NAMES = { stoic: 'Estoico', spiritual: 'Espiritual', calm: 'Calma', performance: 'Rendimiento', student: 'Estudiante' };
export const PROFILE_EMOJIS = { stoic: '⚖️', spiritual: '🌿', calm: '🌊', performance: '⚡', student: '📚' };
export const getProfileName = (profile) => PROFILE_NAMES[profile] || 'Estoico';
export const getProfileEmoji = (profile) => PROFILE_EMOJIS[profile] || '⚖️';
```

---

### Modified files

#### `frontend/src/pages/SettingsPage.js`
Stores resolved profile in `localStorage` so all components can read it synchronously without an extra API call:
```js
// In loadPromptProfile (on mount):
localStorage.setItem('prompt_profile', resolved);
// In savePromptProfile (on save):
localStorage.setItem('prompt_profile', promptProfile);
```

#### `frontend/src/pages/CharacterPage.js`
- Added `import { getProfileName } from '../lib/profileUtils'`
- Reads active profile: `const profileName = getProfileName(localStorage.getItem('prompt_profile') || 'stoic')`
- Replaced all "Mentor Estoico" occurrences with `Mentor ${profileName}`: tab label, card title, reflection history label, AI response header
- Changed placeholder to `"Pregunta a tu mentor..."` (removed "estoico")

#### `frontend/src/components/TaskDraftModal.js`
- Added `import { getProfileName } from '../lib/profileUtils'`
- All four modal title variants use profile name:
  - `Tarea Propuesta por el Mentor ${profileName}`
  - `Modificación de Tarea Propuesta por el Mentor ${profileName}`
  - `Rutina Propuesta por el Mentor ${profileName}`
  - `Modificación de Rutina Propuesta por el Mentor ${profileName}`

#### `frontend/src/components/MissionDraftModal.js`
- Dialog title: `Misión Propuesta por el Mentor ${profileName}`

#### `frontend/src/presentation/components/character/MissionsList.js`
- Added `import { getProfileName, getProfileEmoji } from '../../../lib/profileUtils'`
- Each `MissionCard` renders a profile badge after existing status badges:
```jsx
<Badge variant="outline" className="text-xs border-purple-300 text-purple-700 bg-purple-50">
  {getProfileEmoji(mission.prompt_profile || 'stoic')} {getProfileName(mission.prompt_profile || 'stoic')}
</Badge>
```
- Requires `mission.prompt_profile` field from backend (see backend changes below)

---

### Bug fix: missions generated with wrong profile content

**Root cause (three overlapping issues):**
1. Hard-coded templates in `opensearch_missions._seed_initial_templates` had no `prompt_profile` field. The stoic-profile fallback in `search_mission_templates` used `{"term": {"prompt_profile": "stoic"}}` which returned 0 results for those docs → 0 templates total → engine fell through to `_generate_missions_fallback` which always called the stoic LLM.
2. The 32 profile-specific templates from `mission_templates_seed.py` were never seeded into OpenSearch (function was never called).
3. All 4 non-stoic `mission_engine_adapt/user.txt` files were identical copies of the stoic prompt ("NO inventes misiones desde cero"), causing the LLM to anchor on stoic template names.

**Fixes applied:**

`backend/utils/opensearch_missions.py`:
- Added `"prompt_profile": {"type": "keyword"}` to index mapping
- Tagged `_seed_initial_templates` docs as stoic: `t.setdefault("prompt_profile", "stoic")`
- Changed profile fallback from `_build_body("stoic")` to `_build_body(None)` to include all templates regardless of `prompt_profile` field

`backend/prompts/profiles/*/mission_engine_adapt/user.txt` (calm, performance, spiritual, student):
- Rewritten to explicitly instruct the LLM to **rewrite** titles and descriptions for the profile (not just "adapt" — which caused stoic names to persist)
- Performance: verbs like "Entrena", "Registra", "Optimiza"; metrics (minutes, series, km); no stoic terminology
- Calm: verbs like "Descansa", "Suelta", "Respira"; difficulty capped at 2; no performance pressure
- Spiritual: verbs like "Conecta", "Explora", "Honra"; focus on purpose and inner coherence
- Student: verbs like "Estudia", "Practica", "Revisa"; measurable learning outcomes, deep work

`backend/utils/mission_templates_seed.py`:
- Fixed import path from `from backend.utils.opensearch_missions` → `from utils.opensearch_missions` (correct path inside Docker container)

`backend/server.py`:
- Added `POST /admin/reseed-missions` endpoint: deletes existing index and reseeds with all profile templates from `mission_templates_seed.py`. Call once after deploying.

`backend/models/missions.py`:
- Added `prompt_profile: str = "stoic"` to `MissionResponse` and `MissionConfirmItem`

`backend/routes/missions.py`:
- `get_missions`: populates `prompt_profile` from stored document (`mission.get("prompt_profile", "stoic")`)
- `generate_missions`: stores `"prompt_profile": profile` in mission document; returns it in response
- `confirm_missions`: resolves profile via `get_effective_prompt_profile`, stores on confirmed mission

---

## [PR-6 follow-up 2] Fix fallback mission generation ignoring profile — 2026-03-04

### Bug
Non-stoic profiles (spiritual, calm, performance, student) generated stoic missions even when the selected profile was correct. The `_generate_missions_fallback` function in `mission_service.py` was called when:
1. MissionEngine returned 0 missions (e.g., after deduplication exhausted all stoic template IDs)
2. An exception occurred during engine execution

The fallback always used the stoic prompt (module-level constant) and called `get_stoic_agent_response` without a profile.

### Fixes

`backend/services/mission_service.py`:
- Removed module-level `MISSION_FALLBACK_USER_PROMPT` constant (was loaded at startup without profile)
- Added `profile: str = "stoic"` parameter to `_generate_missions_fallback`
- Now loads `mission_fallback/user.txt` dynamically with the active profile (falls back to stoic via loader chain if profile-specific file missing)
- Passes `profile` to `get_stoic_agent_response` so the system prompt also reflects the selected profile
- Both call sites in `generate_missions_with_ai` now forward `profile` to the fallback

New profile-specific `mission_fallback/user.txt` prompts:

| Profile | File | Key instructions |
|---------|------|-----------------|
| `spiritual` | `backend/prompts/profiles/spiritual/mission_fallback/user.txt` | Purpose/values framing, contemplative verbs, no stoic terminology |
| `calm` | `backend/prompts/profiles/calm/mission_fallback/user.txt` | Recovery/rest focus, soft verbs, difficulty capped at 2 |
| `performance` | `backend/prompts/profiles/performance/mission_fallback/user.txt` | Physical habits with metrics, action verbs, no stoic terminology |
| `student` | `backend/prompts/profiles/student/mission_fallback/user.txt` | Study/deep work with measurable outcomes, learning verbs |

---

## [PR-6 follow-up 3] Full profile propagation + profile questionnaire tabs — 2026-03-04

### Summary
Two changes: (1) `profile` is now propagated across all mission generation paths (generate-with-context, nightly review, mission agent); (2) the questionnaire page is split into two tabs with profile-specific sections for all 5 profiles.

---

### Mission profile propagation (backend + agent-service)

#### `backend/models/missions.py`
- Added `prompt_profile: Optional[str] = None` to `GenerateMissionsWithContextRequest`
  - Comment: "Profile resolved by agent-service from GraphState; falls back to user settings"

#### `backend/routes/missions.py`
- `generate_missions_with_context` route: resolves profile from `request.prompt_profile` (forwarded by agent-service) or falls back to `get_effective_prompt_profile(username)`. Previously always defaulted to stoic.
- `nightly_review` route: resolves profile via `get_effective_prompt_profile(username)` and forwards to `generate_nightly_review(username, profile=profile)`. Previously always defaulted to stoic.

#### `backend/services/mission_service.py`
- Added `profile: str = "stoic"` param to `generate_nightly_review()`. Forwarded to `engine.generate_missions(... profile=profile)`.

#### `agent-service/tools/backend_client.py`
- Added `prompt_profile: str | None = None` param to `generate_missions_with_context()`
- Added `"prompt_profile": prompt_profile` to POST payload

#### `agent-service/graph/subgraphs/mission_agent.py`
- Generator node now reads `prompt_profile = state.get("prompt_profile", "stoic")` and passes it to `backend_client.generate_missions_with_context(..., prompt_profile=prompt_profile)`

---

### Questionnaire page: 2-tab layout + profile-specific sections

#### `backend/services/profile_service.py`
Added 7 new sections to `PROFILE_TEMPLATE_V1` after the existing 9 mission sections. Each new section has a `profile_tag` field:

| Section title | `profile_tag` | Key questions |
|---------------|---------------|---------------|
| Contexto operativo | `"common"` | Rol principal, herramientas, carga de reuniones, limitación principal |
| Rendimiento físico | `"performance"` | Objetivo fitness, deportes habituales, restricciones físicas, ventana de entrenamiento |
| Estudio y carrera | `"student"` | Nivel académico, materias, próximo deadline, métodos (ranking), distractores |
| Bienestar y calma | `"calm"` | Señales de saturación, estado de sueño, estrategias de recuperación (ranking), carga máxima, estilo de intervención |
| Espiritualidad | `"spiritual"` | Tipo de práctica, tradición/referencia (opcional), frecuencia, valor a fortalecer, momento de práctica |
| Perfil estoico | `"stoic"` | Nivel con el estoicismo, autores, prácticas, dureza de verdades (likert 1–7), foco estoico |

Existing 9 sections have no `profile_tag` → they stay in Tab 1.

#### `backend/services/mission_engine.py`
`_build_profile_context()` extended to extract answers from all new question groups:
- Common: `q_ctx_role`, `q_ctx_constraints`, `q_ctx_meetings_load`
- Performance: `q_perf_goal`, `q_perf_sports`, `q_perf_constraints`, `q_perf_best_time`
- Student: `q_student_level`, `q_student_subjects`, `q_student_next_deadline`, `q_student_distractions`
- Calm: `q_calm_sleep`, `q_calm_max_load`, `q_calm_overload_signals`, `q_calm_intervention`
- Spiritual: `q_spirit_practice_type`, `q_spirit_anchor_values`, `q_spirit_frequency`
- Stoic profile: `q_stoic_focus`, `q_stoic_level`, `q_stoic_practices`

Only answered questions are included (sparse context — no empty lines).

#### `frontend/src/pages/QuestionnairePage.js`
Full rewrite. Key changes:
- Added imports: `getProfileName`, `getProfileEmoji` from `profileUtils`; `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger` from `ui/tabs`
- Reads active profile from `localStorage.getItem('prompt_profile') || 'stoic'`
- Tab filtering:
  - Tab 1 "Misión": sections without `profile_tag` (existing 9 sections, unchanged)
  - Tab 2 `"{emoji} Contexto · {profileName}"`: sections where `profile_tag === "common"` OR `profile_tag === activeProfile`
- Tab 2 only shows the common section + the section for the user's active profile (not all 5 profile sections)
- Added `renderSections()` helper to avoid duplicating the section map
- Both tabs share the same `answers` state and submit handler

UX: a student user sees "Contexto operativo" + "Estudio y carrera" in Tab 2. A calm user sees "Contexto operativo" + "Bienestar y calma".
