import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Pencil, Trash2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useLang } from '@/hooks/useLang';

interface User {
  id: number;
  name: string;
  first_name: string;
  username: string;
  email: string;
  email_verified_at: string | null;
  password: string;
  is_vip: boolean;
  vip_api: string | null;
  remember_token: string | null;
  last_command: string | null;
  contract_accept: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  subscription_expires_at?: string;
}

interface MembersResponse {
  members: User[];
  total: number;
  page: number;
  limit: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const Members = () => {
  const { lang } = useLang();
  const { t } = useLang();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery<MembersResponse>({
    queryKey: ['members', search, page],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/admin/members?search=${search}&page=${page}&limit=30`);
      if (!response.ok) throw new Error('Veri çekilemedi');
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 dakika
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_URL}/admin/members/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Üye silinirken bir hata oluştu');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Üye başarıyla silindi');
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  const totalPages = Math.ceil((data?.total || 0) / 30);

  return (
    <div className="space-y-4 p-4 relative">
      {isFetching && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Üyeler</CardTitle>
            </div>
          </div>
          <CardDescription className="text-sm pt-1">
            Sistem üyelerini görüntüleyebilir ve yönetebilirsiniz.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex justify-between items-center">
        <Input
          placeholder="Üye ara..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1); // Arama yapıldığında ilk sayfaya dön
          }}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-card">
            <TableRow>
              <TableHead className="w-[100px]">Id</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Ad Soyad</TableHead>
              <TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow>
                 <TableCell colSpan={4} className="text-center py-10">
                   Yükleniyor...
                 </TableCell>
               </TableRow>
            ) : data?.members && data.members.length > 0 ? (
              data.members.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.id}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.full_name || user.name || user.username}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="outline" onClick={() => navigate(`/admin/members/${user.id}/manage`)} title="Düzenle">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="destructive" onClick={() => setDeleteId(user.id)} title="Sil">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10">
                  Kayıt bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 0 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || isFetching}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Sayfa {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || isFetching}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Üye Silme Onayı</AlertDialogTitle>
            <AlertDialogDescription>
              Bu üyeyi kalıcı olarak silmek istediğinize emin misiniz?
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
};

export default Members; 