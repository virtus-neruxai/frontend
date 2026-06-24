# Testing Guide: Original vs Refactored CharacterPage

## 🎯 Objective

Verify that the refactored CharacterPage (`CharacterPageRefactored.js`) works **identically** to the original (`CharacterPage.js`).

---

## 🔗 URLs

| Version | URL | Status |
|---------|-----|--------|
| **Original** | http://localhost:3000/character | ✅ Production |
| **Refactored** | http://localhost:3000/character-refactored | 🧪 Testing |

---

## ✅ Test Checklist

### 1. Initial Load

**Original (`/character`)**
- [ ] Page loads without errors
- [ ] Character stats display correctly
- [ ] Level and title show correct values
- [ ] All 5 stats (autodominio, claridad, disciplina, virtud, serenidad) display
- [ ] Progress bars show correct percentages
- [ ] Active missions list loads
- [ ] No console errors

**Refactored (`/character-refactored`)**
- [ ] Page loads without errors
- [ ] Character stats display correctly (using `CharacterStats` component)
- [ ] Level and title show correct values
- [ ] All 5 stats display with correct icons and colors
- [ ] Progress bars show correct percentages
- [ ] Active missions list loads (using `MissionsList` component)
- [ ] No console errors

**Comparison:**
- [ ] Both pages look visually identical
- [ ] Both load in similar time
- [ ] Both make same API calls (check Network tab)

---

### 2. Character Stats Display

**Original:**
- [ ] Stats card shows "Estadísticas" title
- [ ] Badge shows "Nivel X"
- [ ] Level title displays (e.g., "Aprendiz Estoico")
- [ ] Each stat has icon, label, value, and progress bar
- [ ] Colors match stat type (orange, blue, purple, pink, green)

**Refactored:**
- [ ] Stats card shows "Estadísticas" title
- [ ] Badge shows "Nivel X"
- [ ] Level title displays correctly
- [ ] Each stat has icon, label, value, and progress bar
- [ ] Colors match stat type
- [ ] Total stats summary at bottom

**Comparison:**
- [ ] Visual appearance is identical or better
- [ ] No layout shifts or styling differences

---

### 3. Missions List

**Original:**
- [ ] Shows "Misiones Activas" header
- [ ] "Generar Misiones" button present
- [ ] "Revisión Nocturna" button present
- [ ] Each mission shows: title, description, difficulty, attempt number
- [ ] Mission badges show type (Diaria/Carácter/Diario)
- [ ] Rewards display (green badges with +X)
- [ ] Penalties display (red badges with -X)
- [ ] "Programar" and trash buttons on each mission

**Refactored:**
- [ ] Shows "Misiones Activas" header
- [ ] "Generar Misiones" button present
- [ ] "Revisión Nocturna" button present
- [ ] Each mission shows same information
- [ ] Mission badges display correctly
- [ ] Rewards and penalties display
- [ ] Action buttons work (schedule, delete)

**Comparison:**
- [ ] Mission cards look identical
- [ ] Button positions are the same
- [ ] Hover effects work

---

### 4. Generate Missions

**Test Flow:**
1. Click "Generar Misiones" button
2. Wait for generation
3. Confirmation modal appears
4. Review proposed missions
5. Confirm or reject

**Original:**
- [ ] Button shows loading state (spinning icon)
- [ ] Modal opens with proposed missions
- [ ] Can edit mission dates/times
- [ ] Can toggle "Add to calendar"
- [ ] "Confirmar" creates missions
- [ ] Missions appear in list after confirmation

**Refactored:**
- [ ] Button shows loading state
- [ ] Modal opens with proposed missions
- [ ] Can edit mission details
- [ ] Can toggle calendar addition
- [ ] "Confirmar" creates missions
- [ ] Missions appear in list

**Comparison:**
- [ ] Modal appearance identical
- [ ] Same number of missions generated
- [ ] Confirmation flow identical

---

### 5. Nightly Review

**Test Flow:**
1. Click "Revisión Nocturna" button
2. Wait for analysis
3. Review result card
4. Check proposed missions

**Original:**
- [ ] Button shows loading state
- [ ] Result card appears with analysis
- [ ] Shows tasks completed/failed
- [ ] Shows stat changes
- [ ] Proposed missions appear for confirmation

**Refactored:**
- [ ] Button shows loading state
- [ ] Result card appears
- [ ] Shows same statistics
- [ ] Proposed missions work

**Comparison:**
- [ ] Analysis text identical
- [ ] Stat calculations same

---

### 6. Complete Mission

**Test Flow:**
1. Click on a mission card
2. Modal opens
3. Optionally add reflection
4. Click "Completada" or "Fallida"
5. Check stat updates

**Original:**
- [ ] Modal opens on mission click
- [ ] Shows mission title and description
- [ ] Reflection textarea works
- [ ] "Completada" button (green)
- [ ] "Fallida" button (red)
- [ ] Stats update after completion
- [ ] Toast notification shows
- [ ] AI response displays (if any)

**Refactored:**
- [ ] Modal opens correctly
- [ ] All fields display
- [ ] Reflection textarea works
- [ ] Both buttons work
- [ ] Stats update correctly
- [ ] Toast notifications work
- [ ] AI responses display

**Comparison:**
- [ ] Modal layout identical
- [ ] Stat updates match
- [ ] Behavior identical

---

### 7. Agent Chat

**Test Flow:**
1. Switch to "Mentor Estoico" tab
2. Type message: "Quiero crear una tarea para hoy"
3. Click "Enviar"
4. Wait for response
5. Check if draft modal appears

**Original:**
- [ ] Tab switches correctly
- [ ] Textarea accepts input
- [ ] Button shows "Pensando..." while loading
- [ ] Response displays in gray box
- [ ] Task draft modal opens automatically
- [ ] Modal shows proposed task details

**Refactored:**
- [ ] Tab switches correctly
- [ ] Chat input works
- [ ] Loading state displays
- [ ] Response displays
- [ ] Draft modal opens (using `useDrafts` hook)
- [ ] Modal shows correct data

**Comparison:**
- [ ] Response times similar
- [ ] UI identical
- [ ] Draft detection works

---

### 8. Task Draft Confirmation

**Test Flow:**
1. Trigger task draft (via agent chat)
2. Draft modal appears
3. Review task details
4. Edit if needed
5. Confirm or reject

**Original:**
- [ ] Modal shows task title, description
- [ ] Shows date/time fields
- [ ] Shows difficulty
- [ ] Can edit all fields
- [ ] "Confirmar" creates task in backend
- [ ] "Rechazar" closes modal
- [ ] Success toast appears

**Refactored:**
- [ ] Modal displays correctly
- [ ] All fields editable
- [ ] Confirmation works (using `confirmTaskDraft`)
- [ ] Rejection works (using `rejectTaskDraft`)
- [ ] Toast notifications work

**Comparison:**
- [ ] Modal appearance identical
- [ ] Confirmation flow same
- [ ] Task created in backend

---

### 9. Emotion Draft Confirmation

**Test Flow:**
1. Type in agent: "Me siento triste"
2. Wait for response
3. Emotion draft modal appears
4. Review emotion details
5. Confirm or reject

**Original:**
- [ ] Modal shows emotion name
- [ ] Shows intensity (1-5)
- [ ] Shows note/description
- [ ] Shows timestamp
- [ ] Can edit note
- [ ] "Confirmar" stores `emotion_snapshot` with the reflection
- [ ] Success toast

**Refactored:**
- [ ] Picker displays correctly inside the reflection flow
- [ ] All fields display
- [ ] Editable fields work
- [ ] Confirmation persists the reflection with `emotion_snapshot`
- [ ] Success toast works

**Comparison:**
- [ ] Modal identical
- [ ] Emotion created correctly
- [ ] Both versions call the reflection endpoint

---

### 10. Schedule Mission

**Test Flow:**
1. Click "Programar" on a mission
2. Modal opens with date/time picker
3. Select date/time
4. Confirm
5. Check calendar for task

**Original:**
- [ ] Schedule modal opens
- [ ] Date/time picker works
- [ ] "Confirmar" schedules to calendar
- [ ] Creates task in calendar-backend
- [ ] Mission shows "Reprogramar" instead

**Refactored:**
- [ ] Schedule modal opens (using `openScheduleModal`)
- [ ] Date/time selection works
- [ ] Confirmation works (using `scheduleMission`)
- [ ] Task created in backend
- [ ] Button text updates

**Comparison:**
- [ ] Same scheduling behavior
- [ ] Same API calls

---

### 11. Delete Mission

**Test Flow:**
1. Click trash icon on mission
2. Confirm deletion (if modal appears)
3. Mission disappears from list

**Original:**
- [ ] Trash button visible on hover
- [ ] Click removes mission
- [ ] Mission removed from backend
- [ ] List updates instantly

**Refactored:**
- [ ] Trash button visible
- [ ] Click triggers `deleteMission` hook
- [ ] Mission removed from backend
- [ ] List updates

**Comparison:**
- [ ] Same deletion flow
- [ ] Same API call

---

## 🐛 Common Issues to Check

### Console Errors
- [ ] No 404 errors for missing files
- [ ] No undefined variable errors
- [ ] No React hook errors
- [ ] No import errors

### Network Requests
- [ ] Same number of API calls in both versions
- [ ] Same endpoints called
- [ ] Same request payloads
- [ ] Same response handling

### Performance
- [ ] No memory leaks (check DevTools Performance)
- [ ] No unnecessary re-renders
- [ ] Similar or better load times

### Accessibility
- [ ] All buttons focusable
- [ ] Tab navigation works
- [ ] Screen reader friendly (test with browser tools)

---

## 📊 Performance Comparison

### Metrics to Track

| Metric | Original | Refactored | Difference |
|--------|----------|------------|------------|
| Initial Load (ms) | _____ | _____ | _____ |
| Character Stats Render (ms) | _____ | _____ | _____ |
| Missions List Render (ms) | _____ | _____ | _____ |
| API Calls Count | _____ | _____ | _____ |
| Bundle Size Impact | N/A | _____ KB | _____ |
| Re-renders on Update | _____ | _____ | _____ |

**How to measure:**
1. Open DevTools Performance tab
2. Start recording
3. Perform action (e.g., load page)
4. Stop recording
5. Analyze flamegraph

---

## ✅ Sign-Off

### Testing Completed By: ______________
### Date: ______________

### Results:

- [ ] All features work identically
- [ ] No regressions found
- [ ] Performance is same or better
- [ ] No console errors
- [ ] Ready to replace original

### Issues Found:

1. ___________________________________
2. ___________________________________
3. ___________________________________

### Notes:

_______________________________________
_______________________________________
_______________________________________

---

## 🚀 Next Steps

If all tests pass:
1. ✅ Mark as "Production Ready"
2. ✅ Update routing to use refactored version by default
3. ✅ Keep original as backup for 1 week
4. ✅ Monitor production logs for errors
5. ✅ Proceed to refactor other pages

If issues found:
1. ❌ Document issues in detail
2. ❌ Fix issues in refactored version
3. ❌ Re-test
4. ❌ Do not deploy until all tests pass

---

**Last Updated**: February 2, 2026  
**Tester**: _____________
