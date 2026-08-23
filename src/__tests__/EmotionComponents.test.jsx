import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import EmotionBadge from '../components/EmotionBadge';
import EmotionDiscardAlert from '../components/EmotionDiscardAlert';
import EmotionPicker from '../components/EmotionPicker';

vi.mock('../lib/api', () => ({
  emotionsApi: {
    getCatalog: vi.fn().mockResolvedValue({
      data: {
        catalog: {
          positive: [{ label: 'Alegría', emoji: '😄' }],
          neutral: [{ label: 'Concentración', emoji: '🧠' }],
          negative: [{ label: 'Tristeza', emoji: '😢' }],
        },
      },
    }),
  },
}));

describe('emotion UI components', () => {
  test('renders the emotion badge using the compact history format', () => {
    render(
      <EmotionBadge
        emotionSnapshot={{
          polarity: 'negative',
          emotion: 'Tristeza',
          intensity: 5,
        }}
      />
    );

    expect(screen.getByText('Tristeza · 5/5')).toBeInTheDocument();
  });

  test('renders nothing when a reflection has no emotion', () => {
    const { container } = render(<EmotionBadge emotionSnapshot={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('disables every emotion choice when its parent flow is loading', async () => {
    render(<EmotionPicker value={null} onChange={vi.fn()} disabled />);

    expect(await screen.findByRole('button', { name: '😊 Positiva' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '😐 Neutra' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '😔 Difícil' })).toBeDisabled();
  });

  test('returns the diary emotion shape unchanged', async () => {
    const onChange = vi.fn();
    render(<EmotionPicker value={null} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '😔 Difícil' }));
    fireEvent.click(await screen.findByRole('button', { name: '😢 Tristeza' }));

    expect(onChange).toHaveBeenCalledWith({
      polarity: 'negative',
      emotion: 'Tristeza',
      intensity: 3,
    });
  });

  test('confirms explicitly before discarding an unidentified emotion', () => {
    const onConfirm = vi.fn();
    render(
      <EmotionDiscardAlert
        open
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        confirmLabel="Salir sin guardar"
      />
    );

    expect(screen.getByText('Emoción sin reflexión')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salir sin guardar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
