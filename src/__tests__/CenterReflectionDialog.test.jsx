import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CenterReflectionDialog from '../presentation/components/reasoning/CenterReflectionDialog';
import { reflectionsApi } from '../lib/api';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('../lib/api', () => ({
  reflectionsApi: { create: vi.fn() },
}));

const panel = {
  key: 'change',
  label: 'Cambio',
  question: '¿Qué cambio quieres sostener?',
};

const renderDialog = (props = {}) => {
  const onOpenChange = vi.fn();
  const onDraftReady = vi.fn();
  render(
    <CenterReflectionDialog
      open
      panel={panel}
      onOpenChange={onOpenChange}
      onDraftReady={onDraftReady}
      {...props}
    />
  );
  return { onOpenChange, onDraftReady };
};

describe('CenterReflectionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('creates a normal journal reflection with optional emotion and shows the result', async () => {
    const user = userEvent.setup();
    reflectionsApi.create.mockResolvedValue({
      data: {
        id: 'reflection-1',
        ai_response: 'Observa ese avance sin exigirte perfección.',
        stat_changes: { claridad: 2, serenidad: 0 },
      },
    });
    renderDialog();

    expect(screen.getByText(panel.question)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analizar y guardar' })).toBeDisabled();

    await user.type(screen.getByTestId('center-reflection-input'), '  Estoy cambiando con calma.  ');
    await user.click(screen.getByRole('button', { name: '😊 Positiva' }));
    await user.click(screen.getByRole('button', { name: /😌 Calma/ }));
    await user.click(screen.getByRole('button', { name: 'Analizar y guardar' }));

    await waitFor(() => expect(reflectionsApi.create).toHaveBeenCalledTimes(1));
    expect(reflectionsApi.create).toHaveBeenCalledWith({
      content: 'Estoy cambiando con calma.',
      emotion_snapshot: {
        polarity: 'positive',
        emotion: 'Calma',
        intensity: 3,
        note: null,
      },
    });
    const payload = reflectionsApi.create.mock.calls[0][0];
    expect(payload).not.toHaveProperty('prompt_profile');
    expect(payload).not.toHaveProperty('reflection_type');
    expect(payload).not.toHaveProperty('source_prompt');
    expect(await screen.findByText('Observa ese avance sin exigirte perfección.')).toBeInTheDocument();
    expect(screen.getByText('Claridad: +2')).toBeInTheDocument();
  });

  test('keeps the draft after an error and allows a single retry', async () => {
    const user = userEvent.setup();
    let resolveRequest;
    reflectionsApi.create
      .mockRejectedValueOnce({ response: { data: { detail: 'Fallo temporal' } } })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRequest = resolve; }));
    renderDialog();

    const input = screen.getByTestId('center-reflection-input');
    await user.type(input, 'No quiero perder este texto');
    await user.click(screen.getByRole('button', { name: 'Analizar y guardar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Fallo temporal');
    expect(input).toHaveValue('No quiero perder este texto');

    await user.click(screen.getByRole('button', { name: 'Analizar y guardar' }));
    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Guardando…' }));
    expect(reflectionsApi.create).toHaveBeenCalledTimes(2);

    resolveRequest({ data: { id: 'reflection-2', ai_response: 'Guardada.', stat_changes: {} } });
    expect(await screen.findByText('Guardada.')).toBeInTheDocument();
  });

  test('offers a returned task or mission through the existing draft callback', async () => {
    const user = userEvent.setup();
    const response = {
      id: 'reflection-3',
      ai_response: 'Puedes convertirlo en un paso concreto.',
      stat_changes: {},
      draft_id: 'draft-3',
      ui_action: {
        action: 'SHOW_TASK_CONFIRMATION_MODAL',
        data: { title: 'Dar el primer paso' },
      },
    };
    reflectionsApi.create.mockResolvedValue({ data: response });
    const { onOpenChange, onDraftReady } = renderDialog();

    await user.type(screen.getByTestId('center-reflection-input'), 'Quiero empezar hoy.');
    await user.click(screen.getByRole('button', { name: 'Analizar y guardar' }));
    await user.click(await screen.findByRole('button', { name: 'Abrir propuesta' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onDraftReady).toHaveBeenCalledWith(response);
  });
});
