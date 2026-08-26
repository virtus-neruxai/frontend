import HealthActivityList from './HealthActivityList';
import { useHealthActivities } from '../../presentation/viewmodels/useHealthActivities';

export default function HealthActivityTab() {
  const { activities, tasks, loading, saving, create, update, remove, linkTask, unlinkTask } = useHealthActivities();

  return (
    <HealthActivityList
      activities={activities}
      tasks={tasks}
      loading={loading}
      saving={saving}
      onCreate={create}
      onUpdate={update}
      onDelete={remove}
      onLinkTask={linkTask}
      onUnlinkTask={unlinkTask}
    />
  );
}
