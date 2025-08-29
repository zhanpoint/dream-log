import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';

export const useWebSocket = (url) => {
    const [connectionState, setConnectionState] = useState('Disconnected');
    const [lastMessage, setLastMessage] = useState(null);
    const { token } = useAuth();
    const ws = useRef(null);
    const reconnectTimer = useRef(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000;

    const connect = useCallback(() => {
        if (!url) {
            console.error('WebSocket: No URL provided');
            setConnectionState('Error');
            return;
        }

        if (!token) {
            console.warn('WebSocket: No token available, waiting...');
            setConnectionState('Disconnected');
            return;
        }

        try {
            // 在URL中添加JWT Token作为查询参数
            const wsUrl = `${url}?token=${token}`;
            console.log('WebSocket: Attempting to connect to:', url);

            setConnectionState('Connecting');
            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                console.log('WebSocket connected to:', url);
                setConnectionState('Connected');
                reconnectAttempts.current = 0;
            };

            ws.current.onmessage = (event) => {
                setLastMessage(event);
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                setConnectionState('Error');
            };

            ws.current.onclose = (event) => {
                console.log('WebSocket disconnected:', event.code, event.reason);
                setConnectionState('Disconnected');

                // 自动重连
                if (reconnectAttempts.current < maxReconnectAttempts) {
                    reconnectTimer.current = setTimeout(() => {
                        reconnectAttempts.current++;
                        console.log(`WebSocket reconnecting... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
                        connect();
                    }, reconnectDelay);
                } else {
                    console.log('WebSocket: Max reconnection attempts reached');
                }
            };
        } catch (error) {
            console.error('WebSocket connection error:', error);
            setConnectionState('Error');
        }
    }, [url, token]);

    const disconnect = useCallback(() => {
        if (reconnectTimer.current) {
            clearTimeout(reconnectTimer.current);
            reconnectTimer.current = null;
        }

        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }
    }, []);

    const sendMessage = useCallback((message) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(message);
        } else {
            console.error('WebSocket is not connected');
        }
    }, []);

    // 连接管理
    useEffect(() => {
        connect();

        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    // 心跳检测
    useEffect(() => {
        const interval = setInterval(() => {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                sendMessage(JSON.stringify({
                    type: 'ping',
                    timestamp: Date.now()
                }));
            }
        }, 30000); // 每30秒发送一次心跳

        return () => clearInterval(interval);
    }, [sendMessage]);

    return {
        connectionState,
        lastMessage,
        sendMessage,
        connect,
        disconnect
    };
};
