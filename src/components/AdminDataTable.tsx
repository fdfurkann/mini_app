import React, { useState, useEffect } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { useLang } from '@/hooks/useLang';

interface AdminDataTableProps {
  title: string;
  endpoint: string;
  columns: { key: string; label: string }[];
  initialData?: any[];
  className?: string;
  itemsPerPage?: number;
}

const AdminDataTable = ({ 
  title, 
  endpoint, 
  columns, 
  className = "",
  itemsPerPage = 30 
}: AdminDataTableProps) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editItem, setEditItem] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();
  const { lang } = useLang();
  const { t } = useLang();

  const fetchData = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL.endsWith('/api') 
        ? import.meta.env.VITE_API_URL.slice(0, -4) 
        : import.meta.env.VITE_API_URL;
      
      const url = `${baseUrl}${endpoint}?page=${currentPage}&limit=${itemsPerPage}${searchTerm ? `&search=${searchTerm}` : ''}`;
      console.log('Fetching data from:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      const result = await response.json();
      
      // Veri yapısını kontrol et ve uygun şekilde ayarla
      let dataArray;
      let total;

      if (Array.isArray(result)) {
        dataArray = result;
        total = result.length;
      } else if (result.signals && Array.isArray(result.signals)) {
        dataArray = result.signals;
        total = result.total || dataArray.length;
      } else if (result.data && Array.isArray(result.data)) {
        dataArray = result.data;
        total = result.total || dataArray.length;
      } else if (result.packages && Array.isArray(result.packages)) {
        dataArray = result.packages;
        total = result.total || dataArray.length;
      } else {
        dataArray = [];
        total = 0;
        console.error('Unexpected data structure:', result);
      }
      
      setData(dataArray);
      setTotalPages(Math.ceil(total / itemsPerPage));
    } catch (error) {
      console.error('Fetch error:', error);
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Veriler yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Fetching data from:', `${import.meta.env.VITE_API_URL}${endpoint}?page=${currentPage}&limit=${itemsPerPage}`);
    fetchData();
  }, [endpoint, currentPage]);

  const handleEdit = (item: any) => {
    setEditItem(item);
    setShowDialog(true);
  };

  const handleSave = async (updatedItem: any) => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL.endsWith('/api') 
        ? import.meta.env.VITE_API_URL.slice(0, -4) 
        : import.meta.env.VITE_API_URL;

      const response = await fetch(
        `${baseUrl}${endpoint}/${updatedItem.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedItem),
        }
      );
      
      if (!response.ok) throw new Error('Güncelleme başarısız');
      
      await fetchData();
      setShowDialog(false);
      toast({
        title: "Başarılı",
        description: "Kayıt başarıyla güncellendi",
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: "Güncelleme sırasında bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const handleAdd = async (newItem: any) => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL.endsWith('/api') 
        ? import.meta.env.VITE_API_URL.slice(0, -4) 
        : import.meta.env.VITE_API_URL;

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      
      if (!response.ok) throw new Error('Ekleme başarısız');
      
      await fetchData();
      setShowDialog(false);
      toast({
        title: "Başarılı",
        description: "Yeni kayıt başarıyla eklendi",
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: "Ekleme sırasında bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bu kaydı silmek istediğinizden emin misiniz?")) return;

    try {
      const baseUrl = import.meta.env.VITE_API_URL.endsWith('/api') 
        ? import.meta.env.VITE_API_URL.slice(0, -4) 
        : import.meta.env.VITE_API_URL;

      const response = await fetch(
        `${baseUrl}${endpoint}/${id}`,
        { method: "DELETE" }
      );
      
      if (!response.ok) throw new Error('Silme başarısız');
      
      await fetchData();
      toast({
        title: "Başarılı",
        description: "Kayıt başarıyla silindi",
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: "Silme sırasında bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const filteredData = data.filter((item) =>
    Object.values(item).some(
      (val) =>
        val &&
        val.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex gap-4">
          <Input
            placeholder={t('search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={() => {
            setEditItem(null);
            setShowDialog(true);
          }}>
            {t('addNew')}
          </Button>
        </div>
      </div>

      <div className={`rounded-md border ${className}`}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
              <TableHead>{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1}>
                  {t('loading')}
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1}>
                  {t('noRecordsFound')}
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => (
                <TableRow key={item.id}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      {item[column.key]}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        {t('edit')}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                      >
                        {t('delete')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm">
          {t('page')} {currentPage} / {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage >= totalPages}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editItem ? t('edit') : t('newRecord')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {columns.map((col) => (
              <div key={col.key} className="grid grid-cols-4 items-center gap-4">
                <label htmlFor={col.key} className="text-right">
                  {col.label}
                </label>
                <Input
                  id={col.key}
                  className="col-span-3"
                  value={editItem ? editItem[col.key] : ""}
                  onChange={(e) =>
                    setEditItem({
                      ...editItem,
                      [col.key]: e.target.value,
                    })
                  }
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={() =>
                editItem?.id ? handleSave(editItem) : handleAdd(editItem)
              }
            >
              {editItem?.id ? t('update') : t('add')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDataTable; 