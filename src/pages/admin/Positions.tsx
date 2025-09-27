import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Checkbox } from "@/components/ui/checkbox"; // Checkbox'ı import et
import { useLang } from '@/hooks/useLang';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/data-table';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

// Helper to format Unix timestamps (in ms)
const formatTimestamp = (timestamp: any) => {
  if (!timestamp || isNaN(timestamp) || Number(timestamp) === 0) return String(timestamp);
  try {
    const date = new Date(Number(timestamp));
    if (isNaN(date.getTime())) return String(timestamp); // Invalid date
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    const hours = ('0' + date.getHours()).slice(-2);
    const minutes = ('0' + date.getMinutes()).slice(-2);
    const seconds = ('0' + date.getSeconds()).slice(-2);
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (e) {
    return String(timestamp);
  }
};

const dateKeys = ['time', 'updateTime', 'openTime', 'closeTime', 'createdTimestamp', 'updateTimestamp'];

// Helper to format values, checking for date keys
const formatValue = (key: string, value: any) => {
  if (dateKeys.includes(key)) {
    return formatTimestamp(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
};

// Helper to reorder headers to put a date column first
const reorderHeaders = (headers: string[]) => {
  const dateKey = headers.find(key => dateKeys.includes(key));
  if (dateKey) {
    return [dateKey, ...headers.filter(h => h !== dateKey)];
  }
  return headers;
};

const getNavs = (apiKeyId: string | undefined) => [
  { label: 'Geri', path: '/admin/api-keys' },
  { label: 'Positions', path: `/admin/positions/${apiKeyId}` },
  { label: 'Orders', path: `/admin/orders/${apiKeyId}` },
  { label: 'Position History', path: `/admin/position-history/${apiKeyId}` },
  { label: 'Order History', path: `/admin/order-history/${apiKeyId}` },
];

// ResponsiveTable yerine modern DataTable yapısı
const ModernTable = ({ data, columns, expandedRows, setExpandedRows }: { data: any[], columns: any[], expandedRows: Record<number, boolean>, setExpandedRows: (rows: Record<number, boolean>) => void }) => {
  if (!data || data.length === 0) return <div>No records to show.</div>;
  const handleRowClick = (id: number) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const renderExpandedRow = (row: any) => (
    <tr>
      <td colSpan={columns.length}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <tbody>
              {Object.entries(row).map(([key, value]) => (
                <tr key={key}>
                  <td className="font-semibold border px-2 py-1 bg-muted/30 whitespace-nowrap">{key}</td>
                  <td className="border px-2 py-1">{String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  );
  return (
    <table className="min-w-full border rounded-md">
      <thead className="bg-card">
        <tr>
          {columns.map((col: any) => (
            <th key={col.accessorKey} className="px-2 py-2 border-b text-left">{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <>
            <tr key={row.id || idx} className="cursor-pointer hover:bg-muted/50" onClick={() => handleRowClick(row.id || idx)}>
              {columns.map((col: any) => (
                <td key={col.accessorKey} className="px-2 py-1 border-b">{row[col.accessorKey]}</td>
              ))}
            </tr>
            {expandedRows[row.id || idx] && renderExpandedRow(row)}
          </>
        ))}
      </tbody>
    </table>
  );
};

// Tablo ana sütunlarını belirle
const MAIN_COLUMNS = [
  // Tarih için olası keyler: time, openTime, closeTime, createdTimestamp, updateTime
  'time', 'openTime', 'closeTime', 'createdTimestamp', 'updateTime',
  // Ticket için olası keyler: orderId, id, ticket, sticket, tticket
  'orderId', 'id', 'ticket', 'sticket', 'tticket',
  'symbol', 'side', 'type', 'volume', 'origQty', 'positionAmt', 'price', 'status'
];

function getMainColumns(row: any) {
  // Sıralı ve tekrar etmeyen ana sütunlar
  const keys = Object.keys(row || {});
  const mainCols = [];
  // Tarih
  const dateKey = MAIN_COLUMNS.find(k => keys.includes(k) && (k.toLowerCase().includes('time') || k === 'createdTimestamp'));
  if (dateKey) mainCols.push(dateKey);
  // Ticket
  const ticketKey = MAIN_COLUMNS.find(k => keys.includes(k) && (k.toLowerCase().includes('ticket') || k.toLowerCase().includes('orderid') || k === 'id'));
  if (ticketKey && !mainCols.includes(ticketKey)) mainCols.push(ticketKey);
  // Diğer ana sütunlar
  ['symbol', 'side', 'type', 'volume', 'origQty', 'positionAmt', 'price', 'status'].forEach(k => {
    if (keys.includes(k) && !mainCols.includes(k)) mainCols.push(k);
  });
  return mainCols;
}

function renderAccordionRow(row: any, mainColsLen: number) {
  return (
    <tr>
      <td colSpan={mainColsLen}>
        <div className="p-3 bg-muted/50 text-xs space-y-2">
          {Object.entries(row).filter(([key]) => !getMainColumns(row).includes(key)).map(([key, value]) => (
            <div key={key}><strong>{key}:</strong> {String(value)}</div>
          ))}
        </div>
      </td>
    </tr>
  );
}

export const Positions = () => {
    const { t } = useLang();
    const { apiKeyId } = useParams<{ apiKeyId: string }>();
    const [positions, setPositions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isClosingAll, setIsClosingAll] = useState(false);
    const [selectedPositions, setSelectedPositions] = useState<any[]>([]);
    const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
    const [search, setSearch] = useState("");
    const debouncedSearch = search; // İstersen useDebounce ekle
    const navs = getNavs(apiKeyId);
    const currentPath = window.location.pathname;

    const fetchPositions = () => {
        if (!apiKeyId) return;
        setLoading(true);
        fetch(`/api/admin/api-keys/${apiKeyId}/positions?search=${debouncedSearch}`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch positions');
                return res.json();
            })
            .then(data => {
                setPositions(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchPositions();
    }, [apiKeyId, debouncedSearch]);

    const handleCloseSelectedPositions = async () => {
        if (selectedPositions.length === 0) {
            toast.warning("Lütfen kapatılacak pozisyonları seçin.");
            return;
        }
        if (!window.confirm(`${selectedPositions.length} pozisyonu kapatmak istediğinize emin misiniz?`)) {
            return;
        }
        setIsClosingAll(true);
        try {
            const response = await fetch('/api/admin/positions/close-selected', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKeyId, positions: selectedPositions }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.detail || 'Failed to close selected positions');
            }
            toast.success(`${selectedPositions.length} kapatma emri gönderildi.`);
            setSelectedPositions([]);
            setTimeout(fetchPositions, 2000);
        } catch (error) {
            toast.error(`Pozisyon kapatılırken hata: ${error.message}`);
        } finally {
            setIsClosingAll(false);
        }
    };

    if (loading) return <div>{t('loading')}...</div>;
    if (error) return <div>{t('error')}: {error}</div>;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Pozisyonlar</CardTitle>
                    <CardDescription>API anahtarına ait açık pozisyonları görüntüleyebilir ve yönetebilirsiniz.</CardDescription>
                </CardHeader>
            </Card>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <Input
                        placeholder="Sembol ile ara..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-[300px]"
                    />
                </div>
                <div className="flex items-center gap-2">
                    {navs.map(nav => (
                        <Button
                            key={nav.path}
                            variant={currentPath === nav.path ? 'default' : 'outline'}
                            size="sm"
                            className={currentPath === nav.path ? 'bg-primary text-white' : 'bg-white text-primary border-primary'}
                            onClick={() => window.location.href = nav.path}
                        >
                            {nav.label}
                        </Button>
                    ))}
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleCloseSelectedPositions}
                        disabled={isClosingAll || selectedPositions.length === 0}
                    >
                        {isClosingAll ? 'Kapatılıyor...' : `Seçiliyi Kapat (${selectedPositions.length})`}
                    </Button>
                </div>
            </div>
            <div className="bg-white rounded-lg shadow">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead></TableHead>
                            {positions[0] && getMainColumns(positions[0]).map(col => (
                                <TableHead key={col}>{col}</TableHead>
                            ))}
                            <TableHead>İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {positions.map((pos, idx) => (
                            <React.Fragment key={pos.id || idx}>
                                <TableRow>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => setExpandedRows(prev => ({ ...prev, [pos.id || idx]: !prev[pos.id || idx] }))}>
                                            {expandedRows[pos.id || idx] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </Button>
                                    </TableCell>
                                    {getMainColumns(pos).map(col => (
                                        <TableCell key={col}>{pos[col]}</TableCell>
                                    ))}
                                    <TableCell>
                                        <Button variant="destructive" size="sm" onClick={() => {/* tekli kapat */}}>Kapat</Button>
                                    </TableCell>
                                </TableRow>
                                {expandedRows[pos.id || idx] && renderAccordionRow(pos, getMainColumns(pos).length + 2)}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

const mainOrderColumns = ['time', 'orderId', 'symbol', 'price', 'origQty', 'side', 'type', 'status'];

const processOrderData = (data: any[]) => {
  if (!Array.isArray(data)) return [];
  return data.map(o => ({
    ...o,
    price: Number(o.avgPrice) > 0 ? o.avgPrice : (Number(o.stopPrice) > 0 ? o.stopPrice : o.price)
  }));
};

export const OpenOrders = () => {
  const { t } = useLang();
  const { apiKeyId } = useParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [selectedOrders, setSelectedOrders] = useState<any[]>([]);
  const [isCancellingAll, setIsCancellingAll] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = search;
  const navs = getNavs(apiKeyId);
  const currentPath = window.location.pathname;

  useEffect(() => {
    if (!apiKeyId) return;
    setLoading(true);
    fetch(`/api/admin/api-keys/${apiKeyId}/open_orders?search=${debouncedSearch}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch open orders');
        return res.json();
      })
      .then(data => {
        setOrders(processOrderData(data));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [apiKeyId, debouncedSearch]);

  const handleCancelSelectedOrders = async () => {
    if (selectedOrders.length === 0) {
      toast.warning("Lütfen iptal edilecek emirleri seçin.");
      return;
    }
    if (!window.confirm(`${selectedOrders.length} emri iptal etmek istediğinize emin misiniz?`)) {
      return;
    }
    setIsCancellingAll(true);
    try {
      const response = await fetch('/api/admin/orders/cancel-selected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKeyId, orders: selectedOrders }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || 'Failed to cancel selected orders');
      }
      toast.success(`${selectedOrders.length} iptal emri gönderildi.`);
      setSelectedOrders([]);
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      toast.error(`Emir iptalinde hata: ${error.message}`);
    } finally {
      setIsCancellingAll(false);
    }
  };

  if (loading) return <div>{t('loading')}...</div>;
  if (error) return <div>{t('error')}: {error}</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Açık Emirler</CardTitle>
          <CardDescription>API anahtarına ait açık emirleri görüntüleyebilir ve toplu/tekli iptal edebilirsiniz.</CardDescription>
        </CardHeader>
      </Card>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Input
            placeholder="Sembol ile ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-[300px]"
          />
        </div>
        <div className="flex items-center gap-2">
          {navs.map(nav => (
            <Button
              key={nav.path}
              variant={currentPath === nav.path ? 'default' : 'outline'}
              size="sm"
              className={currentPath === nav.path ? 'bg-primary text-white' : 'bg-white text-primary border-primary'}
              onClick={() => window.location.href = nav.path}
            >
              {nav.label}
            </Button>
          ))}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancelSelectedOrders}
            disabled={isCancellingAll || selectedOrders.length === 0}
          >
            {isCancellingAll ? 'İptal Ediliyor...' : `Seçiliyi İptal Et (${selectedOrders.length})`}
          </Button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Checkbox
                  checked={selectedOrders.length === orders.length && orders.length > 0}
                  indeterminate={selectedOrders.length > 0 && selectedOrders.length < orders.length}
                  onCheckedChange={checked => {
                    if (checked) setSelectedOrders(orders.map((o, idx) => o.id || idx));
                    else setSelectedOrders([]);
                  }}
                />
              </TableHead>
              <TableHead>Sembol</TableHead>
              <TableHead>Miktar</TableHead>
              <TableHead>Fiyat</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead>Yön</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order, idx) => (
              <React.Fragment key={order.id || idx}>
                <TableRow>
                  <TableCell>
                    <Checkbox
                      checked={selectedOrders.includes(order.id || idx)}
                      onCheckedChange={checked => {
                        if (checked) setSelectedOrders(prev => [...prev, order.id || idx]);
                        else setSelectedOrders(prev => prev.filter(id => id !== (order.id || idx)));
                      }}
                    />
                  </TableCell>
                  <TableCell>{order.symbol}</TableCell>
                  <TableCell>{order.origQty}</TableCell>
                  <TableCell>{order.price}</TableCell>
                  <TableCell>{order.type}</TableCell>
                  <TableCell>{order.side}</TableCell>
                  <TableCell>{order.status}</TableCell>
                  <TableCell>
                    <Button variant="destructive" size="sm" onClick={() => {/* tekli iptal */}}>İptal</Button>
                  </TableCell>
                </TableRow>
                {expandedRows[order.id || idx] && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="p-3 bg-muted/50 text-xs space-y-2">
                        {Object.entries(order).map(([key, value]) => (
                          <div key={key}><strong>{key}:</strong> {String(value)}</div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export const PositionHistory = () => {
  const { t } = useLang();
  const { apiKeyId } = useParams();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState("");
  const debouncedSearch = search;
  const navs = getNavs(apiKeyId);
  const currentPath = window.location.pathname;

  useEffect(() => {
    if (!apiKeyId) return;
    setLoading(true);
    fetch(`/api/admin/api-keys/${apiKeyId}/position_history?page=${page}&limit=${pageSize}&search=${debouncedSearch}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch position history');
        return res.json();
      })
      .then(data => {
        setHistory(processOrderData(data));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [apiKeyId, page, debouncedSearch]);

  if (loading) return <div>{t('loading')}...</div>;
  if (error) return <div>{t('error')}: {error}</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pozisyon Geçmişi</CardTitle>
          <CardDescription>API anahtarına ait pozisyon geçmişini görüntüleyebilirsiniz.</CardDescription>
        </CardHeader>
      </Card>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Input
            placeholder="Sembol ile ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-[300px]"
          />
        </div>
        <div className="flex items-center gap-2">
          {navs.map(nav => (
            <Button
              key={nav.path}
              variant={currentPath === nav.path ? 'default' : 'outline'}
              size="sm"
              className={currentPath === nav.path ? 'bg-primary text-white' : 'bg-white text-primary border-primary'}
              onClick={() => window.location.href = nav.path}
            >
              {nav.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Sembol</TableHead>
              <TableHead>Miktar</TableHead>
              <TableHead>Fiyat</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead>Yön</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((item, idx) => (
              <React.Fragment key={item.id || idx}>
                <TableRow>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setExpandedRows(prev => ({ ...prev, [item.id || idx]: !prev[item.id || idx] }))}>
                      {expandedRows[item.id || idx] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                  <TableCell>{item.symbol}</TableCell>
                  <TableCell>{item.origQty}</TableCell>
                  <TableCell>{item.price}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{item.side}</TableCell>
                  <TableCell>{item.status}</TableCell>
                </TableRow>
                {expandedRows[item.id || idx] && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="p-3 bg-muted/50 text-xs space-y-2">
                        {Object.entries(item).map(([key, value]) => (
                          <div key={key}><strong>{key}:</strong> {String(value)}</div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Önceki
          </Button>
          <div className="text-sm">
            Sayfa {page}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => history.length < pageSize ? p : p + 1)}
            disabled={history.length < pageSize}
          >
            Sonraki
          </Button>
        </div>
      </div>
    </div>
  );
};

export const OrderHistory = () => {
  const { t } = useLang();
  const { apiKeyId } = useParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState("");
  const debouncedSearch = search;
  const navs = getNavs(apiKeyId);
  const currentPath = window.location.pathname;

  useEffect(() => {
    if (!apiKeyId) return;
    setLoading(true);
    fetch(`/api/admin/api-keys/${apiKeyId}/order_history?page=${page}&limit=${pageSize}&search=${debouncedSearch}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch order history');
        return res.json();
      })
      .then(data => {
        setOrders(processOrderData(data));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [apiKeyId, page, debouncedSearch]);

  if (loading) return <div>{t('loading')}...</div>;
  if (error) return <div>{t('error')}: {error}</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Emir Geçmişi</CardTitle>
          <CardDescription>API anahtarına ait emir geçmişini görüntüleyebilirsiniz.</CardDescription>
        </CardHeader>
      </Card>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Input
            placeholder="Sembol ile ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-[300px]"
          />
        </div>
        <div className="flex items-center gap-2">
          {navs.map(nav => (
            <Button
              key={nav.path}
              variant={currentPath === nav.path ? 'default' : 'outline'}
              size="sm"
              className={currentPath === nav.path ? 'bg-primary text-white' : 'bg-white text-primary border-primary'}
              onClick={() => window.location.href = nav.path}
            >
              {nav.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Sembol</TableHead>
              <TableHead>Miktar</TableHead>
              <TableHead>Fiyat</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead>Yön</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order, idx) => (
              <React.Fragment key={order.id || idx}>
                <TableRow>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setExpandedRows(prev => ({ ...prev, [order.id || idx]: !prev[order.id || idx] }))}>
                      {expandedRows[order.id || idx] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                  <TableCell>{order.symbol}</TableCell>
                  <TableCell>{order.origQty}</TableCell>
                  <TableCell>{order.price}</TableCell>
                  <TableCell>{order.type}</TableCell>
                  <TableCell>{order.side}</TableCell>
                  <TableCell>{order.status}</TableCell>
                </TableRow>
                {expandedRows[order.id || idx] && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="p-3 bg-muted/50 text-xs space-y-2">
                        {Object.entries(order).map(([key, value]) => (
                          <div key={key}><strong>{key}:</strong> {String(value)}</div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Önceki
          </Button>
          <div className="text-sm">
            Sayfa {page}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => orders.length < pageSize ? p : p + 1)}
            disabled={orders.length < pageSize}
          >
            Sonraki
          </Button>
        </div>
      </div>
    </div>
  );
}; 