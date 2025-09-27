import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const SubscriptionEdit: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pkg, setPkg] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/subscription-packages/${id}`);
        if (!res.ok) throw new Error("Paket verisi alınamadı");
        const data = await res.json();
        setPkg(data);
      } catch (e) {
        toast.error("Veriler yüklenemedi");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleChange = (field: string, value: any) => {
    setPkg((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        package_name: pkg.package_name,
        package_description: pkg.package_description,
        package_price: parseFloat(pkg.package_price),
        premium_price: pkg.premium_price ? parseFloat(pkg.premium_price) : 0,
        package_date: parseInt(pkg.package_date),
        package_api_rights: parseInt(pkg.package_api_rights),
        status: parseInt(pkg.status)
      };
      const res = await fetch(`/api/subscription-packages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Güncelleme başarısız");
      toast.success("Paket güncellendi", { position: 'top-center' });
      navigate("/admin/subscription-packages");
    } catch (e) {
      toast.error("Paket güncellenemedi", { position: 'top-center' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !pkg) return <div>Yükleniyor...</div>;

  return (
    <div className="flex justify-center items-center min-h-screen bg-white px-2 md:px-0">
      <Card className="w-full max-w-md mx-auto p-2 md:p-6">
        <CardHeader>
          <CardTitle>Paket Düzenle</CardTitle>
          <CardDescription>Abonelik paketinin tüm alanlarını düzenleyebilirsiniz.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm mb-1">Paket Adı</label>
              <Input value={pkg.package_name || ''} onChange={e => handleChange('package_name', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Açıklama</label>
              <Input value={pkg.package_description || ''} onChange={e => handleChange('package_description', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Fiyat</label>
              <Input type="number" value={pkg.package_price || ''} onChange={e => handleChange('package_price', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Premium Fiyatı</label>
              <Input type="number" value={pkg.premium_price || ''} onChange={e => handleChange('premium_price', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Süre (Gün)</label>
              <Input type="number" value={pkg.package_date || ''} onChange={e => handleChange('package_date', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">API Hakları</label>
              <Input type="number" value={pkg.package_api_rights || ''} onChange={e => handleChange('package_api_rights', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Durum</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={pkg.status} onChange={e => handleChange('status', e.target.value)}>
                <option value="1">Aktif</option>
                <option value="0">Pasif</option>
              </select>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" type="button" onClick={() => navigate("/admin/subscription-packages")}>İptal</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Kaydediliyor..." : "Kaydet"}</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionEdit; 