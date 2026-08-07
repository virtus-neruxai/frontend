import { FRICTION_ICONS, FRICTION_ICON_FALLBACK, frictionIcon } from '../lib/frictionIcons';

// The contract with backend/services/friction_labels.py::_LABELS, minus "none"
// (get_known_friction_codes() excludes it). Hardcoded on purpose: if the
// backend taxonomy grows a code, this test is what says the icon map lagged.
const BACKEND_FRICTION_CODES = [
  'avoidance_loop',
  'rumination_loop',
  'low_energy',
  'reactivity',
  'unclear_goal',
  'overload',
  'dopamine_escape',
  'loneliness',
  'value_conflict',
  'ego_reactivity',
  'external_dependency',
  'control_attachment',
  'validation_need',
  'overtraining_impulse',
  'execution_gap',
  'anxiety_spike',
  'procrastination',
  'self_integrity_gap',
];

describe('frictionIcons', () => {
  test('covers exactly the backend friction taxonomy', () => {
    expect(Object.keys(FRICTION_ICONS).sort()).toEqual([...BACKEND_FRICTION_CODES].sort());
  });

  test('every code resolves to a real component', () => {
    BACKEND_FRICTION_CODES.forEach((code) => {
      expect(frictionIcon(code)).toBeDefined();
      expect(frictionIcon(code)).not.toBe(FRICTION_ICON_FALLBACK);
    });
  });

  test('an unmapped code degrades instead of crashing the panel', () => {
    expect(frictionIcon('code_added_after_this_map')).toBe(FRICTION_ICON_FALLBACK);
    expect(frictionIcon(undefined)).toBe(FRICTION_ICON_FALLBACK);
    expect(frictionIcon(null)).toBe(FRICTION_ICON_FALLBACK);
  });

  test('does not mirror the backend labels', () => {
    // Labels arrive on the API's `label` field; duplicating them here would
    // fork the taxonomy.
    const serialized = JSON.stringify(Object.keys(FRICTION_ICONS));
    expect(serialized).not.toMatch(/Saturación|Evitación|Procrastinación/);
  });
});
