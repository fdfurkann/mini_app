import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { useDebounce } from "@/hooks/use-debounce";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Search } from "lucide-react";
import { Link } from "react-router-dom";

interface UserSignal {
  id: number;
  user_id: number;
  api_id: number;
  signal_id: number;
  lotsize: number;
  levelage: number;
  strateji: string;
  ticket: string;
  symbol: string;
  trend: string;
  open: number;
  opentime: string;
  volume: number;
  closed_volume: number;
  sl: number;
  tp: number;
  close: number;
  closetime: string;
  profit: number;
  event: string;
  status: number;
  sticket: string;
  tticket: string;
  sl_wait: number;
  tp_wait: number;
  sl_hit: number;
  tp_hit: number;
  full_name?: string;
  username?: string;
  api_name?: string;
  [key: string]: any;
}

interface UserSignalsResponse {
  user_signals: UserSignal[];
  total: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function UserSignals() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading } = useQuery<UserSignalsResponse>({
    queryKey: ['admin-user-signals', debouncedSearch, page],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/admin/user_signals?search=${debouncedSearch}&page=${page}`);
      if (!response.ok) throw new Error('Üye sinyalleri yüklenemedi');
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
    keepPreviousData: false
  });

  const columns = [
    { accessorKey: "id", header: "ID" },
    { 
      accessorKey: "user_id", 
      header: "Kullanıcı",
      cell: ({ row }: { row: UserSignal }) => row.full_name || row.username || row.user_id
    },
    { 
      accessorKey: "api_id", 
      header: "API",
      cell: ({ row }: { row: UserSignal }) => row.api_name || row.api_id 
    },
    { accessorKey: "signal_id", header: "Sinyal" },
    { accessorKey: "symbol", header: "Sembol" },
    { accessorKey: "trend", header: "Yön" },
    { accessorKey: "open", header: "Açılış Fiyatı" },
    { accessorKey: "opentime", header: "Açılış Zamanı", cell: ({ row }: { row: UserSignal }) => row.opentime ? new Date(row.opentime).toLocaleString('tr-TR') : "-" },
    { accessorKey: "close", header: "Kapanış Fiyatı" },
    { accessorKey: "closetime", header: "Kapanış Zamanı", cell: ({ row }: { row: UserSignal }) => row.closetime ? new Date(row.closetime).toLocaleString('tr-TR') : "-" },
    { accessorKey: "profit", header: "Kar/Zarar" },
    { 
      accessorKey: "status", 
      header: "Durum",
      cell: ({ row }: { row: UserSignal }) => {
        switch(row.status) {
          case 0: return "Bekliyor";
          case 1: return "Açık";
          case 2: return "SL Bekliyor";
          case 3: return "TP Bekliyor";
          case 4: return "SL Gerçekleşti";
          case 5: return "TP Gerçekleşti";
          case 6: return "İptal Edildi";
          default: return "Bilinmiyor";
        }
      }
    },
    { accessorKey: "log", header: "Log", cell: ({ row }: { row: UserSignal }) => (
      <Link
        to={`/admin/bot-logs?user_id=${row.user_id}&user_signals_id=${row.id}`}
        className="text-blue-600 hover:text-blue-800 flex items-center justify-center"
        title="Bot Logları"
      >
        <Search className="w-5 h-5" />
      </Link>
    ) },
  ];

  const handleRowClick = (id: number) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderExpandedRow = (row: UserSignal) => (
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
            <Users className="w-5 h-5 text-primary" />
            <CardTitle>Üye Sinyalleri</CardTitle>
          </div>
          <CardDescription>
            Tüm üye sinyallerini görüntüleyebilir ve yönetebilirsiniz.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex justify-between items-center">
        <Input
          placeholder="Üye sinyali ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.user_signals || []}
        loading={isLoading}
        total={data?.total || 0}
        page={page}
        onPageChange={setPage}
        isMobile={true}
        expandedRows={expandedRows}
        onRowClick={handleRowClick}
        renderExpandedRow={renderExpandedRow}
      />
    </div>
  );
} 