import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SupportBot() {
  const [messages, setMessages] = useState<{role: 'user'|'assistant', content: string}[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const userId =
        localStorage.getItem('user_id') ||
        localStorage.getItem('telegramId') ||
        localStorage.getItem('id') ||
        sessionStorage.getItem('user_id') ||
        sessionStorage.getItem('telegramId') ||
        sessionStorage.getItem('id');
      const res = await fetch("/api/adminsupportbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg], user_id: userId, mode: 'agent' })
      });
      if (!res.ok) {
        // try to read server error body
        let errText = await res.text().catch(() => 'Sunucudan cevap alınamadı.');
        try {
          const parsed = JSON.parse(errText);
          errText = parsed.message || JSON.stringify(parsed);
        } catch (_) {}
        setMessages((prev) => [...prev, { role: 'assistant', content: `Sunucu hatası: ${errText}` }]);
        return;
      }
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        // server returned non-json
        setMessages((prev) => [...prev, { role: 'assistant', content: `Sunucudan beklenmeyen cevap: ${text.substring(0,200)}` }]);
        return;
      }
      const aiMsg = data.choices?.[0]?.message?.content || "Cevap alınamadı.";
      setMessages((prev) => [...prev, { role: 'assistant', content: aiMsg }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `İstek hatası: ${err?.message || String(err)}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-white"
         style={{ paddingTop: '56px', paddingLeft: '0', paddingRight: '0', paddingBottom: '0' }}>
      <div
        className="flex-1 flex flex-col w-full h-full border-none rounded-none shadow-none bg-gray-50"
        style={{
          padding: '4px',
          paddingTop: '0',
          paddingLeft: '0',
          height: 'calc(100vh - 56px)',
          '@media (min-width: 1024px)': {
            paddingLeft: '220px',
            height: '100vh',
          }
        }}
      >
        <div className="flex-1 overflow-y-auto p-1 md:p-2 lg:p-4">
          {messages.length === 0 && <div className="text-gray-400 text-center mt-10">Sorunuzu yazın, yapay zeka cevaplasın.</div>}
          {messages.map((msg, i) => (
            <div key={i} className={`mb-2 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}> 
              <div className={`rounded-lg px-3 py-2 max-w-[80%] ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'}`}>
                {msg.role === 'assistant'
                  ? msg.content.split('\n').map((line, idx) => (
                      <React.Fragment key={idx}>
                        {line}
                        {idx !== msg.content.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))
                  : msg.content}
              </div>
            </div>
          ))}
          {loading && <div className="text-gray-400 text-center">Yanıt bekleniyor...</div>}
        </div>
        <div className="p-3 border-t bg-white flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
            placeholder="Mesajınızı yazın..."
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={loading || !input.trim()} className="bg-blue-500 hover:bg-blue-600">Gönder</Button>
        </div>
      </div>
    </div>
  );
}