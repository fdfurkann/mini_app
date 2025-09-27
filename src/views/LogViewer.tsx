import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

const LogViewer: React.FC = () => {
    const { filename } = useParams<{ filename: string }>();
    const [logs, setLogs] = useState<string[]>([]);
    const [retry, setRetry] = useState(0);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState(true);

    // Scroll pozisyonunu takip et
    useEffect(() => {
        const onScroll = () => {
            if (!containerRef.current) return;
            const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
            // Kullanıcı en altta mı?
            if (scrollHeight - scrollTop - clientHeight < 5) {
                setAutoScroll(true);
            } else {
                setAutoScroll(false);
            }
        };
        const ref = containerRef.current;
        if (ref) ref.addEventListener('scroll', onScroll);
        return () => { if (ref) ref.removeEventListener('scroll', onScroll); };
    }, []);

    useEffect(() => {
        if (!filename) return;
        setLogs([]);
        const baseUrl = import.meta.env.VITE_API_URL.endsWith('/api')
            ? import.meta.env.VITE_API_URL.slice(0, -4)
            : import.meta.env.VITE_API_URL;
        const eventSource = new EventSource(`${baseUrl}/api/stream_logs/${filename}`);
        eventSource.onopen = () => { console.log('Connection to log stream opened.'); };
        eventSource.onmessage = (event) => { setLogs(prevLogs => [...prevLogs, event.data]); };
        eventSource.onerror = (err) => {
            console.error('EventSource failed:', err);
            setLogs(prevLogs => [...prevLogs, `--- Bağlantı hatası: Yeniden deneniyor... ---`]);
            eventSource.close();
            setTimeout(() => setRetry(r => r + 1), 2000);
        };
        return () => { eventSource.close(); };
    }, [filename, retry]);

    useEffect(() => {
        if (autoScroll && containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    return (
        <div
            ref={containerRef}
            style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                fontFamily: 'monospace',
                fontSize: '12px',
                padding: '20px',
                height: 'calc(100vh - 40px)',
                overflowY: 'auto',
                border: '1px solid #ccc'
            }}
        >
            <h1 style={{
                color: '#333',
                fontSize: '16px',
                borderBottom: '1px solid #eee',
                paddingBottom: '10px',
                marginBottom: '10px'
            }}>
                Log File: <span style={{ fontWeight: 'bold' }}>{filename}</span>
            </h1>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
                {logs.join('\n')}
                <div ref={logsEndRef} />
            </pre>
        </div>
    );
};

export default LogViewer; 