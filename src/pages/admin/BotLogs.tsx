import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { useDebounce } from "@/hooks/use-debounce";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useLocation } from "react-router-dom";

interface BotLog {
  id: number;
  signals_id: string;
  user_id: string;
  user_signals_id: string;
  channel_id: string;
  detail: string;
  call_func: string;
  created_at: string;
  [key: string]: any;
}

interface BotLogsResponse {
  bot_logs: BotLog[];
  total: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function BotLogs() {
  const [search, setSearch] = useState({ signals_id: '', user_id: '', user_signals_id: '', channel_id: '' });
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 500);
  const location = useLocation();

  // URL parametrelerinden arama değerlerini al
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearch({
      signals_id: params.get('signals_id') || '',
      user_id: params.get('user_id') || '',
      user_signals_id: params.get('user_signals_id') || '',
      channel_id: params.get('channel_id') || ''
    });
  }, [location.search]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-bot-logs', debouncedSearch, page],
    queryFn: async (): Promise<BotLogsResponse> => {
      const params = new URLSearchParams({
        signals_id: debouncedSearch.signals_id,
        user_id: debouncedSearch.user_id,
        user_signals_id: debouncedSearch.user_signals_id,
        channel_id: debouncedSearch.channel_id,
        page: String(page),
        limit: '200'
      });
      const response = await fetch(`${API_URL}/admin/bot_logs?${params.toString()}`);
      if (!response.ok) throw new Error('Bot logları yüklenemedi');
      return response.json();
    },
    staleTime: 0,
    gcTime: 0
  });

  const columns = [
    { 
      accessorKey: "created_at", 
      header: "Trh",
      cell: ({ row }: { row: BotLog }) => {
        const date = new Date(row.created_at);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      }
    },
    { accessorKey: "id", header: "id" },
    { accessorKey: "channel_id", header: "cid" },
    { accessorKey: "signals_id", header: "sid" },
    { accessorKey: "user_id", header: "u" },
    { accessorKey: "user_signals_id", header: "usid" },
    { 
      accessorKey: "detail", 
      header: "Detail",
      cell: ({ row }: { row: BotLog }) => (
        <div className="font-mono text-xs break-all">
          {row.detail}
        </div>
      )
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-primary" />
            <CardTitle>Bot Logları</CardTitle>
          </div>
          <CardDescription>
            Tüm bot loglarını görüntüleyebilir ve yönetebilirsiniz.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex flex-row gap-2 items-center mb-2">
        <Input
          placeholder="Signal ID"
          value={search.signals_id}
          onChange={e => setSearch(s => ({ ...s, signals_id: e.target.value }))}
          className="max-w-xs"
        />
        <Input
          placeholder="Kullanıcı ID"
          value={search.user_id}
          onChange={e => setSearch(s => ({ ...s, user_id: e.target.value }))}
          className="max-w-xs"
        />
        <Input
          placeholder="User Signal ID"
          value={search.user_signals_id}
          onChange={e => setSearch(s => ({ ...s, user_signals_id: e.target.value }))}
          className="max-w-xs"
        />
        <Input
          placeholder="Kanal ID"
          value={search.channel_id}
          onChange={e => setSearch(s => ({ ...s, channel_id: e.target.value }))}
          className="max-w-xs"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.bot_logs || []}
        loading={isLoading}
        total={data?.total || 0}
        page={page}
        onPageChange={setPage}
        pageSize={200}
        isMobile={true}
      />
    </div>
  );
}