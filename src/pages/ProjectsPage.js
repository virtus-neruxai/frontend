import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import TaskModal from '../components/TaskModal';
import { Button } from '../components/ui/button';
import { ProfileHeroCard } from '../presentation/components/profile-theme/ProfileHeroCard';
import { ProjectCard } from '../presentation/components/projects/ProjectCard';
import { useProjects } from '../presentation/viewmodels/useProjects';
import { useProfileTheme } from '../theme/useProfileTheme';
import { Rocket, RefreshCw, MessageCircle } from 'lucide-react';

const FILTERS = [
  { key: 'active', label: 'En curso' },
  { key: 'completed', label: 'Finalizados' },
  { key: 'all', label: 'Todos' },
];

export default function ProjectsPage() {
  const { theme } = useProfileTheme();
  const navigate = useNavigate();
  const { projects, loading, busyId, fetchProjects, completeProject, deleteProject } = useProjects();
  const [filter, setFilter] = useState('active');

  // Editing a project's task/routine reuses TaskModal — its children are
  // plain items under /items, same shape the Calendario page edits.
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedItem(null);
  };

  const handleItemSaved = () => {
    fetchProjects();
    handleModalClose();
  };

  const handleItemDeleted = () => {
    fetchProjects();
    handleModalClose();
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return projects;
    const wanted = filter === 'completed' ? 'completed' : 'active';
    return projects.filter((p) => (String(p.status || 'active').toLowerCase()) === wanted);
  }, [projects, filter]);

  return (
    <Layout ambient>
      <div className="space-y-6" data-testid="projects-page">
        <ProfileHeroCard
          title="Proyectos"
          titleAs="h1"
          description="Planes completos convertidos en tareas y rutinas, con su progreso hasta la meta."
          action={
            <Button variant="outline" size="sm" onClick={fetchProjects} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          }
        />

        {/* Status filter */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={[
                'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                filter === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg border bg-muted/40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onGoToMentor={() => navigate('/mentor')} theme={theme} hasAny={projects.length > 0} />
        ) : (
          <div className="space-y-3">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                busy={busyId === project.id}
                onComplete={completeProject}
                onDelete={deleteProject}
                onItemClick={handleItemClick}
              />
            ))}
          </div>
        )}

        <TaskModal
          open={modalOpen}
          onClose={handleModalClose}
          task={selectedItem}
          occurrenceDate={null}
          onSaved={handleItemSaved}
          onDeleted={handleItemDeleted}
          mode={selectedItem?.task_kind || 'task'}
        />
      </div>
    </Layout>
  );
}

function EmptyState({ onGoToMentor, hasAny }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-16 px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Rocket className="h-7 w-7 text-primary" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">
        {hasAny ? 'Nada en esta vista' : 'Aún no tienes proyectos'}
      </h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {hasAny
          ? 'Prueba con otro filtro para ver tus planes en otro estado.'
          : 'Ve al Mentor, activa "Modo plan" y cuéntale tu meta. Diseñará un proyecto con tareas y rutinas que podrás confirmar aquí.'}
      </p>
      {!hasAny && (
        <Button className="mt-5" onClick={onGoToMentor}>
          <MessageCircle className="mr-2 h-4 w-4" />
          Ir al Mentor
        </Button>
      )}
    </div>
  );
}
