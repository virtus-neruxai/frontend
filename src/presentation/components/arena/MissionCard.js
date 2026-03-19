/**
 * MissionCard Component
 * 
 * Purpose:
 * - Display daily mission details (title, description, rules, example)
 * - Show submission form for active missions
 * - Handle image upload and submission
 * - Display winner for closed missions
 * 
 * Props:
 * - mission: Current mission data
 * - showSubmissionForm: Boolean to control form visibility
 * - onToggleForm: Callback to toggle form
 * - submissionText: Controlled text value
 * - onTextChange: Text change handler
 * - submissionImage: Selected image file
 * - imagePreview: Image preview URL
 * - onImageChange: Image selection handler
 * - onRemoveImage: Image removal handler
 * - onSubmit: Form submission handler
 * - submitting: Boolean submission in progress
 * - results: Mission results (for closed missions)
 * - onSwitchToReflexiones: Callback to switch to reflexiones tab
 * 
 * Mobile Migration:
 * - Android: MissionCard.kt composable with state hoisting
 * - iOS: MissionCard.swift SwiftUI view with @Binding
 */

import React from 'react';
import { Send, Target, X, Image as ImageIcon, CheckCircle, MessageSquare, Crown, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Textarea } from '../../../components/ui/textarea';

// Trait configuration (same as original ArenaPage)
const TRAIT_CONFIG = {
  sabiduria: { label: 'Sabiduría', icon: '🦉', color: 'bg-blue-500' },
  esfuerzo: { label: 'Esfuerzo', icon: '💪', color: 'bg-orange-500' },
  dicotomia_del_control: { label: 'Dicotomía del Control', icon: '⚖️', color: 'bg-purple-500' },
  rectitud: { label: 'Rectitud', icon: '⚔️', color: 'bg-green-500' },
  humildad: { label: 'Humildad', icon: '🙏', color: 'bg-indigo-500' }
};

export function MissionCard({
  mission,
  showSubmissionForm,
  onToggleForm,
  submissionText,
  onTextChange,
  submissionImage,
  imagePreview,
  onImageChange,
  onRemoveImage,
  onSubmit,
  submitting,
  results,
  onSwitchToReflexiones
}) {
  if (!mission) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Target className="w-12 h-12 mx-auto text-[#71717A] mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay misión hoy</h3>
          <p className="text-[#71717A]">La misión diaria se crea a las 08:00 (Europe/Madrid)</p>
        </CardContent>
      </Card>
    );
  }

  const traitConfig = TRAIT_CONFIG[mission.trait];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={`${traitConfig?.color} text-white`}>
              {traitConfig?.icon} {traitConfig?.label}
            </Badge>
            <Badge variant={mission.status === 'active' ? 'default' : 'secondary'}>
              {mission.status === 'active' ? '🟢 Activa' : '🔴 Cerrada'}
            </Badge>
          </div>
          <span className="text-sm text-[#71717A]">{mission.date}</span>
        </div>
        <CardTitle className="text-xl">{mission.title}</CardTitle>
        <CardDescription>{mission.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mission Details */}
        <div className="bg-[#F4F4F5] rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium text-[#18181B]">📋 Reglas</p>
          <p className="text-sm text-[#18181B]">{mission.rules}</p>
          <p className="text-sm font-medium mt-2 text-[#18181B]">🏆 Criterio de victoria</p>
          <p className="text-sm text-[#18181B]">{mission.win_criteria}</p>
          <p className="text-sm font-medium mt-2 text-[#18181B]">💡 Ejemplo</p>
          <p className="text-sm text-[#18181B] italic">"{mission.example}"</p>
        </div>

        {/* CTA Button - Show form */}
        {mission.status === 'active' && !mission.has_submitted && !showSubmissionForm && (
          <Button 
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            size="lg"
            onClick={onToggleForm}
          >
            <Send className="w-5 h-5 mr-2" />
            Añadir Mi Reflexión
          </Button>
        )}

        {/* Submission Form */}
        {mission.status === 'active' && !mission.has_submitted && showSubmissionForm && (
          <div className="space-y-4 border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">✍️ Tu Reflexión</h3>
              <Button variant="ghost" size="sm" onClick={() => onToggleForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <Textarea
              placeholder="Escribe tu reflexión aquí... (mínimo 10 caracteres)"
              value={submissionText}
              onChange={(e) => onTextChange(e.target.value)}
              rows={5}
              className="resize-none bg-white"
            />
            
            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">📷 Imagen (opcional)</label>
              {imagePreview ? (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Preview" className="max-h-40 rounded-lg border" />
                  <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={onRemoveImage}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={onImageChange} 
                    className="hidden" 
                    id="image-upload" 
                  />
                  <label htmlFor="image-upload">
                    <Button variant="outline" size="sm" asChild>
                      <span className="cursor-pointer">
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Subir Imagen
                      </span>
                    </Button>
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-[#71717A]">{submissionText.length} caracteres</span>
              <Button 
                onClick={onSubmit} 
                disabled={submitting || submissionText.length < 10} 
                className="bg-orange-500 hover:bg-orange-600"
              >
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Enviar Reflexión
              </Button>
            </div>
          </div>
        )}

        {/* Success after submission */}
        {mission.has_submitted && mission.status === 'active' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">¡Reflexión enviada!</span>
            </div>
            <Button variant="outline" className="w-full" onClick={onSwitchToReflexiones}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Ver Reflexiones y Votar
            </Button>
          </div>
        )}

        {/* Winner for closed mission */}
        {mission.status === 'closed' && results && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-yellow-600" />
              <span className="font-semibold">Ganador del día</span>
            </div>
            {results.winner ? (
              <p className="text-lg font-bold text-[#18181B]">🎉 {results.winner.username}</p>
            ) : (
              <p className="text-[#71717A]">Sin ganador</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
