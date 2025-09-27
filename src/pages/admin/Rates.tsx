import React, { useEffect, useState, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Rate {
  symbol: string;
  price: number;
  digits: number;
  vdigits: number;
  stepSize: number;
  tickSize: number;
  dates: string;
}

const Rates: React.FC = () => {
  const [rates, setRates] = useState<Rate[]>([]);
  const prevPricesRef = useRef<{[symbol: string]: number}>({});

  const fetchRates = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/rates`);
      if (!response.ok) {
        console.error("API'den veri çekilemedi");
        return;
      }
      const data: Rate[] = await response.json();
      
      // Sembol ismine göre alfabetik olarak sırala
      data.sort((a, b) => a.symbol.localeCompare(b.symbol));

      const prevPrices = prevPricesRef.current;

      data.forEach(rate => {
        const prevPrice = prevPrices[rate.symbol];
        const priceCell = document.getElementById(`price-cell-${rate.symbol}`);

        if (priceCell && prevPrice !== undefined) {
          // Önceki animasyon sınıflarını temizle
          priceCell.classList.remove('animate-fade-green', 'animate-flash-red');
          // Tarayıcının değişikliği algılaması için kısa bir bekleme (reflow)
          void priceCell.offsetWidth; 

          if (rate.price > prevPrice) {
            priceCell.classList.add('animate-fade-green');
          } else if (rate.price < prevPrice) {
            priceCell.classList.add('animate-flash-red');
          }
        }
      });
      
      setRates(data);
      
      const newPrices: {[symbol: string]: number} = {};
      data.forEach(rate => {
        newPrices[rate.symbol] = rate.price;
      });
      prevPricesRef.current = newPrices;

    } catch (error) {
      console.error("Rates verisi işlenirken hata:", error);
    }
  };

  useEffect(() => {
    fetchRates();
    const intervalId = setInterval(fetchRates, 3000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Canlı Fiyatlar</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sembol</TableHead>
            <TableHead>Fiyat</TableHead>
            <TableHead>Güncellenme</TableHead>
            <TableHead>Digits</TableHead>
            <TableHead>VDigits</TableHead>
            <TableHead>StepSize</TableHead>
            <TableHead>TickSize</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rates.map((rate) => (
            <TableRow key={rate.symbol}>
              <TableCell>{rate.symbol}</TableCell>
              <TableCell id={`price-cell-${rate.symbol}`}>{rate.price}</TableCell>
              <TableCell>{new Date(rate.dates).toLocaleString('tr-TR')}</TableCell>
              <TableCell>{rate.digits}</TableCell>
              <TableCell>{rate.vdigits}</TableCell>
              <TableCell>{rate.stepSize}</TableCell>
              <TableCell>{rate.tickSize}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <style>{`
        @keyframes fade-green {
          from { background-color: rgba(0, 255, 0, 0.5); }
          to { background-color: transparent; }
        }
        .animate-fade-green {
          animation: fade-green 1s ease-out;
        }
        @keyframes flash-red {
          0%, 100% { background-color: transparent; }
          25%, 75% { background-color: rgba(255, 0, 0, 0.7); }
        }
        .animate-flash-red {
          animation: flash-red 1s;
        }
      `}</style>
    </div>
  );
}

export default Rates; 