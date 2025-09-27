import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useDebounce } from '@/hooks/use-debounce';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const SubscriptionsNew: React.FC = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [userSearch, setUserSearch] = useState("");
  const debouncedUserSearch = useDebounce(userSearch, 400);
  const [userOptions, setUserOptions] = useState<any[]>([]);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [fields, setFields] = useState({
    package_time: "",
    package_api_rights: "0",
    start_date: "",
    end_date: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/packages-list")
      .then(r => r.json())
      .then(setPackages);
  }, []);

  useEffect(() => {
    if (debouncedUserSearch.length >= 2) {
      fetch(`/api/admin/users-list?search=${encodeURIComponent(debouncedUserSearch)}`)
        .then(r => r.json())
        .then(setUserOptions);
    } else {
      setUserOptions([]);
    }
  }, [debouncedUserSearch]);

  useEffect(() => {
    if (selectedPackage) {
      const pkg = packages.find((p) => String(p.id) === String(selectedPackage));
      if (pkg) {
        const today = new Date();
        const start_date = today.toISOString().slice(0, 10);
        const end = new Date(today);
        end.setDate(end.getDate() + (pkg.package_date || 1));
        const end_date = end.toISOString().slice(0, 10);
        setFields(f => ({
          ...f,
          package_time: pkg.package_date !== undefined ? String(pkg.package_date) : "",
          package_api_rights: pkg.package_api_rights !== undefined ? String(pkg.package_api_rights) : "0",
          start_date,
          end_date
        }));
      }
    } else {
      setFields(f => ({ ...f, package_api_rights: "0" }));
    }
  }, [selectedPackage, packages]);

  const handleChange = (field: string, value: any) => {
    setFields(f => ({ ...f, [field]: value }));
    // Başlangıç tarihi veya süre değişirse bitiş tarihini güncelle
    if ((field === "package_time" || field === "start_date") && fields.package_time && fields.start_date) {
      const startDate = new Date(field === "start_date" ? value : fields.start_date);
      const days = Number(field === "package_time" ? value : fields.package_time);
      if (!isNaN(days)) {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + days);
        setFields(f => ({ ...f, end_date: endDate.toISOString().slice(0, 10) }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedPackage) {
      toast.error("Kullanıcı ve paket seçmelisiniz.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        package_id: Number(selectedPackage),
        user_id: Number(selectedUser),
        package_time: Number(fields.package_time),
        package_api_rights: Number(fields.package_api_rights),
        start_date: fields.start_date,
        end_date: fields.end_date,
      };
      const response = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Abonelik oluşturulamadı");
      toast.success("Abonelik başarıyla oluşturuldu");
      navigate("/admin/subscriptions");
    } catch (err) {
      toast.error("Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-white px-2 md:px-0">
      <Card className="w-full max-w-md mx-auto p-2 md:p-6">
        <CardHeader>
          <CardTitle>Yeni Abonelik Oluştur</CardTitle>
          <CardDescription>Kullanıcı ve paket seçerek yeni abonelik oluşturun.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm mb-1">Paket</label>
              <Select value={selectedPackage || ""} onValueChange={setSelectedPackage}>
                <SelectTrigger>
                  <SelectValue placeholder="Paket seçin" />
                </SelectTrigger>
                <SelectContent>
                  {packages.map(pkg => (
                    <SelectItem key={pkg.id} value={String(pkg.id)}>
                      {pkg.package_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative">
              <label className="block text-sm mb-1">Kullanıcı</label>
              <Input
                value={userOptions.find(u => u.id === Number(selectedUser))?.username || userSearch}
                onChange={e => {
                  setUserSearch(e.target.value);
                  setSelectedUser(null);
                  setUserDropdownOpen(true);
                }}
                onFocus={() => setUserDropdownOpen(true)}
                placeholder="Kullanıcı adı veya isim yazın"
                autoComplete="off"
              />
              {userDropdownOpen && userOptions.length > 0 && !selectedUser && (
                <div className="absolute z-10 bg-white border rounded w-full max-h-48 overflow-auto shadow text-xs md:text-sm">
                  {userOptions.map(user => (
                    <div
                      key={user.id}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        setSelectedUser(user.id);
                        setUserSearch(user.username || user.full_name || "");
                        setUserDropdownOpen(false);
                      }}
                    >
                      {user.username || user.full_name} <span className="text-gray-400">(ID: {user.id})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm mb-1">Süre (Gün)</label>
              <Input type="number" value={fields.package_time} onChange={e => handleChange("package_time", e.target.value)} placeholder="Gün cinsinden süre" />
            </div>
            <div>
              <label className="block text-sm mb-1">API Hakları</label>
              <Select value={fields.package_api_rights} onValueChange={v => handleChange("package_api_rights", v)}>
                <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Standart Abonelik</SelectItem>
                  <SelectItem value="1">Premium Üye</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm mb-1">Başlangıç Tarihi</label>
              <Input type="date" value={fields.start_date} onChange={e => handleChange("start_date", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Bitiş Tarihi</label>
              <Input type="date" value={fields.end_date} onChange={e => handleChange("end_date", e.target.value)} />
            </div>
            <div className="flex gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => navigate("/admin/subscriptions")}>İptal</Button>
              <Button type="submit" disabled={loading || !selectedUser || !selectedPackage}>
                {loading ? "Oluşturuluyor..." : "Oluştur"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionsNew; 