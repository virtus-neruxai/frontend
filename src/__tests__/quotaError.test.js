import { describe, expect, it } from 'vitest';
import { apiErrorMessage, normalizeQuotaError, quotaMessage } from '../lib/quotaError';

/** Un error de axios con el cuerpo que emite shared/shared/plans/errors.py. */
const quotaError = (detail, status = 429) => ({
  response: { status, data: { detail } },
});

const NOT_IN_PLAN = {
  error: 'quota_exceeded',
  feature: 'modo_plan_generate',
  limit: 0,
  used: 0,
  period: 'semana',
  plan: 'free',
  upgrade_to: 'plus',
};

const EXHAUSTED = {
  error: 'quota_exceeded',
  feature: 'razonar',
  limit: 4,
  used: 4,
  period: 'semana',
  resets_at: '2026-08-24T00:00:00+02:00',
  plan: 'plus',
  upgrade_to: 'pro',
};

describe('apiErrorMessage', () => {
  it('explica que la funcion no esta en el plan cuando limit es 0', () => {
    // El caso que motivo el arreglo: Free + Modo plan mostraba «Error al
    // comunicarse con el agente», como si el servicio estuviera caido.
    expect(apiErrorMessage(quotaError(NOT_IN_PLAN), 'Error al comunicarse con el agente'))
      .toBe('Los proyectos están disponibles en el plan Plus.');
  });

  it('al agotarse una cuota cita el limite, la renovacion y el plan superior', () => {
    const message = apiErrorMessage(quotaError(EXHAUSTED), 'generico');
    expect(message).toContain('los 4 análisis profundos');
    expect(message).toContain('24 de agosto');
    expect(message).toContain('plan Pro');
  });

  it('concuerda el articulo con el genero del sustantivo', () => {
    // «Los regeneraciones de panel» era lo que salia antes: la mitad de las
    // etiquetas son femeninas y la plantilla llevaba un «los» fijo.
    const panel = quotaError({ ...NOT_IN_PLAN, feature: 'centro_panel', upgrade_to: 'plus' });
    expect(apiErrorMessage(panel, 'generico'))
      .toBe('Las regeneraciones de panel están disponibles en el plan Plus.');

    const datos = quotaError({
      error: 'quota_exceeded', feature: 'datos_app', limit: 2, used: 2,
      period: 'semana', plan: 'free', upgrade_to: 'plus',
    });
    expect(apiErrorMessage(datos, 'generico')).toContain('Has usado las 2 preguntas sobre tus datos');
  });

  it('habla en singular si no conoce la feature', () => {
    // El catálogo puede crecer sin que este bundle se redespliegue.
    const nueva = quotaError({ ...NOT_IN_PLAN, feature: 'feature_que_no_existe_aun' });
    expect(apiErrorMessage(nueva, 'generico')).toBe('Esta función está disponible en el plan Plus.');
  });

  it('reconoce la puerta de actividad de Mi centro, que responde 403', () => {
    const gate = quotaError(
      { error: 'activity_gate_not_met', feature: 'centro_completo', required: 7, current: 5 },
      403,
    );
    expect(apiErrorMessage(gate, 'generico')).toContain('faltan 2 días');
  });

  it('no ofrece subir de plan cuando el corte es del tope de gasto', () => {
    // Ahi el problema es nuestro, no del plan del usuario.
    const cap = quotaError({ error: 'spend_cap_reached', feature: 'informe', plan: 'pro' });
    const message = apiErrorMessage(cap, 'generico');
    expect(message).toContain('límite de nuestro lado');
    expect(message).not.toContain('plan');
  });

  it('devuelve el detail del backend cuando no es un error de cuota', () => {
    const error = { response: { status: 500, data: { detail: 'Informe no encontrado' } } };
    expect(apiErrorMessage(error, 'generico')).toBe('Informe no encontrado');
  });

  it('cae al generico sin response (error de red) y con detail vacio', () => {
    expect(apiErrorMessage(new Error('Network Error'), 'generico')).toBe('generico');
    expect(apiErrorMessage(undefined, 'generico')).toBe('generico');
    expect(apiErrorMessage({ response: { status: 502, data: { detail: '  ' } } }, 'generico'))
      .toBe('generico');
  });
});

describe('idempotencia respecto al interceptor', () => {
  // normalizeQuotaError deja la frase en `detail` y el objeto en `quota`. Si
  // quotaDetail solo mirara `detail`, todo el que leyera el error DESPUES del
  // interceptor —o sea, todo el mundo— recibiria null creyendo que no era de
  // cuota. Fue el caso de CenterView, que caia siempre al mensaje generico.
  it('quotaMessage sigue respondiendo despues de normalizar', () => {
    const error = quotaError(NOT_IN_PLAN);
    const antes = quotaMessage(error);

    normalizeQuotaError(error);

    expect(typeof error.response.data.detail).toBe('string');
    expect(error.response.data.quota).toMatchObject({ feature: 'modo_plan_generate' });
    expect(quotaMessage(error)).toBe(antes);
    expect(apiErrorMessage(error, 'generico')).toBe(antes);
  });

  it('normalizar dos veces no rompe el mensaje', () => {
    const error = quotaError(EXHAUSTED);
    normalizeQuotaError(error);
    const unaVez = error.response.data.detail;
    normalizeQuotaError(error);
    expect(error.response.data.detail).toBe(unaVez);
  });
});
