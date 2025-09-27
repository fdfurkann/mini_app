import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { useDebounce } from "@/hooks/use-debounce";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart } from "lucide-react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Signal {
  id: number;
  channel_id: string;
  room_name?: string;
  symbol: string;
  direction: string;
  open_time: string;
  open_price: number;
  status: string;
  // Diğer alanlar detayda gösterilecek
  [key: string]: any;
}

interface SignalsResponse {
  signals: Signal[];
  total: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function Signals() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const debouncedSearch = useDebounce(search, 500);
  const [closeDialog, setCloseDialog] = useState<{ open: boolean; signal?: Signal }>({ open: false });
  const [actionLoading, setActionLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<SignalsResponse>({
    queryKey: ['admin-signals', debouncedSearch, page],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/admin/signals?search=${debouncedSearch}&page=${page}`);
      if (!response.ok) throw new Error('Sinyaller yüklenemedi');
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
    keepPreviousData: false
  });

  const closeSignalMutation = useMutation({
    mutationFn: async (signalId: number) => {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      // Sinyali kapat
      const res1 = await fetch(`${API_URL}/admin/signals/${signalId}/close`, { method: "POST", headers });
      if (!res1.ok) throw new Error('Sinyal kapatılamadı');
      // Üye sinyallerini kapat
      const res2 = await fetch(`${API_URL}/admin/user_signals/close-by-signal/${signalId}`, { method: "POST", headers });
      if (!res2.ok) throw new Error('User signals kapatılamadı');
      return true;
    },
    onSuccess: () => {
      setCloseDialog({ open: false });
      queryClient.invalidateQueries(['admin-signals']);
    },
    onError: (e: any) => {
      setActionLoading(false);
      alert("Sinyal kapatılamadı: " + (e?.message || e));
    }
  });

  const columns = [
    { accessorKey: "room_name", header: "Kanal" },
    { accessorKey: "symbol", header: "Sembol" },
    { accessorKey: "direction", header: "Yön" },
    { accessorKey: "open_time", header: "Açılış Zamanı", cell: ({ row }: { row: Signal }) => row.open_time ? new Date(row.open_time).toLocaleString() : "-" },
    { accessorKey: "open_price", header: "Açılış Fiyatı" },
    { accessorKey: "status", header: "Durum" },
    {
      accessorKey: "actions",
      header: "İşlemler",
      cell: ({ row }: { row: Signal }) => (
        <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setCloseDialog({ open: true, signal: row }); }}>
          <X className="w-4 h-4 text-destructive" />
        </Button>
      )
    }
  ];

  const handleRowClick = (id: number) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCloseSignal = async () => {
    if (!closeDialog.signal) return;
    setActionLoading(true);
    closeSignalMutation.mutate(closeDialog.signal.id);
  };

  const renderExpandedRow = (row: Signal) => (
    <tr>
      <td colSpan={columns.length}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <tbody>
              {Object.entries(row).map(([key, value]) => (
                <tr key={key}>
                  <td className="font-semibold border px-2 py-1 bg-muted/30 whitespace-nowrap">{key}</td>
                  <td className="border px-2 py-1">{typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/) ? new Date(value).toLocaleString() : String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <LineChart className="w-5 h-5 text-primary" />
            <CardTitle>Sinyaller</CardTitle>
          </div>
          <CardDescription>
            Tüm sinyal geçmişini görüntüleyebilirsiniz.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex justify-between items-center">
        <Input
          placeholder="Sinyal ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.signals || []}
        loading={isLoading}
        total={data?.total || 0}
        page={page}
        onPageChange={setPage}
        isMobile={true}
        expandedRows={expandedRows}
        onRowClick={handleRowClick}
        renderExpandedRow={renderExpandedRow}
      />
      <Dialog open={closeDialog.open} onOpenChange={open => setCloseDialog({ open, signal: open ? closeDialog.signal : undefined })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sinyali Kapat</DialogTitle>
          </DialogHeader>
          <div>Kanala atılan sinyali kapatmak istediğinize emin misiniz? Bununla birlikte bütün üyelerde açık pozisyonlar kapanacaktır.</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog({ open: false })} disabled={actionLoading}>Hayır</Button>
            <Button variant="destructive" onClick={handleCloseSignal} loading={actionLoading}>Evet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 