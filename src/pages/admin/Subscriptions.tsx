import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import { useDebounce } from "@/hooks/use-debounce";
import { useNavigate } from "react-router-dom";
import { useLang } from '@/hooks/useLang';

interface Subscription {
  id: number;
  user_id: number;
  package_id: number;
  package_time: number;
  start_date: string;
  end_date: string;
  username?: string;
  package_name?: string;
}

interface Package {
  id: number;
  package_name: string;
}

interface User {
  id: number;
  username: string;
  name: string;
}

interface SubscriptionsResponse {
  subscriptions: Subscription[];
  total: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const AdminSubscriptions: React.FC = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 500);
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSubscription, setNewSubscription] = useState({
    package_id: "",
    user_id: "",
    package_time: "",
    package_api_rights: "",
    start_date: "",
    end_date: "",
  });
  const navigate = useNavigate();
  const { t } = useLang();

  const columns = React.useMemo(
    () => [
      {
        accessorKey: "user_id",
        header: "Kullanıcı ID",
      },
      {
        accessorKey: "username",
        header: "Kullanıcı Adı",
        cell: ({ row }: { row: Subscription }) => row.username || "N/A",
      },
      {
        accessorKey: "package_name",
        header: "Paket",
        cell: ({ row }: { row: Subscription }) => row.package_name || "N/A",
      },
      {
        accessorKey: "end_date",
        header: "Bitiş",
        cell: ({ row }: { row: Subscription }) => format(new Date(row.end_date), "dd.MM.yyyy"),
      },
      {
        accessorKey: "actions",
        header: "İşlemler",
        cell: ({ row }: { row: Subscription }) => (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/admin/subscriptions/edit/${row.id}`)}>
              Düzenle
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteId(row.id)}>
              Sil
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const { data, isLoading } = useQuery<SubscriptionsResponse>({
    queryKey: ['subscriptions', debouncedSearch, page],
    queryFn: async (): Promise<SubscriptionsResponse> => {
      const response = await fetch(`${API_URL}/admin/subscriptions?search=${debouncedSearch}&page=${page}`);
      if (!response.ok) throw new Error('Abonelikler yüklenemedi');
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
    keepPreviousData: false
  });

  const { data: packages } = useQuery<Package[]>({
    queryKey: ["packages-list"],
    queryFn: async () => {
      const response = await fetch("/api/admin/packages-list");
      if (!response.ok) throw new Error("Network response was not ok");
      return response.json();
    },
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["users-list"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users-list");
      if (!response.ok) throw new Error("Network response was not ok");
      return response.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_URL}/admin/subscriptions/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Abonelik silinemedi');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Abonelik başarıyla silindi');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleCreate = async () => {
    try {
      const payload = {
        package_id: Number(newSubscription.package_id),
        user_id: Number(newSubscription.user_id),
        package_time: Number(newSubscription.package_time),
        package_api_rights: Number(newSubscription.package_api_rights),
        start_date: newSubscription.start_date,
        end_date: newSubscription.end_date,
      };
      console.log('Abonelik oluşturma için gönderilen veri:', payload);
      const response = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Abonelik oluşturma başarısız oldu");
      }

      toast.success("Abonelik başarıyla oluşturuldu");
      setIsCreateDialogOpen(false);
      setNewSubscription({
        package_id: "",
        user_id: "",
        package_time: "",
        package_api_rights: "",
        start_date: "",
        end_date: "",
      });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    } catch (error) {
      console.error("Create error:", error);
      toast.error("Abonelik oluşturulurken bir hata oluştu");
    }
  };

  if (isLoading) return <div>{t('loading')}</div>;
  if (!data || !data.subscriptions) return <div>Veri yüklenemedi, lütfen tekrar deneyin.</div>;

  const totalPages = Math.ceil((data?.total || 0) / 30);

  return (
    <div className="space-y-4 px-2 md:px-8 max-w-7xl mx-auto w-full">
      <Card>
        <CardHeader>
            <div className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-primary" />
            <CardTitle>Abonelikler</CardTitle>
          </div>
          <CardDescription>
            Tüm abonelikleri görüntüleyebilir ve yönetebilirsiniz.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 md:gap-0">
        <div className="flex items-center gap-4">
          <Input
            placeholder="Kullanıcı adı veya isim ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[300px]"
          />
        </div>
        <Button onClick={() => navigate('/admin/subscriptions/new')}>
          Yeni Kayıt
        </Button>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          .subscriptions-table th {
            background-color: hsl(var(--card)) !important;
            color: hsl(var(--card-foreground)) !important;
            font-weight: 600 !important;
          }
        `
      }} />

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <DataTable
          columns={columns}
          data={data.subscriptions || []}
          loading={isLoading}
          total={data.total || 0}
          page={page}
          onPageChange={setPage}
        />
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu aboneliği silmek istediğinize emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)}>
              Evet, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Abonelik Oluştur</DialogTitle>
            <DialogDescription>
              Yeni bir abonelik oluşturmak için aşağıdaki formu doldurun.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label>Paket</label>
              <Select
                value={newSubscription.package_id}
                onValueChange={(value) =>
                  setNewSubscription({ ...newSubscription, package_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Paket seçin" />
                </SelectTrigger>
                <SelectContent>
                  {packages?.map((pkg) => (
                    <SelectItem key={pkg.id} value={String(pkg.id)}>
                      {pkg.package_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label>Kullanıcı</label>
              <Select
                value={newSubscription.user_id}
                onValueChange={(value) =>
                  setNewSubscription({ ...newSubscription, user_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kullanıcı seçin" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.username || user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label>Süre (Gün)</label>
              <Input
                type="number"
                placeholder="Gün cinsinden süre girin"
                value={newSubscription.package_time}
                onChange={(e) =>
                  setNewSubscription({
                    ...newSubscription,
                    package_time: e.target.value,
                  })
                }
              />
              <small className="text-gray-500">
                Abonelik süresini gün cinsinden girin (örn: 30, 90, 365)
              </small>
            </div>
            <div className="grid gap-2">
              <label>API Hakları</label>
              <Input
                type="number"
                value={newSubscription.package_api_rights}
                onChange={(e) =>
                  setNewSubscription({
                    ...newSubscription,
                    package_api_rights: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <label>Başlangıç Tarihi</label>
              <Input
                type="date"
                value={newSubscription.start_date}
                onChange={(e) =>
                  setNewSubscription({
                    ...newSubscription,
                    start_date: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <label>Bitiş Tarihi</label>
              <Input
                type="date"
                value={newSubscription.end_date}
                onChange={(e) =>
                  setNewSubscription({
                    ...newSubscription,
                    end_date: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleCreate}>Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubscriptions; 