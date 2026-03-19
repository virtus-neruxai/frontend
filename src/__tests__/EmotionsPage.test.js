import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EmotionsPage from '../pages/EmotionsPage';
import { emotionsApi } from '../lib/emotionApi';
import { tasksApi } from '../lib/api';

jest.mock('../components/Layout', () => ({ children }) => <div>{children}</div>);

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('../lib/emotionApi', () => ({
  emotionsApi: {
    getRange: jest.fn(),
    getRecent: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../lib/api', () => ({
  tasksApi: {
    getAll: jest.fn(),
  },
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/emotions/month']}>
      <Routes>
        <Route path="/emotions/:view" element={<EmotionsPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('EmotionsPage', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-03-15T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    tasksApi.getAll.mockResolvedValue({ data: [] });
    emotionsApi.getRange.mockResolvedValue({
      data: [
        {
          id: 'e1',
          user_id: 'tester',
          date: '2025-03-15',
          ts: '2025-03-15T08:00:00Z',
          polarity: 'positive',
          emotion: 'Alegría',
          emoji: '😄',
          intensity: 5,
          note: 'Gran día',
          created_at: '2025-03-15T08:00:00Z',
          updated_at: '2025-03-15T08:00:00Z',
        },
        {
          id: 'e2',
          user_id: 'tester',
          date: '2025-03-15',
          ts: '2025-03-15T10:00:00Z',
          polarity: 'positive',
          emotion: 'Calma',
          emoji: '😌',
          intensity: 4,
          note: null,
          created_at: '2025-03-15T10:00:00Z',
          updated_at: '2025-03-15T10:00:00Z',
        },
        {
          id: 'e3',
          user_id: 'tester',
          date: '2025-03-15',
          ts: '2025-03-15T18:00:00Z',
          polarity: 'positive',
          emotion: 'Gratitud',
          emoji: '🙏',
          intensity: 4,
          note: 'Gracias',
          created_at: '2025-03-15T18:00:00Z',
          updated_at: '2025-03-15T18:00:00Z',
        },
        {
          id: 'e4',
          user_id: 'tester',
          date: '2025-03-15',
          ts: '2025-03-15T20:00:00Z',
          polarity: 'positive',
          emotion: 'Esperanza',
          emoji: '🌤️',
          intensity: 3,
          note: null,
          created_at: '2025-03-15T20:00:00Z',
          updated_at: '2025-03-15T20:00:00Z',
        },
      ],
    });
    emotionsApi.getRecent.mockResolvedValue({
      data: [
        {
          id: 'r1',
          user_id: 'tester',
          date: '2025-03-15',
          ts: '2025-03-15T18:00:00Z',
          polarity: 'positive',
          emotion: 'Gratitud',
          emoji: '🙏',
          intensity: 4,
          note: 'Gracias',
          created_at: '2025-03-15T18:00:00Z',
          updated_at: '2025-03-15T18:00:00Z',
        },
        {
          id: 'r2',
          user_id: 'tester',
          date: '2025-03-15',
          ts: '2025-03-15T10:00:00Z',
          polarity: 'positive',
          emotion: 'Calma',
          emoji: '😌',
          intensity: 4,
          note: null,
          created_at: '2025-03-15T10:00:00Z',
          updated_at: '2025-03-15T10:00:00Z',
        },
        {
          id: 'r3',
          user_id: 'tester',
          date: '2025-03-14',
          ts: '2025-03-14T09:00:00Z',
          polarity: 'negative',
          emotion: 'Estrés',
          emoji: '😵‍💫',
          intensity: 2,
          note: 'Mucho trabajo',
          created_at: '2025-03-14T09:00:00Z',
          updated_at: '2025-03-14T09:00:00Z',
        },
      ],
    });
  });

  it('renders max 3 emojis per day based on intensity', async () => {
    renderPage();

    const dayCell = await screen.findByTestId('emotion-day-2025-03-15');
    expect(screen.getByTestId('emotion-emoji-e1')).toBeInTheDocument();
    expect(screen.getByTestId('emotion-emoji-e2')).toBeInTheDocument();
    expect(screen.getByTestId('emotion-emoji-e3')).toBeInTheDocument();
    expect(screen.queryByTestId('emotion-emoji-e4')).not.toBeInTheDocument();

    const emojiButtons = within(dayCell).getAllByRole('button');
    expect(emojiButtons).toHaveLength(3);
  });

  it('opens day detail modal with all entries', async () => {
    renderPage();

    const dayCell = await screen.findByTestId('emotion-day-2025-03-15');
    fireEvent.click(dayCell);

    const modal = await screen.findByTestId('emotion-day-detail-modal');
    expect(modal).toHaveTextContent('Alegría');
    expect(modal).toHaveTextContent('Calma');
    expect(modal).toHaveTextContent('Gratitud');
    expect(modal).toHaveTextContent('Esperanza');
  });

  it('opens edit modal for selected emoji entry', async () => {
    renderPage();

    const emojiButton = await screen.findByTestId('emotion-emoji-e1');
    fireEvent.click(emojiButton);

    const modal = await screen.findByTestId('emotion-edit-modal');
    expect(modal).toHaveTextContent('Editar emoción');
  });

  it('renders recent entries and hides empty notes', async () => {
    renderPage();

    const recentPanel = await screen.findByTestId('recent-emotions');
    expect(recentPanel).toHaveTextContent('Gratitud');
    expect(recentPanel).toHaveTextContent('Calma');
    expect(recentPanel).toHaveTextContent('Estrés');
    expect(screen.getByTestId('recent-note-r1')).toHaveTextContent('Gracias');
    expect(screen.queryByTestId('recent-note-r2')).not.toBeInTheDocument();
  });
});
