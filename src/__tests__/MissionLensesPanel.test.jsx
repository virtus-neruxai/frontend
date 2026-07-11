import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { MissionLensesPanel } from '../presentation/components/dashboard/MissionLensesPanel';

describe('MissionLensesPanel', () => {
  test('renders the mission statement and materialized lenses', () => {
    render(
      <MissionLensesPanel
        loading={false}
        data={{
          available: true,
          mission_statement: 'Ser disciplinado y entrenar cada mañana.',
          updated_at: '2026-07-10T00:00:00+00:00',
          lenses: [
            {
              id: 'identity-1',
              lens_type: 'identity',
              text: 'Persona que honra sus compromisos físicos.',
              source_excerpt: 'Valores no negociables: Disciplina',
              confidence: 0.91,
            },
            {
              id: 'direction-1',
              lens_type: 'direction',
              text: 'Entrenar antes de mirar distracciones.',
              confidence: 0.82,
            },
          ],
        }}
      />
    );

    expect(screen.getByTestId('mission-lenses-panel')).toBeInTheDocument();
    expect(screen.getByText('Lentes de misión')).toBeInTheDocument();
    expect(screen.getByText('Ser disciplinado y entrenar cada mañana.')).toBeInTheDocument();
    expect(screen.getByText('Persona que honra sus compromisos físicos.')).toBeInTheDocument();
    expect(screen.getByText('Entrenar antes de mirar distracciones.')).toBeInTheDocument();
    expect(screen.getByText('91%')).toBeInTheDocument();
  });

  test('does not reserve dashboard space when no lenses or statement exist', () => {
    const { container } = render(
      <MissionLensesPanel
        loading={false}
        data={{
          available: false,
          mission_statement: null,
          lenses: [],
        }}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
