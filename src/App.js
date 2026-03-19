import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import LoginPage from "./pages/LoginPage";
import CalendarPage from "./pages/CalendarPage";
import EmotionsPage from "./pages/EmotionsPage";
import DashboardPage from "./pages/DashboardPage";
import CharacterPage from "./pages/CharacterPage";
import ArenaPage from "./pages/ArenaPage";
import QuestionnairePage from "./pages/QuestionnairePage";
import SettingsPage from "./pages/SettingsPage";
import ProactiveSuggestionsPage from "./pages/ProactiveSuggestionsPage";
import ProjectChatPage from "./pages/ProjectChatPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationSystem } from "./components/NotificationSystem";
import { ThemeProvider } from "./components/theme-provider";
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
        path="/emotions" 
        element={
          <ProtectedRoute>
            <EmotionsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/emotions/:view" 
        element={
          <ProtectedRoute>
            <EmotionsPage />
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
        path="/mission-statement" 
        element={
          <ProtectedRoute>
            <QuestionnairePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/arena" 
        element={
          <ProtectedRoute>
            <ArenaPage />
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
      <Route
        path="/suggestions"
        element={
          <ProtectedRoute>
            <ProactiveSuggestionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/project-chat"
        element={
          <ProtectedRoute>
            <ProjectChatPage />
          </ProtectedRoute>
        }
      />
      <Route path="/profile" element={<Navigate to="/mission-statement" replace />} />
      <Route path="/" element={<Navigate to="/calendar/day" replace />} />
      <Route path="*" element={<Navigate to="/calendar/day" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="virtus-theme">
      <AuthProvider>
        <NotificationSystem>
          <BrowserRouter>
            <AppRoutes />
            <Toaster position="top-right" richColors />
          </BrowserRouter>
        </NotificationSystem>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
