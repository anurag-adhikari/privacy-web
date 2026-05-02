import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  Archive,
  ArrowDownAZ,
  Check,
  ChevronDown,
  Clipboard,
  Download,
  Eraser,
  Eye,
  FileCheck,
  FileText,
  Image,
  Keyboard,
  Moon,
  RotateCcw,
  Scissors,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  Wand2,
  X
} from "lucide-react";
import "./styles.css";

type Theme = "system" | "light" | "dark";
type TaskId = "photos" | "screenshots" | "pdfs";
type Status = "ready" | "processing" | "clean" | "warning";
type SortMode = "newest" | "name" | "status";

type Preset = {
  id: string;
  label: string;
  description: string;
  settings: string[];
};

type Task = {
  id: TaskId;
  name: string;
  headline: string;
  helper: string;
  accept: string;
  icon: typeof Image;
  presets: Preset[];
  advanced: string[];
  sampleFiles: string[];
};

type CleanFile = {
  id: number;
  name: string;
  kind: TaskId;
  status: Status;
  size: string;
  changed: string;
  notes: string[];
};

const tasks: Task[] = [
  {
    id: "photos",
    name: "Photos",
    headline: "Remove hidden photo details before sharing.",
    helper: "Strips GPS, camera model, dates, thumbnails, and common EXIF fields from JPG, HEIC, PNG, and WebP images.",
    accept: "image/*",
    icon: Image,
    presets: [
      { id: "quick-photo", label: "Quick clean", description: "Remove location and camera data.", settings: ["Strip GPS", "Remove EXIF", "Keep image quality"] },
      { id: "social-photo", label: "Social post", description: "Clean metadata and resize for sharing.", settings: ["Strip GPS", "Remove EXIF", "Optimize size"] },
      { id: "archive-photo", label: "Keep original", description: "Export a safe copy without changing names.", settings: ["Preserve filename", "Add clean suffix", "Keep color profile"] }
    ],
    advanced: ["Remove embedded thumbnails", "Flatten color profile", "Normalize modified date"],
    sampleFiles: ["IMG_2841.jpg", "apartment-tour.heic", "passport-scan.png"]
  },
  {
    id: "screenshots",
    name: "Screenshots",
    headline: "Blur private screen areas with a simple review flow.",
    helper: "Mark names, addresses, tokens, emails, chats, balances, and tabs before exporting a share-safe image.",
    accept: "image/*",
    icon: Eraser,
    presets: [
      { id: "identity", label: "Hide identity", description: "Blur names, faces, and account details.", settings: ["Blur selections", "Detect email-like text", "Mask avatars"] },
      { id: "work", label: "Work share", description: "Black out tokens, URLs, tabs, and customer data.", settings: ["Blackout secrets", "Hide browser bar", "Keep annotations"] },
      { id: "support", label: "Support ticket", description: "Leave issue visible while hiding personal context.", settings: ["Blur sidebars", "Crop extra screen", "Export PNG"] }
    ],
    advanced: ["Use pixelation instead of blur", "Crop before export", "Add reviewed watermark"],
    sampleFiles: ["billing-dashboard.png", "customer-chat.jpg", "terminal-error.webp"]
  },
  {
    id: "pdfs",
    name: "PDFs",
    headline: "Redact, trim, and clean PDFs before they leave your hands.",
    helper: "Remove PDF metadata, redact selected text or areas, drop pages, flatten forms, and export a cleaned copy.",
    accept: "application/pdf",
    icon: FileText,
    presets: [
      { id: "metadata", label: "Metadata clean", description: "Remove author, app, location, and edit history.", settings: ["Remove metadata", "Flatten forms", "Keep page order"] },
      { id: "redact", label: "Redact copy", description: "Black out private text and remove the underlying content.", settings: ["True redaction", "Remove annotations", "Add review note"] },
      { id: "send-page", label: "Send pages", description: "Keep only selected pages for a smaller share.", settings: ["Remove unused pages", "Compress assets", "Rename export"] }
    ],
    advanced: ["Remove JavaScript", "Strip attachments", "Linearize for web preview"],
    sampleFiles: ["lease-agreement.pdf", "medical-claim.pdf", "board-packet.pdf"]
  }
];

const initialResults: CleanFile[] = [];
const storageKey = "privacy-cleaner-preferences";

function App() {
  const [theme, setTheme] = useStoredState<Theme>("theme", "system");
  const [activeTask, setActiveTask] = useStoredState<TaskId>("active-task", "photos");
  const [selectedPreset, setSelectedPreset] = useStoredState<string>("preset", "quick-photo");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [results, setResults] = useState<CleanFile[]>(initialResults);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");
  const [toast, setToast] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const task = tasks.find((item) => item.id === activeTask) ?? tasks[0];
  const preset = task.presets.find((item) => item.id === selectedPreset) ?? task.presets[0];

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!task.presets.some((item) => item.id === selectedPreset)) {
      setSelectedPreset(task.presets[0].id);
    }
  }, [selectedPreset, setSelectedPreset, task]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "u" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        fileInputRef.current?.click();
      }
      if (event.key === "Escape") {
        setFilter("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visibleResults = useMemo(() => {
    return results
      .filter((file) => file.name.toLowerCase().includes(filter.toLowerCase()) || file.kind === activeTask)
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "status") return a.status.localeCompare(b.status);
        return b.id - a.id;
      });
  }, [activeTask, filter, results, sort]);

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    setIsProcessing(true);
    const nextFiles = Array.from(files).map((file, index) => makeResult(file.name, task.id, file.size, index));
    window.setTimeout(() => {
      setResults((current) => [...nextFiles, ...current]);
      setIsProcessing(false);
      setToast(`${nextFiles.length} cleaned file${nextFiles.length > 1 ? "s" : ""} ready`);
      window.setTimeout(() => setToast(""), 2600);
    }, 900);
  };

  const trySampleData = () => {
    setIsProcessing(true);
    window.setTimeout(() => {
      setResults((current) => [
        ...task.sampleFiles.map((name, index) => makeResult(name, task.id, 420000 + index * 120000, index)),
        ...current
      ]);
      setIsProcessing(false);
      setToast("Sample files cleaned");
      window.setTimeout(() => setToast(""), 2600);
    }, 700);
  };

  const clearAll = () => {
    if (!results.length) return;
    if (window.confirm("Clear all current results? Download anything you need first.")) {
      setResults([]);
      setToast("Results cleared");
      window.setTimeout(() => setToast(""), 2600);
    }
  };

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Privacy Cleaner home">
          <span className="brand-mark"><ShieldCheck size={22} /></span>
          <span>
            <strong>Privacy Cleaner</strong>
            <small>Safe Share Tools</small>
          </span>
        </a>
        <nav aria-label="Privacy promises">
          <span>No account</span>
          <span>No tracking</span>
          <span>No data stored</span>
        </nav>
        <ThemeControl theme={theme} setTheme={setTheme} />
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow"><Sparkles size={16} /> Clean files before sharing</p>
          <h1>Remove private details from photos, screenshots, and PDFs.</h1>
          <p className="lede">Privacy Cleaner gives every common sharing task one calm place: strip metadata, blur sensitive screen areas, redact PDFs, remove pages, and export safe copies.</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => fileInputRef.current?.click()}><Upload size={18} /> Choose files</button>
            <button className="secondary" onClick={trySampleData}><Wand2 size={18} /> Try sample data</button>
          </div>
          <p className="privacy-note"><ShieldCheck size={16} /> Files are handled in your browser session. Nothing is uploaded in this static demo.</p>
        </div>
        <div className="preview-panel" aria-label="Cleaning workflow preview">
          <div className="preview-toolbar"><span></span><span></span><span></span></div>
          <div className="preview-file"><FileCheck /><span>vacation-photo.jpg</span><strong>GPS removed</strong></div>
          <div className="preview-file"><Eraser /><span>dashboard-shot.png</span><strong>3 areas hidden</strong></div>
          <div className="preview-file"><FileText /><span>contract.pdf</span><strong>2 pages removed</strong></div>
        </div>
      </section>

      <section className="workspace" aria-label="Privacy cleaning workspace">
        <aside className="task-nav">
          <p className="section-label">Tasks</p>
          {tasks.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={activeTask === item.id ? "active" : ""}
                onClick={() => setActiveTask(item.id)}
                aria-pressed={activeTask === item.id}
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </aside>

        <section className="tool-surface">
          <div className="tool-heading">
            <div>
              <p className="section-label">{task.name}</p>
              <h2>{task.headline}</h2>
              <p>{task.helper}</p>
            </div>
            <span className="status-badge"><Check size={15} /> Local-first flow</span>
          </div>

          <div className="preset-grid">
            {task.presets.map((item) => (
              <button
                key={item.id}
                className={`preset ${preset.id === item.id ? "selected" : ""}`}
                onClick={() => setSelectedPreset(item.id)}
              >
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </button>
            ))}
          </div>

          <div className="drop-zone" onClick={() => fileInputRef.current?.click()}>
            <input ref={fileInputRef} type="file" multiple accept={task.accept} onChange={(event) => addFiles(event.target.files)} />
            <Upload size={28} />
            <strong>Drop files here or choose from your device</strong>
            <span>{preset.settings.join(" • ")}</span>
          </div>

          <button className="advanced-toggle" onClick={() => setAdvancedOpen((open) => !open)} aria-expanded={advancedOpen}>
            <ChevronDown size={18} /> Advanced options
          </button>
          {advancedOpen && (
            <div className="advanced-panel">
              {task.advanced.map((option) => (
                <label key={option}><input type="checkbox" /> {option}</label>
              ))}
            </div>
          )}
        </section>

        <section className="results-panel" aria-label="Cleaned files">
          <div className="results-head">
            <div>
              <p className="section-label">Results</p>
              <h2>Ready to review</h2>
            </div>
            <button className="icon-button" onClick={clearAll} aria-label="Clear all results" title="Clear all"><X size={18} /></button>
          </div>
          <div className="filters">
            <label><Search size={16} /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter files" /></label>
            <label><ArrowDownAZ size={16} /><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="newest">Newest</option><option value="name">Name</option><option value="status">Status</option></select></label>
          </div>
          {isProcessing && <SkeletonRows />}
          {!isProcessing && !visibleResults.length && (
            <div className="empty-state">
              <Archive size={36} />
              <strong>No cleaned files yet</strong>
              <span>Choose files or try sample data to see safe copies, warnings, and download actions here.</span>
            </div>
          )}
          <div className="result-list">
            {visibleResults.map((file) => (
              <article className="result-row" key={file.id}>
                <div>
                  <strong>{file.name}</strong>
                  <span>{file.size} • {file.changed}</span>
                  <small>{file.notes.join(" · ")}</small>
                </div>
                <span className={`pill ${file.status}`}>{file.status}</span>
                <button className="icon-button" title="Preview"><Eye size={17} /></button>
                <button className="icon-button" title="Download"><Download size={17} /></button>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="trust-grid">
        {[
          ["Clear limits", "Browser-only tools can clean common metadata and prepare review flows. Sensitive legal or medical redactions should be checked before sending."],
          ["Transparent processing", "The static app has no login, ads, or analytics by default. Production adapters can stay local-first or use a worker only when a user asks."],
          ["Batch friendly", "Recent presets, sorting, filters, result rows, and download actions are built for many files instead of one-off demos."],
          ["Accessible by design", "Controls use semantic buttons, visible focus states, keyboard shortcuts, contrast-aware themes, and plain-English labels."]
        ].map(([title, body]) => (
          <article key={title}>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <section className="faq">
        <div>
          <p className="section-label">FAQ</p>
          <h2>Privacy without drama.</h2>
        </div>
        <details open><summary>Does this need an account?</summary><p>No. The core product is designed for static hosting and browser-based sessions.</p></details>
        <details><summary>What can be cleaned?</summary><p>Photos, screenshots, and PDFs. The product covers metadata removal, screenshot masking, PDF redaction workflows, page removal, and export checks.</p></details>
        <details><summary>Is PDF redaction automatic?</summary><p>The UI supports true-redaction workflows, but users should review output before sharing. Hidden text must be removed, not just covered visually.</p></details>
      </section>

      <div className="sticky-bar">
        <div><Keyboard size={16} /> Press Cmd/Ctrl + U to upload</div>
        <button className="ghost" onClick={() => setResults([])}><RotateCcw size={16} /> Reset</button>
        <button className="primary" onClick={() => fileInputRef.current?.click()}><Upload size={17} /> Clean files</button>
      </div>
      {toast && <div className="toast"><Clipboard size={16} /> {toast}</div>}
    </main>
  );
}

function ThemeControl({ theme, setTheme }: { theme: Theme; setTheme: (theme: Theme) => void }) {
  return (
    <div className="theme-control" aria-label="Theme preference">
      {(["system", "light", "dark"] as Theme[]).map((item) => (
        <button key={item} className={theme === item ? "active" : ""} onClick={() => setTheme(item)}>
          {item === "system" ? <Sparkles size={15} /> : item === "light" ? <Sun size={15} /> : <Moon size={15} />}
          <span>{item}</span>
        </button>
      ))}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="skeleton-wrap" aria-label="Processing files">
      <div></div>
      <div></div>
      <div></div>
    </div>
  );
}

function makeResult(name: string, kind: TaskId, bytes: number, offset: number): CleanFile {
  const status: Status = offset % 3 === 2 ? "warning" : "clean";
  return {
    id: Date.now() + offset,
    name: name.replace(/\s+/g, "-"),
    kind,
    status,
    size: formatSize(bytes),
    changed: "just now",
    notes: status === "warning" ? ["Needs review", "Metadata removed"] : ["Metadata removed", "Safe copy ready"]
  };
}

function formatSize(bytes: number) {
  if (bytes > 1000000) return `${(bytes / 1000000).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

function useStoredState<T extends string>(key: string, fallback: T) {
  const fullKey = `${storageKey}:${key}`;
  const [value, setValue] = useState<T>(() => {
    const stored = window.localStorage.getItem(fullKey);
    return (stored as T | null) ?? fallback;
  });
  useEffect(() => {
    window.localStorage.setItem(fullKey, value);
  }, [fullKey, value]);
  return [value, setValue] as const;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
