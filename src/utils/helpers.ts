import { useT } from '@/utils/locales';

export const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
};

export const getTradeStatus = (status: number, t: (key: string) => string): { text: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' } => {
    switch (status) {
      case 0: return { text: t('status_pending'), variant: 'default' };
      case 1: return { text: t('status_open'), variant: 'default' };
      case 2: return { text: t('status_completed'), variant: 'outline' };
      case 3: return { text: t('status_error'), variant: 'destructive' };
      case 4: return { text: t('status_cancelled'), variant: 'destructive' };
      default: return { text: t('status_unknown'), variant: 'secondary' };
    }
};

export const formatNumberByDigits = (price: number | undefined | null, digits: number | undefined | null) => {
    if (price === undefined || price === null) return "-";
    const numPrice = Number(price);
    if (isNaN(numPrice)) return "-";
  
    const effectiveDigits = (digits !== undefined && digits !== null && digits >= 0) ? digits : 5;
    return numPrice.toFixed(effectiveDigits);
}; 