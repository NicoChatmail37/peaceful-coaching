import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, UserPlus, Shield, AlertTriangle } from 'lucide-react';
import { validatePassword, validateEmail, validateTextInput } from '@/lib/validation';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordValidation, setPasswordValidation] = useState<{isValid: boolean; message?: string}>({ isValid: true });
  const [emailValidation, setEmailValidation] = useState<{isValid: boolean; message?: string}>({ isValid: true });
  const [nameValidation, setNameValidation] = useState<{isValid: boolean; message?: string}>({ isValid: true });

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validateForm = (): boolean => {
    let isValid = true;

    // Email validation
    const emailValidation = validateEmail(email);
    setEmailValidation(emailValidation);
    if (!emailValidation.isValid) isValid = false;

    // Password validation (only for signup or if password is entered for login)
    if (!isLogin || password) {
      const passwordValidation = validatePassword(password);
      setPasswordValidation(passwordValidation);
      if (!passwordValidation.isValid) isValid = false;
    }

    // Full name validation for signup
    if (!isLogin) {
      const nameValidation = validateTextInput(fullName, 100, "Le nom complet");
      setNameValidation(nameValidation);
      if (!nameValidation.isValid) isValid = false;
      
      if (fullName.trim().length < 2) {
        setNameValidation({ isValid: false, message: "Le nom complet doit contenir au moins 2 caractères" });
        isValid = false;
      }
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('Email ou mot de passe incorrect');
          } else if (error.message.includes('too many requests')) {
            setError('Trop de tentatives. Veuillez réessayer dans quelques minutes.');
          } else {
            setError(error.message);
          }
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('User already registered')) {
            setError('Un compte existe déjà avec cet email');
          } else if (error.message.includes('Password should be')) {
            setError('Le mot de passe ne respecte pas les exigences de sécurité');
          } else {
            setError(error.message);
          }
        } else {
          setSuccess('Compte créé avec succès ! Vérifiez votre email pour confirmer votre compte.');
        }
      }
    } catch (err) {
      setError('Une erreur inattendue s\'est produite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Facturation Suisse
          </h1>
          <p className="text-muted-foreground">
            {isLogin ? 'Connectez-vous à votre compte' : 'Créez votre compte'}
          </p>
        </div>

        <Card className="shadow-large">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {isLogin ? 'Connexion' : 'Créer un compte'}
            </CardTitle>
            <CardDescription className="text-center">
              {isLogin 
                ? 'Entrez vos identifiants pour vous connecter' 
                : 'Remplissez les informations pour créer votre compte'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nom complet</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Jean Dupont"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (nameValidation.message) {
                        setNameValidation({ isValid: true });
                      }
                    }}
                    required={!isLogin}
                    maxLength={100}
                    className={`transition-all duration-200 focus:ring-primary ${!nameValidation.isValid ? 'border-destructive' : ''}`}
                  />
                  {!nameValidation.isValid && nameValidation.message && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {nameValidation.message}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jean@exemple.ch"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailValidation.message) {
                      setEmailValidation({ isValid: true });
                    }
                  }}
                  required
                  maxLength={254}
                  className={`transition-all duration-200 focus:ring-primary ${!emailValidation.isValid ? 'border-destructive' : ''}`}
                />
                {!emailValidation.isValid && emailValidation.message && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {emailValidation.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordValidation.message) {
                        setPasswordValidation({ isValid: true });
                      }
                    }}
                    required
                    minLength={8}
                    maxLength={128}
                    className={`pr-10 transition-all duration-200 focus:ring-primary ${!passwordValidation.isValid ? 'border-destructive' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {!passwordValidation.isValid && passwordValidation.message && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {passwordValidation.message}
                  </p>
                )}
                {!isLogin && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3" />
                      <span>Exigences de sécurité:</span>
                    </div>
                    <ul className="text-xs space-y-1 ml-5 list-disc">
                      <li>Au moins 8 caractères</li>
                      <li>Une majuscule et une minuscule</li>
                      <li>Un chiffre et un caractère spécial</li>
                    </ul>
                  </div>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-success bg-success/10 text-success-foreground">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-200"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {isLogin ? 'Connexion...' : 'Création...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {isLogin ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                    {isLogin ? 'Se connecter' : 'Créer le compte'}
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                {isLogin ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?"}
              </p>
              <Button
                variant="link"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setSuccess(null);
                }}
                className="p-0 h-auto font-medium text-primary hover:text-primary-glow"
              >
                {isLogin ? 'Créer un compte' : 'Se connecter'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;