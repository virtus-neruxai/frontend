import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { PositiveReflectionsPanel } from '../presentation/components/dashboard/PositiveReflectionsPanel';

const longAnnotation = `${'El Mentor reconoce que este momento refleja una decisión consciente y valiosa. '.repeat(4)}Cierre visible solo al expandir.`;

function data(overrides = {}) {
  return {
    summary: {
      total_reflections: 2,
      returned_reflections: 2,
      emotion_count: 2,
      average_intensity: 4.5,
      truncated: false,
    },
    by_emotion: [
      {
        emotion: 'Calma',
        emoji: '😌',
        count: 1,
        average_intensity: 5,
        entries: [{
          id: 'routine-1',
          content: 'Hoy pude parar, respirar y recuperar la calma.',
          mentor_annotation: longAnnotation,
          created_at: '2026-08-10T10:00:00+00:00',
          reflection_type: 'routine',
          source_item_title: 'Paseo consciente',
          prompt_profile: 'calm',
          emotion_snapshot: { polarity: 'positive', emotion: 'Calma', intensity: 5, note: null },
        }],
      },
      {
        emotion: 'Gratitud',
        emoji: '🙏',
        count: 1,
        average_intensity: 4,
        entries: [{
          id: 'journal-1',
          content: 'Agradezco haber sostenido mi compromiso hoy.',
          mentor_annotation: null,
          created_at: '2026-08-09T10:00:00+00:00',
          reflection_type: 'journal',
          source_item_title: null,
          prompt_profile: null,
          emotion_snapshot: { polarity: 'positive', emotion: 'Gratitud', intensity: 4, note: null },
        }],
      },
    ],
    ...overrides,
  };
}

describe('PositiveReflectionsPanel', () => {
  test('groups reflections by emotion with their profile, source and date', () => {
    render(<PositiveReflectionsPanel data={data()} loading={false} />);

    expect(screen.getByTestId('positive-reflections-panel')).toBeInTheDocument();
    expect(screen.getByText('Reflexiones positivas')).toBeInTheDocument();
    expect(screen.getByText('Calma')).toBeInTheDocument();
    expect(screen.getByText('Gratitud')).toBeInTheDocument();
    expect(screen.getAllByText('1 reflexión', { exact: false })).toHaveLength(2);
    expect(screen.getByText('Rutina · Paseo consciente')).toBeInTheDocument();
    expect(screen.getByText('🌊 Calma')).toBeInTheDocument();
    expect(screen.getByText('Calma · 5/5')).toBeInTheDocument();
  });

  test('expands the complete Mentor annotation only when requested', () => {
    render(<PositiveReflectionsPanel data={data()} loading={false} />);

    expect(screen.queryByText('Cierre visible solo al expandir.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver anotación completa' }));
    expect(screen.getByText(/Cierre visible solo al expandir/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver menos' })).toBeInTheDocument();
  });

  test('shows a distinct empty state and allows retrying an error', () => {
    const retry = vi.fn();
    const { rerender } = render(
      <PositiveReflectionsPanel data={{ summary: {}, by_emotion: [] }} loading={false} />,
    );
    expect(screen.getByText('Aún no has marcado reflexiones positivas en este periodo.')).toBeInTheDocument();

    rerender(
      <PositiveReflectionsPanel
        data={null}
        loading={false}
        error="No se pudieron cargar las reflexiones positivas."
        onRetry={retry}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
