import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useLang } from '@/hooks/useLang';

export default function Faq() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { t } = useLang();

  useEffect(() => {
    fetch('/api/faq')
      .then(res => res.json())
      .then(data => {
        setFaqs(data.sort((a, b) => a.id - b.id));
        setLoading(false);
      })
      .catch(() => {
        setError('S.S.S verileri alınamadı.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <p className="text-gray-500">{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{t('error')}</p>
        <Button onClick={() => window.location.reload()} size="sm">{t('retry')}</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">{t('faq.title')}</h1>
      </div>
      {faqs.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">{t('faqNotFound') !== 'faqNotFound' ? t('faqNotFound') : t('tradeRecordNotFound')}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {faqs.map((faq, idx) => (
            <Card key={faq.id} className="border hover:border-primary transition-colors">
              <CardHeader
                className="py-2 px-3 cursor-pointer flex flex-row items-center justify-between"
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              >
                <CardTitle className="text-base flex items-center gap-2">
                  {faq.question}
                </CardTitle>
                <ChevronDown className={`w-5 h-5 transition-transform ${openIndex === idx ? 'rotate-180' : ''}`} />
              </CardHeader>
              {openIndex === idx && (
                <CardContent className="py-2 px-3 border-t bg-muted/50 animate-fade-in">
                  <div className="text-sm text-muted-foreground">{faq.answer}</div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 