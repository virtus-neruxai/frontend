import { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import ProjectPlanPreview from '../components/project/ProjectPlanPreview';
import ProjectSessionsSidebar from '../components/project/ProjectSessionsSidebar';
import { useProjectChat } from '../presentation/viewmodels/useProjectChat';
import { Send, Paperclip, Loader2, FileText } from 'lucide-react';

export default function ProjectChatPage() {
  const {
    messages,
    inputMessage,
    loading,
    phase,
    plan,
    draftId,
    attachedFiles,
    sessionId,
    sendMessage,
    setInputMessage,
    startNewConversation,
    loadSession,
    confirmDraft,
    rejectDraft,
  } = useProjectChat();

  const [selectedFile, setSelectedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputMessage.trim() && !selectedFile) return;
    const msg = inputMessage;
    const file = selectedFile;
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    await sendMessage(msg, file);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxMB = 10;
      if (file.size > maxMB * 1024 * 1024) {
        alert(`Archivo demasiado grande. Máximo: ${maxMB}MB`);
        return;
      }
      setSelectedFile(file);
    }
  };

  const showPlanPanel = !!(
    plan?.tasks?.length > 0 ||
    phase === 'PLANNING' ||
    phase === 'REVIEW' ||
    phase === 'FINALIZE' ||
    phase === 'CONFIRMED'
  );

  return (
    <Layout>
      <div className="flex h-[calc(100vh-8rem)] gap-3">
        {/* Sessions sidebar */}
        <ProjectSessionsSidebar
          currentSessionId={sessionId}
          onSelectSession={loadSession}
          onNewSession={startNewConversation}
          onSessionDeleted={startNewConversation}
        />

        {/* Chat Panel */}
        <div className={`flex min-w-0 flex-col rounded-xl border bg-card ${showPlanPanel ? 'flex-1' : 'flex-1'}`}>
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2 className="text-lg font-semibold">Planificador de Proyectos</h2>
              <p className="text-xs text-muted-foreground">
                Describe tu proyecto y te ayudaré a crear un plan de tareas
              </p>
            </div>
          </div>

          {/* Attached files banner */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 border-b bg-muted/40 px-4 py-2">
              {attachedFiles.map((name, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground"
                >
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="max-w-[160px] truncate">{name}</span>
                </span>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-muted-foreground">
                    Empieza a planificar
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    Describe tu proyecto, sube un documento con los requisitos, o simplemente
                    cuéntame qué quieres lograr. Te haré preguntas para entender mejor el alcance
                    y generar un plan de tareas.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Pensando...
                  </div>
                </div>
              )}
            </div>

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4">
            {selectedFile && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate">{selectedFile.name}</span>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  x
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf,.txt,.md,.csv"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center rounded-lg border p-2.5 text-muted-foreground hover:bg-accent"
                title="Adjuntar archivo"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe tu proyecto..."
                rows={1}
                className="flex-1 resize-none rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={handleSend}
                disabled={loading || (!inputMessage.trim() && !selectedFile)}
                className="flex items-center justify-center rounded-lg bg-primary p-2.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Plan Preview Panel */}
        {showPlanPanel && (
          <div className="w-[42%] shrink-0 rounded-xl border bg-card">
            <ProjectPlanPreview
              plan={plan}
              phase={phase}
              draftId={draftId}
              onConfirm={() => confirmDraft()}
              onReject={() => rejectDraft()}
              onConfirmPlan={() => sendMessage('confirmar el proyecto')}
              onNewProject={startNewConversation}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}
