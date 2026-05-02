import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
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
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  X
} from "lucide-react";
import "./styles.css";

type Theme = "system" | "light" | "dark";
type TaskId = "photos" | "screenshots" | "pdfs";
type Status = "ready" | "processing" | "clean" | "warning";
type SortMode = "newest" | "name" | "status";
type PreviewMode = "before" | "after" | "compare";
type RedactionRegion = { id: number; x: number; y: number; width: number; height: number; page?: number };

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
  sampleFiles: SampleFile[];
};

type CleanFile = {
  id: number;
  name: string;
  kind: TaskId;
  status: Status;
  size: string;
  changed: string;
  notes: string[];
  sourceUrl?: string;
  outputUrl?: string;
  fileType: "image" | "pdf" | "other";
  redactions: RedactionRegion[];
  pageCount?: number;
  keptPages?: number[];
  metadata: MetadataItem[];
};

type SampleFile = {
  name: string;
  size: number;
  url: string;
  notes: string[];
  metadata: MetadataItem[];
};

type MetadataItem = {
  label: string;
  value: string;
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
    sampleFiles: [
      { name: "vacation-location.svg", size: 184000, url: "/samples/vacation-location.svg", notes: ["GPS removed", "Camera details removed"], metadata: [{ label: "GPS latitude", value: "37.7749" }, { label: "GPS longitude", value: "-122.4194" }, { label: "Camera", value: "SamplePhone 14" }, { label: "Captured", value: "2026-04-12 09:42" }] },
      { name: "apartment-tour.svg", size: 222000, url: "/samples/apartment-tour.svg", notes: ["Location hints flagged", "Metadata removed"], metadata: [{ label: "Creator app", value: "Demo Camera" }, { label: "Original filename", value: "home-tour-unit-4b.svg" }, { label: "Modified", value: "2026-04-20 18:05" }] },
      { name: "passport-scan.svg", size: 196000, url: "/samples/passport-scan.svg", notes: ["Needs review", "Metadata removed"], metadata: [{ label: "Scanner", value: "OfficeScan Demo" }, { label: "Author", value: "Sample User" }, { label: "Created", value: "2026-03-02 11:10" }] }
    ]
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
    sampleFiles: [
      { name: "billing-dashboard.svg", size: 310000, url: "/samples/billing-dashboard.svg", notes: ["Account numbers hidden", "Metadata removed"], metadata: [{ label: "Browser title", value: "Billing - Demo Workspace" }, { label: "Screenshot app", value: "System Capture" }, { label: "Created", value: "2026-04-28 14:31" }] },
      { name: "customer-chat.svg", size: 276000, url: "/samples/customer-chat.svg", notes: ["Names blurred", "Email-like text hidden"], metadata: [{ label: "Window title", value: "Support chat with sample@example.com" }, { label: "Source app", value: "Demo Browser" }] },
      { name: "terminal-error.svg", size: 142000, url: "/samples/terminal-error.svg", notes: ["Token pattern flagged", "Metadata removed"], metadata: [{ label: "Shell", value: "zsh" }, { label: "Working directory", value: "/demo/private-project" }, { label: "Captured", value: "2026-05-01 16:55" }] }
    ]
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
    sampleFiles: [
      { name: "lease-agreement.pdf", size: 420000, url: "/samples/lease-agreement.pdf", notes: ["Metadata removed", "Safe copy ready"], metadata: [{ label: "Title", value: "Synthetic Lease Agreement" }, { label: "Author", value: "Example Property Manager" }, { label: "Producer", value: "Demo PDF Tool" }] },
      { name: "medical-claim.pdf", size: 540000, url: "/samples/medical-claim.pdf", notes: ["Metadata removed", "Safe copy ready"], metadata: [{ label: "Title", value: "Synthetic Medical Claim" }, { label: "Author", value: "Example Clinic" }, { label: "Subject", value: "Demo claim fixture" }] },
      { name: "board-packet.pdf", size: 660000, url: "/samples/board-packet.pdf", notes: ["Needs review", "Metadata removed"], metadata: [{ label: "Title", value: "Synthetic Board Packet" }, { label: "Author", value: "Sample Board Secretary" }, { label: "Keywords", value: "strategy, private, demo" }] }
    ]
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
  const [previewFile, setPreviewFile] = useState<CleanFile | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("compare");
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
    const query = filter.trim().toLowerCase();
    return results
      .filter((file) => {
        if (!query) return true;
        return [file.name, file.kind, file.status, ...file.notes].join(" ").toLowerCase().includes(query);
      })
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "status") return a.status.localeCompare(b.status);
        return b.id - a.id;
      });
  }, [activeTask, filter, results, sort]);

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    setIsProcessing(true);
    void Promise.all(Array.from(files).map((file, index) => makeResult(file, task.id, index))).then((nextFiles) => {
      setResults((current) => [...nextFiles, ...current]);
      setIsProcessing(false);
      setToast(`${nextFiles.length} cleaned file${nextFiles.length > 1 ? "s" : ""} ready`);
      window.setTimeout(() => setToast(""), 2600);
    });
  };

  const trySampleData = () => {
    setIsProcessing(true);
    void Promise.all(task.sampleFiles.map((sample, index) => makeSampleResult(sample, task.id, index))).then((sampleResults) => {
      setResults((current) => [
        ...sampleResults,
        ...current
      ]);
      setIsProcessing(false);
      setToast("Sample files cleaned");
      window.setTimeout(() => setToast(""), 2600);
    });
  };

  const clearAll = () => {
    if (!results.length) return;
    if (window.confirm("Clear all current results? Download anything you need first.")) {
      results.forEach((file) => {
        if (file.sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(file.sourceUrl);
        if (file.outputUrl?.startsWith("blob:") && file.outputUrl !== file.sourceUrl) URL.revokeObjectURL(file.outputUrl);
      });
      setResults([]);
      setToast("Results cleared");
      window.setTimeout(() => setToast(""), 2600);
    }
  };

  const downloadFile = async (file: CleanFile) => {
    if (!file.outputUrl) {
      setToast("Download is available after a file is cleaned");
      window.setTimeout(() => setToast(""), 2600);
      return;
    }

    const response = await fetch(file.outputUrl);
    if (!response.ok) {
      setToast("Sample download failed");
      window.setTimeout(() => setToast(""), 2600);
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setToast(`${file.name} downloaded`);
    window.setTimeout(() => setToast(""), 2600);
  };

  const openPreview = (file: CleanFile, mode: PreviewMode = "compare") => {
    setPreviewMode(mode);
    setPreviewFile(file);
  };

  const updateCleanFile = (updatedFile: CleanFile) => {
    setResults((current) => current.map((file) => file.id === updatedFile.id ? updatedFile : file));
    setPreviewFile(updatedFile);
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

          <div className="sample-strip" aria-label={`${task.name} sample files`}>
            <div>
              <p className="section-label">Samples</p>
              <span>Synthetic files with fake private details for testing this workflow.</span>
            </div>
            <div className="sample-actions">
              {task.sampleFiles.map((sample, index) => (
                <button key={sample.name} onClick={() => {
                  void makeSampleResult(sample, task.id, index).then((sampleResult) => setResults((current) => [sampleResult, ...current]));
                  setToast(`${sample.name} added`);
                  window.setTimeout(() => setToast(""), 2600);
                }}>
                  <FileCheck size={16} />
                  {sample.name}
                </button>
              ))}
              <button className="add-all" onClick={trySampleData}>Add all samples</button>
            </div>
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
              <strong>{filter ? "No matching files" : "No cleaned files yet"}</strong>
              <span>{filter ? "Try a filename, status, task, or note like clean, warning, PDF, or GPS." : "Choose files or add synthetic samples to see safe copies, warnings, and download actions here."}</span>
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
                <button className="icon-button" onClick={() => openPreview(file)} aria-label={`Preview ${file.name}`} title="Preview before and after"><Eye size={17} /></button>
                <button className="icon-button" onClick={() => void downloadFile(file)} aria-label={`Download ${file.name}`} title="Download"><Download size={17} /></button>
              </article>
            ))}
          </div>
        </section>
      </section>

      {previewFile && (
        <div className="modal-backdrop" role="presentation" onClick={() => setPreviewFile(null)}>
          <section className="preview-modal" role="dialog" aria-modal="true" aria-label={`Preview ${previewFile.name}`} onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <p className="section-label">Preview</p>
                <h2>{previewFile.name}</h2>
              </div>
              <button className="icon-button" onClick={() => setPreviewFile(null)} aria-label="Close preview"><X size={18} /></button>
            </div>
            <div className="compare-controls" aria-label="Preview mode">
              {(["before", "after", "compare"] as PreviewMode[]).map((mode) => (
                <button key={mode} className={previewMode === mode ? "active" : ""} onClick={() => setPreviewMode(mode)}>
                  {mode}
                </button>
              ))}
            </div>
            <ChangeSummary file={previewFile} />
            {previewFile.fileType === "image" && (
              <ImageRedactionTools file={previewFile} onApply={updateCleanFile} />
            )}
            {previewFile.fileType === "pdf" && (
              <PdfTools file={previewFile} onApply={updateCleanFile} />
            )}
            <div className={`preview-frame ${previewMode}`}>
              {previewMode === "compare" ? (
                <>
                  <PreviewPane file={previewFile} variant="before" />
                  <PreviewPane file={previewFile} variant="after" />
                </>
              ) : (
                <PreviewPane file={previewFile} variant={previewMode} />
              )}
            </div>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setPreviewFile(null)}>Close</button>
              <button className="primary" onClick={() => void downloadFile(previewFile)}><Download size={17} /> Download cleaned copy</button>
            </div>
          </section>
        </div>
      )}

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
        <button className="ghost" onClick={clearAll}><RotateCcw size={16} /> Reset</button>
        <button className="primary" onClick={() => fileInputRef.current?.click()}><Upload size={17} /> Clean files</button>
      </div>
      {toast && <div className="toast"><Clipboard size={16} /> {toast}</div>}
    </main>
  );
}

function PreviewPane({ file, variant }: { file: CleanFile; variant: "before" | "after" }) {
  const url = variant === "before" ? file.sourceUrl : file.outputUrl;

  return (
    <section className="preview-pane">
      <div className="preview-label">
        <strong>{variant === "before" ? "Before" : "After"}</strong>
        <span>{variant === "before" ? "Original file" : file.notes.join(" · ")}</span>
      </div>
      <div className="preview-media">
        {!url && (
          <div className="empty-state">
            <Archive size={36} />
            <strong>No preview available</strong>
            <span>This file type can still be tracked in the results list, but the browser cannot preview it here.</span>
          </div>
        )}
        {url && file.fileType === "pdf" && <iframe title={`${variant} ${file.name}`} src={url} />}
        {url && file.fileType === "image" && <img src={url} alt={`${variant} preview for ${file.name}`} />}
        {url && file.fileType === "other" && (
          <div className="empty-state">
            <FileCheck size={36} />
            <strong>Ready for download</strong>
            <span>Preview is limited to images and PDFs in this static browser demo.</span>
          </div>
        )}
      </div>
      {variant === "after" && (
        <div className="clean-stamp">
          <ShieldCheck size={16} />
          Cleaned copy preview
        </div>
      )}
    </section>
  );
}

function ChangeSummary({ file }: { file: CleanFile }) {
  const changes = getChangeSummary(file);

  return (
    <section className="change-summary" aria-label="What changed">
      <div>
        <p className="section-label">What changed</p>
        <h3>{changes.title}</h3>
        <p>{changes.description}</p>
      </div>
      <div className="change-columns">
        <article>
          <strong>Before</strong>
          <ul>
            {changes.before.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>
        <article>
          <strong>After</strong>
          <ul>
            {changes.after.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>
      </div>
      <div className="metadata-table">
        <strong>Detected metadata before cleaning</strong>
        {file.metadata.length ? (
          <dl>
            {file.metadata.map((item) => (
              <div key={`${item.label}-${item.value}`}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p>No readable metadata was detected in this browser session.</p>
        )}
      </div>
    </section>
  );
}

function ImageRedactionTools({ file, onApply }: { file: CleanFile; onApply: (file: CleanFile) => void }) {
  const [draftRegions, setDraftRegions] = useState<RedactionRegion[]>(file.redactions);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const activeRegion = dragStart && dragEnd ? normalizeRegion(dragStart, dragEnd) : null;

  const pointFromEvent = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!bounds) return { x: 0, y: 0 };
    return {
      x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))
    };
  };

  const apply = async () => {
    const outputUrl = await cleanImage(file.sourceUrl!, file.kind, draftRegions);
    onApply({
      ...file,
      outputUrl,
      redactions: draftRegions,
      notes: draftRegions.length ? [`${draftRegions.length} area${draftRegions.length > 1 ? "s" : ""} redacted`, "Metadata stripped"] : ["Metadata stripped"]
    });
  };

  return (
    <section className="edit-tools">
      <div>
        <p className="section-label">Manual redaction</p>
        <span>Drag boxes over the original image. Nothing is censored until you apply the marks.</span>
      </div>
      <div
        ref={stageRef}
        className="redaction-stage"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const point = pointFromEvent(event);
          setDragStart(point);
          setDragEnd(point);
        }}
        onPointerMove={(event) => {
          if (!dragStart) return;
          setDragEnd(pointFromEvent(event));
        }}
        onPointerUp={(event) => {
          if (!dragStart) return;
          const end = pointFromEvent(event);
          const region = normalizeRegion(dragStart, end);
          setDragStart(null);
          setDragEnd(null);
          if (region.width > 0.01 && region.height > 0.01) {
            setDraftRegions((regions) => [...regions, { ...region, id: Date.now() }]);
          }
        }}
        onPointerCancel={() => {
          setDragStart(null);
          setDragEnd(null);
        }}
      >
        <img src={file.sourceUrl} alt={`${file.name} redaction editor`} draggable={false} />
        {draftRegions.map((region) => <span key={region.id} className="redaction-box" style={regionStyle(region)} />)}
        {activeRegion && <span className="redaction-box drafting" style={regionStyle({ ...activeRegion, id: -1 })} />}
      </div>
      <div className="tool-actions">
        <button className="secondary" onClick={() => setDraftRegions([])}>Clear marks</button>
        <button className="primary" onClick={() => void apply()}><Eraser size={17} /> Apply redactions</button>
      </div>
    </section>
  );
}

function getChangeSummary(file: CleanFile) {
  const baseImageBefore = file.kind === "photos"
    ? ["Original pixels kept for review", "Embedded photo metadata may include GPS, device, app, dates, and thumbnails"]
    : ["Original screenshot pixels kept for review", "Any selected private areas are still visible until redactions are applied"];

  if (file.fileType === "image") {
    const after = ["Re-exported as a fresh PNG from the browser canvas", "Original embedded metadata is not copied into the cleaned file"];
    if (file.redactions.length) {
      after.push(`${file.redactions.length} selected area${file.redactions.length > 1 ? "s are" : " is"} permanently blacked out`);
    } else if (file.kind === "screenshots") {
      after.push("No visual redactions applied yet");
    }

    return {
      title: file.kind === "photos" ? "Location and camera data removed" : "Screenshot cleaned with selected marks",
      description: file.redactions.length
        ? "The after file is a new image with your selected redaction boxes burned in."
        : "The after file is a new export. If the image looks the same, the change is metadata removal rather than pixel editing.",
      before: baseImageBefore,
      after
    };
  }

  if (file.fileType === "pdf") {
    const originalPages = file.pageCount ?? file.keptPages?.length ?? 1;
    const keptPages = file.keptPages ?? makePageList(originalPages);
    const removedPages = originalPages - keptPages.length;
    const after = [
      "PDF rewritten into a new browser-generated document",
      "Title, author, subject, creator, producer, keywords, and modified date replaced"
    ];
    if (removedPages > 0) after.push(`${removedPages} page${removedPages > 1 ? "s" : ""} removed; kept pages ${keptPages.join(", ")}`);
    if (file.redactions.length) after.push(`${file.redactions.length} redaction block${file.redactions.length > 1 ? "s" : ""} drawn into the cleaned PDF`);
    if (!file.redactions.length && removedPages === 0) after.push("No page removals or visual redactions applied yet");

    return {
      title: "PDF metadata and selected changes reviewed",
      description: "Metadata cleanup is automatic. Page removal and redaction blocks update after you apply the PDF changes.",
      before: [
        `${originalPages} page${originalPages > 1 ? "s" : ""} in the original PDF`,
        "Original document metadata may include author, app, creation details, edit history, and annotations"
      ],
      after
    };
  }

  return {
    title: "Cleaned file prepared",
    description: "This file type can be tracked and downloaded, but browser preview is limited.",
    before: ["Original file selected"],
    after: ["Cleaned output prepared where supported"]
  };
}

function PdfTools({ file, onApply }: { file: CleanFile; onApply: (file: CleanFile) => void }) {
  const [pages, setPages] = useState((file.keptPages ?? makePageList(file.pageCount ?? 1)).join(","));
  const [redactionCount, setRedactionCount] = useState(file.redactions.length);

  const apply = async () => {
    const keptPages = parsePageList(pages, file.pageCount ?? 1);
    const redactions = Array.from({ length: redactionCount }, (_, index) => ({
      id: Date.now() + index,
      page: keptPages[0] ?? 1,
      x: 0.1,
      y: 0.75 - index * 0.1,
      width: 0.55,
      height: 0.06
    }));
    const outputUrl = await cleanPdf(file.sourceUrl!, file.name, { keptPages, redactions });
    onApply({
      ...file,
      outputUrl,
      keptPages,
      redactions,
      notes: [
        `${keptPages.length} page${keptPages.length > 1 ? "s" : ""} kept`,
        redactions.length ? `${redactions.length} block${redactions.length > 1 ? "s" : ""} redacted` : "Metadata stripped"
      ]
    });
  };

  return (
    <section className="edit-tools compact">
      <div>
        <p className="section-label">PDF cleanup</p>
        <span>Choose pages to keep for Send pages. Add redaction blocks for Redact copy, then apply.</span>
      </div>
      <label className="page-input">
        Pages to keep
        <input value={pages} onChange={(event) => setPages(event.target.value)} placeholder="1, 3-5" />
      </label>
      <label className="page-input">
        Redaction blocks
        <input type="number" min="0" max="6" value={redactionCount} onChange={(event) => setRedactionCount(Number(event.target.value))} />
      </label>
      <button className="primary" onClick={() => void apply()}><FileText size={17} /> Apply PDF changes</button>
    </section>
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

async function makeResult(file: File, kind: TaskId, offset: number): Promise<CleanFile> {
  const status: Status = offset % 3 === 2 ? "warning" : "clean";
  const url = URL.createObjectURL(file);
  const fileType = getFileType(file.name, file.type);
  const pageCount = fileType === "pdf" ? await getPdfPageCount(url) : undefined;
  const metadata = await detectMetadata(file, url, fileType);
  const outputUrl = await createCleanedOutput(url, fileType, kind, file.name);
  return {
    id: Date.now() + offset,
    name: file.name.replace(/\s+/g, "-"),
    kind,
    status,
    size: formatSize(file.size),
    changed: "just now",
    notes: status === "warning" ? ["Needs review", "Cleaned output generated"] : ["Metadata stripped", "Cleaned output generated"],
    sourceUrl: url,
    outputUrl,
    fileType,
    redactions: [],
    pageCount,
    keptPages: pageCount ? makePageList(pageCount) : undefined,
    metadata
  };
}

async function makeSampleResult(sample: SampleFile, kind: TaskId, offset: number): Promise<CleanFile> {
  const status: Status = sample.notes.some((note) => note.toLowerCase().includes("review") || note.toLowerCase().includes("flagged")) ? "warning" : "clean";
  const fileType = getFileType(sample.name);
  const pageCount = fileType === "pdf" ? await getPdfPageCount(sample.url) : undefined;
  const outputUrl = await createCleanedOutput(sample.url, fileType, kind, sample.name);
  return {
    id: Date.now() + offset,
    name: sample.name,
    kind,
    status,
    size: formatSize(sample.size),
    changed: "just now",
    notes: sample.notes,
    sourceUrl: sample.url,
    outputUrl,
    fileType,
    redactions: [],
    pageCount,
    keptPages: pageCount ? makePageList(pageCount) : undefined,
    metadata: sample.metadata
  };
}

async function createCleanedOutput(sourceUrl: string, fileType: CleanFile["fileType"], kind: TaskId, fileName: string) {
  if (fileType === "image") return cleanImage(sourceUrl, kind, []);
  if (fileType === "pdf") return cleanPdf(sourceUrl, fileName);
  return sourceUrl;
}

async function detectMetadata(file: File, sourceUrl: string, fileType: CleanFile["fileType"]): Promise<MetadataItem[]> {
  if (fileType === "image") {
    try {
      const exifr = await import("exifr");
      const parsed = await exifr.parse(file, {
        gps: true,
        tiff: true,
        exif: true,
        pick: ["Make", "Model", "Software", "DateTimeOriginal", "CreateDate", "ModifyDate", "latitude", "longitude", "ImageWidth", "ImageHeight", "Orientation"]
      });
      return metadataFromRecord(parsed);
    } catch {
      return [];
    }
  }

  if (fileType === "pdf") {
    return getPdfMetadata(sourceUrl);
  }

  return [];
}

function metadataFromRecord(record: Record<string, unknown> | undefined): MetadataItem[] {
  if (!record) return [];
  return Object.entries(record)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([label, value]) => ({
      label: humanizeMetadataLabel(label),
      value: value instanceof Date ? value.toLocaleString() : String(value)
    }));
}

function humanizeMetadataLabel(label: string) {
  return label
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^Gps/i, "GPS")
    .replace(/^gps/i, "GPS")
    .replace(/^./, (letter) => letter.toUpperCase());
}

async function cleanImage(sourceUrl: string, kind: TaskId, redactions: RedactionRegion[]) {
  const image = await loadImage(sourceUrl);
  const canvas = document.createElement("canvas");
  const maxWidth = 1800;
  const scale = Math.min(1, maxWidth / image.naturalWidth);
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) return sourceUrl;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  redactions.forEach((region) => {
    drawMask(context, region.x * canvas.width, region.y * canvas.height, region.width * canvas.width, region.height * canvas.height);
  });

  return canvas.toDataURL("image/png", 0.92);
}

function drawMask(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  context.save();
  context.fillStyle = "#050707";
  context.fillRect(x, y, width, height);
  context.restore();
}

function loadImage(sourceUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image preview failed"));
    image.src = sourceUrl;
  });
}

async function cleanPdf(sourceUrl: string, fileName: string, options: { keptPages?: number[]; redactions?: RedactionRegion[] } = {}) {
  const { PDFDocument, rgb } = await import("pdf-lib");
  const sourceBytes = await fetch(sourceUrl).then((response) => response.arrayBuffer());
  const original = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  const cleaned = await PDFDocument.create();
  const keptPages = options.keptPages ?? makePageList(original.getPageCount());
  const copiedPages = await cleaned.copyPages(original, keptPages.map((page) => page - 1));
  copiedPages.forEach((page) => {
    cleaned.addPage(page);
  });
  cleaned.setTitle(`${fileName} cleaned`);
  cleaned.setAuthor("Privacy Cleaner");
  cleaned.setSubject("Cleaned browser-side copy");
  cleaned.setCreator("Privacy Cleaner");
  cleaned.setProducer("Privacy Cleaner");
  cleaned.setKeywords(["cleaned", "privacy"]);
  cleaned.setModificationDate(new Date());
  cleaned.getPages().forEach((page, pageIndex) => {
    const { width, height } = page.getSize();
    const originalPageNumber = keptPages[pageIndex];
    options.redactions?.filter((region) => !region.page || region.page === originalPageNumber).forEach((region) => {
      page.drawRectangle({
        x: region.x * width,
        y: height - (region.y + region.height) * height,
        width: region.width * width,
        height: region.height * height,
        color: rgb(0, 0, 0),
        opacity: 1
      });
    });
  });
  const bytes = await cleaned.save({ useObjectStreams: false });
  const pdfBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return URL.createObjectURL(new Blob([pdfBuffer], { type: "application/pdf" }));
}

async function getPdfPageCount(sourceUrl: string) {
  const { PDFDocument } = await import("pdf-lib");
  const sourceBytes = await fetch(sourceUrl).then((response) => response.arrayBuffer());
  const pdf = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  return pdf.getPageCount();
}

async function getPdfMetadata(sourceUrl: string): Promise<MetadataItem[]> {
  const { PDFDocument } = await import("pdf-lib");
  const sourceBytes = await fetch(sourceUrl).then((response) => response.arrayBuffer());
  const pdf = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  const fields: Array<[string, string | undefined]> = [
    ["Title", pdf.getTitle()],
    ["Author", pdf.getAuthor()],
    ["Subject", pdf.getSubject()],
    ["Creator", pdf.getCreator()],
    ["Producer", pdf.getProducer()],
    ["Keywords", pdf.getKeywords()],
    ["Creation date", pdf.getCreationDate()?.toLocaleString()],
    ["Modified date", pdf.getModificationDate()?.toLocaleString()]
  ];
  return fields
    .filter(([, value]) => value)
    .map(([label, value]) => ({ label, value: value ?? "" }));
}

function normalizeRegion(start: { x: number; y: number }, end: { x: number; y: number }): Omit<RedactionRegion, "id"> {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y)
  };
}

function regionStyle(region: RedactionRegion) {
  return {
    left: `${region.x * 100}%`,
    top: `${region.y * 100}%`,
    width: `${region.width * 100}%`,
    height: `${region.height * 100}%`
  };
}

function makePageList(count: number) {
  return Array.from({ length: count }, (_, index) => index + 1);
}

function parsePageList(value: string, pageCount: number) {
  const pages = value.split(",").flatMap((part) => {
    const trimmed = part.trim();
    if (!trimmed) return [];
    if (trimmed.includes("-")) {
      const [start, end] = trimmed.split("-").map((item) => Number(item.trim()));
      if (!Number.isFinite(start) || !Number.isFinite(end)) return [];
      return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
    }
    const page = Number(trimmed);
    return Number.isFinite(page) ? [page] : [];
  });
  const validPages = pages.filter((page) => page >= 1 && page <= pageCount);
  return [...new Set(validPages)].length ? [...new Set(validPages)] : makePageList(pageCount);
}

function getFileType(name: string, type = ""): CleanFile["fileType"] {
  const lowerName = name.toLowerCase();
  if (type.includes("pdf") || lowerName.endsWith(".pdf")) return "pdf";
  if (type.startsWith("image/") || [".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif"].some((extension) => lowerName.endsWith(extension))) return "image";
  return "other";
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
