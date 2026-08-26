import { fireEvent, render, screen } from '@testing-library/react';
import HealthNoteRecallSettings from '../components/HealthNoteRecallSettings';

describe('HealthNoteRecallSettings', () => {
  test('explains that revoking stops recall without deleting the notes, and allows changing the preference', () => {
    const onToggle = vi.fn();
    const onSave = vi.fn();

    render(
      <HealthNoteRecallSettings
        enabled
        loading={false}
        saving={false}
        onToggle={onToggle}
        onSave={onSave}
      />
    );

    expect(screen.getByText('Memoria del Mentor de Salud')).toBeInTheDocument();
    expect(screen.getByText(/nunca graba tus conversaciones/)).toBeInTheDocument();
    expect(screen.getByText(/no borra las\s+notas ya guardadas/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('toggle-health-note-recall'));
    fireEvent.click(screen.getByTestId('save-health-note-recall-btn'));

    expect(onToggle).toHaveBeenCalledWith(false);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  test('shows a loading state before the account preference arrives', () => {
    render(
      <HealthNoteRecallSettings
        enabled={false}
        loading
        saving={false}
        onToggle={vi.fn()}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByText(/Cargando memoria del Mentor de Salud/)).toBeInTheDocument();
    expect(screen.queryByTestId('toggle-health-note-recall')).not.toBeInTheDocument();
  });
});
