import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RefreshCw } from 'lucide-react';
import CenterPanelCard from '../presentation/components/reasoning/CenterPanelCard';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), info: vi.fn() },
}));

vi.mock('../lib/api', () => ({
  centerApi: {},
}));

const panel = {
  key: 'change',
  reading: 'Algo está empezando a moverse.',
  reflection_question: '¿Qué cambio quieres sostener?',
  generated_at: '2026-08-22T10:00:00Z',
  evidence_refs: [],
  user_annotation: '',
  revision: 1,
};

test('places the compact reflection action beside the panel question', async () => {
  const user = userEvent.setup();
  const onRegisterReflection = vi.fn();
  render(
    <CenterPanelCard
      label="Cambio"
      icon={RefreshCw}
      panel={panel}
      onRegisterReflection={onRegisterReflection}
      onAnnotationSaved={vi.fn()}
      onReloadCenter={vi.fn()}
    />
  );

  const question = screen.getByText(panel.reflection_question);
  const button = screen.getByRole('button', { name: 'Registrar reflexión' });
  expect(question.parentElement).toBe(button.parentElement);

  await user.click(button);
  expect(onRegisterReflection).toHaveBeenCalledWith({
    key: 'change',
    label: 'Cambio',
    question: panel.reflection_question,
  });
});
