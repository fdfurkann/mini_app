import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ApiKey, Exchange, generateMockApiKeys } from "@/utils/types";
import { Plus, Trash, Edit, Key, CheckCircle, AlertTriangle, Link as LinkIcon, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiKeys, addApiKey, updateApiKey, deleteApiKey } from "@/services/api";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

import { useLang } from '@/hooks/useLang';

const ApiKeyManager: React.FC<{ userId: number }> = ({ userId }) => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    exchange: Exchange.BINANCE,
    apiKey: "",
    secretKey: "",
    isActive: true,
  });
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { lang } = useLang();
  const { t } = useLang();

  useEffect(() => {
    loadApiKeys();
  }, [userId]);

  const loadApiKeys = async () => {
    try {
      const keys = await getApiKeys(userId);
      setApiKeys(keys);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      toast({
        title: "Error",
        description: "API anahtarları yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSelectChange = (value: string) => {
    setFormData({
      ...formData,
      exchange: value as Exchange,
    });
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData({
      ...formData,
      isActive: checked,
    });
  };

  const handleAddKey = async () => {
    try {
      const newKey = await addApiKey(
        userId,
        formData.name,
        formData.apiKey,
        formData.secretKey
      );

      setApiKeys([...apiKeys, newKey]);
      setIsAddDialogOpen(false);
      resetForm();
      
      toast({
        title: "API Key Added",
        description: `${formData.name} başarıyla eklendi.`,
      });
    } catch (error) {
      console.error('Failed to add API key:', error);
      toast({
        title: "Error",
        description: "API anahtarı eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleEditKey = async () => {
    if (!selectedKey) return;

    try {
      const updatedKey = await updateApiKey(
        userId,
        parseInt(selectedKey.id),
        formData.name,
        formData.apiKey,
        formData.secretKey
      );

      const updatedKeys = apiKeys.map((key) =>
        key.id === selectedKey.id ? updatedKey : key
      );

      setApiKeys(updatedKeys);
      setIsEditDialogOpen(false);
      resetForm();
      
      toast({
        title: "API Key Updated",
        description: `${formData.name} başarıyla güncellendi.`,
      });
    } catch (error) {
      console.error('Failed to update API key:', error);
      toast({
        title: "Error",
        description: "API anahtarı güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteKey = async () => {
    if (!selectedKey) return;

    try {
      await deleteApiKey(userId, parseInt(selectedKey.id));
      
      const updatedKeys = apiKeys.filter((key) => key.id !== selectedKey.id);
      setApiKeys(updatedKeys);
      setIsDeleteDialogOpen(false);
      
      toast({
        title: "API Key Deleted",
        description: `${selectedKey.name} başarıyla silindi.`,
        variant: "destructive",
      });
    } catch (error) {
      console.error('Failed to delete API key:', error);
      toast({
        title: "Error",
        description: "API anahtarı silinirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (key: ApiKey) => {
    setSelectedKey(key);
    setFormData({
      name: key.name,
      exchange: key.exchange,
      apiKey: key.apiKey,
      secretKey: key.secretKey,
      isActive: key.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (key: ApiKey) => {
    setSelectedKey(key);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      exchange: Exchange.BINANCE,
      apiKey: "",
      secretKey: "",
      isActive: true,
    });
    setSelectedKey(null);
  };

  const verifyApiKey = (key: ApiKey) => {
    toast({
      title: "Verifying API Key",
      description: "Checking connection to exchange...",
    });
    
    // Simulate verification
    setTimeout(() => {
      toast({
        title: "API Key Verified",
        description: "Connection to exchange is successful.",
      });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t('apiKeys')}</h2>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/api-keys/new")} size="sm">
            <Plus size={16} className="mr-1" />
            {t('addNew')}
          </Button>
        </div>
      </div>

      {/* API Key Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {apiKeys.map((key) => (
          <Card key={key.id} className={`border ${key.isActive ? 'border-primary/30' : 'border-border'} transition-colors`}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-1.5">
                    {key.name}
                    {key.isActive && (
                      <span className="inline-block w-2 h-2 rounded-full bg-signal-success"></span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {key.exchange} • {t('addedOn')} {key.createdAt.toLocaleDateString()}
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/settings?api=${key.id}`)}
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Settings size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(key)}
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openDeleteDialog(key)}
                  >
                    <Trash size={16} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('apiKey')}:</span>
                  <span className="font-mono">
                    {key.apiKey.substring(0, 4)}...
                    {key.apiKey.substring(key.apiKey.length - 4)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('secretKey')}:</span>
                  <span className="font-mono">••••••••••••••••</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => verifyApiKey(key)}
              >
                <CheckCircle size={14} className="mr-1" />
                {t('verify')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <LinkIcon size={14} className="mr-1" />
                {t('permissions')}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('editApiKey')}</DialogTitle>
            <DialogDescription>
              {t('updateApiKeySettings')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">{t('keyName')}</Label>
              <Input
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-exchange">{t('exchange')}</Label>
              <Select
                value={formData.exchange}
                onValueChange={handleSelectChange}
              >
                <SelectTrigger id="edit-exchange">
                  <SelectValue placeholder={t('selectExchange')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Exchange.BINANCE}>Binance</SelectItem>
                  <SelectItem value={Exchange.BYBIT}>Bybit</SelectItem>
                  <SelectItem value={Exchange.BINGX}>BingX</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-apiKey">{t('apiKey')}</Label>
              <Input
                id="edit-apiKey"
                name="apiKey"
                value={formData.apiKey}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-secretKey">{t('secretKey')}</Label>
              <Input
                id="edit-secretKey"
                name="secretKey"
                type="password"
                value={formData.secretKey}
                onChange={handleInputChange}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={handleSwitchChange}
              />
              <Label htmlFor="edit-isActive">{t('active')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleEditKey}>{t('saveChanges')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('deleteApiKey')}</DialogTitle>
            <DialogDescription>
              {t('deleteApiKeyConfirm')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center p-4 border rounded-md bg-secondary/30 gap-3">
            <AlertTriangle className="text-signal-warning" size={20} />
            <div className="text-sm">
              <p className="font-medium">{selectedKey?.name}</p>
              <p className="text-muted-foreground">{selectedKey?.exchange}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteKey}>
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApiKeyManager;
