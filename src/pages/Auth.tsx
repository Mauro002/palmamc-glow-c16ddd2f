import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Email non valida");
const passwordSchema = z.string().min(6, "La password deve avere almeno 6 caratteri");
const usernameSchema = z.string().min(3, "Username deve avere almeno 3 caratteri").max(16, "Username deve avere massimo 16 caratteri").regex(/^[a-zA-Z0-9_]+$/, "Username può contenere solo lettere, numeri e underscore");

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [minecraftUsername, setMinecraftUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate("/");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate inputs
      const emailResult = emailSchema.safeParse(email);
      if (!emailResult.success) {
        toast.error(emailResult.error.errors[0].message);
        setIsLoading(false);
        return;
      }

      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        toast.error(passwordResult.error.errors[0].message);
        setIsLoading(false);
        return;
      }

      if (!isLogin) {
        const usernameResult = usernameSchema.safeParse(minecraftUsername);
        if (!usernameResult.success) {
          toast.error(usernameResult.error.errors[0].message);
          setIsLoading(false);
          return;
        }
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Email o password non corretti");
          } else if (error.message.includes("Email not confirmed")) {
            toast.error("Conferma la tua email prima di accedere");
          } else {
            toast.error(error.message);
          }
          return;
        }

        toast.success("Accesso effettuato!");
      } else {
        const { error: registerError } = await supabase.functions.invoke("register-user", {
          body: {
            email,
            password,
            minecraftUsername,
          },
        });

        if (registerError) {
          if (registerError.message.includes("already") || registerError.message.includes("registered")) {
            toast.error("Questa email è già registrata");
          } else if (registerError.message.includes("Minecraft username")) {
            toast.error("Username Minecraft già in uso");
          } else {
            toast.error(registerError.message);
          }
          return;
        }

        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) {
          toast.success("Account creato senza verifica email. Effettua il login.");
          return;
        }

        toast.success("Registrazione completata! Accesso effettuato.");
      }
    } catch (error: any) {
      toast.error("Si è verificato un errore. Riprova.");
      console.error("Auth error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <Card className="w-full max-w-md relative z-10 bg-card/80 backdrop-blur-sm border-border">
        <CardHeader className="text-center">
          <a href="/" className="inline-block mb-4">
            <span className="text-3xl font-heading font-bold">
              Elden<span className="text-primary">MC</span>
            </span>
          </a>
          <CardTitle className="text-2xl font-heading">
            {isLogin ? "Accedi" : "Registrati"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Accedi al tuo account per acquistare rank"
              : "Crea un account per acquistare rank su EldenMC"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="minecraft-username">Username Minecraft</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="minecraft-username"
                    type="text"
                    placeholder="Il tuo username Minecraft"
                    value={minecraftUsername}
                    onChange={(e) => setMinecraftUsername(e.target.value)}
                    className="pl-10"
                    required={!isLogin}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Deve corrispondere al tuo username sul server EldenMC
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="email@esempio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
              {isLoading ? "Caricamento..." : isLogin ? "Accedi" : "Registrati"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
