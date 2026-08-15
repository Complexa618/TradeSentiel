import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { Upload, X, Trash2, ChevronLeft, ChevronRight, Loader2, Play, Film } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const ALLOWED_IMAGE = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'];
const MAX_IMAGE = 15 * 1024 * 1024;
const MAX_VIDEO = 100 * 1024 * 1024;

export const photoSrc = (p) => (p?.file_url ? `${BACKEND}${p.file_url}` : p?.preview);
export const isVideoItem = (p) => p?.kind === 'video' || (p?.file && (p.file.type || '').startsWith('video/'));

// Fullscreen lightbox — portal to body so a transformed ancestor can't offset it.
export function Lightbox({ items, index, onClose, onIndex }) {
  const i = index;
  const go = useCallback((d) => onIndex((i + d + items.length) % items.length), [i, items.length, onIndex]);
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [go, onClose]);
  if (index == null || !items[i]) return null;
  const current = items[i];
  const video = isVideoItem(current);
  return createPortal(
    <div
      className="animate-in fade-in-0 duration-200"
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 9999, background: 'rgba(0,0,0,0.98)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {video ? (
          <video key={i} src={photoSrc(current)} controls autoPlay onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '92%', maxHeight: '92%', width: 'auto', height: 'auto', outline: 'none' }}
            className="rounded-lg animate-in zoom-in-95 fade-in-0 duration-200" />
        ) : (
          <img key={i} src={photoSrc(current)} alt="trade chart" onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain' }}
            className="animate-in zoom-in-95 fade-in-0 duration-200" />
        )}
      </div>

      <button className="absolute top-5 right-5 z-10 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Close" data-testid="lightbox-close"><X className="h-6 w-6" /></button>
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10 text-sm text-gray-300 font-mono-num bg-white/10 rounded-full px-3 py-1">{i + 1} / {items.length}</div>
      {items.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); go(-1); }} className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition" data-testid="lightbox-prev"><ChevronLeft className="h-7 w-7" /></button>
          <button onClick={(e) => { e.stopPropagation(); go(1); }} className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition" data-testid="lightbox-next"><ChevronRight className="h-7 w-7" /></button>
        </>
      )}
    </div>,
    document.body
  );
}

// Uniform thumbnail tile (image or video)
function MediaTile({ item, onOpen, onRemove }) {
  const video = isVideoItem(item);
  return (
    <figure className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10 bg-black/30 shadow-[0_8px_30px_-14px_rgba(0,0,0,0.8)]" data-testid="media-tile">
      {video ? (
        <video src={photoSrc(item)} preload="metadata" muted playsInline
          className="w-full h-full object-cover cursor-zoom-in transition duration-200 group-hover:brightness-110 group-hover:scale-[1.03]"
          onClick={onOpen} />
      ) : (
        <img src={photoSrc(item)} alt={item.file_name || 'trade media'} loading="lazy"
          className="w-full h-full object-cover cursor-zoom-in transition duration-200 group-hover:brightness-110 group-hover:scale-[1.03]"
          onClick={onOpen} />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-70 group-hover:opacity-100 transition" />

      {video && (
        <>
          <span className="pointer-events-none absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-semibold text-white/90 bg-black/55 rounded px-1.5 py-0.5">
            <Film className="h-3 w-3" /> VIDEO
          </span>
          <button onClick={onOpen} className="absolute inset-0 flex items-center justify-center" aria-label="Play video">
            <span className="h-12 w-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-emerald-500/80 transition">
              <Play className="h-5 w-5 translate-x-[1px]" fill="currentColor" />
            </span>
          </button>
        </>
      )}

      <button type="button" onClick={onRemove} data-testid="media-delete"
        className="absolute top-2 right-2 h-7 w-7 rounded-md bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white hover:bg-red-500/80 transition">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </figure>
  );
}

export default function TradePhotos({ tradeId = null, pending, onPending }) {
  const { listPhotos, uploadPhotos, deletePhoto } = useApp();
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
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
      const isImg = ALLOWED_IMAGE.includes(f.type);
      const isVid = ALLOWED_VIDEO.includes(f.type);
      if (!isImg && !isVid) { toast.error(`${f.name}: unsupported type (images or MP4/WebM video)`); continue; }
      const limit = isVid ? MAX_VIDEO : MAX_IMAGE;
      if (f.size > limit) { toast.error(`${f.name} exceeds ${limit / (1024 * 1024)}MB`); continue; }
      ok.push(f);
    }
    return ok;
  };

  const handleFiles = async (fileList) => {
    const files = validate(Array.from(fileList));
    if (!files.length) return;
    if (serverMode) {
      setBusy(true); setProgress(0);
      try {
        const added = await uploadPhotos(tradeId, files, setProgress);
        setPhotos((p) => [...p, ...added]);
        toast.success(`${added.length} file${added.length > 1 ? 's' : ''} uploaded`);
      } catch (e) { toast.error(e?.response?.data?.detail || 'Upload failed'); }
      finally { setBusy(false); setProgress(0); }
    } else {
      const previews = files.map((f) => ({
        id: `local_${Math.random().toString(36).slice(2)}`,
        file: f, preview: URL.createObjectURL(f), name: f.name,
        kind: (f.type || '').startsWith('video/') ? 'video' : 'image',
      }));
      onPending([...(pending || []), ...previews]);
    }
  };

  const removePending = (id) => onPending((pending || []).filter((x) => x.id !== id));
  const removeServer = async (id) => {
    setPhotos((p) => p.filter((x) => x.id !== id));
    try { await deletePhoto(id); toast.success('Deleted'); } catch { toast.error('Delete failed'); }
  };

  const items = serverMode ? photos : (pending || []);

  return (
    <div>
      <div
        onClick={() => !busy && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        data-testid="media-dropzone"
        className={`relative cursor-pointer rounded-xl border border-dashed px-4 py-6 flex flex-col items-center gap-2 transition overflow-hidden ${drag ? 'border-emerald-500/60 bg-emerald-500/[0.06]' : 'border-white/15 hover:border-emerald-500/40 hover:bg-white/[0.02]'}`}
      >
        {busy ? <Loader2 className="h-5 w-5 text-emerald-400 animate-spin" /> : <Upload className="h-5 w-5 text-gray-500" />}
        <span className="text-sm text-gray-400">{busy ? `Uploading… ${progress}%` : 'Drop screenshots or video, or'} {!busy && <span className="text-emerald-400 font-medium">click to add media</span>}</span>
        <span className="text-[11px] text-gray-600">Images up to 15MB · Video (MP4/WebM) up to 100MB · multiple allowed</span>
        {busy && (
          <div className="absolute bottom-0 left-0 h-1 bg-emerald-400 transition-all duration-150" style={{ width: `${progress}%` }} />
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} data-testid="media-file-input" />

      {items.length > 0 && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {items.map((p, idx) => (
            <MediaTile
              key={p.id}
              item={p}
              onOpen={() => setLight(idx)}
              onRemove={() => (serverMode ? removeServer(p.id) : removePending(p.id))}
            />
          ))}
        </div>
      )}

      <Lightbox items={items} index={light} onClose={() => setLight(null)} onIndex={setLight} />
    </div>
  );
}
