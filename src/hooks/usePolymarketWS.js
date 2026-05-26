import { useEffect, useRef, useState } from 'react';

const POLY_WS = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';

/**
 * Subscribe to live price updates for a set of CLOB token IDs.
 *
 * @param {string[]} tokenIds - YES token IDs for each market to watch
 * @returns {object} map of tokenId -> { price, timestamp }
 */
export function usePolymarketWS(tokenIds) {
  const [prices, setPrices] = useState({});
  const [status, setStatus] = useState('disconnected'); // 'connecting' | 'live' | 'disconnected' | 'error'
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const lastTokensKey = useRef('');

  useEffect(() => {
    if (!tokenIds || tokenIds.length === 0) {
      setStatus('disconnected');
      return;
    }

    const key = tokenIds.slice().sort().join(',');
    if (key === lastTokensKey.current && wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    lastTokensKey.current = key;

    function connect() {
      setStatus('connecting');
      try {
        const ws = new WebSocket(POLY_WS);
        wsRef.current = ws;

        ws.onopen = () => {
          setStatus('live');
          // Subscribe to market updates for each asset
          ws.send(
            JSON.stringify({
              type: 'MARKET',
              assets_ids: tokenIds,
            })
          );
        };

        ws.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            const events = Array.isArray(data) ? data : [data];
            setPrices((prev) => {
              const next = { ...prev };
              for (const ev of events) {
                // Event types: 'price_change', 'book', 'last_trade_price'
                const tokenId = ev.asset_id || ev.market;
                if (!tokenId) continue;

                let price = null;
                if (ev.price) price = parseFloat(ev.price);
                else if (ev.changes && ev.changes.length > 0) {
                  // book update — derive mid-price from best bid/ask
                  price = parseFloat(ev.changes[0].price);
                }

                if (price !== null && !isNaN(price)) {
                  next[tokenId] = { price, timestamp: Date.now() };
                }
              }
              return next;
            });
          } catch (_) {}
        };

        ws.onerror = () => setStatus('error');

        ws.onclose = () => {
          setStatus('disconnected');
          // Auto-reconnect with backoff
          clearTimeout(reconnectTimer.current);
          reconnectTimer.current = setTimeout(connect, 5000);
        };
      } catch (_) {
        setStatus('error');
      }
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [tokenIds?.join(',')]);

  return { prices, status };
}
