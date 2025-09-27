import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Edit, Trash } from "lucide-react";
import { toast } from "sonner";
import { useLang } from '@/hooks/useLang';
import { useNavigate } from 'react-router-dom';

interface SubscriptionPackage {
  id: number;
  package_name: string;
  package_description: string;
  package_price: number;
  premium_price?: number;
  status: number;
  created_at: string;
  updated_at: string;
  package_date: number;
  package_api_rights: number;
}

interface PackagesResponse {
  packages: SubscriptionPackage[];
  total: number;
  page: number;
  limit: number;
}

export default function SubscriptionPackages() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newPackage, setNewPackage] = useState({
    package_name: "",
    package_description: "",
    package_price: "",
    premium_price: "",
    package_date: "",
    package_api_rights: "",
    status: "1"
  });
  const [editPackage, setEditPackage] = useState<{
    id: number;
    package_name: string;
    package_description: string;
    package_price: string;
    premium_price?: string;
    package_date: string;
    package_api_rights: string;
    status: string;
  } | null>(null);
  const { t } = useLang();

  const { data, isLoading, error } = useQuery<PackagesResponse>({
    queryKey: ["subscriptionPackages", search, page],
    queryFn: async () => {
      const response = await fetch(
        `/api/subscription-packages?search=${search}&page=${page}&limit=30`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
    keepPreviousData: false
  });

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/subscription-packages/${deleteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Silme işlemi başarısız oldu");
      }

      toast.success("Paket başarıyla silindi");
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["subscriptionPackages"] });
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Paket silinirken bir hata oluştu");
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch("/api/subscription-packages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newPackage,
          package_price: parseFloat(newPackage.package_price),
          premium_price: newPackage.premium_price ? parseFloat(newPackage.premium_price) : null,
          package_date: parseInt(newPackage.package_date),
          package_api_rights: parseInt(newPackage.package_api_rights),
          status: parseInt(newPackage.status)
        }),
      });

      if (!response.ok) {
        throw new Error("Paket oluşturma başarısız oldu");
      }

      toast.success("Paket başarıyla oluşturuldu");
      setIsCreateDialogOpen(false);
      setNewPackage({
        package_name: "",
        package_description: "",
        package_price: "",
        premium_price: "",
        package_date: "",
        package_api_rights: "",
        status: "1"
      });
      queryClient.invalidateQueries({ queryKey: ["subscriptionPackages"] });
    } catch (error) {
      console.error("Create error:", error);
      toast.error("Paket oluşturulurken bir hata oluştu");
    }
  };

  const handleEdit = (pkg: SubscriptionPackage) => {
    navigate(`/admin/subscription-packages/edit/${pkg.id}`);
  };

  const handleUpdate = async () => {
    if (!editPackage) return;

    try {
      const response = await fetch(`/api/subscription-packages/${editPackage.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editPackage,
          package_price: parseFloat(editPackage.package_price),
          premium_price: editPackage.premium_price ? parseFloat(editPackage.premium_price) : null,
          package_date: parseInt(editPackage.package_date),
          package_api_rights: parseInt(editPackage.package_api_rights),
          status: parseInt(editPackage.status)
        }),
      });

      if (!response.ok) {
        throw new Error("Paket güncelleme başarısız oldu");
      }

      toast.success("Paket başarıyla güncellendi", { position: 'top-center' });
      setEditPackage(null);
      queryClient.invalidateQueries({ queryKey: ["subscriptionPackages"] });
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Paket güncellenirken bir hata oluştu", { position: 'top-center' });
    }
  };

  if (isLoading) return <div>{t('loading')}</div>;
  if (error) return <div>Hata: {(error as Error).message}</div>;

  const totalPages = Math.ceil((data?.total || 0) / 30);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-primary" />
            <CardTitle>Abonelik Paketleri</CardTitle>
          </div>
          <CardDescription>
            Abonelik paketlerini görüntüleyebilir ve yönetebilirsiniz.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Input
            placeholder="Paket adı ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[300px]"
          />
        </div>
        <Button onClick={() => navigate('/admin/subscription-packages/new')}>
          Yeni Paket
        </Button>
      </div>

      {/* Yeni Paket Ekle Dialog */}
      {/* Dialog ve isCreateDialogOpen ile ilgili kodlar tamamen kaldırıldı. */}

      <style dangerouslySetInnerHTML={{
        __html: `
          .subscription-packages-table th {
            background-color: hsl(var(--card)) !important;
            color: hsl(var(--card-foreground)) !important;
            font-weight: 600 !important;
          }
        `
      }} />

      <div className="bg-white rounded-lg shadow subscription-packages-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Paket Adı</TableHead>
              <TableHead>Süre (Gün)</TableHead>
              <TableHead>API Hakları</TableHead>
              <TableHead>Fiyat</TableHead>
              <TableHead>Premium Fiyat</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.packages.map((pkg) => (
              <TableRow key={pkg.id}>
                <TableCell>{pkg.id}</TableCell>
                <TableCell>{pkg.package_name}</TableCell>
                <TableCell>{pkg.package_date}</TableCell>
                <TableCell>{pkg.package_api_rights}</TableCell>
                <TableCell>{pkg.package_price}</TableCell>
                <TableCell>{pkg.premium_price ?? '-'}</TableCell>
                <TableCell>{pkg.status ? "Aktif" : "Pasif"}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(pkg)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteId(pkg.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Önceki
        </Button>
        <div className="text-sm">
          Sayfa {page} / {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
          disabled={page >= totalPages}
        >
          Sonraki
        </Button>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu paketi silmek istediğinize emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Evet, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit formu ana sayfanın altında gösterilecek */}
      {editPackage && (
        <div className="bg-gray-50 border rounded-lg p-6 mt-8 max-w-xl mx-auto">
          <h2 className="text-lg font-semibold mb-2">Paketi Düzenle</h2>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label>Paket Adı</label>
              <Input
                value={editPackage.package_name}
                onChange={(e) =>
                  setEditPackage({
                    ...editPackage,
                    package_name: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <label>Açıklama</label>
              <Input
                value={editPackage.package_description}
                onChange={(e) =>
                  setEditPackage({
                    ...editPackage,
                    package_description: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <label>Fiyat</label>
              <Input
                type="number"
                value={editPackage.package_price}
                onChange={(e) =>
                  setEditPackage({
                    ...editPackage,
                    package_price: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <label>Premium Fiyatı</label>
              <Input
                type="number"
                value={editPackage.premium_price ?? ''}
                onChange={(e) =>
                  setEditPackage({
                    ...editPackage,
                    premium_price: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <label>Süre (Gün Cinsinden)</label>
              <Input
                type="number"
                placeholder="Örn: 30 (1 ay), 90 (3 ay), 365 (1 yıl)"
                value={editPackage.package_date}
                onChange={(e) =>
                  setEditPackage({
                    ...editPackage,
                    package_date: e.target.value,
                  })
                }
              />
              <small className="text-gray-500">
                Abonelik süresini gün cinsinden girin. 1 ay = 30 gün, 3 ay = 90 gün
              </small>
            </div>
            <div className="grid gap-2">
              <label>API Hakları</label>
              <Input
                type="number"
                value={editPackage.package_api_rights}
                onChange={(e) =>
                  setEditPackage({
                    ...editPackage,
                    package_api_rights: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <label>Durum</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={editPackage.status}
                onChange={(e) =>
                  setEditPackage({
                    ...editPackage,
                    status: e.target.value,
                  })
                }
              >
                <option value="1">Aktif</option>
                <option value="0">Pasif</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditPackage(null)}>
              İptal
            </Button>
            <Button onClick={handleUpdate}>Güncelle</Button>
          </div>
        </div>
      )}
    </div>
  );
} 