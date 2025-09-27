import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { useLang } from '@/hooks/useLang';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function BotChannelForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    room_id: '',
    room_name: '',
    admin_id: '',
    channel_desc: '',
    telegram_link: '',
    active: 0,
    channel_img: '',
    register: '',
    pnl_msg: '',
  });
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userOptions, setUserOptions] = useState<{ id: number, username: string }[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [deleteImg, setDeleteImg] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    if (userSearch.length > 0) {
      setUserLoading(true);
      fetch(`${API_URL}/search_users?search=${encodeURIComponent(userSearch)}`)
        .then(r => r.json())
        .then(setUserOptions)
        .finally(() => setUserLoading(false));
    } else {
      setUserOptions([]);
    }
  }, [userSearch]);

  useEffect(() => {
    if (id && id !== 'new') {
      setLoading(true);
      fetch(`${API_URL}/channels/${id}`)
        .then(r => r.json())
        .then(data => {
          setForm({
            room_id: data.room_id || '',
            room_name: data.room_name || '',
            admin_id: data.admin_id ? String(data.admin_id) : '',
            channel_desc: data.channel_desc || '',
            telegram_link: data.telegram_link || '',
            active: data.active ?? 0,
            channel_img: data.channel_img || '',
            register: data.register || '',
            pnl_msg: data.pnl_msg || '',
          });
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  useEffect(() => {
    if (form.admin_id && !userSearch) {
      fetch(`${API_URL}/admin/members/${form.admin_id}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.username) setUserSearch(data.username);
        });
    }
  }, [form.admin_id, userSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleImgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImgFile(e.target.files[0]);
      setForm(f => ({ ...f, channel_img: URL.createObjectURL(e.target.files[0]) }));
    }
  };

  const handleUserSelect = (user: { id: number, username: string }) => {
    setForm(f => ({ ...f, admin_id: String(user.id) }));
    setUserSearch(user.username);
    setUserOptions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let channel_img = form.channel_img;
      if (deleteImg && id && id !== 'new') {
        await fetch(`${API_URL}/channels/${id}/delete-img`, { method: 'POST' });
        channel_img = '';
      } else if (imgFile) {
        const fd = new FormData();
        fd.append('channel_img', imgFile);
        const res = await fetch(`${API_URL}/channels/${id && id !== 'new' ? id : 'temp'}/upload-img`, {
          method: 'POST',
          body: fd,
        });
        const imgData = await res.json();
        if (imgData.channel_img) channel_img = imgData.channel_img;
      }
      const payload = { ...form, admin_id: form.admin_id ? Number(form.admin_id) : null, channel_img };
      const method = id && id !== 'new' ? 'PUT' : 'POST';
      const url = id && id !== 'new' ? `${API_URL}/channels/${id}` : `${API_URL}/channels`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Kayıt başarısız');
      toast.success('Kanal başarıyla kaydedildi');
      navigate('/admin/bot-channels');
    } catch (err: any) {
      toast.error('Hata: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>{id && id !== 'new' ? 'Kanalı Düzenle' : 'Yeni Kanal Ekle'}</CardTitle>
          <CardDescription>Kanal bilgilerini doldurun.</CardDescription>
        </CardHeader>
        <form className="space-y-4 p-4" onSubmit={handleSubmit} autoComplete="off">
          <Input name="room_id" value={form.room_id} onChange={handleChange} placeholder="Kanal ID" />
          <Input name="room_name" value={form.room_name} onChange={handleChange} placeholder="Kanal Adı" />
          <Input name="telegram_link" value={form.telegram_link} onChange={handleChange} placeholder="Telegram Linki" />
          <Input name="pnl_msg" value={form.pnl_msg} onChange={handleChange} placeholder="PNL Mesajı (resimde gözükecek)" />
          <div className="relative">
            <Input
              name="admin_search"
              value={userSearch}
              onChange={e => { setUserSearch(e.target.value); setForm(f => ({ ...f, admin_id: '' })); }}
              placeholder="Admin Seçiniz (arama yapın)"
              autoComplete="off"
            />
            {userLoading && !form.admin_id && <div className="absolute left-0 top-full bg-white border w-full z-10 p-2 text-xs">{t('loading')}</div>}
            {userOptions.length > 0 && !form.admin_id && (
              <div className="absolute left-0 top-full bg-white border w-full z-10 max-h-40 overflow-auto">
                {userOptions.map(u => (
                  <div
                    key={u.id}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleUserSelect(u)}
                  >
                    {u.username}
                  </div>
                ))}
              </div>
            )}
            {form.admin_id && userSearch && (
              <div className="mt-1 text-xs text-green-700">Seçilen admin: {userSearch}</div>
            )}
          </div>
          <textarea
            name="channel_desc"
            value={form.channel_desc}
            onChange={e => setForm(f => ({ ...f, channel_desc: e.target.value }))}
            placeholder="Açıklama"
            className="w-full border rounded p-2 min-h-[80px] resize-y"
          />
          <select name="active" value={form.active} onChange={handleChange} className="w-full border rounded p-2">
            <option value={0}>Bekliyor</option>
            <option value={1}>Aktif</option>
            <option value={2}>Askıda</option>
          </select>
          <div>
            <label>Resim Yükle:</label>
            <Input type="file" accept="image/*" onChange={handleImgChange} />
            {form.channel_img && (
              <div className="flex items-center gap-2 mt-2">
                <img src={form.channel_img} alt="Kanal Resmi" className="max-h-24 rounded" />
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={deleteImg} onChange={e => setDeleteImg(e.target.checked)} />
                  Resmi sil
                </label>
              </div>
            )}
          </div>
          <Button type="submit" disabled={loading}>{loading ? 'Kaydediliyor...' : 'Kaydet'}</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/admin/bot-channels')}>İptal</Button>
        </form>
      </Card>
    </div>
  );
} 