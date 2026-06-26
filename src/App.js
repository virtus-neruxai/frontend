import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import LoginPage from "./pages/LoginPage";
import CalendarPage from "./pages/CalendarPage";
import DashboardPage from "./pages/DashboardPage";
import CharacterPage from "./pages/CharacterPage";
import MentorPage from "./pages/MentorPage";
import QuestionnairePage from "./pages/QuestionnairePage";
import SettingsPage from "./pages/SettingsPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationSystem } from "./components/NotificationSystem";
import { ThemeProvider } from "./components/theme-provider";
import { ProfileThemeProvider } from "./presentation/components/profile-theme/ProfileThemeProvider";
import { useProfileTheme } from "./theme/useProfileTheme";
import { userSettingsApi } from "./lib/api";
import { useEffect } from "react";
import "./App.css";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  
  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/calendar/day" replace /> : <LoginPage />} 
      />
      <Route 
        path="/calendar" 
        element={
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/calendar/:view" 
        element={
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/character" 
        element={
          <ProtectedRoute>
            <CharacterPage />
          </ProtectedRoute>
        } 
      />
      <Route
        path="/mentor"
        element={
          <ProtectedRoute>
            <MentorPage />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <QuestionnairePage />
          </ProtectedRoute>
        } 
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/mission-statement" element={<Navigate to="/profile" replace />} />
      <Route path="/" element={<Navigate to="/calendar/day" replace />} />
      <Route path="*" element={<Navigate to="/calendar/day" replace />} />
    </Routes>
  );
}

function ProfileSettingsSync() {
  const { isAuthenticated, loading } = useAuth();
  const { syncPersistedProfile } = useProfileTheme();

  useEffect(() => {
    if (loading || !isAuthenticated) return undefined;

    let cancelled = false;

    userSettingsApi.getSettings()
      .then((response) => {
        if (cancelled) return;
        const resolved = response?.data?.resolved_prompt_profile || response?.data?.prompt_profile;
        if (resolved) {
          syncPersistedProfile(resolved);
        }
      })
      .catch(() => {
        // Settings sync should never block the authenticated app shell.
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loading, syncPersistedProfile]);

  return null;
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="virtus-theme">
      <ProfileThemeProvider>
        <AuthProvider>
          <NotificationSystem>
            <BrowserRouter>
              <ProfileSettingsSync />
              <AppRoutes />
              <Toaster position="top-right" richColors />
            </BrowserRouter>
          </NotificationSystem>
        </AuthProvider>
      </ProfileThemeProvider>
    </ThemeProvider>
  );
}

export default App;
