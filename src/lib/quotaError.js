/**
 * Lectura del 429 de cuota — Fase 2, §2.6.
 *
 * Hasta la Fase 2, `detail` era **siempre** un string en los tres servicios y
 * toda la UI lo asumía. Los errores de cuota lo rompen a propósito: llevan un
 * objeto, porque «te has quedado sin Razonar» necesita decir cuánto tenías,
 * cuándo se renueva y a qué plan subir — y eso no cabe en una frase que además
 * habría que parsear.
 *
 * Este módulo es el único sitio que conoce esa forma. El resto de la app pide
 * `quotaMessage(error)` y recibe una frase, o `null` si no era un error de
 * cuota.
 */

/** Discriminantes del cuerpo estructurado (shared/shared/plans/errors.py). */
const QUOTA_EXCEEDED = 'quota_exceeded';
const SPEND_CAP_REACHED = 'spend_cap_reached';
//: No viene de shared/plans — es una puerta de reasoning-service (§2.6), no
//: una cuota, por eso responde 403 y no 429.
const ACTIVITY_GATE_NOT_MET = 'activity_gate_not_met';

/**
 * `[artículo, sustantivo]` por feature.
 *
 * El artículo va en la tabla, y no en la plantilla, porque las dos frases lo
 * colocan en sitios distintos («Las regeneraciones…» / «Has usado las 2
 * regeneraciones…») y la mitad de estos sustantivos son femeninos: con un
 * `los` fijo salía «Los regeneraciones de panel».
 */
const FEATURE_LABELS = {
  chat: ['los', 'mensajes con el mentor'],
  datos_app: ['las', 'preguntas sobre tus datos'],
  razonar: ['los', 'análisis profundos'],
  modo_plan_generate: ['los', 'proyectos'],
  reflexion_analisis: ['los', 'análisis de reflexiones'],
  centro_completo: ['las', 'generaciones de Mi centro'],
  centro_panel: ['las', 'regeneraciones de panel'],
  informe: ['los', 'informes'],
  informe_pregunta: ['las', 'preguntas sobre el informe'],
  companion: ['los', 'mensajes transformadores'],
  misiones_retos: ['las', 'generaciones de misiones y retos'],
  perfil_ia: ['los', 'perfiles con IA'],
};

const PLAN_LABELS = { free: 'Free', plus: 'Plus', pro: 'Pro' };

const PERIOD_LABELS = {
  dia: 'hoy',
  semana: 'esta semana',
  mes: 'este mes',
  total: 'en total',
};

/**
 * El cuerpo de cuota de un error de axios, o `null`.
 *
 * Tolera que `detail` siga siendo un string —que es lo que devuelve el otro 95 %
 * de los errores— sin tratarlo como cuota. Acepta 429 (cuota, tope de gasto) y
 * 403 (puerta de actividad): los tres comparten el mismo `{error: "..."}` como
 * discriminante, así que da igual el código HTTP a la hora de interpretarlos.
 */
export function quotaDetail(error) {
  const status = error?.response?.status;
  if (status !== 429 && status !== 403) return null;
  // `quota` primero: si el interceptor ya normalizó, `detail` es la frase y el
  // objeto vive ahí. Sin esto la función solo acierta la primera vez, y todo
  // el que la llame después de normalizar —que es todo el mundo, porque
  // normaliza el interceptor— recibe null creyendo que no era de cuota.
  const detail = error.response?.data?.quota ?? error.response?.data?.detail;
  if (!detail || typeof detail !== 'object') return null;
  if (![QUOTA_EXCEEDED, SPEND_CAP_REACHED, ACTIVITY_GATE_NOT_MET].includes(detail.error)) {
    return null;
  }
  return detail;
}

/** `true` si el corte viene del tope de gasto y no de la cuota del usuario. */
export function isSpendCap(detail) {
  return detail?.error === SPEND_CAP_REACHED;
}

/** `true` si es la puerta de actividad de Mi centro (7 días), no una cuota. */
export function isActivityGate(detail) {
  return detail?.error === ACTIVITY_GATE_NOT_MET;
}

function formatResetDate(isoString) {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
}

/**
 * Frase lista para mostrar, o `null` si el error no era de cuota.
 *
 * Se evita mencionar el plan superior cuando el corte es del tope de gasto: ahí
 * el problema es nuestro, no del plan del usuario, y ofrecerle pagar más por
 * algo que ahora mismo no podemos servir sería vender humo.
 */
export function quotaMessage(error) {
  const detail = quotaDetail(error);
  if (!detail) return null;

  if (isSpendCap(detail)) {
    return 'Esta función no está disponible temporalmente por un límite de nuestro lado. Vuelve a intentarlo más tarde.';
  }

  if (isActivityGate(detail)) {
    const missing = Math.max(0, (detail.required ?? 0) - (detail.current ?? 0));
    return missing > 0
      ? `Mi centro se desbloquea a partir del ${detail.required}º día desde tu alta. Te ${missing === 1 ? 'falta 1 día' : `faltan ${missing} días`}.`
      : 'Mi centro ya debería estar disponible — vuelve a intentarlo en un momento.';
  }

  const upgrade = PLAN_LABELS[detail.upgrade_to];
  // Una feature que este frontend no conoce todavía (catálogo más nuevo que el
  // bundle desplegado) no tiene sustantivo, así que se habla en singular en vez
  // de construir un plural con un hueco vacío.
  const [article, noun] = FEATURE_LABELS[detail.feature] || [];
  const The = article === 'las' ? 'Las' : 'Los';

  // limit 0 ⇒ la función no está en el plan; no se ha «agotado» nada.
  if (detail.limit === 0) {
    if (!noun) {
      return upgrade
        ? `Esta función está disponible en el plan ${upgrade}.`
        : 'Esta función no está disponible en tu plan.';
    }
    return upgrade
      ? `${The} ${noun} están disponibles en el plan ${upgrade}.`
      : `${The} ${noun} no están disponibles en tu plan.`;
  }

  const when = PERIOD_LABELS[detail.period] || 'en este periodo';
  const resets = formatResetDate(detail.resets_at);
  const parts = [
    noun
      ? `Has usado ${article} ${detail.limit} ${noun} de tu plan ${when}.`
      : `Has agotado esta función en tu plan ${when}.`,
  ];
  if (resets) parts.push(`Se renuevan el ${resets}.`);
  if (upgrade) parts.push(`El plan ${upgrade} incluye más.`);
  return parts.join(' ');
}

/**
 * El mejor mensaje disponible para un error de API.
 *
 * Por orden: la frase de cuota, el `detail` del backend si es texto, y si no el
 * genérico que pasa el call site. Pensado para los `catch` que hasta ahora
 * enseñaban una cadena fija: un 429 de cuota se leía como «el servicio está
 * roto» cuando en realidad era «tu plan no incluye esto».
 *
 * El `fallback` sigue haciendo falta: cubre los errores de red (sin `response`)
 * y los 5xx sin cuerpo, donde no hay nada que contar más que lo genérico.
 */
export function apiErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail;
  return (
    quotaMessage(error) || (typeof detail === 'string' && detail.trim() ? detail : fallback)
  );
}

/**
 * Normaliza un error de cuota **en su sitio**, para los interceptores.
 *
 * Mueve el objeto a `error.response.data.quota` y deja en `detail` la frase.
 * Suena invasivo, y lo es a propósito: hay una docena de sitios que hacen
 * `toast.error(data.detail || '…')` porque hasta ahora `detail` siempre era un
 * string. Sin esta normalización, cada uno de ellos mostraría `[object Object]`
 * el día que activemos `enforce`. Así todos aciertan sin tocarlos, y el que
 * necesite los números (para un upsell, para pintar cuánto queda) lee `quota`.
 *
 * Es idempotente: `quotaDetail` mira `quota` antes que `detail`, así que volver
 * a pasar un error ya normalizado no lo degrada a un error sin cuota.
 */
export function normalizeQuotaError(error) {
  const detail = quotaDetail(error);
  if (!detail) return error;
  const message = quotaMessage(error);
  error.response.data.quota = detail;
  error.response.data.detail = message;
  return error;
}
