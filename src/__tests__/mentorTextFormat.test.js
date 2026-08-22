import { formatMentorHistoryResponseText, formatMentorResponseText } from '../lib/mentorTextFormat';

describe('formatMentorResponseText', () => {
  it('separates mentor response sections and records', () => {
    const text = 'Reflexion inicial. --- He preparado esta tarea para ti: **Revisar metas** 📅 Inicio: 26/06/2026 17:00 💡 Motivo. --- 📎 Registros: - 15/06/2026 — reflexión: «no pude» - 17/06/2026 — chat: «perdí el rumbo»';

    expect(formatMentorResponseText(text)).toBe(
      [
        'Reflexion inicial.',
        '',
        '---',
        '',
        'He preparado esta tarea para ti:',
        '',
        '**Revisar metas**',
        '',
        '📅 Inicio: 26/06/2026 17:00',
        '',
        '💡 Motivo.',
        '',
        '---',
        '',
        '📎 Registros:',
        '- 15/06/2026 — reflexión: «no pude»',
        '- 17/06/2026 — chat: «perdí el rumbo»',
      ].join('\n')
    );
  });

  it('hides a confirmable proposal in history but keeps the records footer', () => {
    const text = 'Lectura breve del Mentor. --- He preparado esta misión contemplativa para ti: **Caminar veinte minutos** 📅 Inicio: hoy 💡 Motivo largo. Puedes editar los campos antes de confirmar. --- 📎 Registros: - 15/06/2026 — reflexión: «no pude»';

    expect(formatMentorHistoryResponseText(text)).toBe(
      [
        'Lectura breve del Mentor.',
        '',
        '---',
        '',
        '📎 Registros:',
        '- 15/06/2026 — reflexión: «no pude»',
      ].join('\n')
    );
  });

  it('hides a proposal without records and leaves ordinary responses unchanged', () => {
    expect(formatMentorHistoryResponseText(
      'Lectura breve.\n\n---\n\nHe preparado una tarea concreta para ti:\n\n**Actuar ahora**'
    )).toBe('Lectura breve.');
    expect(formatMentorHistoryResponseText('Solo una lectura breve.')).toBe('Solo una lectura breve.');
  });
});
