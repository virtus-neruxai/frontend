import { fireEvent, render, screen } from '@testing-library/react';
import HealthNoteRecallSettings from '../components/HealthNoteRecallSettings';

const renderCard = (props = {}) => {
  const onToggle = vi.fn();
  const onSave = vi.fn();
  render(
    <HealthNoteRecallSettings
      scopes={{}}
      loading={false}
      saving={false}
      onToggle={onToggle}
      onSave={onSave}
      {...props}
    />
  );
  return { onToggle, onSave };
};

describe('HealthNoteRecallSettings', () => {
  test('explains that revoking recall stops it without deleting the notes', () => {
    const { onToggle, onSave } = renderCard({ scopes: { health_note_recall: true } });

    expect(screen.getByText('Permisos del Mentor de Salud')).toBeInTheDocument();
    expect(screen.getByText(/nunca graba tus conversaciones/)).toBeInTheDocument();
    expect(screen.getByText(/no borra las\s+notas ya guardadas/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('toggle-health-note-recall'));
    fireEvent.click(screen.getByTestId('save-health-note-recall-btn'));

    expect(onToggle).toHaveBeenCalledWith('health_note_recall', false);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  test('offers the three scopes separately', () => {
    // They govern different things: indexing prose for later recall, reading
    // canonical records inside a turn, and crossing into the journal. Bundling
    // them into one switch would make "use my health data" and "look at my
    // diary" a single answer, which is the distinction the scopes exist for.
    renderCard();

    expect(screen.getByTestId('toggle-health-note-recall')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-health-records-context')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-health-wellbeing-context')).toBeInTheDocument();
  });

  test('each switch reports its own scope', () => {
    const { onToggle } = renderCard({ scopes: { health_wellbeing_context: true } });

    fireEvent.click(screen.getByTestId('toggle-health-wellbeing-context'));
    expect(onToggle).toHaveBeenCalledWith('health_wellbeing_context', false);
  });

  test('a scope with no stored preference shows as granted', () => {
    // Default-open, and the default is computed rather than persisted — so an
    // account that never touched the setting must not read as having said no.
    renderCard({ scopes: {} });

    expect(screen.getByTestId('toggle-health-records-context')).toBeChecked();
  });

  test('the journal scope says it is the one that leaves the health surface', () => {
    renderCard();
    expect(screen.getByText(/único permiso que saca información de Salud/)).toBeInTheDocument();
    expect(screen.getByText(/nunca el texto/)).toBeInTheDocument();
  });

  test('shows a loading state before the account preferences arrive', () => {
    renderCard({ loading: true });
    expect(screen.getByText(/Cargando permisos del Mentor de Salud/)).toBeInTheDocument();
    expect(screen.queryByTestId('toggle-health-note-recall')).not.toBeInTheDocument();
  });
});
