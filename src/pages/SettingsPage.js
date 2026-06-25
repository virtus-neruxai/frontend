import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import NotificationSettings from '../components/NotificationSettings';
import PromptProfileSettings from '../components/PromptProfileSettings';
import ProactiveSettings from '../components/ProactiveSettings';
import { notificationsApi, userSettingsApi } from '../lib/api';
import { ProfileHeroCard } from '../presentation/components/profile-theme/ProfileHeroCard';
import { getProfileTheme } from '../theme/profileThemeUtils';
import { useProfileTheme } from '../theme/useProfileTheme';

const DEFAULT_SETTINGS = {
  enabled: true,
  sound_enabled: true,
  priority_preferences: {
    urgent: true,
    high: true,
    medium: true,
    low: true,
  },
  do_not_disturb: {
    enabled: false,
    start_hour: 22,
    end_hour: 8,
  },
};

export default function SettingsPage() {
  const {
    profileId,
    previewProfile,
    persistProfile,
    syncPersistedProfile,
  } = useProfileTheme();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [promptProfile, setPromptProfile] = useState(profileId);
  const [persistedPromptProfile, setPersistedPromptProfile] = useState(profileId);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [autoApplyProactiveChanges, setAutoApplyProactiveChanges] = useState(false);
  const [proactiveSaving, setProactiveSaving] = useState(false);
  const persistedPromptProfileRef = useRef(profileId);
  const selectedProfileTheme = getProfileTheme(promptProfile);

  useEffect(() => {
    persistedPromptProfileRef.current = persistedPromptProfile;
  }, [persistedPromptProfile]);

  useEffect(() => {
    return () => {
      previewProfile(persistedPromptProfileRef.current);
    };
  }, [previewProfile]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await notificationsApi.getSettings();
        const data = response?.data || DEFAULT_SETTINGS;
        setSettings({
          enabled: data.enabled ?? true,
          sound_enabled: data.sound_enabled ?? true,
          priority_preferences: {
            ...DEFAULT_SETTINGS.priority_preferences,
            ...(data.priority_preferences || {}),
          },
          do_not_disturb: {
            ...DEFAULT_SETTINGS.do_not_disturb,
            ...(data.do_not_disturb || {}),
          },
        });
      } catch (error) {
        toast.error('Error al cargar configuración de notificaciones');
      } finally {
        setLoading(false);
      }
    };

    const loadPromptProfile = async () => {
      try {
        const response = await userSettingsApi.getSettings();
        const resolved = response?.data?.resolved_prompt_profile || response?.data?.prompt_profile || 'stoic';
        const autoApply = Boolean(response?.data?.auto_apply_proactive_changes);
        setPromptProfile(resolved);
        setPersistedPromptProfile(resolved);
        syncPersistedProfile(resolved);
        setAutoApplyProactiveChanges(autoApply);
      } catch (error) {
        const fallbackProfile = persistedPromptProfileRef.current;
        setPromptProfile(fallbackProfile);
        setPersistedPromptProfile(fallbackProfile);
      } finally {
        setProfileLoading(false);
      }
    };

    loadSettings();
    loadPromptProfile();
  }, [syncPersistedProfile]);

  const updateNested = (path, value) => {
    setSettings((prev) => {
      if (path === 'enabled' || path === 'sound_enabled') {
        return { ...prev, [path]: value };
      }

      if (path === 'do_not_disturb.enabled') {
        return {
          ...prev,
          do_not_disturb: {
            ...prev.do_not_disturb,
            enabled: value,
          },
        };
      }

      return prev;
    });
  };

  const onPriorityToggle = (priority, checked) => {
    setSettings((prev) => ({
      ...prev,
      priority_preferences: {
        ...prev.priority_preferences,
        [priority]: checked,
      },
    }));
  };

  const onDndHourChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      do_not_disturb: {
        ...prev.do_not_disturb,
        [field]: value,
      },
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        enabled: settings.enabled,
        sound_enabled: settings.sound_enabled,
        priority_preferences: settings.priority_preferences,
        do_not_disturb: settings.do_not_disturb,
      };
      const response = await notificationsApi.saveSettings(payload);
      const saved = response?.data;

      if (saved) {
        setSettings({
          enabled: saved.enabled,
          sound_enabled: saved.sound_enabled,
          priority_preferences: {
            ...DEFAULT_SETTINGS.priority_preferences,
            ...(saved.priority_preferences || {}),
          },
          do_not_disturb: {
            ...DEFAULT_SETTINGS.do_not_disturb,
            ...(saved.do_not_disturb || {}),
          },
        });
      }

      localStorage.setItem(
        'notification_settings',
        JSON.stringify({
          enabled: payload.enabled,
          sound_enabled: payload.sound_enabled,
          priority_preferences: payload.priority_preferences,
          do_not_disturb: payload.do_not_disturb,
        })
      );

      toast.success('Configuración guardada');
    } catch (error) {
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handlePromptProfileSelect = (nextProfile) => {
    setPromptProfile(nextProfile);
    previewProfile(nextProfile);
  };

  const savePromptProfile = async () => {
    setProfileSaving(true);
    try {
      const response = await userSettingsApi.saveSettings({ prompt_profile: promptProfile });
      const resolved = response?.data?.resolved_prompt_profile || response?.data?.prompt_profile || promptProfile;
      setPromptProfile(resolved);
      setPersistedPromptProfile(resolved);
      persistProfile(resolved);
      toast.success('Perfil del mentor guardado');
    } catch (error) {
      setPromptProfile(persistedPromptProfile);
      previewProfile(persistedPromptProfile);
      toast.error('Error al guardar el perfil del mentor');
    } finally {
      setProfileSaving(false);
    }
  };

  const saveProactiveSettings = async () => {
    setProactiveSaving(true);
    try {
      await userSettingsApi.saveSettings({
        auto_apply_proactive_changes: autoApplyProactiveChanges,
      });
      toast.success('Ajuste proactivo guardado');
    } catch (error) {
      toast.error('Error al guardar el ajuste proactivo');
    } finally {
      setProactiveSaving(false);
    }
  };

  return (
    <Layout ambient>
      <div className="space-y-6" data-testid="settings-page">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            Ajustes
          </h1>
          <p className="text-muted-foreground mt-1">Personaliza tu experiencia con el agente y las notificaciones.</p>
        </div>

        <ProfileHeroCard
          title={`Perfil activo: ${selectedProfileTheme.name}`}
          description={selectedProfileTheme.tagline}
        />

        <PromptProfileSettings
          currentProfile={promptProfile}
          loading={profileLoading}
          saving={profileSaving}
          onSelect={handlePromptProfileSelect}
          onSave={savePromptProfile}
        />

        <ProactiveSettings
          enabled={autoApplyProactiveChanges}
          loading={profileLoading}
          saving={proactiveSaving}
          onToggle={setAutoApplyProactiveChanges}
          onSave={saveProactiveSettings}
        />

        <NotificationSettings
          settings={settings}
          loading={loading}
          saving={saving}
          onToggle={updateNested}
          onPriorityToggle={onPriorityToggle}
          onDndHourChange={onDndHourChange}
          onSave={saveSettings}
        />
      </div>
    </Layout>
  );
}
