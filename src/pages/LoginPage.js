import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Lock, User, Key } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { VirtusBrand } from '../components/VirtusBrand';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const { login, register, loginFromToken } = useAuth();

  useEffect(() => {
    const handleOIDCCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (token) {
        try {
          await loginFromToken(token);
          toast.success(urlParams.get('new_user') === 'true' ? 'Cuenta creada exitosamente.' : 'Autenticación OIDC exitosa.');
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error('Error al procesar token OIDC:', error);
          toast.error('Error en autenticación OIDC.');
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    handleOIDCCallback();
  }, [loginFromToken]);

  const handleOIDCLogin = () => {
    window.location.href = `${API_URL}/api/v1/auth/oidc/login`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegistering) {
        if (password !== confirmPassword) {
          toast.error('Las contraseñas no coinciden');
          return;
        }
        await register(username, password);
        toast.success('Usuario creado y sesión iniciada');
      } else {
        await login(username, password);
        toast.success('Bienvenido a Virtus');
      }
    } catch {
      toast.error(isRegistering ? 'No se pudo crear el usuario' : 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="mx-auto flex max-w-6xl justify-end">
        <ThemeToggle />
      </div>
      <div className="mx-auto mt-6 grid max-w-6xl gap-8 lg:grid-cols-2">
        <section className="rounded-[8px] border bg-card p-8">
          <div className="mb-10 flex justify-center">
            <div className="origin-center scale-[1.35] sm:scale-[1.45]">
              <VirtusBrand />
            </div>
          </div>

          <Card className="border shadow-none">
            <CardHeader>
              <CardTitle className="text-2xl">{isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}</CardTitle>
              <CardDescription>
                Accede con tus credenciales o con OIDC para mantener una práctica consistente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Usuario</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="username"
                      data-testid="login-username-input"
                      type="text"
                      placeholder="demo"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      data-testid="login-password-input"
                      type="password"
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {isRegistering && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        data-testid="register-confirm-password-input"
                        type="password"
                        placeholder="••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                )}

                <Button type="submit" data-testid="login-submit-btn" disabled={loading} className="w-full">
                  {loading ? 'Procesando...' : isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                <span>O CONTINÚA CON</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <Button type="button" onClick={handleOIDCLogin} variant="outline" className="w-full">
                <Key className="mr-2 h-4 w-4" />
                Autenticación OIDC (Keycloak)
              </Button>

              <p className="mt-5 text-center text-sm text-muted-foreground">
                Demo: <code>demo</code> / <code>demo123</code>
              </p>

              <button
                type="button"
                onClick={() => {
                  setIsRegistering((prev) => !prev);
                  setConfirmPassword('');
                }}
                className="mt-4 w-full text-center text-sm text-primary"
              >
                {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : 'Crear una cuenta nueva'}
              </button>
            </CardContent>
          </Card>
        </section>

        <section className="hidden rounded-[8px] border bg-card p-8 lg:flex lg:flex-col lg:justify-between">
          <div>
            <h2 className="text-3xl">Autoridad tranquila</h2>
            <p className="mt-3 text-muted-foreground">
              Virtus prioriza claridad sobre ruido. Decide con calma, ejecuta con constancia y revisa tu avance cada día.
            </p>
          </div>
          <div className="flex justify-center my-4">
            <img
              src={process.env.PUBLIC_URL + "/assets/login.png"}
              alt="Virtus login visual"
              className="w-full h-auto rounded shadow border"
              style={{ objectFit: 'contain', padding: '0', margin: 0, background: 'var(--background)' }}
            />
          </div>
          <div className="rounded-[8px] border bg-background p-6">
            <p className="text-sm text-muted-foreground">"No busques que los hechos ocurran como deseas, desea que ocurran como ocurren."</p>
            <p className="mt-3 text-sm font-medium">— Epicteto</p>
          </div>
        </section>
      </div>
    </div>
  );
}
