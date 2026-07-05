import { fireEvent, render, screen } from '@testing-library/react';
import { DomainDistributionChart } from '../presentation/components/dashboard/DomainDistributionChart';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => <div />,
  CartesianGrid: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

describe('DomainDistributionChart', () => {
  test('opens the matching domain when its total is clicked', () => {
    const onDomainClick = vi.fn();
    render(
      <DomainDistributionChart
        data={[{ domain: 'Trabajo', count: 3 }, { domain: 'Salud', count: 2 }]}
        onDomainClick={onDomainClick}
      />
    );

    fireEvent.click(screen.getByTestId('domain-total-Trabajo'));
    expect(onDomainClick).toHaveBeenCalledWith('Trabajo');
    expect(screen.getByTestId('domain-total-Trabajo')).toHaveTextContent('3');
  });
});
