import { useEffect, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { healthReportApi } from '../../lib/api';
import { apiErrorMessage } from '../../lib/quotaError';

/**
 * Short-lived Q&A for the report currently on screen.
 *
 * The server reloads the owned report by id; the browser sends only the last
 * visible messages to make a follow-up intelligible. We intentionally do not
 * write these turns to the Mentor or general-report conversation histories.
 */
export default function HealthReportQuestions({ reportId }) {
  const [question, setQuestion] = useState('');
  const [thread, setThread] = useState([]);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    setQuestion('');
    setThread([]);
    setAsking(false);
  }, [reportId]);

  const ask = async () => {
    const message = question.trim();
    if (!message || asking || !reportId) return;

    const history = thread.slice(-10);
    setQuestion('');
    setThread((current) => [...current, { role: 'user', content: message }]);
    setAsking(true);
    try {
      const { data } = await healthReportApi.askQuestion(reportId, { message, history });
      setThread((current) => [...current, {
        role: 'assistant',
        content: data?.response || 'No he podido responder ahora mismo.',
      }]);
    } catch (error) {
      setThread((current) => [...current, {
        role: 'assistant',
        content: apiErrorMessage(error, 'No he podido responder ahora mismo.'),
      }]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="mt-4 border-t border-primary/20 pt-4" data-testid="health-report-questions">
      <p className="text-sm font-medium text-foreground">Preguntar sobre este informe</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Aclara esta lectura con los datos que contiene; no crea tareas ni modifica tus registros.
      </p>

      {thread.length > 0 && (
        <div className="mt-3 space-y-2" aria-live="polite">
          {thread.map((turn, index) => (
            <div key={`${turn.role}-${index}`} className={turn.role === 'user' ? 'text-right' : ''}>
              <span className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                turn.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {turn.content}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              ask();
            }
          }}
          placeholder="¿Qué significa esta lectura? ¿Qué dato falta para aclararlo?"
          rows={2}
          maxLength={2000}
          aria-label="Pregunta sobre este informe"
          data-testid="health-report-question-input"
        />
        <Button
          type="button"
          size="icon"
          onClick={ask}
          disabled={asking || !question.trim() || !reportId}
          aria-label="Enviar pregunta sobre el informe"
          data-testid="health-report-question-send"
        >
          {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
