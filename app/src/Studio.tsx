import { useEffect, useRef, useState } from "react";
import { ImagePlus, Wand2, CheckCircle2 } from "lucide-react";

const BACKEND = "http://127.0.0.1:8000";

type Rect = { x: number; y: number; w: number; h: number };

export default function Studio() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [backendOk, setBackendOk] = useState(false);
  const [status, setStatus] = useState("Проверяю backend…");

  const [file, setFile] = useState<File | null>(null);
  const [imgUrl, setImgUrl] = useState<string>("");
  const [rect, setRect] = useState<Rect | null>(null);
  const [drag, setDrag] = useState<{ sx: number; sy: number; active: boolean }>({ sx: 0, sy: 0, active: false });

  const [extractedUrl, setExtractedUrl] = useState("");

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch(`${BACKEND}/health`, { cache: "no-store" });
        if (r.ok) {
          setBackendOk(true);
          setStatus("Backend online");
          return;
        }
        setBackendOk(false);
        setStatus("Backend offline");
      } catch {
        setBackendOk(false);
        setStatus("Backend offline");
      }
    }, 800);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!imgUrl) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const c = canvasRef.current!;
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      drawRect(ctx, rect);
    };
    img.src = imgUrl;
  }, [imgUrl]);

  useEffect(() => {
    const c = canvasRef.current;
    const img = imgRef.current;
    if (!c || !img) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    drawRect(ctx, rect);
  }, [rect]);

  function drawRect(ctx: CanvasRenderingContext2D, r: Rect | null) {
    if (!r) return;
    ctx.save();
    ctx.strokeStyle = "rgba(198,161,91,0.95)";
    ctx.lineWidth = 4;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = "rgba(198,161,91,0.15)";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();
  }

  function mousePos(e: React.MouseEvent) {
    const c = canvasRef.current!;
    const b = c.getBoundingClientRect();
    const x = Math.round((e.clientX - b.left) * (c.width / b.width));
    const y = Math.round((e.clientY - b.top) * (c.height / b.height));
    return { x, y };
  }

  function onDown(e: React.MouseEvent) {
    const { x, y } = mousePos(e);
    setDrag({ sx: x, sy: y, active: true });
    setRect({ x, y, w: 1, h: 1 });
  }
  function onMove(e: React.MouseEvent) {
    if (!drag.active) return;
    const { x, y } = mousePos(e);
    const x0 = Math.min(drag.sx, x);
    const y0 = Math.min(drag.sy, y);
    const w = Math.max(1, Math.abs(x - drag.sx));
    const h = Math.max(1, Math.abs(y - drag.sy));
    setRect({ x: x0, y: y0, w, h });
  }
  function onUp() {
    setDrag((d) => ({ ...d, active: false }));
  }

  async function extract() {
    if (!backendOk) {
      setStatus("Backend offline. Запусти Start.bat.");
      return;
    }
    if (!file || !rect) {
      setStatus("Загрузи фото и обведи очки прямоугольником.");
      return;
    }
    setStatus("Extract…");
    setExtractedUrl("");

    const form = new FormData();
    form.append("image", file);
    form.append("x", String(rect.x));
    form.append("y", String(rect.y));
    form.append("w", String(rect.w));
    form.append("h", String(rect.h));

    const res = await fetch(`${BACKEND}/extract_glasses`, { method: "POST", body: form });
    if (!res.ok) {
      setStatus(`Extract failed: ${res.status}`);
      return;
    }
    const blob = await res.blob();
    setExtractedUrl(URL.createObjectURL(blob));
    setStatus("Готово. PNG вырезано.");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D0F14] to-[#07080B] text-white">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div>
          <div className="text-sm text-white/60">Glasses Try-On</div>
          <div className="text-lg font-semibold tracking-wide">Studio</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-white/70">
            {backendOk ? (
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#C6A15B]" /> {status}
              </span>
            ) : (
              <span className="text-white/50">{status}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_420px] gap-4 p-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/60">Фото товара</div>
              <div className="text-xl font-semibold">Выдели очки прямоугольником</div>
            </div>

            <label className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-white/10 hover:bg-white/15 border border-white/10 cursor-pointer">
              <ImagePlus size={16} />
              Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setFile(f);
                  setRect(null);
                  setExtractedUrl("");
                  if (f) setImgUrl(URL.createObjectURL(f));
                }}
              />
            </label>
          </div>

          <div className="mt-4">
            <canvas
              ref={canvasRef}
              onMouseDown={onDown}
              onMouseMove={onMove}
              onMouseUp={onUp}
              className="w-full rounded-2xl border border-white/10 bg-black/20"
              style={{ cursor: "crosshair" }}
            />
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={extract}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-[#C6A15B] text-black hover:brightness-110"
            >
              <Wand2 size={16} />
              Extract PNG
            </button>
            <button
              onClick={() => setRect(null)}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-white/10 hover:bg-white/15 border border-white/10"
            >
              Reset rect
            </button>
          </div>
          <div className="mt-2 text-xs text-white/50">
            MVP: выделение прямоугольником. Кисть +/− добавим дальше.
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-white/60">Результат</div>
          <div className="text-xl font-semibold">Вырезанные очки (PNG)</div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
            {extractedUrl ? (
              <img
                src={extractedUrl}
                className="w-full rounded-xl border border-white/10"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg,#222 25%,transparent 25%),linear-gradient(-45deg,#222 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#222 75%),linear-gradient(-45deg,transparent 75%,#222 75%)",
                  backgroundSize: "20px 20px",
                  backgroundPosition: "0 0,0 10px,10px -10px,-10px 0px"
                }}
              />
            ) : (
              <div className="h-[320px] rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-white/40 text-sm">
                Пока пусто
              </div>
            )}
          </div>

          {extractedUrl && (
            <a
              href={extractedUrl}
              download="glasses.png"
              className="mt-3 inline-block text-sm text-[#C6A15B] hover:underline"
            >
              Скачать PNG
            </a>
          )}

          <div className="mt-4 text-xs text-white/50">
            Если backend offline — запускай сборку через <b>Start.bat</b>.
          </div>
        </div>
      </div>
    </div>
  );
}
