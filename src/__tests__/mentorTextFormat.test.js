import { formatMentorResponseText } from '../lib/mentorTextFormat';

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
});
