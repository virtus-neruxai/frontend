import { useState } from 'react';
import { Check } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { healthReportApi } from '../../lib/api';

// Cómo se establecio la relacion, y por tanto lo que puede sostener. Los textos
// son los del prompt (regla 14) a proposito: la interfaz y el modelo tienen que
// redactar una coincidencia de la misma manera, o la persona leera dos grados
// de certeza distintos sobre el mismo par de cosas.
const KIND_LABELS = {
  linked: {
    label: 'Lo escribiste sobre eso',
    hint: 'Tú dijiste que eran el mismo evento. Es la relación más fuerte que hay aquí.',
  },
  temporal_and_semantic: {
    label: 'Coincidió, y encaja',
    hint: 'Cayó en los mismos días y lo que escribiste iba en la misma línea.',
  },
  temporal: {
    label: 'Coincidió en el tiempo',
    hint: 'Cayeron cerca en el calendario, y eso es todo lo que se sabe.',
  },
  semantic: {
    label: 'Solo se parece',
    hint: 'Solo se parece en el texto, sin coincidir en fechas. No sostiene una '
      + 'afirmación, únicamente propone algo que observar.',
  },
};

const DIMENSIONS = {
  activity: 'Actividad', recovery: 'Recuperación', nutrition: 'Nutrición',
  composition: 'Composición', followup: 'Seguimiento',
  mental_wellbeing: 'Bienestar mental',
};

// Una relacion `semantic` a secas no se puede guardar, y el boton no aparece.
// El backend la rechaza con 409; ofrecerla igualmente convertiria lo mas debil
// del informe en lo mas duradero del sistema —una nota que el Mentor recuperara
// como cualquier otra— en cuanto alguien pulsara.
const ADOPTABLE = new Set(['linked', 'temporal_and_semantic', 'temporal']);

/**
 * "Relaciones observadas": lo que el codigo encontro entre lo que la persona
 * registro y lo que escribio en su diario esos dias.
 *
 * El informe **propone**; la persona **adopta**. Es el mismo circuito que las
 * practicas, y por la misma razon: una relacion guardada se convierte en una
 * nota de autoria propia, que es el peldano mas alto de la escalera de
 * evidencia. Solo un gesto explicito puede colocar algo ahi.
 */
export default function HealthRelations({ reportId, relations = [] }) {
  const [adopted, setAdopted] = useState({});
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');

  if (relations.length === 0) return null;

  const adopt = async (relation) => {
    if (!reportId || adopted[relation.relation_id]) return;
    setSaving(relation.relation_id);
    setError('');
    try {
      const response = await healthReportApi.adoptRelation(reportId, relation.relation_id);
      // Pulsar dos veces no duplica: el id de la nota se deriva del par
      // (informe, relacion), asi que el servidor responde con la que ya existe.
      setAdopted((current) => ({ ...current, [relation.relation_id]: response.data }));
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'No se pudo guardar esta relación.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-3" data-testid="health-report-relations">
      <p className="text-xs text-muted-foreground">
        Cosas que cayeron juntas en tu registro. Coincidir no es causar: guárdala solo
        si te reconoces en ella, y entonces el Mentor la recordará como algo que dijiste tú.
      </p>
      {relations.map((relation) => {
        const kind = KIND_LABELS[relation.kind] || KIND_LABELS.temporal;
        const isAdopted = Boolean(adopted[relation.relation_id]);
        const canAdopt = ADOPTABLE.has(relation.kind);
        return (
          <div
            key={relation.relation_id}
            className="space-y-2 rounded-lg border border-border p-3"
            data-testid={`health-relation-${relation.relation_id}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm text-foreground">
                  {relation.emotion && (
                    <span className="font-medium">
                      {relation.emotion.charAt(0).toUpperCase() + relation.emotion.slice(1)}
                    </span>
                  )}
                  {relation.related_title && (
                    <>
                      {relation.emotion ? ' · ' : ''}
                      {relation.related_title}
                    </>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{kind.hint}</p>
              </div>
              {canAdopt && (
                <Button
                  size="sm"
                  variant={isAdopted ? 'secondary' : 'outline'}
                  disabled={!reportId || isAdopted || saving === relation.relation_id}
                  onClick={() => adopt(relation)}
                  data-testid={`health-relation-adopt-${relation.relation_id}`}
                >
                  {isAdopted ? <><Check className="mr-1 h-3.5 w-3.5" /> Guardada</> :
                    saving === relation.relation_id ? 'Guardando…' : 'Guardar como nota'}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{kind.label}</Badge>
              {relation.dimension && (
                <Badge variant="secondary">
                  {DIMENSIONS[relation.dimension] || relation.dimension}
                </Badge>
              )}
              {/* Un solo evento nunca se presenta como patron (regla 14). */}
              {relation.recurrent && <Badge variant="secondary">Se ha repetido</Badge>}
              {(relation.dates || []).length > 0 && (
                <span>{relation.dates.join(' · ')}</span>
              )}
            </div>
          </div>
        );
      })}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
