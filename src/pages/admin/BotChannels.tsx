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
import { Bot, Trash2, ChevronDown, ChevronUp, Edit, MessageSquare } from "lucide-react"; // İkonlar güncellendi
import { DataTable } from "@/components/ui/data-table";
import { useDebounce } from "@/hooks/use-debounce";
import { useLang } from "@/hooks/useLang";

// Yeni backend'e uygun BotChannel tipi
interface BotChannel {
  id: number;
  room_id: string;
  room_name: string;
  active: number;
  active_text: string;
  admin_username?: string;
  channel_desc?: string;
  register?: string;
  channel_img?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const formatDate = (dateString: string | null) => {
  if (!dateString || dateString === '0000-00-00 00:00:00') return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return format(date, 'dd.MM.yyyy HH:mm', { locale: tr });
  } catch (e) {
    return dateString;
  }
};

export default function BotChannels() {
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 500);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  // Edit/Create state'leri eklenebilir, şimdilik sadece listeleme ve silme
  // const [isSheetOpen, setIsSheetOpen] = useState(false);
  // const [editingChannel, setEditingChannel] = useState<BotChannel | null>(null);
  const queryClient = useQueryClient();
  const [isMobile, setIsMobile] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [bulkMsgOpen, setBulkMsgOpen] = useState(false);
  const [bulkMsgChannelId, setBulkMsgChannelId] = useState<number|null>(null);
  const [bulkMsgText, setBulkMsgText] = useState("");
  const [bulkMsgLoading, setBulkMsgLoading] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const { data, isLoading, error } = useQuery<BotChannel[]>({
    queryKey: ['bot-channels'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/channels`);
      if (!response.ok) throw new Error(t('botChannels.loadError'));
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
    keepPreviousData: true,
  });

  // Silme işlemi için API endpoint'i /api/channels/:id olmalı (eğer backend'de böyleyse)
  // Şimdilik bu endpoint'in var olduğunu varsayıyorum, yoksa oluşturulmalı.
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_URL}/channels/${id}`, { // Varsayılan silme endpoint'i
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: t('botChannels.unknownDeleteError') }));
        throw new Error(errorData.message || t('botChannels.deleteError'));
      }
      return response.json(); 
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-channels'] });
      toast.success(t('botChannels.deleteSuccess'));
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(t('botChannels.deleteErrorDetailed', { error: (err as Error).message }));
    },
  });

  const toggleRowExpansion = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // const handleEdit = (channel: BotChannel) => {
  //   setEditingChannel(channel);
  //   setIsSheetOpen(true);
  // };

  // const handleCreateNew = () => {
  //   setEditingChannel(null);
  //   setIsSheetOpen(true);
  // };

  const columns = [
    { accessorKey: 'room_id', header: t('botChannels.channelId') },
    { accessorKey: 'room_name', header: t('botChannels.channelName') },
    { accessorKey: 'active_text', header: t('botChannels.status') },
    {
      accessorKey: 'actions',
      header: t('botChannels.actions'),
      cell: ({ row }: any) => (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="icon" onClick={() => window.location.href = `/admin/bot-channels/edit/${row.id}`} title={t('edit')}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.id)} title={t('delete')}>
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleBulkMessage(row.id)} title={t('sendBulkMessage')}>
            <MessageSquare className="h-4 w-4 text-blue-600" />
          </Button>
        </div>
      ),
    },
  ];

  const renderExpandedRow = (row: BotChannel) => (
    <div className="p-3 bg-muted/50 text-xs space-y-2">
      <div><strong>{t('botChannels.admin')}:</strong> {row.admin_username || '-'}</div>
      <div><strong>{t('botChannels.description')}:</strong> {row.channel_desc || '-'}</div>
      <div><strong>{t('botChannels.registerDate')}:</strong> {row.register || '-'}</div>
      {row.channel_img && <div><img src={row.channel_img} alt={t('botChannels.channelImageAlt')} className="max-h-24 rounded" /></div>}
    </div>
  );

  const handleBulkMessage = (id: number) => {
    setBulkMsgChannelId(id);
    setBulkMsgText("");
    setBulkMsgOpen(true);
  };

  const sendBulkMessage = async () => {
    if (!bulkMsgChannelId || !bulkMsgText.trim()) return;
    setBulkMsgLoading(true);
    try {
      const res = await fetch(`${API_URL}/channels/${bulkMsgChannelId}/bulk-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: bulkMsgText })
      });
      if (!res.ok) throw new Error("Mesaj gönderilemedi");
      toast.success("Toplu mesaj başarıyla gönderildi");
      setBulkMsgOpen(false);
    } catch (e) {
      toast.error("Mesaj gönderilemedi");
    } finally {
      setBulkMsgLoading(false);
    }
  };

  if (isLoading) return <div className="p-4 text-center">{t('loading')}...</div>;
  if (error) return <div className="p-4 text-red-600 text-center">{t('error')}: {(error as Error).message}</div>;

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">{t('botChannels.title')}</CardTitle>
            <Button className="ml-auto" onClick={() => window.location.href = '/admin/bot-channels/new'}>{t('botChannels.addChannel')}</Button>
          </div>
          <CardDescription className="text-sm pt-1">
            {t('botChannels.pageDescription')}
          </CardDescription>
        </CardHeader>
        <div className="flex items-center gap-2 px-4 pb-2">
          <Input
            placeholder={t('botChannels.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <DataTable
          columns={columns}
          data={data || []}
          expandedRows={expandedRows}
          onRowExpand={id => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }))}
          renderExpandedRow={renderExpandedRow}
        />
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('botChannels.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('botChannels.deleteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              {t('botChannels.confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit/Create Sheet (Sheet, Dialog veya farklı bir component olabilir) */}
      {/* <BotChannelSheet 
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        channelData={editingChannel}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['bot-channels'] })}
      /> */}

      {/* Toplu Mesaj Modalı */}
      {bulkMsgOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-2">Toplu Mesaj Gönder</h2>
            <textarea
              className="w-full border rounded p-2 min-h-[100px] mb-4"
              value={bulkMsgText}
              onChange={e => setBulkMsgText(e.target.value)}
              placeholder="Mesajınızı yazın..."
              disabled={bulkMsgLoading}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setBulkMsgOpen(false)} disabled={bulkMsgLoading}>İptal</Button>
              <Button onClick={sendBulkMessage} loading={bulkMsgLoading} disabled={bulkMsgLoading || !bulkMsgText.trim()}>Gönder</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 