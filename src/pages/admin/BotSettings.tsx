import AdminDataTable from "@/components/AdminDataTable";

const BotSettings = () => {
  const columns = [
    { key: "id", label: "ID" },
    { key: "setting_key", label: "Ayar Anahtarı" },
    { key: "setting_value", label: "Ayar Değeri" },
    { key: "description", label: "Açıklama" },
    { key: "created_at", label: "Oluşturma Tarihi" },
    { key: "updated_at", label: "Güncelleme Tarihi" }
  ];

  return (
    <AdminDataTable
      title="Bot Ayarları"
      endpoint="/api/bot-settings"
      columns={columns}
    />
  );
};

export default BotSettings; 