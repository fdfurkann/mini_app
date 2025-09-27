import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useLang } from '@/hooks/useLang';

const ChannelOwnerConfirmation = () => {
  const navigate = useNavigate();
  const { lang } = useLang();
  const { t } = useLang();

  return (
    <div className="w-full max-w-md mx-auto space-y-6 text-center">
      <Card>
        <CardContent className="pt-8 pb-8 flex flex-col items-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500" />
          <h1 className="text-2xl font-bold">{t('confirmation_title')}</h1>
          <p className="text-muted-foreground">
            {t('confirmation_message')}
          </p>
          <Button onClick={() => navigate('/')} className="mt-6 gap-2">
            <ArrowLeft className="h-4 w-4" /> {t('confirmation_return')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChannelOwnerConfirmation; 