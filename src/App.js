import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import LoginPage from "./pages/LoginPage";
import CalendarPage from "./pages/CalendarPage";
import DashboardPage from "./pages/DashboardPage";
import CharacterPage from "./pages/CharacterPage";
import QuestionnairePage from "./pages/QuestionnairePage";
import SettingsPage from "./pages/SettingsPage";
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
