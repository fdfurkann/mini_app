import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useLang } from '@/hooks/useLang';

const formSchema = z.object({
  telegram_id: z.string().min(1, 'Telegram ID zorunludur'),
  name: z.string().min(1, 'Ad zorunludur'),
  username: z.string().min(1, 'Kullanıcı adı zorunludur'),
  email: z.string().email('Geçerli bir email adresi girin').nullable(),
  email_verified_at: z.string().nullable(),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır').nullable(),
  is_vip: z.boolean(),
  vip_api: z.string().nullable(),
  remember_token: z.string().nullable(),
  last_command: z.string().nullable(),
  contract_accept: z.boolean(),
  deleted_at: z.string().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

const MemberEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLang();

  const { data: member, isLoading } = useQuery({
    queryKey: ['member', id],
    queryFn: async () => {
      const response = await fetch(`http://localhost:3000/api/admin/members/${id}`);
      if (!response.ok) {
        throw new Error('Üye bilgileri yüklenirken bir hata oluştu');
      }
      return response.json();
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: member || {
      telegram_id: '',
      name: '',
      username: '',
      email: null,
      email_verified_at: null,
      password: null,
      is_vip: false,
      vip_api: null,
      remember_token: null,
      last_command: null,
      contract_accept: false,
      deleted_at: null,
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = await fetch(`http://localhost:3000/api/admin/members/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        throw new Error('Üye güncellenirken bir hata oluştu');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member', id] });
      toast.success('Üye başarıyla güncellendi');
      navigate('/admin/members');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">{t('loading')}</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Üye Düzenle</h1>
        <Button variant="outline" onClick={() => navigate('/admin/members')}>
          Geri Dön
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="telegram_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telegram ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ad</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kullanıcı Adı</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şifre</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vip_api"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VIP API</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_vip"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0">
                    <FormLabel>VIP Üye</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contract_accept"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0">
                    <FormLabel>Sözleşme Kabul</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/members')}
              >
                İptal
              </Button>
              <Button type="submit">
                Kaydet
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default MemberEdit; 