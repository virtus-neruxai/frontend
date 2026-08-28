import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HealthPracticesPanel } from '../presentation/components/dashboard/HealthPracticesPanel';

const data = {
  practices: [{
    practice_key: 'nutrition:key', title: 'Reutilizar una comida',
    instruction: 'Guárdala con un título.', status: 'active', application_count: 1,
  }],
  applications: [{
    id: 'app-1', practice_key: 'nutrition:key', application_date: '2026-08-26',
    note: 'Nota sanitaria que no debe replicarse aquí.',
  }],
};

test('dashboard shows only adopted health practices and never their private notes', () => {
  render(<HealthPracticesPanel data={data} loading={false} />);
  expect(screen.getByTestId('health-practices-panel')).toHaveTextContent(
    'Prácticas de salud que estás practicando'
  );
  expect(screen.getByText('Reutilizar una comida')).toBeInTheDocument();
  expect(screen.queryByText(/Nota sanitaria que no debe/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/racha|porcentaje/i)).toBeInTheDocument();
});

test('Lo he hecho records date and optional note without any task semantics', async () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<HealthPracticesPanel data={data} loading={false} onRecordApplication={onSave} />);
  fireEvent.click(screen.getByRole('button', { name: 'Lo he hecho' }));
  fireEvent.change(screen.getByLabelText(/Nota/i), { target: { value: 'Me resultó útil' } });
  fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith('nutrition:key', expect.objectContaining({
    note: 'Me resultó útil',
  })));
});

test('user-owned lifecycle actions are forwarded without derived states', () => {
  const onSetStatus = vi.fn();
  render(<HealthPracticesPanel data={data} loading={false} onSetStatus={onSetStatus} />);
  fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
  expect(onSetStatus).toHaveBeenCalledWith('nutrition:key', 'paused');
});

test('an empty response hides the panel', () => {
  render(<HealthPracticesPanel data={{ practices: [], applications: [] }} loading={false} />);
  expect(screen.queryByTestId('health-practices-panel')).not.toBeInTheDocument();
});

test('a failed application keeps the dialog open and offers retry', async () => {
  const onSave = vi.fn().mockRejectedValue(new Error('offline'));
  render(<HealthPracticesPanel data={data} loading={false} onRecordApplication={onSave} />);
  fireEvent.click(screen.getByRole('button', { name: 'Lo he hecho' }));
  fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/volver a intentarlo/i);
  expect(screen.getByTestId('health-practice-application-dialog')).toBeInTheDocument();
});
