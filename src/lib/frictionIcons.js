import {
  DoorOpen, Repeat, BatteryLow, Zap, HelpCircle, Layers, Smartphone, UserMinus,
  Scale, Shield, Link, Hand, ThumbsUp, Dumbbell, Unlink, HeartPulse, Hourglass,
  Compass, CircleDashed,
} from 'lucide-react';

/**
 * Icon vocabulary for the friction taxonomy (backend/services/friction_labels.py).
 *
 * Icons only. The Spanish labels stay backend-owned and arrive on the API's
 * `label` field — mirroring them here would fork the taxonomy, which the
 * "does not translate friction taxonomy locally" test exists to prevent.
 */
export const FRICTION_ICONS = {
  avoidance_loop: DoorOpen,        // salir de la habitación en vez de empezar
  rumination_loop: Repeat,
  low_energy: BatteryLow,
  reactivity: Zap,
  unclear_goal: HelpCircle,
  overload: Layers,
  dopamine_escape: Smartphone,
  loneliness: UserMinus,
  value_conflict: Scale,           // dos valores en la balanza
  ego_reactivity: Shield,
  external_dependency: Link,       // atado a algo de fuera
  control_attachment: Hand,
  validation_need: ThumbsUp,
  overtraining_impulse: Dumbbell,
  execution_gap: Unlink,           // decisión y acción desconectadas
  anxiety_spike: HeartPulse,
  procrastination: Hourglass,
  self_integrity_gap: Compass,     // brújula desalineada
};

export const FRICTION_ICON_FALLBACK = CircleDashed;

/** Icon for a friction code, falling back for codes added after this map. */
export function frictionIcon(code) {
  return FRICTION_ICONS[code] || FRICTION_ICON_FALLBACK;
}
