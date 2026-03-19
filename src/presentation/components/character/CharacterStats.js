import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { 
  Brain, Shield, Target, Heart, Sun, 
  Flame, Trophy, Sparkles, CheckCircle2, XCircle 
} from 'lucide-react';
import { formatStatLabel, getStatColor } from '../../../lib/statUtils';

const STAT_ICONS = {
  autodominio: Shield,
  claridad: Brain,
  disciplina: Target,
  virtud: Heart,
  serenidad: Sun
};

/**
 * CharacterStats Component
 *
 * Displays character statistics in a visually appealing card layout
 * Shows level, title, and five core stats (profile-aware)
 *
 * @param {Object} props
 * @param {Object} props.character - Character data object
 * @param {number} props.character.level - Character level
 * @param {string} props.character.level_title - Character title/rank
 * @param {Object} props.character.stats - Character stats object
 * @param {Object} props.statsInfo - Stat metadata { statKey: { name, description } }
 */
export const CharacterStats = ({ character, statsInfo = {} }) => {
  if (!character) return null;

  return (
    <Card className="border-[#E4E4E7] shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-[#18181B] dark:text-white">Estadísticas</CardTitle>
          <Badge 
            variant="outline" 
            className="bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white border-0"
          >
            <Trophy className="w-3 h-3 mr-1" />
            Nivel {character.level}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Level Title */}
        <div className="text-center p-4 bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A] rounded-lg border border-[#FCD34D]">
          <Sparkles className="w-5 h-5 mx-auto mb-2 text-[#D97706]" />
          <p className="text-sm text-[#92400E] font-medium">Título Actual</p>
          <p className="text-xl font-bold text-[#B45309]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {character.level_title}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4">
          {Object.entries(character.stats || {}).map(([statKey, value]) => {
            const Icon = STAT_ICONS[statKey] || Flame;
            const color = getStatColor(statKey);
            const label = formatStatLabel(statKey, statsInfo);
            const percentage = Math.min((value / 100) * 100, 100);

            return (
              <div key={statKey} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="p-1.5 rounded-lg"
                      style={{ backgroundColor: `${color}15` }}
                    >
                      <Icon 
                        className="w-4 h-4" 
                        style={{ color }} 
                        strokeWidth={1.5} 
                      />
                    </div>
                    <span className="text-sm font-medium text-[#18181B] dark:text-white">
                      {label}
                    </span>
                  </div>
                  <span 
                    className="text-sm font-bold" 
                    style={{ color }}
                  >
                    {value}/100
                  </span>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: `${color}20` }}>
                  <div 
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: color
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats Summary */}
        <div className="pt-2 border-t border-[#E4E4E7]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#71717A]">Total Stats</span>
            <span className="font-bold text-[#F97316]">
              {Object.values(character.stats || {}).reduce((sum, val) => sum + val, 0)}/500
            </span>
          </div>
        </div>

        {/* Missions Stats */}
        <div className="pt-2 border-t border-[#E4E4E7] space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-[#71717A]">
              <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
              <span>Misiones Completadas</span>
            </div>
            <span className="font-bold text-[#22C55E]">
              {character.missions_completed || 0}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-[#71717A]">
              <XCircle className="w-4 h-4 text-[#EF4444]" />
              <span>Misiones Falladas</span>
            </div>
            <span className="font-bold text-[#EF4444]">
              {character.missions_failed || 0}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
