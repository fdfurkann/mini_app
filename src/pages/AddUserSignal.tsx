import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { getApiKeys, createSignal, getUserByTelegramId } from '@/services/api';

const AddUserSignal: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [selectedApiKey, setSelectedApiKey] = useState<string>('');
  const [form, setForm] = useState({ symbol: '', trend: 'LONG', slPercentage: '', entryRangePercentage: '', tpCount: '3', tpRangePercentage: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const telegramId = sessionStorage.getItem('telegramId');
        if (!telegramId) return setApiKeys([]);
        const user = await getUserByTelegramId(telegramId);
        if (!user || !user.id) return setApiKeys([]);
        setUserId(user.id);
        const res = await getApiKeys(user.id);
        setApiKeys(res || []);
      } catch {
        setApiKeys([]);
      }
    };
    fetchApiKeys();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!selectedApiKey) throw new Error('API anahtarı seçmelisiniz');
      if (!userId) throw new Error('Kullanıcı bulunamadı');
      await createSignal({
        user_id: userId,
        symbol: form.symbol,
        trend: form.trend,
        slPercentage: form.slPercentage,
        entryRangePercentage: form.entryRangePercentage,
        tpCount: Number(form.tpCount),
        tpRangePercentage: form.tpRangePercentage,
        message_id: selectedApiKey
      });
      navigate('/trades');
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-8">
      <Card>
        <CardHeader>
          <CardTitle>Yeni Üye Sinyali Ekle</CardTitle>
          <CardDescription>API anahtarınızı seçin ve sinyal bilgilerini doldurun.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 font-medium">API Anahtarı</label>
              <Select value={selectedApiKey} onValueChange={setSelectedApiKey} disabled={apiKeys.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={apiKeys.length === 0 ? 'API anahtarınız yok' : 'API anahtarı seçin'} />
                </SelectTrigger>
                <SelectContent>
                  {apiKeys.map(api => (
                    <SelectItem key={api.id} value={String(api.id)}>{api.api_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Parite İsmi</label>
              <Input name="symbol" value={form.symbol} onChange={handleChange} required disabled={apiKeys.length === 0} />
            </div>
            <div>
              <label className="block mb-1 font-medium">Yön</label>
              <select name="trend" value={form.trend} onChange={handleChange} className="w-full border rounded px-2 py-1" disabled={apiKeys.length === 0}>
                <option value="LONG">LONG</option>
                <option value="SHORT">SHORT</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Stop Loss (%)</label>
              <Input name="slPercentage" value={form.slPercentage} onChange={handleChange} placeholder="Örn: 2" required disabled={apiKeys.length === 0} />
            </div>
            <div>
              <label className="block mb-1 font-medium">Entry Aralık (%)</label>
              <Input name="entryRangePercentage" value={form.entryRangePercentage} onChange={handleChange} placeholder="Örn: 1" required disabled={apiKeys.length === 0} />
            </div>
            <div>
              <label className="block mb-1 font-medium">TP Adedi</label>
              <Input name="tpCount" value={form.tpCount} onChange={handleChange} placeholder="Örn: 3" required disabled={apiKeys.length === 0} />
            </div>
            <div>
              <label className="block mb-1 font-medium">TP'ler Arası (%)</label>
              <Input name="tpRangePercentage" value={form.tpRangePercentage} onChange={handleChange} placeholder="Örn: 1" required disabled={apiKeys.length === 0} />
            </div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <Button type="submit" className="w-full" disabled={apiKeys.length === 0 || loading}>
              {apiKeys.length === 0 ? 'API anahtarınız yok' : loading ? 'Ekleniyor...' : 'Sinyali Ekle'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddUserSignal; 