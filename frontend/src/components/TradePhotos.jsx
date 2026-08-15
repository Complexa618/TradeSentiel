import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Upload, X, Trash2, ChevronLeft, ChevronRight, ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const photoSrc = (p) => (p?.file_url ? `${BACKEND}${p.file_url}` : p?.preview);

// Fullscreen lightbox with prev/next, counter, keyboard controls
export function Lightbox({ items, index, onClose, onIndex }) {
  const i = index;
  const go = useCallback((d) => onIndex((i + d + items.length) % items.length), [i, items.length, onIndex]);
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [go, onClose]);
  if (index == null || !items[i]) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in-0" onClick={onClose}>
      <button className="absolute top-5 right-5 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition" onClick={onClose}><X className="h-5 w-5" /></button>
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-sm text-gray-300 font-mono-num">{i + 1} / {items.length}</div>
      {items.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); go(-1); }} className="absolute left-4 md:left-8 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"><ChevronLeft className="h-6 w-6" /></button>
          <button onClick={(e) => { e.stopPropagation(); go(1); }} className="absolute right-4 md:right-8 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"><ChevronRight className="h-6 w-6" /></button>
        </>
      )}
      <img src={photoSrc(items[i])} alt="trade chart" onClick={(e) => e.stopPropagation()}
        className="max-h-[86vh] max-w-[92vw] rounded-xl border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200" />
    </div>
  );
}

export default function TradePhotos({ tradeId = null, pending, onPending }) {
  const { listPhotos, uploadPhotos, deletePhoto } = useApp();
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [light, setLight] = useState(null);
  const fileRef = useRef();
  const serverMode = !!tradeId;

  useEffect(() => {
    if (serverMode) listPhotos(tradeId).then(setPhotos).catch(() => {});
  }, [tradeId, serverMode, listPhotos]);

  const validate = (files) => {
    const ok = [];
    for (const f of files) {
      if (!ALLOWED.includes(f.type)) { toast.error(`${f.name}: unsupported type (use JPG, PNG, WebP)`); continue; }
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} exceeds 10MB`); continue; }
      ok.push(f);
    }
    return ok;
  };

  const handleFiles = async (fileList) => {
    const files = validate(Array.from(fileList));
    if (!files.length) return;
    if (serverMode) {
      setBusy(true);
      try {
        const added = await uploadPhotos(tradeId, files);
        setPhotos((p) => [...p, ...added]);
        toast.success(`${added.length} photo${added.length > 1 ? 's' : ''} uploaded`);
      } catch (e) { toast.error(e?.response?.data?.detail || 'Upload failed'); }
      finally { setBusy(false); }
    } else {
      const previews = files.map((f) => ({ id: `local_${Math.random().toString(36).slice(2)}`, file: f, preview: URL.createObjectURL(f), name: f.name }));
      onPending([...(pending || []), ...previews]);
    }
  };

  const removePending = (id) => onPending((pending || []).filter((x) => x.id !== id));
  const removeServer = async (id) => {
    setPhotos((p) => p.filter((x) => x.id !== id));
    try { await deletePhoto(id); toast.success('Photo deleted'); } catch { toast.error('Delete failed'); }
  };

  const items = serverMode ? photos : (pending || []);

  return (
    <div>
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        className={`cursor-pointer rounded-xl border border-dashed px-4 py-6 flex flex-col items-center gap-2 transition ${drag ? 'border-emerald-500/60 bg-emerald-500/[0.06]' : 'border-white/15 hover:border-emerald-500/40 hover:bg-white/[0.02]'}`}
      >
        {busy ? <Loader2 className="h-5 w-5 text-emerald-400 animate-spin" /> : <Upload className="h-5 w-5 text-gray-500" />}
        <span className="text-sm text-gray-400">{busy ? 'Uploading…' : 'Drop screenshots or'} <span className="text-emerald-400 font-medium">click to add photos</span></span>
        <span className="text-[11px] text-gray-600">JPG, PNG, WebP · up to 10MB · multiple allowed</span>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />

      {items.length > 0 && (
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
          {items.map((p, idx) => (
            <div key={p.id} className="group relative aspect-square rounded-lg overflow-hidden border border-white/10">
              <img src={photoSrc(p)} alt="" onClick={() => setLight(idx)} className="h-full w-full object-cover cursor-zoom-in transition group-hover:scale-105" />
              <button type="button" onClick={() => (serverMode ? removeServer(p.id) : removePending(p.id))}
                className="absolute top-1 right-1 h-6 w-6 rounded-md bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white hover:bg-red-500/80 transition"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      <Lightbox items={items} index={light} onClose={() => setLight(null)} onIndex={setLight} />
    </div>
  );
}
