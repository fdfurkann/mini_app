import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { useDebounce } from "@/hooks/use-debounce";
import { useLang } from '@/hooks/useLang';

interface ChannelNotification {
  id: number;
  user_id: number;
  post_id: number;
  symbol: string;
  trend: string;
  open: number;
  opendate: string;
  sl: number;
  last: number;
  lastdate: string;
  cmd: string;
  profit: number;
  msg: string;
  gonderim: number;
  result: number;
  room_name?: string;
}

interface NotificationsResponse {
  notifications: ChannelNotification[];
  total: number;
  page: number;
  limit: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const formatDate = (dateString: string) => {
  if (!dateString || dateString === '0000-00-00 00:00:00') return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return format(date, 'dd.MM.yyyy HH:mm', { locale: tr });
  } catch (e) {
    return dateString;
  }
};

const formatGonderim = (gonderim: number) => {
  if (!gonderim || gonderim === 0) return '-';
  try {
    return format(new Date(gonderim * 1000), 'dd.MM.yyyy HH:mm:ss', { locale: tr });
  } catch (e) {
    return String(gonderim);
  }
};

export default function ChannelNotifications() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 500);
  const [deleteId, setDeleteId] = useState<number | null>(null);
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
    queryKey: ['channel-notifications', debouncedSearch, page],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/admin/channel-notifications?search=${debouncedSearch}&page=${page}&limit=30`);
      if (!response.ok) throw new Error('Kanal Bildirimleri yüklenemedi');
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_URL}/admin/channel-notifications/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Bilinmeyen silme hatası" }));
        throw new Error(errorData.message || "Silme işlemi başarısız oldu");
      }
      return response.json(); 
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-notifications'] });
      toast.success("Kanal Bildirimi başarıyla silindi");
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error("Kanal Bildirimi silinirken hata: " + (err as Error).message);
    },
  });

  const toggleRowExpansion = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const desktopColumns = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "room_name", header: "Kanal", cell: ({ row }: any) => row.room_name || row.user_id },
    { accessorKey: "post_id", header: "Post ID" },
    { accessorKey: "symbol", header: "Sembol" },
    { accessorKey: "trend", header: "Trend" },
    { accessorKey: "open", header: "Açılış" },
    { accessorKey: "opendate", header: "Açılış Tarihi", cell: ({ row }: any) => formatDate(row.opendate) },
    { accessorKey: "sl", header: "SL" },
    { accessorKey: "last", header: "Son Fiyat" },
    { accessorKey: "lastdate", header: "Son Fiyat Tarihi", cell: ({ row }: any) => formatDate(row.lastdate) },
    { accessorKey: "cmd", header: "CMD" },
    { accessorKey: "profit", header: "Kar" },
    { accessorKey: "msg", header: "Mesaj" },
    { accessorKey: "gonderim", header: "Gönderim", cell: ({ row }: any) => formatGonderim(row.gonderim) },
    { accessorKey: "result", header: "Sonuç" },
    {
      accessorKey: "actions",
      header: "İşlemler",
      cell: ({ row }: any) => (
        <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.id)} title="Sil">
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
      ),
    },
  ];

  const mobileColumns = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "room_name", header: "Kanal", cell: ({ row }: any) => row.room_name || row.user_id },
    { accessorKey: "symbol", header: "Sembol" },
    { accessorKey: "trend", header: "Trend" },
    { accessorKey: "gonderim", header: "Gönderim", cell: ({ row }: any) => formatGonderim(row.gonderim) },
    { accessorKey: "cmd", header: "CMD" },
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

  const renderExpandedRow = (row: ChannelNotification) => (
    <div className="p-3 bg-muted/50 text-xs space-y-2">
      <div><strong>Post ID:</strong> {row.post_id}</div>
      <div><strong>Açılış:</strong> {row.open} ({formatDate(row.opendate)})</div>
      <div><strong>SL:</strong> {row.sl}</div>
      <div><strong>Son Fiyat:</strong> {row.last} ({formatDate(row.lastdate)})</div>
      <div><strong>Kar:</strong> {row.profit}</div>
      <div><strong>Mesaj:</strong> {row.msg}</div>
      <div><strong>Sonuç:</strong> {row.result}</div>
      <div className="flex gap-2 pt-1">
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
            <CardTitle className="text-lg">Kanal Bildirimleri</CardTitle> 
          </div>
          <CardDescription className="text-sm pt-1">
            Sinyal kanallarından gelen bildirimleri görüntüleyebilirsiniz.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex justify-between items-center">
        <Input
          placeholder="Kanal adı, sembol, mesaj vb. ile ara..."
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
            <AlertDialogTitle>Kanal Bildirimi Silme Onayı</AlertDialogTitle>
            <AlertDialogDescription>
              Bu kanal bildirimini kalıcı olarak silmek istediğinize emin misiniz?
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
    </div>
  );
} 