import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLang } from '@/hooks/useLang';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useLang();

  useEffect(() => {
    const error = location.state?.error;
    if (error) {
        toast({
        title: t('loginError'),
        description: error,
          variant: "destructive",
        });
      }
  }, [location.state, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            {t('loginWithTelegram')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            {t('pleaseLoginWithTelegram')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 