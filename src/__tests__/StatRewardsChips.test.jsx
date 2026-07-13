import { render, screen } from '@testing-library/react';
import { StatRewardsChips } from '../presentation/components/stats/StatRewardsChips';

describe('StatRewardsChips', () => {
  it('renders stat increments with formatted labels', () => {
    render(<StatRewardsChips rewards={{ disciplina: 2, coherencia_interna: 1 }} />);

    expect(screen.getByText('Incrementa:')).toBeInTheDocument();
    expect(screen.getByText('+2 Disciplina')).toBeInTheDocument();
    expect(screen.getByText('+1 Coherencia Interna')).toBeInTheDocument();
  });

  it('renders nothing when there are no rewards', () => {
    const { container } = render(<StatRewardsChips rewards={{}} />);

    expect(container).toBeEmptyDOMElement();
  });
});
