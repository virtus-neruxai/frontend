import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import GeneralCompassCard from '../presentation/components/reasoning/GeneralCompassCard';

const alignment = { status: 'insufficient_data', coverage_axes: 0, total_axes: 5 };

describe('GeneralCompassCard', () => {
  test('shows the LLM-authored center summary when present', () => {
    render(
      <GeneralCompassCard
        alignment={alignment}
        missionLensRefs={['identity', 'direction']}
        centerSummary={{ text: 'Cuidar tu energía sin perder tu rumbo.' }}
      />
    );

    expect(screen.getByText('Cuidar tu energía sin perder tu rumbo.')).toBeInTheDocument();
    expect(screen.queryByText(/Tu centro se apoya en/)).not.toBeInTheDocument();
  });

  test('falls back to the generic lens sentence for a center predating this field', () => {
    render(
      <GeneralCompassCard
        alignment={alignment}
        missionLensRefs={['identity', 'direction']}
        centerSummary={null}
      />
    );

    expect(screen.getByText(/Tu centro se apoya en/)).toBeInTheDocument();
  });
});
