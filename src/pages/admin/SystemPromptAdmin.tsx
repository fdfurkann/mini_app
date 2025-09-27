import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ChevronDown, HelpCircle, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLang } from '@/hooks/useLang';

interface SystemPrompt {
  id: number;
  question: string;
  answer: string;
}

export default function SystemPromptAdmin() {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editAnswer, setEditAnswer] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const navigate = useNavigate();
  const { t } = useLang();

  const fetchPrompts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/system_prompt', {
        headers: {
          'X-Telegram-ID': localStorage.getItem('telegramId') || '',
          'X-Login-Hash': localStorage.getItem('loginHash') || ''
        }
      });
      const data = await res.json();
      setPrompts(data);
    } catch {
      setError('System Prompt verileri alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrompts(); }, []);

  const handleEdit = (prompt: SystemPrompt) => {
    setEditId(prompt.id);
    setEditAnswer(prompt.answer);
  };

  const handleSave = async (id: number) => {
    setSaving(true);
    try {
      await fetch(`/api/system_prompt/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Telegram-ID': localStorage.getItem('telegramId') || '',
          'X-Login-Hash': localStorage.getItem('loginHash') || ''
        },
        body: JSON.stringify({ answer: editAnswer })
      });
      setEditId(null);
      setEditAnswer('');
      fetchPrompts();
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditId(null);
    setEditAnswer('');
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Silmek istediğinize emin misiniz?')) return;
    await fetch(`/api/system_prompt/${id}`, { 
      method: 'DELETE',
      headers: {
        'X-Telegram-ID': localStorage.getItem('telegramId') || '',
        'X-Login-Hash': localStorage.getItem('loginHash') || ''
      }
    });
    fetchPrompts();
  };

  const toggleRow = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
    if (editId) {
      setEditId(null);
      setEditAnswer('');
    }
  };

  return (
    <div className="w-full">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold">System Prompt Yönetimi</h3>
              </div>
              <p className="text-muted-foreground text-sm">
                Bu sayfada system prompt kayıtlarını görüntüleyebilir, düzenleyebilir ve silebilirsiniz.
              </p>
            </div>
            <Button 
              className="bg-blue-500 hover:bg-blue-600 w-full sm:w-auto"
              onClick={() => navigate('/admin/system-prompt/new')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Yeni Prompt
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">{t('loading')}</div>
          ) : error ? (
            <div className="p-6 text-red-500">{error}</div>
          ) : prompts.length === 0 ? (
            <div className="p-6">Hiç prompt yok.</div>
          ) : (
            <div className="divide-y">
              {prompts.map((prompt, idx) => (
                <div key={prompt.id}>
                  <div
                    className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleRow(idx)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <ChevronDown className={`w-5 h-5 transition-transform ${openIndex === idx ? 'rotate-180' : ''}`} />
                      <span className="font-medium">{prompt.question}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(prompt);
                          setOpenIndex(idx);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(prompt.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  {openIndex === idx && (
                    <div className="px-6 pb-4 border-t bg-gray-50">
                      {editId === prompt.id ? (
                        <div className="space-y-3 pt-4">
                          <textarea
                            value={editAnswer}
                            onChange={(e) => setEditAnswer(e.target.value)}
                            className="w-full border rounded p-3 min-h-[100px] resize-none"
                            placeholder="Cevap yazın..."
                          />
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button 
                              onClick={() => handleSave(prompt.id)}
                              disabled={saving}
                              className="bg-blue-500 hover:bg-blue-600 w-full sm:w-auto"
                            >
                              {saving ? 'Kaydediliyor...' : 'Kaydet'}
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={handleCancel}
                              className="w-full sm:w-auto"
                            >
                              Vazgeç
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-4 text-gray-600">
                          {prompt.answer}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 