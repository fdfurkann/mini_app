import React from "react";
import { useQuery } from "@tanstack/react-query";
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
import { useState, useEffect } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useLang } from "@/hooks/useLang";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";

interface ApiKey {
  id: number;
  user_id: string;
  api_name: string;
  api_key: string;
  api_secret: string;
  bot_room: number;
  created_at: string;
  updated_at: string;
  username: string;
  name: string;
  room_name: string;
  enrolled_id?: number;
  api_type: number;
  package_start_date?: string;
  lotsize?: number;
  leverage?: number;
  margin_type?: string;
  max_orders?: number;
  auto_trade?: boolean;
}

interface ApiKeysResponse {
  api_keys: ApiKey[];
  total: number;
  page: number;
  limit: number;
}

export default function ApiKeys() {
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [packageEndDates, setPackageEndDates] = useState<Record<number, string>>({});
  const [rowDetails, setRowDetails] = useState<Record<number, any>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<number, boolean>>({});

  const { data, isLoading, error } = useQuery<ApiKeysResponse>({
    queryKey: ["apiKeys", debouncedSearch, page],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/api-keys?search=${debouncedSearch}&page=${page}&limit=30`
      );
      if (!response.ok) {
        throw new Error(t('networkError'));
      }
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
    keepPreviousData: false
  });

  const navigate = useNavigate();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    async function fetchPackageEndDates() {
      if (!data?.api_keys) return;
      const userIds = Array.from(new Set(data.api_keys.map(k => k.user_id)));
      let allEndDates: Record<number, string> = {};
      for (const userId of userIds) {
        try {
          const res = await fetch(`/api/enrolled-users/${userId}`);
          if (!res.ok) continue;
          const enrolleds = await res.json();
          if (!Array.isArray(enrolleds)) continue;
          for (const apiKey of data.api_keys.filter(k => k.user_id === userId)) {
            if (apiKey.enrolled_id) {
              const found = enrolleds.find((e: any) => e.id === apiKey.enrolled_id);
              allEndDates[apiKey.id] = found ? found.end_date : "-";
            } else {
              allEndDates[apiKey.id] = "-";
            }
          }
        } catch {
          // ignore
        }
      }
      setPackageEndDates(allEndDates);
    }
    fetchPackageEndDates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.api_keys]);

  const fetchApiKeyDetails = async (apiKey: any) => {
    setLoadingDetails(prev => ({ ...prev, [apiKey.id]: true }));
    try {
      // Örnek endpoint: /api/admin/api-keys/:id/details
      const res = await fetch(`/api/admin/api-keys/${apiKey.id}/details`);
      if (!res.ok) throw new Error(t('fetchDetailsError'));
      const details = await res.json();
      setRowDetails(prev => ({ ...prev, [apiKey.id]: details }));
    } catch {
      setRowDetails(prev => ({ ...prev, [apiKey.id]: null }));
    } finally {
      setLoadingDetails(prev => ({ ...prev, [apiKey.id]: false }));
    }
  };

  const toggleRowExpansion = (id: number, apiKey?: any) => {
    setExpandedRows((prev) => {
      const expanded = !prev[id];
      if (expanded && apiKey && !rowDetails[id] && !loadingDetails[id]) {
        fetchApiKeyDetails(apiKey);
      }
      return { ...prev, [id]: expanded };
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/admin/api-keys/${deleteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(t('deleteFailed'));
      }

      toast.success(t('apiKeyDeletedSuccess'));
      setDeleteId(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(t('apiKeyDeleteError'));
    }
  };

  if (isLoading) return <div>{t('loading')}...</div>;
  if (error) return <div>{t('error')}: {(error as Error).message}</div>;

  const totalPages = Math.ceil((data?.total || 0) / 30);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-primary" />
            <CardTitle>{t('adminApiKeys.title')}</CardTitle>
          </div>
          <CardDescription>
            {t('adminApiKeys.description')}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Input
            placeholder={t('adminApiKeys.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[300px]"
            autoFocus
          />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          .api-keys-table th {
            background-color: hsl(var(--card)) !important;
            color: hsl(var(--card-foreground)) !important;
            font-weight: 600 !important;
          }
        `
      }} />

      <div className="bg-white rounded-lg shadow api-keys-table">
        {isMobile ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('adminApiKeys.user')}</TableHead>
                <TableHead>{t('adminApiKeys.apiName')}</TableHead>
                <TableHead>{t('adminApiKeys.apiType')}</TableHead>
                <TableHead>{t('adminApiKeys.packageEnd')}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.api_keys.map((apiKey) => (
                <React.Fragment key={apiKey.id}>
                  <TableRow onClick={() => toggleRowExpansion(apiKey.id, apiKey)} className="cursor-pointer">
                    <TableCell>{apiKey.username || apiKey.name || apiKey.user_id}</TableCell>
                    <TableCell>{apiKey.api_name}</TableCell>
                    <TableCell>{apiKey.api_type === 1 ? "Binance" : apiKey.api_type === 2 ? "Bybit" : apiKey.api_type === 3 ? "Bingx" : "-"}</TableCell>
                    <TableCell>{packageEndDates[apiKey.id] ? (packageEndDates[apiKey.id] !== "-" ? format(new Date(packageEndDates[apiKey.id]), "yyyy-MM-dd") : "-") : "-"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); toggleRowExpansion(apiKey.id, apiKey); }}>
                        {expandedRows[apiKey.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedRows[apiKey.id] && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        {loadingDetails[apiKey.id] ? (
                          <div className="p-3 text-xs">{t('loading')}...</div>
                        ) : (
                          <div className="p-3 bg-muted/50 text-xs space-y-2">
                            <div><strong>{t('adminApiKeys.channel')}:</strong> {(apiKey.room_name || (rowDetails[apiKey.id]?.room_name)) ?? "-"}</div>
                            <div><strong>{t('adminApiKeys.packageStart')}:</strong> {(apiKey.package_start_date ? format(new Date(apiKey.package_start_date), "yyyy-MM-dd") : (rowDetails[apiKey.id]?.package_start_date ? format(new Date(rowDetails[apiKey.id].package_start_date), "yyyy-MM-dd") : "-"))}</div>
                            <div><strong>{t('adminApiKeys.packageEnd')}:</strong> {packageEndDates[apiKey.id] ? (packageEndDates[apiKey.id] !== "-" ? format(new Date(packageEndDates[apiKey.id]), "yyyy-MM-dd") : "-") : "-"}</div>
                            <div><strong>{t('adminApiKeys.lotsize')}:</strong> {(apiKey.lotsize ?? rowDetails[apiKey.id]?.lotsize) ?? "-"}</div>
                            <div><strong>{t('adminApiKeys.leverage')}:</strong> {(apiKey.leverage ?? rowDetails[apiKey.id]?.leverage) ?? "-"}</div>
                            <div><strong>{t('adminApiKeys.marginType')}:</strong> {(apiKey.margin_type ?? rowDetails[apiKey.id]?.margin_type) ?? "-"}</div>
                            <div><strong>{t('adminApiKeys.maxOrders')}:</strong> {(apiKey.max_orders ?? rowDetails[apiKey.id]?.max_orders) ?? "-"}</div>
                            <div><strong>{t('adminApiKeys.autoTrade')}:</strong> {typeof (apiKey.auto_trade ?? rowDetails[apiKey.id]?.auto_trade) !== "undefined" ? ((apiKey.auto_trade ?? rowDetails[apiKey.id]?.auto_trade) ? t('on') : t('off')) : "-"}</div>
                            <div className="flex gap-2 mt-2">
                              <Button size="sm" onClick={() => navigate(`/admin/positions/${apiKey.id}`)}>{t('positions')}</Button>
                              <Button size="sm" onClick={() => navigate(`/admin/open_orders/${apiKey.id}`)}>{t('orders')}</Button>
                              <Button size="sm" onClick={() => navigate(`/admin/position_history/${apiKey.id}`)}>{t('positionHistory')}</Button>
                              <Button size="sm" onClick={() => navigate(`/admin/order_history/${apiKey.id}`)}>{t('orderHistory')}</Button>
                            </div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>{t('adminApiKeys.user')}</TableHead>
                <TableHead>{t('adminApiKeys.apiName')}</TableHead>
                <TableHead>{t('adminApiKeys.apiType')}</TableHead>
                <TableHead>{t('adminApiKeys.channel')}</TableHead>
                <TableHead>{t('adminApiKeys.packageStart')}</TableHead>
                <TableHead>{t('adminApiKeys.packageEnd')}</TableHead>
                <TableHead>{t('adminApiKeys.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.api_keys.map((apiKey) => (
                <TableRow key={apiKey.id}>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => toggleRowExpansion(apiKey.id, apiKey)}>
                      {expandedRows[apiKey.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div>{apiKey.username}</div>
                    <div className="text-xs text-muted-foreground">{apiKey.name}</div>
                    <div className="text-xs text-muted-foreground">{apiKey.user_id}</div>
                  </TableCell>
                  <TableCell>{apiKey.api_name}</TableCell>
                  <TableCell>{apiKey.api_type === 1 ? "Binance" : apiKey.api_type === 2 ? "Bybit" : apiKey.api_type === 3 ? "Bingx" : "-"}</TableCell>
                  <TableCell>{apiKey.room_name}</TableCell>
                  <TableCell>
                    {apiKey.package_start_date
                      ? format(new Date(apiKey.package_start_date), "yyyy-MM-dd")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {packageEndDates[apiKey.id] ? (packageEndDates[apiKey.id] !== "-" ? format(new Date(packageEndDates[apiKey.id]), "yyyy-MM-dd") : "-") : "-"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(apiKey.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-2"
                      onClick={() => navigate(`/admin/positions/${apiKey.id}`)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
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

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('adminApiKeys.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('adminApiKeys.deleteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 