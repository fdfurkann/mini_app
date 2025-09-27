import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { TradeData } from './TradeHistoryUtils';

interface TradeHistoryDialogsProps {
  isEditDialogOpen: boolean;
  setIsEditDialogOpen: (open: boolean) => void;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (open: boolean) => void;
  isAddSignalDialogOpen: boolean;
  setIsAddSignalDialogOpen: (open: boolean) => void;
  formData: TradeData;
  setFormData: (data: TradeData) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectChange: (value: string) => void;
  handleEditTrade: () => void;
  selectedTrade: TradeData | null;
  handleDeleteTrade: () => void;
  signalFormData: any;
  handleSignalFormSubmit: (e: React.FormEvent) => void;
  handleSignalInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  t: any;
}

const TradeHistoryDialogs: React.FC<TradeHistoryDialogsProps> = ({
  isEditDialogOpen,
  setIsEditDialogOpen,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  isAddSignalDialogOpen,
  setIsAddSignalDialogOpen,
  formData,
  setFormData,
  handleInputChange,
  handleSelectChange,
  handleEditTrade,
  selectedTrade,
  handleDeleteTrade,
  signalFormData,
  handleSignalFormSubmit,
  handleSignalInputChange,
  t
}) => (
  <>
    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('editTrade')}</DialogTitle>
          <DialogDescription>
            {t('updateTradeDetails')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-symbol">{t('symbol')}</Label>
            <Input
              id="edit-symbol"
              name="symbol"
              value={formData.symbol}
              onChange={handleInputChange}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-type">{t('type')}</Label>
            <Select
              value={formData.side}
              onValueChange={handleSelectChange}
            >
              <SelectTrigger id="edit-type">
                <SelectValue placeholder={t('selectTradeType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUY">{t('long')}</SelectItem>
                <SelectItem value="SELL">{t('short')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-entryPrice">{t('entryPrice')}</Label>
            <Input
              id="edit-entryPrice"
              name="openPrice"
              type="number"
              value={formData.openPrice}
              onChange={handleInputChange}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-exitPrice">{t('exitPrice')}</Label>
            <Input
              id="edit-exitPrice"
              name="closePrice"
              type="number"
              value={formData.closePrice}
              onChange={handleInputChange}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-profit">{t('profit')}</Label>
            <Input
              id="edit-profit"
              name="profit"
              type="number"
              value={formData.profit}
              onChange={handleInputChange}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-closeDate">{t('closeDate')}</Label>
            <Input
              id="edit-closeDate"
              name="closeTime"
              type="date"
              value={formData.closeTime}
              onChange={handleInputChange}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleEditTrade}>{t('saveChanges')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('deleteTrade')}</DialogTitle>
          <DialogDescription>
            {t('deleteTradeConfirm')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center p-4 border rounded-md bg-secondary/30 gap-3">
          <AlertTriangle className="text-signal-warning" size={20} />
          <div className="text-sm">
            <p className="font-medium">{selectedTrade?.symbol}</p>
            <p className="text-muted-foreground">{selectedTrade?.side === "BUY" ? t('long') : t('short')}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
            {t('cancel')}
          </Button>
          <Button variant="destructive" onClick={handleDeleteTrade}>
            {t('delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={isAddSignalDialogOpen} onOpenChange={setIsAddSignalDialogOpen}>
      <DialogContent className="sm:max-w-xs p-3 text-[13px]" style={{ width: 350 }}>
        <DialogHeader>
          <DialogTitle className="text-base mb-1">{t('addNewSignal')}</DialogTitle>
          <DialogDescription className="text-xs mb-2">
            {t('fillSignalDetails')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSignalFormSubmit}>
          <div className="grid gap-2 py-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="symbol" className="text-xs w-20 mb-0">Parite</Label>
              <Input
                id="symbol"
                name="symbol"
                value={signalFormData.symbol}
                onChange={handleSignalInputChange}
                placeholder="BTCUSDT"
                required
                className="h-7 px-2 py-1 text-xs flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="trend" className="text-xs w-20 mb-0">Trend</Label>
              <Select
                value={signalFormData.trend}
                onValueChange={(value) => handleSignalInputChange({ target: { name: 'trend', value } } as any)}
              >
                <SelectTrigger id="trend" className="h-7 px-2 py-1 text-xs flex-1">
                  <SelectValue placeholder={t('selectTrend')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY" className="text-xs">{t('long')}</SelectItem>
                  <SelectItem value="SELL" className="text-xs">{t('short')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="slPercentage" className="text-xs w-20 mb-0">SL %</Label>
              <Input
                id="slPercentage"
                name="slPercentage"
                value={signalFormData.slPercentage}
                onChange={handleSignalInputChange}
                placeholder="0.5"
                className="h-7 px-2 py-1 text-xs flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="entryRangePercentage" className="text-xs w-20 mb-0">Entry %</Label>
              <Input
                id="entryRangePercentage"
                name="entryRangePercentage"
                value={signalFormData.entryRangePercentage}
                onChange={handleSignalInputChange}
                placeholder="0.2"
                className="h-7 px-2 py-1 text-xs flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="tpCount" className="text-xs w-20 mb-0">TP Adet</Label>
              <Input
                id="tpCount"
                name="tpCount"
                value={signalFormData.tpCount}
                onChange={handleSignalInputChange}
                placeholder="1"
                className="h-7 px-2 py-1 text-xs flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="tpRangePercentage" className="text-xs w-20 mb-0">TP %</Label>
              <Input
                id="tpRangePercentage"
                name="tpRangePercentage"
                value={signalFormData.tpRangePercentage}
                onChange={handleSignalInputChange}
                placeholder="1.2"
                className="h-7 px-2 py-1 text-xs flex-1"
              />
            </div>
          </div>
          <DialogFooter className="mt-2 flex gap-2 justify-end">
            <Button variant="outline" type="button" onClick={() => setIsAddSignalDialogOpen(false)} className="h-7 px-3 py-1 text-xs min-w-0">{t('cancel')}</Button>
            <Button type="submit" className="h-7 px-3 py-1 text-xs min-w-0">{t('save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>
);

export default TradeHistoryDialogs; 