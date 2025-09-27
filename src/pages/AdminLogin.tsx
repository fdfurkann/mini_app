import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface LoginResponse {
  success: boolean;
  message?: string;
}

export default function AdminLogin() {
  const [adminPassword, setAdminPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const session = sessionStorage.getItem("isAdmin");
    if (session === "true") {
      setIsLoggedIn(true);
      navigate("/");
    }
  }, [navigate]);

  const loginMutation = useMutation<LoginResponse, Error, string>({
    mutationFn: async (password: string) => {
      const response = await fetch(`${API_BASE_URL}/admin-login-simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });
      
      if (!response.ok) {
        throw new Error('Sunucu hatası');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        sessionStorage.setItem("isAdmin", "true");
        toast({
          title: "Başarılı",
          description: "Admin girişi başarılı",
        });
        setIsLoggedIn(true);
        navigate("/");
      } else {
        toast({
          title: "Hata",
          description: data.message || "Şifre yanlış",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Giriş yapılamadı",
        variant: "destructive"
      });
    },
  });

  const handleAdminLogin = () => {
    if (!adminPassword.trim()) return;
    loginMutation.mutate(adminPassword);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdminLogin();
    }
  };

  if (isLoggedIn) {
    return null; // Zaten giriş yapılmışsa login sayfasını gösterme
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Admin Girişi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loginMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{loginMutation.error.message}</AlertDescription>
              </Alert>
            )}
            
            <div>
              <label htmlFor="adminPassword" className="text-sm font-medium">
                Admin Şifresi
              </label>
              <Input
                id="adminPassword"
                type="password"
                placeholder="Admin şifresini girin"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="mt-1"
                autoFocus
                disabled={loginMutation.isPending}
              />
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleAdminLogin}
              disabled={loginMutation.isPending || !adminPassword.trim()}
            >
              {loginMutation.isPending ? "Giriş Yapılıyor..." : "Giriş Yap"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 