import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useMutation } from '@tanstack/react-query';

import { useLang } from '@/hooks/useLang';

interface FormData {
  channelName: string;
  channelLink: string;
  followerCount: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  ownerTelegram: string;
}

const initialFormData: FormData = {
  channelName: '',
  channelLink: '',
  followerCount: '',
  fullName: '',
  email: '',
  phoneNumber: '',
  ownerTelegram: '',
};

const ChannelOwner = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isAgreementAccepted, setIsAgreementAccepted] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [agreementText, setAgreementText] = useState('');
  const { lang } = useLang();
  const { t } = useLang();

  useEffect(() => {
    if (showAgreement && !agreementText) {
      fetch('/ortaklik_sozlesmesi.txt')
        .then(res => res.text())
        .then(setAgreementText)
        .catch(() => setAgreementText('Sözleşme yüklenemedi.'));
    }
  }, [showAgreement, agreementText]);

  // Form verilerinin geçerliliğini kontrol et
  const isFormValid = useMemo(() => {
    return Object.values(formData).every(value => value.trim() !== '') && isAgreementAccepted;
  }, [formData, isAgreementAccepted]);

  // Form gönderme mutasyonu
  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/channel-owner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Başvuru gönderilemedi');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Başvurunuz başarıyla gönderildi.",
      });
      navigate('/partnership');
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      toast({
        title: "Hata",
        description: !isAgreementAccepted 
          ? "Lütfen Ortaklık Sözleşmesini kabul edin."
          : "Lütfen tüm alanları doldurun.",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate(formData);
  };

  return (
    <div className="container max-w-2xl mx-auto py-6 space-y-6">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('goBack')}
      </Button>

      {/* Sözleşme Modalı */}
      <Dialog open={showAgreement} onOpenChange={setShowAgreement}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ortaklık Sözleşmesi</DialogTitle>
          </DialogHeader>
          <div className="w-full h-96 overflow-hidden rounded border">
            <iframe
              src="/ortaklik_sozlesmesi.txt"
              title="Ortaklık Sözleşmesi"
              className="w-full h-full border-0"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAgreement(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>{t('channelOwnerApply')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channelName">{t('channelNameLabel')}</Label>
              <Input
                id="channelName"
                name="channelName"
                value={formData.channelName}
                onChange={handleChange}
                placeholder={t('channelNamePlaceholder')}
              />
            </div>
            <div>
              <Label htmlFor="channelLink">{t('channelLink')}:</Label>
              <Input
                id="channelLink"
                name="channelLink"
                type="text"
                value={formData.channelLink}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="followerCount">{t('followerCount')}:</Label>
              <Input
                id="followerCount"
                name="followerCount"
                type="number"
                value={formData.followerCount}
                onChange={handleChange}
                required
                className="mt-1"
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="fullName">{t('fullName')}:</Label>
              <Input
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">{t('email')}:</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber">{t('phoneNumber')}:</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="ownerTelegram">{t('ownerTelegram')}:</Label>
              <Input
                id="ownerTelegram"
                name="ownerTelegram"
                value={formData.ownerTelegram}
                onChange={handleChange}
                required
                className="mt-1"
                placeholder="@username"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="agreement"
                checked={isAgreementAccepted}
                onCheckedChange={(checked) => setIsAgreementAccepted(checked as boolean)}
              />
              <label
                htmlFor="agreement"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t('agreementAccept')}
                <button
                  type="button"
                  onClick={() => setShowAgreement(true)}
                  className="ml-2 text-primary underline hover:text-primary/80 bg-transparent border-none p-0 cursor-pointer"
                  style={{ marginLeft: 8 }}
                >
                  (Sözleşmeyi oku)
                </button>
              </label>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={submitMutation.isPending || !isFormValid}
            >
              {submitMutation.isPending ? t('submitting') : t('submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChannelOwner; 