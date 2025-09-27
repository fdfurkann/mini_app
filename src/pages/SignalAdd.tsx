import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SignalAdd = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    symbol: '',
    direction: '',
    open_price: '',
    stop_loss: '',
    tp1: '',
    tp2: '',
    tp3: '',
    channel_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Kayıt başarısız');
      navigate('/signals');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-lg p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Sinyal Ekle</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="block mb-1">Sembol</label>
          <input name="symbol" value={form.symbol} onChange={handleChange} className="input input-bordered w-full" required />
        </div>
        <div className="mb-3">
          <label className="block mb-1">Yön (LONG/SHORT)</label>
          <select name="direction" value={form.direction} onChange={handleChange} className="input input-bordered w-full" required>
            <option value="">Seçiniz</option>
            <option value="LONG">LONG</option>
            <option value="SHORT">SHORT</option>
          </select>
        </div>
        <div className="mb-3">
          <label className="block mb-1">Açılış Fiyatı</label>
          <input name="open_price" value={form.open_price} onChange={handleChange} className="input input-bordered w-full" required type="number" step="any" />
        </div>
        <div className="mb-3">
          <label className="block mb-1">Stop Loss</label>
          <input name="stop_loss" value={form.stop_loss} onChange={handleChange} className="input input-bordered w-full" required type="number" step="any" />
        </div>
        <div className="mb-3">
          <label className="block mb-1">TP1</label>
          <input name="tp1" value={form.tp1} onChange={handleChange} className="input input-bordered w-full" required type="number" step="any" />
        </div>
        <div className="mb-3">
          <label className="block mb-1">TP2</label>
          <input name="tp2" value={form.tp2} onChange={handleChange} className="input input-bordered w-full" type="number" step="any" />
        </div>
        <div className="mb-3">
          <label className="block mb-1">TP3</label>
          <input name="tp3" value={form.tp3} onChange={handleChange} className="input input-bordered w-full" type="number" step="any" />
        </div>
        <div className="mb-3">
          <label className="block mb-1">Kanal ID</label>
          <input name="channel_id" value={form.channel_id} onChange={handleChange} className="input input-bordered w-full" required />
        </div>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>{loading ? 'Kaydediliyor...' : 'Kaydet'}</button>
      </form>
    </div>
  );
};

export default SignalAdd; 