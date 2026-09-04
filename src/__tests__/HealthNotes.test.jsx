/**
 * The notes panel: correcting a note, deleting one, and resetting all of them
 * at once — the memory-side twin of "Reiniciar contexto" on the conversation,
 * which has to actually delete (and purge from the index), not just stop
 * recall the way the Ajustes consent toggle does.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import HealthNotesPanel from '../components/health/HealthNotesPanel';
import { healthNotesApi } from '../lib/api';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('../lib/api', () => ({
  healthNotesApi: { getAll: vi.fn(), update: vi.fn(), remove: vi.fn(), resetAll: vi.fn() },
}));

const note = (overrides = {}) => ({
  note_id: 'note-1',
  content: 'Le molesta la rodilla derecha al sentadillar hondo.',
  author: 'mentor_classifier',
  domain: 'training',
  created_at: '2026-08-10T08:00:00+00:00',
  updated_at: '2026-08-10T08:00:00+00:00',
  revision: 1,
  rag_indexable: true,
  source_health_interaction_id: 'hi-1',
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  healthNotesApi.getAll.mockResolvedValue({ data: { total: 1, notes: [note()] } });
});

test('the panel has no consent toggle — that lives only in Ajustes', async () => {
  render(<HealthNotesPanel />);
  await waitFor(() => expect(screen.getByText(/rodilla derecha/)).toBeInTheDocument());

  expect(screen.queryByTestId('toggle-health-note-recall')).not.toBeInTheDocument();
});

test('a note can be corrected in place and reattributes to the user server-side', async () => {
  healthNotesApi.update.mockResolvedValue({
    data: note({ content: 'Ya no le molesta la rodilla.', author: 'user', revision: 2 }),
  });

  render(<HealthNotesPanel />);
  await waitFor(() => expect(screen.getByText(/rodilla derecha/)).toBeInTheDocument());

  fireEvent.click(screen.getByTestId('health-note-edit-note-1'));
  const textarea = screen.getByDisplayValue(/rodilla derecha/);
  fireEvent.change(textarea, { target: { value: 'Ya no le molesta la rodilla.' } });
  fireEvent.click(screen.getByText('Guardar'));

  await waitFor(() => expect(healthNotesApi.update).toHaveBeenCalledWith(
    'note-1', 'Ya no le molesta la rodilla.'
  ));
});

test('deleting a note requires a second confirming click', async () => {
  render(<HealthNotesPanel />);
  await waitFor(() => expect(screen.getByText(/rodilla derecha/)).toBeInTheDocument());

  const deleteBtn = screen.getByTestId('health-note-delete-note-1');
  fireEvent.click(deleteBtn);
  expect(healthNotesApi.remove).not.toHaveBeenCalled();

  fireEvent.click(deleteBtn);
  await waitFor(() => expect(healthNotesApi.remove).toHaveBeenCalledWith('note-1'));
});

test('resetting notes requires a second confirming click and clears the list', async () => {
  healthNotesApi.resetAll.mockResolvedValue({ data: { deleted: 1 } });

  render(<HealthNotesPanel />);
  await waitFor(() => expect(screen.getByText(/rodilla derecha/)).toBeInTheDocument());

  const resetBtn = screen.getByTestId('health-notes-reset');
  fireEvent.click(resetBtn);
  expect(healthNotesApi.resetAll).not.toHaveBeenCalled();

  fireEvent.click(resetBtn);
  await waitFor(() => expect(healthNotesApi.resetAll).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryByText(/rodilla derecha/)).not.toBeInTheDocument());

  const resetToast = toast.success.mock.calls.map(([msg]) => msg).find((msg) => /índice/.test(msg));
  expect(resetToast).toBeDefined();
});

test('there is nothing to reset when there are no notes', async () => {
  healthNotesApi.getAll.mockResolvedValue({ data: { total: 0, notes: [] } });

  render(<HealthNotesPanel />);
  await waitFor(() => expect(screen.getByText(/Todavía no hay notas/)).toBeInTheDocument());

  expect(screen.queryByTestId('health-notes-reset')).not.toBeInTheDocument();
});
