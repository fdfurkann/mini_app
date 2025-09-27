import React, { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from '@/hooks/useLang';
import { CardHeader, CardTitle } from '@/components/ui/card';
import SubscriptionManager from '@/components/SubscriptionManager';

const SubscriptionPage = () => {
  const { t } = useLang();

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">{t('subscription_title')}</h1>
      <Suspense fallback={
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-[200px]" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[80%]" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      }>
        <SubscriptionManager />
      </Suspense>
    </>
  );
}; 

export default SubscriptionPage;
