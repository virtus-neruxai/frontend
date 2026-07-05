import { fireEvent, render, screen } from '@testing-library/react';
import MentorNotificationSettings from '../components/MentorNotificationSettings';

describe('MentorNotificationSettings', () => {
  test('explains the covered LLM notifications and allows changing the preference', () => {
    const onToggle = vi.fn();
    const onSave = vi.fn();

    render(
      <MentorNotificationSettings
        enabled
        loading={false}
        saving={false}
        onToggle={onToggle}
        onSave={onSave}
      />
    );

    expect(screen.getByText('Notificaciones del Mentor')).toBeInTheDocument();
    expect(screen.getByText(/NightlyReview/)).toBeInTheDocument();
    expect(screen.getByText(/seguimientos de reflexiones/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('toggle-mentor-notifications'));
    fireEvent.click(screen.getByTestId('save-mentor-notifications-btn'));

    expect(onToggle).toHaveBeenCalledWith(false);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
