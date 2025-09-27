import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { useDebounce } from "@/hooks/use-debounce";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface BotChannel {
  id: number;
  room_id: string;
  room_name: string;
  status: number;
  created_at: string;
}

interface ChannelsResponse {
  channels: BotChannel[];
  total: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function BotChannel() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 500);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<ChannelsResponse>({
    queryKey: ['bot-channels', debouncedSearch, page],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/admin/bot-channels?search=${debouncedSearch}&page=${page}`);
      if (!response.ok) throw new Error('Kanallar yüklenemedi');
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
    keepPreviousData: false
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: number }) => {
      const response = await fetch(`${API_URL}/admin/bot-channels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Kanal güncellenemedi');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-channels'] });
      toast.success('Kanal başarıyla güncellendi');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <CardTitle>Bot Kanalları</CardTitle>
          </div>
          <CardDescription>
            Bot kanallarını görüntüleyebilir ve yönetebilirsiniz.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex justify-between items-center">
        <Input
          placeholder="Kanal ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <DataTable
        data={data?.channels || []}
        loading={isLoading}
        total={data?.total || 0}
        page={page}
        onPageChange={setPage}
      />
    </div>
  );
} 