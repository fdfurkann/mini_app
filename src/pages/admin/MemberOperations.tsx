import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCog } from "lucide-react";

const AdminMemberOperations: React.FC = () => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserCog className="w-5 h-5 text-primary" />
              <CardTitle>Üye İşlemleri</CardTitle>
            </div>
          </div>
          <CardDescription>
            Üye işlemlerini yönetebilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Bu sayfa henüz yapım aşamasındadır.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMemberOperations; 