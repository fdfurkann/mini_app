import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLang } from "@/hooks/useLang";
import { useToast } from "@/components/ui/use-toast";

export default function FaqNew() {
  const { t } = useLang();
  const { toast } = useToast();
  const [form, setForm] = useState({ question: '', answer: '' });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.question.trim() || !form.answer.trim()) {
      toast({ title: t('error'), description: t('fillAllFields'), variant: 'destructive' });
      return;
    }

    // Kimlik kontrolü
    const telegramId = localStorage.getItem('id');
    const loginHash = localStorage.getItem('login_hash');
    if (!telegramId || !loginHash) {
      toast({ title: t('error'), description: t('admin.notLoggedIn'), variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/faq', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Telegram-ID': telegramId,
          'X-Login-Hash': loginHash
        },
        body: JSON.stringify(form)
      });

      if (response.ok) {
        toast({ title: t('success'), description: t('admin.faq.addSuccess') });
        navigate('/admin/faq');
      } else {
        const data = await response.json();
        throw new Error(data.error || t('admin.faq.addError'));
      }
    } catch (error: any) {
      toast({ title: t('error'), description: error.message || t('error'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold">{t('admin.faq.addNewTitle')}</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            {t('admin.faq.addNewDesc')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/admin/faq')}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <CardTitle>{t('admin.faq.questionInfo')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('admin.faq.question')}</label>
              <Input
                name="question"
                placeholder={t('admin.faq.questionPlaceholder')}
                value={form.question}
                onChange={handleChange}
                required
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">{t('admin.faq.answer')}</label>
              <textarea
                name="answer"
                placeholder={t('admin.faq.answerPlaceholder')}
                value={form.answer}
                onChange={handleChange}
                className="w-full border rounded p-3 min-h-[120px] resize-none"
                required
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button 
                type="submit" 
                disabled={saving}
                className="bg-blue-500 hover:bg-blue-600 w-full sm:w-auto"
              >
                {saving ? t('saving') : t('save')}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/admin/faq')}
                className="w-full sm:w-auto"
              >
                {t('cancel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 