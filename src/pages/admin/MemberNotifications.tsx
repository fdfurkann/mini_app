import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from "sonner";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Trash2, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useLang } from '@/hooks/useLang';

interface Notification {
  id: number;
  user_id: string;
  msg: string;
  gonderim: number;
  username: string;
  name: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const formatUnixTime = (unixTime: number) => {
  if (unixTime === 0) return 'Gönderilmedi';
  try {
    return format(new Date(unixTime * 1000), 'dd.MM.yyyy HH:mm:ss', { locale: tr });
  } catch (e) {
    return String(unixTime);
  }
};

const MemberNotifications = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [resetId, setResetId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const [isMobile, setIsMobile] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const { t } = useLang();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const { data, isLoading, error } = useQuery<NotificationsResponse>({
    queryKey: ['memberNotifications', search, page],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/admin/member-notifications?search=${search}&page=${page}&limit=30`);
      if (!response.ok) {
        throw new Error('Bildirimler yüklenirken bir hata oluştu');
      }
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_URL}/admin/member-notifications/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Bildirim silinirken bir hata oluştu');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberNotifications'] });
      toast.success('Bildirim başarıyla silindi');
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error("Bildirim silinirken hata: " + (err as Error).message);
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_URL}/admin/member-notifications/${id}/reset-sending`, {
        method: 'PUT',
      });
      if (!response.ok) {
        throw new Error('Gönderim sıfırlanırken bir hata oluştu');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberNotifications'] });
      toast.success('Gönderim başarıyla sıfırlandı');
      setResetId(null);
    },
    onError: (err) => {
      toast.error("Gönderim sıfırlanırken hata: " + (err as Error).message);
    },
  });

  const toggleRowExpansion = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const desktopColumns = [
    { accessorKey: "id", header: "ID" },
    {
      accessorKey: "user", 
      header: "Kullanıcı", 
      cell: ({ row }: any) => (
        <Link to={`/admin/members/${row.user_id}`} className="text-blue-600 hover:underline">
          {row.name || row.username || row.user_id}
        </Link>
      )
    },
    { accessorKey: "msg", header: "Mesaj" },
    { accessorKey: "gonderim", header: "Gönderim Tarihi", cell: ({ row }: any) => formatUnixTime(row.gonderim) },
    {
      accessorKey: "actions",
      header: "İşlemler",
      cell: ({ row }: any) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => setResetId(row.id)} title="Gönderimi Sıfırla">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.id)} title="Sil">
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ),
    },
  ];

  const mobileColumns = [
    {
      accessorKey: "user", 
      header: "Kullanıcı", 
      cell: ({ row }: any) => (
        <Link to={`/admin/members/${row.user_id}`} className="text-blue-600 hover:underline">
          {row.name || row.username || row.user_id}
        </Link>
      )
    },
    { accessorKey: "gonderim", header: "Gönderim Tarihi", cell: ({ row }: any) => formatUnixTime(row.gonderim) },
    {
      accessorKey: "expand",
      header: "",
      cell: ({ row }: any) => (
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); toggleRowExpansion(row.id); }}>
          {expandedRows[row.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      ),
    },
  ];

  const columns = isMobile ? mobileColumns : desktopColumns;

  const renderExpandedRow = (row: Notification) => (
    <div className="p-3 bg-muted/50 text-xs space-y-2">
      <div><strong>ID:</strong> {row.id}</div>
      <div><strong>Mesaj:</strong> {row.msg}</div>
      <div className="flex gap-2 pt-1">
        <Button variant="ghost" size="icon" onClick={() => setResetId(row.id)} title="Gönderimi Sıfırla">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.id)} title="Sil">
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    </div>
  );

  if (isLoading) return <div className="p-4 text-center">{t('loading')}</div>;
  if (error) return <div className="p-4 text-red-600 text-center">Hata: {(error as Error).message}</div>;

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-primary" />
            <CardTitle>Üye Bildirimleri</CardTitle>
          </div>
          <CardDescription>
            Üye bildirimlerini görüntüleyebilir ve yönetebilirsiniz.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex justify-between items-center">
        <Input
          placeholder="Kullanıcı adı, isim veya mesaj ile ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.notifications || []}
        loading={isLoading}
        total={data?.total || 0}
        page={page}
        onPageChange={setPage}
        isMobile={isMobile}
        expandedRows={expandedRows}
        renderExpandedRow={renderExpandedRow}
        onRowClick={isMobile ? (id) => toggleRowExpansion(id) : undefined}
        getRowId={(row) => row.id}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bildirim Silme Onayı</AlertDialogTitle>
            <AlertDialogDescription>
              Bu bildirimi kalıcı olarak silmek istediğinize emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Evet, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetId !== null} onOpenChange={() => setResetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gönderim Sıfırlama Onayı</AlertDialogTitle>
            <AlertDialogDescription>
              Bu bildirimin gönderimini sıfırlamak istediğinize emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={() => resetId && resetMutation.mutate(resetId)}>
              Evet, Sıfırla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MemberNotifications; 