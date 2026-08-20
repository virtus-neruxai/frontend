import { act, render, screen, waitFor } from '@testing-library/react';
import { UsageDialog } from '../presentation/components/account/UsageDialog';
import { meApi } from '../lib/api';

vi.mock('../lib/api', () => ({
  meApi: { getEntitlements: vi.fn() },
}));

const baseEntitlements = {
  plan: 'plus',
  cycle_start: '2026-08-01T00:00:00Z',
  cycle_end: '2026-08-31T23:59:59Z',
  features: {
    razonar: {
      feature: 'razonar',
      limit: 10,
      period: 'mes',
      used: 4,
      remaining: 6,
      enabled: true,
      enforcement: 'quota',
      resets_at: '2026-09-01T00:00:00Z',
      upgrade_limit: null,
    },
    modo_plan_generate: {
      feature: 'modo_plan_generate',
      limit: 0,
      period: 'mes',
      used: 0,
      remaining: 0,
      enabled: false,
      enforcement: 'quota',
      resets_at: null,
      upgrade_limit: 5,
    },
    chat: {
      feature: 'chat',
      limit: null,
      period: 'dia',
      used: 12,
      remaining: null,
      enabled: true,
      enforcement: 'quota',
      resets_at: null,
      upgrade_limit: null,
    },
    nightly_review: {
      feature: 'nightly_review',
      limit: null,
      period: 'total',
      used: 0,
      remaining: null,
      enabled: true,
      enforcement: 'scheduler',
      resets_at: null,
      upgrade_limit: null,
    },
  },
  spend: { estimated_usd: 1.2, budget_usd: 5 },
  activity: {
    account_age_days: 30,
    centro_completo_unlocked: true,
    centro_completo_min_account_age_days: 7,
  },
};

describe('UsageDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('does not fetch while closed', () => {
    render(<UsageDialog open={false} onClose={vi.fn()} />);
    expect(meApi.getEntitlements).not.toHaveBeenCalled();
  });

  test('fetches once on open and renders plan badge and cycle dates', async () => {
    meApi.getEntitlements.mockResolvedValueOnce({ data: baseEntitlements });
    render(<UsageDialog open={true} onClose={vi.fn()} />);

    await waitFor(() => expect(meApi.getEntitlements).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Plus')).toBeInTheDocument();
    expect(screen.getByText(/Ciclo:/)).toBeInTheDocument();
  });

  test('renders a quota feature with used/limit and reset date', async () => {
    meApi.getEntitlements.mockResolvedValueOnce({ data: baseEntitlements });
    render(<UsageDialog open={true} onClose={vi.fn()} />);

    expect(await screen.findByText(/4 \/ 10/)).toBeInTheDocument();
    expect(screen.getByText(/Se renueva el/)).toBeInTheDocument();
  });

  test('renders a disabled (limit 0) feature grayed out with upgrade hint', async () => {
    meApi.getEntitlements.mockResolvedValueOnce({ data: baseEntitlements });
    render(<UsageDialog open={true} onClose={vi.fn()} />);

    expect(await screen.findByText('No disponible')).toBeInTheDocument();
    expect(screen.getByText(/Disponible en el plan Pro/)).toBeInTheDocument();
  });

  test('renders an unlimited feature as "Ilimitado"', async () => {
    meApi.getEntitlements.mockResolvedValueOnce({ data: baseEntitlements });
    render(<UsageDialog open={true} onClose={vi.fn()} />);

    expect(await screen.findByText('Ilimitado')).toBeInTheDocument();
  });

  test('renders a scheduler-enforcement feature as included/not included, not as a fraction', async () => {
    meApi.getEntitlements.mockResolvedValueOnce({ data: baseEntitlements });
    render(<UsageDialog open={true} onClose={vi.fn()} />);

    expect(await screen.findByText('Incluido en tu plan')).toBeInTheDocument();
  });

  test('shows an error state with a retry that re-fetches', async () => {
    meApi.getEntitlements.mockRejectedValueOnce(new Error('network'));
    render(<UsageDialog open={true} onClose={vi.fn()} />);

    expect(await screen.findByText(/No se pudo cargar/)).toBeInTheDocument();

    meApi.getEntitlements.mockResolvedValueOnce({ data: baseEntitlements });
    await act(async () => {
      screen.getByText('Reintentar').click();
    });

    expect(await screen.findByText('Plus')).toBeInTheDocument();
    expect(meApi.getEntitlements).toHaveBeenCalledTimes(2);
  });
});
