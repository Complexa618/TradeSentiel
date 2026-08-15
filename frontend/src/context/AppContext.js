import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const TOKEN_KEY = 'ts_token';

const api = axios.create({ baseURL: API });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const emptyData = () => ({ trades: [], accounts: [], goals: [], settings: { hideBalance: false, hideUsername: false } });
const errMsg = (e) => e?.response?.data?.detail || 'Something went wrong. Please try again.';

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(emptyData());
  const [ready, setReady] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await api.get('/data');
    setData({ ...emptyData(), ...res.data });
  }, []);

  // Restore session on load
  useEffect(() => {
    (async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        try {
          const me = await api.get('/auth/me');
          setUser(me.data.user);
          await fetchData();
        } catch {
          localStorage.removeItem(TOKEN_KEY);
        }
      }
      setReady(true);
    })();
  }, [fetchData]);

  const signup = useCallback(async ({ name, email, password }) => {
    try {
      const res = await api.post('/auth/signup', { name, email, password });
      localStorage.setItem(TOKEN_KEY, res.data.token);
      setUser(res.data.user);
      await fetchData();
      return { ok: true };
    } catch (e) { return { error: errMsg(e) }; }
  }, [fetchData]);

  const login = useCallback(async ({ email, password }) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem(TOKEN_KEY, res.data.token);
      setUser(res.data.user);
      await fetchData();
      return { ok: true };
    } catch (e) { return { error: errMsg(e) }; }
  }, [fetchData]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setData(emptyData());
  }, []);

  const addTrade = useCallback(async (trade) => {
    const res = await api.post('/trades', trade);
    setData((d) => ({ ...d, trades: [res.data, ...d.trades] }));
    toast.success('Trade saved');
    return res.data;
  }, []);

  const updateTrade = useCallback(async (id, patch) => {
    const res = await api.put(`/trades/${id}`, patch);
    setData((d) => ({ ...d, trades: d.trades.map((t) => (t.id === id ? res.data : t)) }));
    toast.success('Trade updated');
  }, []);

  const deleteTrade = useCallback(async (id) => {
    setData((d) => ({ ...d, trades: d.trades.filter((t) => t.id !== id) }));
    try { await api.delete(`/trades/${id}`); toast.success('Trade deleted'); } catch { fetchData(); }
  }, [fetchData]);

  const loadDemo = useCallback(async () => {
    const res = await api.post('/trades/demo');
    setData({ ...emptyData(), ...res.data });
    toast.success('Demo data loaded');
  }, []);

  const clearData = useCallback(async () => {
    await api.delete('/trades');
    setData((d) => ({ ...d, trades: [], accounts: [] }));
    toast.success('Journal cleared');
  }, []);

  const addAccount = useCallback(async (acc) => {
    const res = await api.post('/accounts', acc);
    setData((d) => ({ ...d, accounts: [...d.accounts, res.data] }));
  }, []);

  const deleteAccount = useCallback(async (id) => {
    setData((d) => ({ ...d, accounts: d.accounts.filter((a) => a.id !== id) }));
    try { await api.delete(`/accounts/${id}`); } catch { fetchData(); }
  }, [fetchData]);

  const updateGoal = useCallback(async (id, patch) => {
    setData((d) => {
      const goals = d.goals.map((g) => (g.id === id ? { ...g, ...patch } : g));
      api.put('/goals', goals).catch(() => {});
      return { ...d, goals };
    });
  }, []);

  // Persist the full goals array to the backend (used by Edit Goals). Returns {ok}|{error}.
  const saveGoals = useCallback(async (goals) => {
    try {
      const res = await api.put('/goals', goals);
      const saved = Array.isArray(res.data) ? res.data : goals;
      setData((d) => ({ ...d, goals: saved }));
      toast.success('Goals updated');
      return { ok: true };
    } catch (e) {
      toast.error('Unable to update goal. Please try again.');
      return { error: errMsg(e) };
    }
  }, []);

  const setSettings = useCallback(async (patch) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
    try { await api.put('/settings', patch); } catch { /* ignore */ }
  }, []);

  const fetchEconomicCalendar = useCallback(async () => {
    const res = await api.get('/economic-calendar');
    return res.data;
  }, []);

  const uploadPhotos = useCallback(async (tradeId, files) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    const res = await api.post(`/trades/${tradeId}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  }, []);
  const listPhotos = useCallback(async (tradeId) => (await api.get(`/trades/${tradeId}/photos`)).data, []);
  const deletePhoto = useCallback(async (id) => (await api.delete(`/photos/${id}`)).data, []);
  const reorderPhotos = useCallback(async (tradeId, ids) => (await api.put(`/trades/${tradeId}/photos/order`, ids)).data, []);

  const value = useMemo(() => ({
    user, data, ready,
    signup, login, logout,
    addTrade, updateTrade, deleteTrade, loadDemo, clearData,
    addAccount, deleteAccount, updateGoal, saveGoals, setSettings, fetchEconomicCalendar,
    uploadPhotos, listPhotos, deletePhoto, reorderPhotos,
  }), [user, data, ready, signup, login, logout, addTrade, updateTrade, deleteTrade, loadDemo, clearData, addAccount, deleteAccount, updateGoal, saveGoals, setSettings, fetchEconomicCalendar, uploadPhotos, listPhotos, deletePhoto, reorderPhotos]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
