import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import HealthActivityList from './HealthActivityList';
import MeasurementForm from './MeasurementForm';
import { formatHealthValue } from '../../lib/healthRecords';

function MeasurementDetails({ activity }) {
  const details = activity.details;
  if (details?.kind !== 'measurement') return null;
  return (
    <p className="text-sm font-medium pt-1">
      {formatHealthValue(details.value, details.unit)}
      {details.method && <span className="ml-2 text-xs font-normal text-muted-foreground">{details.method}</span>}
    </p>
  );
}

export default function MeasurementList({ records }) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-3">
      {creating ? (
        <MeasurementForm
          saving={records.saving}
          onCancel={() => setCreating(false)}
          onSubmit={async (payload) => {
            const created = await records.create(payload);
            if (created) setCreating(false);
          }}
        />
      ) : (
        <Button type="button" variant="outline" onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4 mr-1" /> Registrar medida
        </Button>
      )}
      <HealthActivityList
        activities={records.measurements}
        tasks={records.tasks}
        loading={records.loading}
        saving={records.saving}
        allowCreate={false}
        emptyMessage="Todavía no has registrado medidas de composición."
        onUpdate={records.update}
        onDelete={records.remove}
        onLinkTask={records.linkTask}
        onUnlinkTask={records.unlinkTask}
        renderDetails={(activity) => <MeasurementDetails activity={activity} />}
        renderEditor={({ activity, onCancel, onSaved }) => (
          <MeasurementForm
            key={`${activity.id}-${activity.revision}`}
            activity={activity}
            saving={records.saving}
            onCancel={onCancel}
            onSubmit={async (payload) => {
              const updated = await records.update(activity.id, payload);
              if (updated) onSaved();
              return updated;
            }}
          />
        )}
      />
    </div>
  );
}

