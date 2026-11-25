'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  CheckCircle2,
  Cloud,
  Crown,
  Eye,
  EyeOff,
  FileText,
  FolderPlus,
  HardDrive,
  Info,
  KeyRound,
  Layers,
  Lock,
  LogIn,
  LogOut,
  MessageSquarePlus,
  Moon,
  PackageCheck,
  PenTool,
  Plus,
  Printer,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  Users,
  Zap,
} from 'lucide-react';
import {
  getPolygonBounds,
  KOMA_LAYOUT_PRESETS,
  type KaiDualOutput,
  type KomaLayoutId,
} from '@/lib/kai/schema';
import {
  buildPrintBundle,
  runPreflightChecks,
} from '@/lib/export/buildPrintBundle';
import {
  buildPrintPdf,
  getPrintPdfFilename,
} from '@/lib/export/buildPrintPdf';
import {
  PLAN_CATALOG,
  buildProfileForPlan,
  checkQuota,
  createGuestQuotaProfile,
  normalizePlanTier,
  type PlanTier,
  type SubscriptionStatus,
  type UsageSnapshot,
  type UserQuotaProfile,
} from '@/lib/plans/quotas';
import { encodeEan13, formatIsbn13 } from '@/lib/print/ean13';
import { computeSpineInches } from '@/lib/print/presets';
import {
  getSeedProjectForVolume,
  isStarterBlankProject,
} from '@/lib/storage/seedProjects';
import {
  buildKomasForLayout,
  createInitialStudioProject,
  loadStudioProject,
  saveStudioProject,
  type StorageMode,
} from '@/lib/storage/studioRepository';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { PricingUpgradeModal } from '@/components/studio/PricingUpgradeModal';
import { Flow, QuotaExceededError } from './flow-sdk';
import { FieldDropdown, PillButton, SectionLabel, TextInput } from './components/Primitives';
import { AuthModal } from './components/AuthModal';
import { CharacterLibrary } from './components/CharacterLibrary';
import { CoverDesigner, type CoverDesignerHandle } from './components/CoverDesigner';
import { DrawingTabletWorkbench } from './components/DrawingTabletWorkbench';
import { KaiCopilotDrawer } from './components/KaiCopilotDrawer';
import { PageEditor } from './components/PageEditor';
import { PreflightModal } from './components/PreflightModal';
import { FluxStudio } from './components/FluxStudio';
import { ProjectManager } from './components/ProjectManager';

const MangaFlipbookViewer = dynamic(() => import('./components/MangaFlipbookViewer'), {
  ssr: false,
});
import {
  DEFAULT_LAYERS_VISIBILITY,
  DEFAULT_LAYER_OPACITY,
  KOMA_STATES,
  LAYER_DEFINITIONS,
  normalizeTagHandle,
  type DialogueStyle,
  type GeneratingState,
  type Koma,
  type KomaDialogue,
  type KomaSfx,
  type KomaState,
  type LayerKey,
  type Page,
  type Project,
  type ScreentonePreset,
  type SpeedlinePreset,
  type StudioView,
} from './types';
import './studio.css';

const STUDIO_THEME_KEY = 'mangai-studio-theme-v1';
const SIMULATED_PLAN_KEY = 'mangai-simulated-plan-v1';
const EXTRA_PROJECTS_KEY = 'mangai-extra-projects-v1';
const LOCAL_SESSION_KEY = 'mangai-local-session-v1';
const USER_PROJECTS_PREFIX = 'mangai-user-projects-v1:';
const GOOGLE_KEY_STORAGE = 'mangai-google-key-v1';

interface LocalBetaSession {
  id?: string;
  email: string;
  displayName?: string;
  name?: string;
  planTier?: string;
}

function parseLocalBetaSession(): LocalBetaSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalBetaSession>;
    const email = typeof parsed?.email === 'string' ? parsed.email.trim().toLowerCase() : '';
    if (!email || !email.includes('@')) return null;
    return {
      id: typeof parsed.id === 'string' && parsed.id ? parsed.id : `local-${email}`,
      email,
      displayName: parsed.displayName || parsed.name || email.split('@')[0],
      planTier: parsed.planTier,
    };
  } catch {
    return null;
  }
}

function projectMatchesVolume(candidate: Project, volumeSlug: string, seedName?: string): boolean {
  if (candidate.volumeSlug && candidate.volumeSlug.toLowerCase() === volumeSlug.toLowerCase()) {
    return true;
  }
  if (seedName && candidate.name.trim().toLowerCase() === seedName.trim().toLowerCase()) {
    return true;
  }
  return false;
}

const ART_STYLES = [
  'Classic Shonen',
  'Dark Seinen',
  'Modern Shojo',
  'Retro Gekiga',
  'Cyberpunk Manga',
];

const CAMERA_ANGLES = [
  'Plano General / Establishing',
  'Plano Medio',
  'Primer Plano Emocional',
  'Contrapicado Heroico',
  'Picado Dramático',
  'Plano Holandés (Acción)',
  'Detalle / Inserto',
  'Doble Página Splash',
];

const SCREENTONE_OPTIONS: Array<{ value: ScreentonePreset; label: string }> = [
  { value: 'none', label: 'Sin trama' },
  { value: 'dots_15', label: 'Trama Semitono 15%' },
  { value: 'dots_30', label: 'Trama Semitono 30%' },
  { value: 'dots_60', label: 'Trama Semitono 60%' },
  { value: 'gradient', label: 'Degradado Atmosférico' },
  { value: 'beta_black', label: 'Relleno Negro Beta' },
];

const SPEEDLINE_OPTIONS: Array<{ value: SpeedlinePreset; label: string }> = [
  { value: 'none', label: 'Sin líneas cinéticas' },
  { value: 'ryusen', label: 'Ryūsen (Acción Lateral)' },
  { value: 'shuchusen', label: 'Shūchūsen (Impacto Radial)' },
];

const DIALOGUE_STYLE_OPTIONS: Array<{ value: DialogueStyle; label: string }> = [
  { value: 'normal', label: 'Normal (Elipse + Cola)' },
  { value: 'shout', label: 'Grito / Impacto (Picos)' },
  { value: 'whisper', label: 'Susurro (Punteado)' },
  { value: 'thought', label: 'Pensamiento (Nube)' },
  { value: 'narrator', label: 'Narrador (Caja Recta)' },
  { value: 'system', label: 'Sistema / RPG (Marco Doble)' },
];

function resolveTabParam(raw: string | null): StudioView | null {
  if (!raw) return null;
  const slug = raw.trim().toLowerCase();
  if (slug === 'flux') return 'flux';
  if (slug === 'project' || slug === 'lore' || slug === 'setup' || slug === 'config') {
    return 'project';
  }
  if (slug === 'characters' || slug === 'settei' || slug === 'personajes') {
    return 'characters';
  }
  if (slug === 'cover' || slug === 'print' || slug === 'portada' || slug === 'tankobon') {
    return 'cover';
  }
  if (slug === 'pages' || slug === 'panels' || slug === 'paginas' || slug === 'interiores') {
    return 'pages';
  }
  if (
    slug === 'drawing_tablet' ||
    slug === 'tablet' ||
    slug === 'tabla' ||
    slug === 'dibujo' ||
    slug === 'sketch'
  ) {
    return 'drawing_tablet';
  }
  if (slug === 'kai' || slug === 'kai_canvas' || slug === 'canvas' || slug === 'lienzo') {
    return 'project';
  }
  return null;
}

function createEntityId(prefix: string): string {
  if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function StudioPage() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [storageMode, setStorageMode] = useState<StorageMode>('local');
  const [view, setView] = useState<StudioView>('project');
  const [project, setProject] = useState<Project>(() => createInitialStudioProject());
  const [extraProjects, setExtraProjects] = useState<Project[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [selectedKomaId, setSelectedKomaId] = useState<string | null>(null);
  const [selectedDialogueId, setSelectedDialogueId] = useState<string | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'kai' | 'inspector'>('kai');
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [tabletPromptFromKai, setTabletPromptFromKai] = useState('');
  const [kaiPendingMessage, setKaiPendingMessage] = useState('');
  const [kaiPendingMode, setKaiPendingMode] = useState<'mentor' | 'script'>('mentor');
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [flipbookOpen, setFlipbookOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [buildingPdf, setBuildingPdf] = useState(false);
  const [quotaProfile, setQuotaProfile] = useState<UserQuotaProfile>(() =>
    createGuestQuotaProfile('trial'),
  );
  const [localUserEmail, setLocalUserEmail] = useState<string | null>(null);
  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean;
    reason?: string;
    requiredPlan?: PlanTier;
  }>({ open: false });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [keyPopoverOpen, setKeyPopoverOpen] = useState(false);
  const [customGoogleKey, setCustomGoogleKey] = useState('');
  const [hdModelOn, setHdModelOn] = useState(false);
  const [renderPriorityOn, setRenderPriorityOn] = useState(false);
  const [generating, setGenerating] = useState<GeneratingState>({
    cover: false,
    bundle: false,
    pages: {},
    komas: {},
    characters: {},
  });
  const [bundleError, setBundleError] = useState('');

  const coverDesignerRef = useRef<CoverDesignerHandle>(null);

  const preflightReport = useMemo(() => runPreflightChecks(project), [project]);

  const usageSnapshot = useMemo<UsageSnapshot>(() => {
    const extraPages = extraProjects.reduce((acc, p) => acc + p.pages.length, 0);
    return {
      projectCount: 1 + extraProjects.length,
      totalPages: project.pages.length + extraPages,
    };
  }, [project.pages.length, extraProjects]);

  const openUpgradeModal = useCallback((reason?: string, requiredPlan?: PlanTier) => {
    setUpgradeModal({ open: true, reason, requiredPlan });
  }, []);

  const setTaskLoading = useCallback((task: 'cover' | 'bundle', value: boolean) => {
    setGenerating((prev) => ({ ...prev, [task]: value }));
  }, []);

  const setPageLoading = useCallback((pageId: string, value: boolean) => {
    setGenerating((prev) => {
      const nextPages = { ...prev.pages };
      if (value) nextPages[pageId] = true;
      else delete nextPages[pageId];
      return { ...prev, pages: nextPages };
    });
  }, []);

  const setKomaLoading = useCallback((komaId: string, value: boolean) => {
    setGenerating((prev) => {
      const nextKomas = { ...prev.komas };
      if (value) nextKomas[komaId] = true;
      else delete nextKomas[komaId];
      return { ...prev, komas: nextKomas };
    });
  }, []);

  const setCharacterLoading = useCallback((charId: string, value: boolean) => {
    setGenerating((prev) => {
      const nextCharacters = { ...prev.characters };
      if (value) nextCharacters[charId] = true;
      else delete nextCharacters[charId];
      return { ...prev, characters: nextCharacters };
    });
  }, []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const initialTab = resolveTabParam(params.get('tab'));
    if (params.get('tab') === 'print') setPreflightOpen(true);
    const plan = params.get('plan');
    if (plan === 'starter' || plan === 'pro' || plan === 'master') {
      setUpgradeModal({ open: true, requiredPlan: plan });
    }
    const volumeParam = params.get('volume')?.trim() || '';
    if (initialTab) {
      setView(initialTab);
    }

    let initialExtras: Project[] = [];
    try {
      const savedTheme = window.localStorage.getItem(STUDIO_THEME_KEY);
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
      }
      const savedGoogleKey = window.localStorage.getItem(GOOGLE_KEY_STORAGE);
      if (savedGoogleKey) {
        setCustomGoogleKey(savedGoogleKey);
      }
      const savedExtras = window.localStorage.getItem(EXTRA_PROJECTS_KEY);
      if (savedExtras) {
        const parsedExtras = JSON.parse(savedExtras) as Project[];
        if (Array.isArray(parsedExtras)) {
          initialExtras = parsedExtras;
          setExtraProjects(parsedExtras);
        }
      }
    } catch {
      // Ignore storage access errors.
    }

    const loadAuthProfile = async (): Promise<string | null> => {
      let simulated: PlanTier | undefined;
      try {
        const rawSim = window.localStorage.getItem(SIMULATED_PLAN_KEY);
        if (rawSim === 'trial' || rawSim === 'starter' || rawSim === 'pro' || rawSim === 'master') {
          simulated = rawSim;
        }
      } catch {
        // Ignore storage errors.
      }

      const applyLocalBetaFallback = (): string | null => {
        const localSess = parseLocalBetaSession();
        if (!localSess) {
          if (active) {
            setLocalUserEmail(null);
            setQuotaProfile(createGuestQuotaProfile(simulated));
          }
          return null;
        }
        const effectiveTier = simulated ?? normalizePlanTier(localSess.planTier);
        if (active) {
          setLocalUserEmail(localSess.email);
          setQuotaProfile(
            buildProfileForPlan(effectiveTier, {
              id: localSess.id,
              email: localSess.email,
              displayName: localSess.displayName,
              isGuest: false,
            }),
          );
        }
        return localSess.email;
      };

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        return applyLocalBetaFallback();
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!active) return null;

        if (!user) {
          return applyLocalBetaFallback();
        }

        const { data: row } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (!active) return null;
        const effectiveTier = simulated ?? normalizePlanTier(row?.plan_tier);
        const resolvedEmail = user.email ?? null;
        setLocalUserEmail(resolvedEmail);
        setQuotaProfile(
          buildProfileForPlan(effectiveTier, {
            id: user.id,
            email: user.email ?? undefined,
            displayName:
              row?.display_name ||
              (user.user_metadata?.full_name as string | undefined) ||
              user.email?.split('@')[0] ||
              'Mangaka',
            isGuest: false,
            maxProjects: simulated
              ? PLAN_CATALOG[simulated].maxProjects
              : typeof row?.max_projects === 'number'
              ? row.max_projects
              : undefined,
            maxPages: simulated
              ? PLAN_CATALOG[simulated].maxPages
              : typeof row?.max_pages === 'number'
              ? row.max_pages
              : undefined,
            trialEndsAt: typeof row?.trial_ends_at === 'string' ? row.trial_ends_at : null,
            hdRenderEnabled: simulated
              ? PLAN_CATALOG[simulated].hdModelEnabled
              : typeof row?.hd_render_enabled === 'boolean'
              ? row.hd_render_enabled
              : undefined,
            renderPriority: simulated
              ? PLAN_CATALOG[simulated].renderPriority
              : typeof row?.render_priority === 'boolean'
              ? row.render_priority
              : undefined,
            subscriptionStatus: (row?.subscription_status as SubscriptionStatus) || undefined,
          }),
        );
        return resolvedEmail;
      } catch {
        return applyLocalBetaFallback();
      }
    };

    void Promise.all([loadStudioProject(), loadAuthProfile()]).then(
      ([{ project: loaded, mode }, userEmail]) => {
        if (!active) return;

        let resolvedProject = loaded;
        let resolvedExtras = initialExtras;

        // Restore per-user local projects if user signed in via Beta / local session
        if (userEmail) {
          try {
            const rawUserProjects = window.localStorage.getItem(
              `${USER_PROJECTS_PREFIX}${userEmail}`,
            );
            if (rawUserProjects) {
              const parsed = JSON.parse(rawUserProjects) as {
                activeProject?: Project;
                extraProjects?: Project[];
              };
              if (parsed?.activeProject && isStarterBlankProject(loaded)) {
                resolvedProject = parsed.activeProject;
              }
              if (Array.isArray(parsed?.extraProjects) && parsed.extraProjects.length > 0) {
                resolvedExtras = parsed.extraProjects;
              }
            }
          } catch {
            // Ignore per-user storage parse errors.
          }
        }

        // Deep-link ?volume=<id> from landing collection/hero
        if (volumeParam) {
          const seeded = getSeedProjectForVolume(volumeParam);
          const seedName = seeded?.name;
          if (projectMatchesVolume(resolvedProject, volumeParam, seedName)) {
            if (!resolvedProject.volumeSlug) {
              resolvedProject = { ...resolvedProject, volumeSlug: volumeParam };
            }
          } else {
            const existingIdx = resolvedExtras.findIndex((p) =>
              projectMatchesVolume(p, volumeParam, seedName),
            );
            if (existingIdx >= 0) {
              const matched = resolvedExtras[existingIdx];
              const remaining = resolvedExtras.filter((_, idx) => idx !== existingIdx);
              if (!isStarterBlankProject(resolvedProject)) {
                remaining.push(resolvedProject);
              }
              resolvedProject = matched;
              resolvedExtras = remaining;
            } else if (seeded) {
              if (!isStarterBlankProject(resolvedProject)) {
                resolvedExtras = [...resolvedExtras, resolvedProject];
              }
              resolvedProject = seeded;
            }
          }
        }

        setExtraProjects(resolvedExtras);
        setProject(resolvedProject);
        setStorageMode(mode);
        const firstKoma = resolvedProject.pages[0]?.komas?.[0] ?? null;
        setSelectedKomaId(firstKoma?.id ?? null);
        setSelectedDialogueId(firstKoma?.dialogues?.[0]?.id ?? null);
        setMounted(true);
      },
    );

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(EXTRA_PROJECTS_KEY, JSON.stringify(extraProjects));
      if (localUserEmail) {
        window.localStorage.setItem(
          `${USER_PROJECTS_PREFIX}${localUserEmail}`,
          JSON.stringify({ activeProject: project, extraProjects }),
        );
      }
    } catch {
      // Ignore quota errors gracefully.
    }
  }, [extraProjects, project, localUserEmail, mounted]);

  // Debounced persistence via studioRepository (Supabase + localStorage fallback)
  useEffect(() => {
    if (!mounted) return;
    const timer = window.setTimeout(() => {
      void saveStudioProject(project).then((mode) => {
        setStorageMode(mode);
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [project, mounted]);

  useEffect(() => {
    if (activePageIndex >= project.pages.length) {
      setActivePageIndex(Math.max(0, project.pages.length - 1));
    }
  }, [project.pages.length, activePageIndex]);

  const safePageIndex = Math.min(activePageIndex, Math.max(0, project.pages.length - 1));
  const activePage = project.pages[safePageIndex];

  // Keep selectedKomaId synchronized with the active page's komas
  useEffect(() => {
    const komas = activePage?.komas ?? [];
    if (komas.length === 0) {
      setSelectedKomaId(null);
      setSelectedDialogueId(null);
      return;
    }
    if (!selectedKomaId || !komas.some((k) => k.id === selectedKomaId)) {
      setSelectedKomaId(komas[0].id);
      setSelectedDialogueId(komas[0].dialogues[0]?.id ?? null);
    }
  }, [activePage, selectedKomaId]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        window.localStorage.setItem(STUDIO_THEME_KEY, next);
      } catch {
        // Ignore storage access errors.
      }
      return next;
    });
  };

  const handleSelectView = useCallback((nextView: StudioView) => {
    setView(nextView);
    setRightPanelCollapsed(false);
    setRightPanelTab('kai');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', nextView);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Cross-worker event bridges: mangai-kai-ask & mangai-koma-sketch-bridge
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleKaiAsk = (evt: Event) => {
      const detail = (evt as CustomEvent<{ prompt?: string; mode?: 'mentor' | 'script' }>).detail;
      if (!detail?.prompt) return;
      setRightPanelCollapsed(false);
      setRightPanelTab('kai');
      setKaiPendingMode(detail.mode === 'script' ? 'script' : 'mentor');
      setKaiPendingMessage(detail.prompt);
    };

    const handleKomaSketchBridge = (evt: Event) => {
      const detail = (
        evt as CustomEvent<{
          pageIndex: number;
          komaId: string;
          nemuSketchUrl?: string;
          taggedHandle?: string;
          actionPrompt?: string;
        }>
      ).detail;
      if (!detail) return;
      if (typeof detail.pageIndex === 'number' && detail.pageIndex >= 0) {
        setActivePageIndex(detail.pageIndex);
      }
      if (detail.komaId) {
        setSelectedKomaId(detail.komaId);
      }
      try {
        window.sessionStorage.setItem('mangai-pending-koma-sketch', JSON.stringify(detail));
      } catch {
        // Ignore sessionStorage errors.
      }
      handleSelectView('drawing_tablet');
    };

    window.addEventListener('mangai-kai-ask', handleKaiAsk);
    window.addEventListener('mangai-koma-sketch-bridge', handleKomaSketchBridge);
    return () => {
      window.removeEventListener('mangai-kai-ask', handleKaiAsk);
      window.removeEventListener('mangai-koma-sketch-bridge', handleKomaSketchBridge);
    };
  }, [handleSelectView]);

  const openDockedKai = () => {
    setRightPanelCollapsed(false);
    setRightPanelTab('kai');
  };

  const updateProject = (updates: Partial<Project>) => {
    setProject((prev) => {
      const mergedCover = updates.cover
        ? { ...prev.cover, ...updates.cover }
        : { ...prev.cover };
      const nextState: Project = {
        ...prev,
        ...updates,
        cover: mergedCover,
      };
      nextState.cover.spineWidthInches = computeSpineInches(
        nextState.pageCount,
        nextState.paperType,
        nextState.colorMode ?? 'bw',
        nextState.bindingType ?? 'rustica_pegada',
      );
      return nextState;
    });
  };

  const updatePageById = (pageId: string, patch: Partial<Page>) => {
    setProject((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => (p.id === pageId ? { ...p, ...patch } : p)),
    }));
  };

  const updateKomaById = (pageId: string, komaId: string, patch: Partial<Koma>) => {
    setProject((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => {
        if (p.id !== pageId) return p;
        const nextKomas = (p.komas ?? []).map((k) =>
          k.id === komaId ? { ...k, ...patch } : k,
        );
        return { ...p, komas: nextKomas };
      }),
    }));
  };

  const handleToggleLayer = (pageId: string, layer: LayerKey) => {
    setProject((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => {
        if (p.id !== pageId) return p;
        const current = { ...DEFAULT_LAYERS_VISIBILITY, ...(p.layersVisibility ?? {}) };
        return {
          ...p,
          layersVisibility: {
            ...current,
            [layer]: !current[layer],
          },
        };
      }),
    }));
  };

  const handleLayerOpacity = (
    pageId: string,
    layer: 'L0_nemu' | 'L1_tones',
    value: number,
  ) => {
    const clamped = Math.min(100, Math.max(0, Math.round(value)));
    setProject((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => {
        if (p.id !== pageId) return p;
        const current = { ...DEFAULT_LAYER_OPACITY, ...(p.layerOpacity ?? {}) };
        return {
          ...p,
          layerOpacity: {
            ...current,
            [layer]: clamped,
          },
        };
      }),
    }));
  };

  const handleAddBalloon = (pageId: string, koma: Koma) => {
    const bounds = getPolygonBounds(koma.polygonCoords);
    const count = koma.dialogues.length;
    const x = Number(
      Math.min(82, Math.max(18, bounds.left + bounds.width * (count % 2 === 0 ? 0.35 : 0.65))).toFixed(1),
    );
    const y = Number(
      Math.min(84, Math.max(16, bounds.top + Math.min(bounds.height * 0.35, 11) + count * 8)).toFixed(1),
    );
    const newBalloon: KomaDialogue = {
      id: createEntityId('dlg'),
      speaker: koma.taggedHandles[0] || 'Personaje',
      style: 'normal',
      text: 'Escribe tu diálogo aquí...',
      x,
      y,
      tailX: Number(Math.min(90, x + 7).toFixed(1)),
      tailY: Number(Math.min(90, y + 8).toFixed(1)),
      fontSize: 2.35,
      width: 20,
    };

    updateKomaById(pageId, koma.id, {
      dialogues: [...koma.dialogues, newBalloon],
    });
    setSelectedDialogueId(newBalloon.id);
  };

  const handleUpdateDialogue = (
    pageId: string,
    komaId: string,
    dialogueId: string,
    patch: Partial<KomaDialogue>,
  ) => {
    setProject((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => {
        if (p.id !== pageId) return p;
        return {
          ...p,
          komas: (p.komas ?? []).map((k) => {
            if (k.id !== komaId) return k;
            return {
              ...k,
              dialogues: k.dialogues.map((d) =>
                d.id === dialogueId ? { ...d, ...patch } : d,
              ),
            };
          }),
        };
      }),
    }));
  };

  const handleDeleteDialogue = (pageId: string, komaId: string, dialogueId: string) => {
    setProject((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => {
        if (p.id !== pageId) return p;
        return {
          ...p,
          komas: (p.komas ?? []).map((k) => {
            if (k.id !== komaId) return k;
            return {
              ...k,
              dialogues: k.dialogues.filter((d) => d.id !== dialogueId),
            };
          }),
        };
      }),
    }));
    if (selectedDialogueId === dialogueId) {
      setSelectedDialogueId(null);
    }
  };

  const handleUpdateSfx = (
    pageId: string,
    komaId: string,
    sfxId: string,
    patch: Partial<KomaSfx>,
  ) => {
    setProject((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => {
        if (p.id !== pageId) return p;
        return {
          ...p,
          komas: (p.komas ?? []).map((k) => {
            if (k.id !== komaId) return k;
            return {
              ...k,
              sfxItems: k.sfxItems.map((s) => (s.id === sfxId ? { ...s, ...patch } : s)),
            };
          }),
        };
      }),
    }));
  };

  const handleChangePageLayout = (pageId: string, layoutId: KomaLayoutId) => {
    setProject((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => {
        if (p.id !== pageId) return p;
        const nextKomas = buildKomasForLayout(layoutId, p.komas ?? [], p.id);
        return {
          ...p,
          layoutTemplate: layoutId,
          komas: nextKomas,
        };
      }),
    }));
  };

  const handleApplyKaiScript = (output: KaiDualOutput) => {
    const activeArtStyle = project.pages[safePageIndex]?.artStyle || 'Classic Shonen';

    const generatedPages: Page[] = output.script_pages.map((sp) => {
      const pageId = createEntityId('page');
      const preset =
        KOMA_LAYOUT_PRESETS[sp.suggested_layout] ?? KOMA_LAYOUT_PRESETS['4_panel_classic'];

      const komas: Koma[] = preset.panels.map((coords, idx) => {
        const scriptKoma = sp.komas[idx];
        const handles = scriptKoma?.tagged_handles ?? [];
        const b = getPolygonBounds(coords);

        return {
          id: createEntityId('koma'),
          panelIndex: idx + 1,
          state: 'NEMU',
          polygonCoords: coords,
          cameraAngle: scriptKoma?.camera_angle || 'Plano Medio',
          taggedHandles: handles,
          actionPrompt: scriptKoma?.action_prompt || '',
          screentonePreset: 'none',
          speedlinePreset: sp.suggested_layout === '5_panel_action' && idx === 1 ? 'ryusen' : 'none',
          dialogues: (scriptKoma?.dialogues ?? []).map((d, dIdx) => {
            const x = Number(
              Math.min(82, Math.max(18, b.left + b.width * (dIdx % 2 === 0 ? 0.3 : 0.7))).toFixed(1),
            );
            const y = Number(
              Math.min(84, Math.max(15, b.top + Math.min(b.height * 0.32, 10) + dIdx * 9)).toFixed(1),
            );
            return {
              id: `${pageId}-d-${idx}-${dIdx}`,
              speaker: d.speaker,
              style: d.style,
              text: d.text,
              x,
              y,
              tailX: Number(Math.min(88, Math.max(12, x + (dIdx % 2 === 0 ? 6 : -6))).toFixed(1)),
              tailY: Number(Math.min(88, y + 8).toFixed(1)),
              fontSize: 2.35,
              width: 20,
            };
          }),
          sfxItems: scriptKoma?.sfx
            ? [
                {
                  id: `${pageId}-sfx-${idx}`,
                  text: scriptKoma.sfx,
                  x: Number(Math.min(84, Math.max(16, b.left + b.width * 0.74)).toFixed(1)),
                  y: Number(Math.min(86, Math.max(14, b.top + b.height * 0.76)).toFixed(1)),
                  rotation: -8,
                  fontSize: 4.2,
                },
              ]
            : [],
        };
      });

      const taggedSet = new Set(
        komas.flatMap((k) => k.taggedHandles.map((h) => h.toLowerCase())),
      );
      const castIds = project.characters
        .filter((c) => taggedSet.has(normalizeTagHandle(c.tagHandle || '', c.name).toLowerCase()))
        .map((c) => c.id);

      return {
        id: pageId,
        base64: '',
        prompt: sp.chapter_beat,
        artStyle: activeArtStyle,
        castIds,
        layoutTemplate: sp.suggested_layout,
        chapterBeat: sp.chapter_beat,
        layersVisibility: { ...DEFAULT_LAYERS_VISIBILITY },
        layerOpacity: { ...DEFAULT_LAYER_OPACITY },
        komas,
      };
    });

    if (generatedPages.length === 0) return false;

    const firstPage = project.pages[0];
    const isStarterBlank =
      project.pages.length === 1 &&
      !firstPage.base64 &&
      !firstPage.prompt.trim() &&
      !firstPage.chapterBeat?.trim() &&
      (firstPage.komas ?? []).every((k) => !k.inkRenderUrl && !k.actionPrompt.trim());

    const netPageDelta = isStarterBlank
      ? Math.max(0, generatedPages.length - 1)
      : generatedPages.length;

    if (netPageDelta > 0) {
      const quotaCheck = checkQuota(quotaProfile, usageSnapshot, 'ADD_PAGE', netPageDelta);
      if (!quotaCheck.allowed) {
        openUpgradeModal(quotaCheck.reason, quotaCheck.requiredPlan);
        return false;
      }
    }

    const nextPages = isStarterBlank
      ? generatedPages
      : [...project.pages, ...generatedPages];
    const targetPageIndex = isStarterBlank ? 0 : project.pages.length;

    updateProject({ pages: nextPages });
    setActivePageIndex(targetPageIndex);
    const firstKoma = generatedPages[0].komas?.[0] ?? null;
    setSelectedKomaId(firstKoma?.id ?? null);
    setSelectedDialogueId(firstKoma?.dialogues?.[0]?.id ?? null);
    handleSelectView('pages');
    return true;
  };

  const handleAddPage = () => {
    const quotaCheck = checkQuota(quotaProfile, usageSnapshot, 'ADD_PAGE', 1);
    if (!quotaCheck.allowed) {
      openUpgradeModal(quotaCheck.reason, quotaCheck.requiredPlan);
      return;
    }
    const activeArtStyle = project.pages[safePageIndex]?.artStyle || 'Classic Shonen';
    const newPageId = createEntityId('page');
    const newKomas = buildKomasForLayout('4_panel_classic', [], newPageId);
    const newPages: Page[] = [
      ...project.pages,
      {
        id: newPageId,
        base64: '',
        prompt: '',
        artStyle: activeArtStyle,
        castIds: [],
        layoutTemplate: '4_panel_classic',
        chapterBeat: '',
        layersVisibility: { ...DEFAULT_LAYERS_VISIBILITY },
        layerOpacity: { ...DEFAULT_LAYER_OPACITY },
        komas: newKomas,
      },
    ];
    updateProject({ pages: newPages });
    setActivePageIndex(newPages.length - 1);
    setSelectedKomaId(newKomas[0]?.id ?? null);
    setSelectedDialogueId(null);
  };

  const handleCreateNewProject = () => {
    const projectCheck = checkQuota(quotaProfile, usageSnapshot, 'CREATE_PROJECT', 1);
    if (!projectCheck.allowed) {
      openUpgradeModal(projectCheck.reason, projectCheck.requiredPlan);
      return;
    }
    const pageCheck = checkQuota(quotaProfile, usageSnapshot, 'ADD_PAGE', 1);
    if (!pageCheck.allowed) {
      openUpgradeModal(pageCheck.reason, pageCheck.requiredPlan);
      return;
    }
    const fresh = createInitialStudioProject(createEntityId('page'));
    fresh.name = `Nuevo Tomo #${usageSnapshot.projectCount + 1}`;
    fresh.author = project.author || quotaProfile.displayName || 'Autor';
    setExtraProjects((prev) => [...prev, project]);
    setProject(fresh);
    setActivePageIndex(0);
    setSelectedKomaId(fresh.pages[0]?.komas?.[0]?.id ?? null);
    setSelectedDialogueId(null);
    handleSelectView('project');
  };

  const handleSwitchProject = (targetId: string) => {
    if (!targetId || targetId === project.id) return;
    const target = extraProjects.find((p) => p.id === targetId);
    if (!target) return;
    setExtraProjects((prev) => [...prev.filter((p) => p.id !== targetId), project]);
    setProject(target);
    setActivePageIndex(0);
    setSelectedKomaId(target.pages[0]?.komas?.[0]?.id ?? null);
    setSelectedDialogueId(null);
  };

  const handleToggleHdModel = () => {
    if (hdModelOn) {
      setHdModelOn(false);
      return;
    }
    const check = checkQuota(quotaProfile, usageSnapshot, 'USE_HD_MODEL');
    if (!check.allowed) {
      openUpgradeModal(check.reason, check.requiredPlan);
      return;
    }
    setHdModelOn(true);
  };

  const handleToggleRenderPriority = () => {
    if (renderPriorityOn) {
      setRenderPriorityOn(false);
      return;
    }
    const check = checkQuota(quotaProfile, usageSnapshot, 'USE_RENDER_PRIORITY');
    if (!check.allowed) {
      openUpgradeModal(check.reason, check.requiredPlan);
      return;
    }
    setRenderPriorityOn(true);
  };

  const handleSimulatePlan = (tier: PlanTier) => {
    try {
      window.localStorage.setItem(SIMULATED_PLAN_KEY, tier);
    } catch {
      // Ignore storage errors.
    }
    const nextProfile = buildProfileForPlan(tier, {
      id: quotaProfile.id,
      email: quotaProfile.email,
      displayName: quotaProfile.displayName,
      isGuest: quotaProfile.isGuest,
    });
    setQuotaProfile(nextProfile);
    if (!nextProfile.hdRenderEnabled) setHdModelOn(false);
    if (!nextProfile.renderPriority) setRenderPriorityOn(false);
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    try {
      window.localStorage.removeItem(LOCAL_SESSION_KEY);
    } catch {
      // Ignore storage errors.
    }
    setLocalUserEmail(null);
    setUserMenuOpen(false);
    setQuotaProfile(createGuestQuotaProfile('trial'));
    setStorageMode('local');
    setHdModelOn(false);
    setRenderPriorityOn(false);
  };

  const updateCover = (patch: Partial<Project['cover']>) => {
    setProject((prev) => ({
      ...prev,
      cover: {
        ...prev.cover,
        ...patch,
      },
    }));
  };

  const handleConfirmPrintExport = async () => {
    if (generating.bundle) return;
    setTaskLoading('bundle', true);
    setBundleError('');
    try {
      const { base64, filename } = await buildPrintBundle(project);
      await Flow.download({
        base64,
        mimeType: 'application/zip',
        filename,
      });
      setPreflightOpen(false);
    } catch (err) {
      console.error(err);
      setBundleError(err instanceof Error ? err.message : 'No se pudo generar el paquete ZIP.');
    } finally {
      setTaskLoading('bundle', false);
    }
  };

  const handleConfirmPdfExport = async () => {
    if (buildingPdf) return;
    setBuildingPdf(true);
    setBundleError('');
    try {
      const { base64, filename } = await buildPrintPdf(project);
      await Flow.download({
        base64,
        mimeType: 'application/pdf',
        filename,
      });
      setPreflightOpen(false);
    } catch (err) {
      console.error(err);
      setBundleError(err instanceof Error ? err.message : 'No se pudo generar el PDF KDP.');
    } finally {
      setBuildingPdf(false);
    }
  };

  if (!mounted) {
    return <div className="gf-loading" aria-hidden="true" />;
  }

  const activePlanCfg = PLAN_CATALOG[quotaProfile.planTier];
  const pagesPct = Math.min(100, Math.round((usageSnapshot.totalPages / Math.max(1, quotaProfile.maxPages)) * 100));
  const projectsPct = Math.min(
    100,
    Math.round((usageSnapshot.projectCount / Math.max(1, quotaProfile.maxProjects)) * 100),
  );
  const pagesMeterTone = pagesPct >= 100 ? 'is-danger' : pagesPct >= 80 ? 'is-warn' : 'is-ok';
  const projectsMeterTone = projectsPct >= 100 ? 'is-danger' : projectsPct >= 80 ? 'is-warn' : 'is-ok';
  const userInitials = (quotaProfile.displayName || quotaProfile.email || 'M')
    .split(/\s+/)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="gf-studio-root" data-theme={theme}>
      <header className="gf-topbar">
        <div className="gf-topbar-left">
          <Link
            href="/"
            prefetch={false}
            title="Volver al inicio"
            className="gf-brand-link"
          >
            <ArrowLeft size={16} strokeWidth={1.75} className="gf-icon-shrink" />
            <span>MANGAI STUDIO</span>
          </Link>
          <span className="gf-topbar-divider" aria-hidden="true" />
          <span className="gf-topbar-project">{project.name || 'Manga sin título'}</span>
          {quotaProfile.isGuest ? (
            <span className="gf-guest-banner">
              <HardDrive size={12} strokeWidth={2} className="gf-icon-shrink" />
              <span>Modo Invitado · Inicia sesión para guardar en la nube</span>
            </span>
          ) : (
            <span
              className={`gf-storage-pill ${storageMode === 'supabase' ? 'is-cloud' : ''}`}
              title={
                storageMode === 'supabase'
                  ? 'Sincronizado con Supabase'
                  : 'Guardado local automático en este navegador'
              }
            >
              {storageMode === 'supabase' ? (
                <Cloud size={12} strokeWidth={2} className="gf-icon-shrink" />
              ) : (
                <HardDrive size={12} strokeWidth={2} className="gf-icon-shrink" />
              )}
              <span>{storageMode === 'supabase' ? 'Supabase Sync' : 'Local Sync'}</span>
            </span>
          )}
        </div>

        <div className="gf-topbar-right">
          <div className="gf-user-menu-wrap">
            <button
              type="button"
              onClick={() => setKeyPopoverOpen((v) => !v)}
              className="gf-theme-toggle"
              title="Conectar llave propia de Google AI Studio (opcional)"
            >
              <KeyRound size={13} strokeWidth={2} className="gf-icon-shrink" />
              <span>{customGoogleKey.trim() ? 'Llave Propia Activa' : 'Llave IA'}</span>
            </button>
            {keyPopoverOpen && (
              <div className="gf-user-dropdown" style={{ width: '286px', padding: '12px' }}>
                <div className="gf-user-dropdown-head">
                  <strong>Llave Google AI Studio (Opcional)</strong>
                  <span>
                    Si cuentas con una llave propia de Gemini AI Studio, guárdala localmente en este
                    navegador.
                  </span>
                </div>
                <input
                  type="password"
                  className="gf-modal-input gf-mono-input"
                  value={customGoogleKey}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setCustomGoogleKey(nextVal);
                    try {
                      if (nextVal.trim()) {
                        window.localStorage.setItem(GOOGLE_KEY_STORAGE, nextVal.trim());
                      } else {
                        window.localStorage.removeItem(GOOGLE_KEY_STORAGE);
                      }
                    } catch {
                      // Ignore storage errors.
                    }
                  }}
                  placeholder="AIzaSy..."
                />
                <PillButton variant="solid" onClick={() => setKeyPopoverOpen(false)}>
                  Guardar y Cerrar
                </PillButton>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => openUpgradeModal()}
            className={`gf-quota-top-pill ${pagesMeterTone}`}
            title="Ver cuotas y gestionar plan"
          >
            <Crown size={13} strokeWidth={2} className="gf-icon-shrink" />
            <span>
              {activePlanCfg.name} · Págs {usageSnapshot.totalPages}/{quotaProfile.maxPages}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!rightPanelCollapsed && rightPanelTab === 'kai') {
                setRightPanelCollapsed(true);
              } else {
                openDockedKai();
              }
            }}
            className="gf-kai-trigger-btn"
            title="Mostrar u ocultar el Espacio KAI acoplado a la derecha (sin opacar el proyecto)"
          >
            <Sparkles size={15} strokeWidth={2} className="gf-icon-shrink" />
            <span>{!rightPanelCollapsed && rightPanelTab === 'kai' ? 'KAI Activo' : 'Espacio KAI'}</span>
          </button>

          {quotaProfile.isGuest ? (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="gf-auth-cta-btn"
            >
              <LogIn size={14} strokeWidth={2} className="gf-icon-shrink" />
              <span>Iniciar Sesión</span>
            </button>
          ) : (
            <div className="gf-user-menu-wrap">
              <button
                type="button"
                className="gf-user-pill"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                aria-expanded={userMenuOpen}
              >
                <span className="gf-user-avatar">{userInitials}</span>
                <span className="gf-user-plan-tag">{activePlanCfg.name}</span>
              </button>
              {userMenuOpen && (
                <div className="gf-user-dropdown">
                  <div className="gf-user-dropdown-head">
                    <strong>{quotaProfile.displayName}</strong>
                    <span>{quotaProfile.email}</span>
                  </div>
                  <button
                    type="button"
                    className="gf-user-dropdown-item"
                    onClick={() => {
                      setUserMenuOpen(false);
                      openUpgradeModal();
                    }}
                  >
                    <Crown size={14} strokeWidth={2} className="gf-icon-shrink" />
                    <span>Gestionar Plan / Upgrade</span>
                  </button>
                  <button
                    type="button"
                    className="gf-user-dropdown-item is-danger"
                    onClick={handleSignOut}
                  >
                    <LogOut size={14} strokeWidth={2} className="gf-icon-shrink" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className="gf-theme-toggle"
            title={theme === 'light' ? 'Cambiar a Modo Estudio Oscuro' : 'Cambiar a Modo Papel Genkō'}
            aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo Papel Genkō claro'}
          >
            {theme === 'light' ? (
              <>
                <Moon size={15} strokeWidth={1.75} className="gf-icon-shrink" />
                <span>Modo Oscuro</span>
              </>
            ) : (
              <>
                <Sun size={15} strokeWidth={1.75} className="gf-icon-shrink" />
                <span>Papel Genkō</span>
              </>
            )}
          </button>
        </div>
      </header>

      <div className={`manga-grid ${rightPanelCollapsed ? 'is-right-collapsed' : ''}`}>
        <aside className="gf-sidebar-left no-scrollbar">
          <div className="gf-sidebar-section">
            <Link
              href="/"
              prefetch={false}
              title="Volver al inicio"
              className="gf-sidebar-brand"
            >
              <ArrowLeft size={14} strokeWidth={1.75} className="gf-icon-shrink" />
              <span>MANGAI STUDIO</span>
            </Link>
            <div className="gf-nav-list">
              <NavItem active={view === 'flux'} icon={<Sparkles size={17} strokeWidth={1.75} />}
                label="Ilustrar con FLUX" onClick={() => handleSelectView('flux')} />
              <NavItem
                active={view === 'project'}
                icon={<Printer size={17} strokeWidth={1.75} className="gf-icon-shrink" />}
                label="Configuración y Lomo"
                onClick={() => handleSelectView('project')}
              />
              <NavItem
                active={view === 'characters'}
                icon={<Users size={17} strokeWidth={1.75} className="gf-icon-shrink" />}
                label="Settei y Personajes"
                onClick={() => handleSelectView('characters')}
              />
              <NavItem
                active={view === 'cover'}
                icon={<BookOpen size={17} strokeWidth={1.75} className="gf-icon-shrink" />}
                label="Portada Tankōbon"
                onClick={() => handleSelectView('cover')}
              />
              <NavItem
                active={view === 'pages'}
                icon={<BookMarked size={17} strokeWidth={1.75} className="gf-icon-shrink" />}
                label="Viñetas e Interiores"
                onClick={() => handleSelectView('pages')}
              />
              <NavItem
                active={view === 'drawing_tablet'}
                icon={<PenTool size={17} strokeWidth={1.75} className="gf-icon-shrink" />}
                label="Tabla de Dibujo"
                onClick={() => handleSelectView('drawing_tablet')}
              />
            </div>
          </div>

          {view === 'pages' && (
            <div className="gf-sidebar-section animate-slide-in-right">
              <SectionLabel>Manuscrito</SectionLabel>
              <div className="gf-manuscript-list dark-scrollbar">
                {project.pages.map((p, i) => {
                  const isThisPageBusy =
                    Boolean(generating.pages[p.id]) ||
                    (p.komas ?? []).some((k) => Boolean(generating.komas[k.id]));
                  const hasInk =
                    Boolean(p.base64) || (p.komas ?? []).some((k) => Boolean(k.inkRenderUrl));
                  return (
                    <button
                      key={p.id || i}
                      type="button"
                      onClick={() => setActivePageIndex(i)}
                      className={`gf-page-item ${safePageIndex === i ? 'is-active' : ''}`}
                    >
                      <span className="gf-page-item-left">
                        <span className="gf-page-item-num">{String(i + 1).padStart(2, '0')}</span>
                        <span>Página {i + 1}</span>
                      </span>
                      <span className="gf-page-item-icon">
                        {isThisPageBusy ? (
                          <RefreshCw size={14} strokeWidth={1.75} className="gf-spin gf-icon-shrink" />
                        ) : hasInk ? (
                          <CheckCircle2 size={14} strokeWidth={1.75} className="gf-icon-shrink" />
                        ) : (
                          <PenTool size={14} strokeWidth={1.75} className="gf-icon-shrink" />
                        )}
                      </span>
                    </button>
                  );
                })}
                <PillButton
                  variant="outline"
                  icon={<Plus size={16} strokeWidth={1.75} className="gf-icon-shrink" />}
                  onClick={handleAddPage}
                >
                  Añadir Página
                </PillButton>
              </div>
            </div>
          )}

          {/* Sprint 4: Projects & Compact Quota Meter */}
          <div className="gf-sidebar-section gf-quota-card">
            <div className="gf-quota-card-head">
              <SectionLabel>Plan {activePlanCfg.name}</SectionLabel>
              <button
                type="button"
                className="gf-quota-upgrade-link"
                onClick={() => openUpgradeModal()}
              >
                <Crown size={11} strokeWidth={2.2} className="gf-icon-shrink" />
                <span>Upgrade</span>
              </button>
            </div>

            {extraProjects.length > 0 && (
              <select
                className="gf-project-switcher"
                value={project.id || ''}
                onChange={(e) => handleSwitchProject(e.target.value)}
                aria-label="Cambiar de proyecto activo"
              >
                <option value={project.id || ''}>{project.name || 'Proyecto activo'}</option>
                {extraProjects.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.name || 'Tomo sin título'} ({ep.pages.length} págs.)
                  </option>
                ))}
              </select>
            )}

            <div className="gf-quota-meter">
              <div className="gf-quota-meter-row">
                <span>Páginas</span>
                <strong>
                  {usageSnapshot.totalPages} / {quotaProfile.maxPages}
                </strong>
              </div>
              <div className="gf-quota-bar-track">
                <div
                  className={`gf-quota-bar-fill ${pagesMeterTone}`}
                  style={{ width: `${pagesPct}%` }}
                />
              </div>
            </div>

            <div className="gf-quota-meter">
              <div className="gf-quota-meter-row">
                <span>Proyectos</span>
                <strong>
                  {usageSnapshot.projectCount} / {quotaProfile.maxProjects}
                </strong>
              </div>
              <div className="gf-quota-bar-track">
                <div
                  className={`gf-quota-bar-fill ${projectsMeterTone}`}
                  style={{ width: `${projectsPct}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              className="gf-new-project-btn"
              onClick={handleCreateNewProject}
            >
              <FolderPlus size={13} strokeWidth={2} className="gf-icon-shrink" />
              <span>+ Nuevo Proyecto</span>
            </button>
          </div>

          <div className="gf-sidebar-bottom">
            <SectionLabel>Pre-Prensa & Entrega</SectionLabel>
            <PillButton
              variant="outline"
              icon={<BookOpen size={15} strokeWidth={1.75} className="gf-icon-shrink" />}
              onClick={() => setFlipbookOpen(true)}
            >
              Visor 3D PageFlip
            </PillButton>
            <PillButton
              variant="outline"
              icon={
                buildingPdf ? (
                  <RefreshCw size={15} strokeWidth={1.75} className="gf-spin gf-icon-shrink" />
                ) : (
                  <FileText size={15} strokeWidth={1.75} className="gf-icon-shrink" />
                )
              }
              onClick={handleConfirmPdfExport}
              disabled={buildingPdf || generating.bundle}
            >
              {buildingPdf ? 'Generando PDF KDP...' : 'Exportar PDF KDP'}
            </PillButton>
            <PillButton
              variant="solid"
              icon={
                generating.bundle ? (
                  <RefreshCw size={16} strokeWidth={1.75} className="gf-spin gf-icon-shrink" />
                ) : (
                  <PackageCheck size={16} strokeWidth={1.75} className="gf-icon-shrink" />
                )
              }
              onClick={() => {
                setBundleError('');
                setPreflightOpen(true);
              }}
              disabled={generating.bundle || buildingPdf}
            >
              {generating.bundle ? 'Empaquetando ZIP...' : 'Exportar Paquete ZIP'}
            </PillButton>
            {generating.bundle && (
              <div className="gf-status-text animate-pulse-slow">
                Aplanando capas L1 → L5...
              </div>
            )}
            {bundleError && !preflightOpen && <div className="gf-inline-error">{bundleError}</div>}
          </div>
        </aside>

        <main className="gf-canvas-shell">
          <div className="gf-canvas-scroll dark-scrollbar">
            <div hidden={view !== 'flux'}>
              <FluxStudio key={project.id || project.volumeSlug || 'local'} project={project} updateProject={updateProject} />
            </div>
            {view === 'pages' && (
              <PageEditor
                project={project}
                pageIndex={safePageIndex}
                selectedKomaId={selectedKomaId}
                selectedDialogueId={selectedDialogueId}
                onSelectKoma={(kId) => {
                  setSelectedKomaId(kId);
                  const found = activePage?.komas?.find((k) => k.id === kId);
                  setSelectedDialogueId(found?.dialogues?.[0]?.id ?? null);
                }}
                onSelectDialogue={(kId, dId) => {
                  setSelectedKomaId(kId);
                  setSelectedDialogueId(dId);
                }}
                onUpdateDialogue={handleUpdateDialogue}
                onUpdateSfx={handleUpdateSfx}
                onToggleLayer={handleToggleLayer}
                onChangeLayout={handleChangePageLayout}
                updateProject={updateProject}
                isGeneratingPage={Boolean(activePage && generating.pages[activePage.id])}
                komaLoading={generating.komas}
              />
            )}
            {view === 'characters' && (
              <CharacterLibrary
                project={project}
                updateProject={updateProject}
                characterLoading={generating.characters}
                setCharacterLoading={setCharacterLoading}
              />
            )}
            {view === 'cover' && (
              <CoverDesigner
                ref={coverDesignerRef}
                project={project}
                updateProject={updateProject}
                isGeneratingCover={generating.cover}
              />
            )}
            {view === 'project' && (
              <ProjectManager project={project} updateProject={updateProject} />
            )}
            {view === 'drawing_tablet' && (
              <DrawingTabletWorkbench
                project={project}
                activePageIndex={safePageIndex}
                selectedKomaId={selectedKomaId}
                externalPrompt={tabletPromptFromKai}
                onConsumeExternalPrompt={() => setTabletPromptFromKai('')}
                updateProject={updateProject}
                onAskKaiForSketch={(note) => {
                  openDockedKai();
                  setKaiPendingMessage(note);
                }}
                onQuotaBlocked={openUpgradeModal}
              />
            )}
          </div>
        </main>

        {!rightPanelCollapsed && (
          <aside className="gf-sidebar-right gf-sidebar-right-docked">
            {(view === 'pages' || view === 'cover') && (
              <div className="gf-right-dock-tabs" role="tablist" aria-label="Panel lateral derecho">
                <button
                  type="button"
                  role="tab"
                  aria-selected={rightPanelTab === 'kai'}
                  className={`gf-right-dock-tab ${rightPanelTab === 'kai' ? 'is-active' : ''}`}
                  onClick={() => setRightPanelTab('kai')}
                >
                  <Sparkles size={13} strokeWidth={2} className="gf-icon-shrink" />
                  <span>Espacio KAI</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={rightPanelTab === 'inspector'}
                  className={`gf-right-dock-tab ${rightPanelTab === 'inspector' ? 'is-active' : ''}`}
                  onClick={() => setRightPanelTab('inspector')}
                >
                  <SlidersHorizontal size={13} strokeWidth={2} className="gf-icon-shrink" />
                  <span>{view === 'pages' ? 'Capas y Viñeta' : 'Ajustes Cubierta'}</span>
                </button>
              </div>
            )}

            <div className="gf-right-dock-body dark-scrollbar">
              {rightPanelTab === 'kai' || (view !== 'pages' && view !== 'cover') ? (
                <KaiCopilotDrawer
                  project={project}
                  activeView={view}
                  activePageIndex={safePageIndex}
                  selectedKomaId={selectedKomaId}
                  pendingExternalMessage={kaiPendingMessage}
                  pendingExternalMode={kaiPendingMode}
                  onConsumeExternalMessage={() => {
                    setKaiPendingMessage('');
                    setKaiPendingMode('mentor');
                  }}
                  onNavigateView={handleSelectView}
                  updateProject={updateProject}
                  onApplyScript={handleApplyKaiScript}
                  onSendPromptToTablet={(vp) => setTabletPromptFromKai(vp)}
                  onQuotaBlocked={openUpgradeModal}
                />
              ) : (
                <ViewControls
                  view={view}
                  project={project}
                  pageIndex={safePageIndex}
                  selectedKomaId={selectedKomaId}
                  selectedDialogueId={selectedDialogueId}
                  generating={generating}
                  quotaProfile={quotaProfile}
                  hdModelOn={hdModelOn}
                  renderPriorityOn={renderPriorityOn}
                  onToggleHdModel={handleToggleHdModel}
                  onToggleRenderPriority={handleToggleRenderPriority}
                  onQuotaBlocked={openUpgradeModal}
                  setTaskLoading={setTaskLoading}
                  setPageLoading={setPageLoading}
                  setKomaLoading={setKomaLoading}
                  updateProject={updateProject}
                  updatePageById={updatePageById}
                  updateKomaById={updateKomaById}
                  onToggleLayer={handleToggleLayer}
                  onLayerOpacity={handleLayerOpacity}
                  onAddBalloon={handleAddBalloon}
                  onSelectDialogue={setSelectedDialogueId}
                  onUpdateDialogue={handleUpdateDialogue}
                  onDeleteDialogue={handleDeleteDialogue}
                  updateCover={updateCover}
                  onExportCover={() => coverDesignerRef.current?.exportCover()}
                  onOpenKai={openDockedKai}
                />
              )}
            </div>
          </aside>
        )}
      </div>

      <PreflightModal
        open={preflightOpen}
        report={preflightReport}
        pdfFilename={getPrintPdfFilename(project)}
        isBuilding={generating.bundle}
        isBuildingPdf={buildingPdf}
        error={bundleError}
        onClose={() => setPreflightOpen(false)}
        onConfirmExport={handleConfirmPrintExport}
        onConfirmExportPdf={handleConfirmPdfExport}
      />

      <MangaFlipbookViewer
        open={flipbookOpen}
        project={project}
        onClose={() => setFlipbookOpen(false)}
      />

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={() => {
          void (async () => {
            const supabase = getSupabaseBrowserClient();
            if (supabase) {
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (user) {
                setLocalUserEmail(user.email ?? null);
                setQuotaProfile(
                  buildProfileForPlan('trial', {
                    id: user.id,
                    email: user.email ?? undefined,
                    displayName:
                      (user.user_metadata?.full_name as string | undefined) ||
                      user.email?.split('@')[0] ||
                      'Mangaka',
                    isGuest: false,
                  }),
                );
              }
            }
            const { project: cloudProj, mode } = await loadStudioProject();
            setProject(cloudProj);
            setStorageMode(mode);
          })();
        }}
      />

      <PricingUpgradeModal
        open={upgradeModal.open}
        currentPlan={quotaProfile.planTier}
        isGuest={quotaProfile.isGuest}
        blockReason={upgradeModal.reason}
        recommendedPlan={upgradeModal.requiredPlan}
        onClose={() => setUpgradeModal({ open: false })}
        onSimulatePlan={handleSimulatePlan}
      />
    </div>
  );
}

function NavItem({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`gf-nav-item ${active ? 'is-active' : ''}`}
    >
      <span className="gf-nav-icon">{icon}</span>
      <span className="gf-nav-label">{label}</span>
    </button>
  );
}

function ViewControls({
  view,
  project,
  pageIndex,
  selectedKomaId,
  selectedDialogueId,
  generating,
  quotaProfile,
  hdModelOn,
  renderPriorityOn,
  onToggleHdModel,
  onToggleRenderPriority,
  onQuotaBlocked,
  setTaskLoading,
  setKomaLoading,
  updateProject,
  updatePageById,
  updateKomaById,
  onToggleLayer,
  onLayerOpacity,
  onAddBalloon,
  onSelectDialogue,
  onUpdateDialogue,
  onDeleteDialogue,
  updateCover,
  onExportCover,
  onOpenKai,
}: {
  view: StudioView;
  project: Project;
  pageIndex: number;
  selectedKomaId: string | null;
  selectedDialogueId: string | null;
  generating: GeneratingState;
  quotaProfile: UserQuotaProfile;
  hdModelOn: boolean;
  renderPriorityOn: boolean;
  onToggleHdModel: () => void;
  onToggleRenderPriority: () => void;
  onQuotaBlocked: (reason?: string, requiredPlan?: PlanTier) => void;
  setTaskLoading: (task: 'cover' | 'bundle', value: boolean) => void;
  setPageLoading: (pageId: string, value: boolean) => void;
  setKomaLoading: (komaId: string, value: boolean) => void;
  updateProject: (updates: Partial<Project>) => void;
  updatePageById: (pageId: string, patch: Partial<Page>) => void;
  updateKomaById: (pageId: string, komaId: string, patch: Partial<Koma>) => void;
  onToggleLayer: (pageId: string, layer: LayerKey) => void;
  onLayerOpacity: (pageId: string, layer: 'L0_nemu' | 'L1_tones', value: number) => void;
  onAddBalloon: (pageId: string, koma: Koma) => void;
  onSelectDialogue: (dialogueId: string | null) => void;
  onUpdateDialogue: (
    pageId: string,
    komaId: string,
    dialogueId: string,
    patch: Partial<KomaDialogue>,
  ) => void;
  onDeleteDialogue: (pageId: string, komaId: string, dialogueId: string) => void;
  updateCover: (patch: Partial<Project['cover']>) => void;
  onExportCover: () => void;
  onOpenKai: () => void;
}) {
  const [style, setStyle] = useState<string>('Classic Shonen');
  const [coverError, setCoverError] = useState<string>('');
  const [komaErrors, setKomaErrors] = useState<Record<string, string>>({});

  const currentPage = project.pages[pageIndex];
  const pageStyle = currentPage?.artStyle || style;
  const coverPrompt = project.cover.prompt ?? '';

  const komas = currentPage?.komas ?? [];
  const selectedKoma = komas.find((k) => k.id === selectedKomaId) ?? komas[0] ?? null;
  const activeDialogue =
    selectedKoma?.dialogues.find((d) => d.id === selectedDialogueId) ??
    selectedKoma?.dialogues[0] ??
    null;

  const isSelectedKomaBusy = Boolean(selectedKoma && generating.komas[selectedKoma.id]);
  const isCoverBusy = generating.cover;
  const currentKomaError = selectedKoma ? komaErrors[selectedKoma.id] ?? '' : '';

  const layersVis = {
    ...DEFAULT_LAYERS_VISIBILITY,
    ...(currentPage?.layersVisibility ?? {}),
  };
  const layersOpacity = {
    ...DEFAULT_LAYER_OPACITY,
    ...(currentPage?.layerOpacity ?? {}),
  };

  const toggleKomaSetteiHandle = (handle: string, charId: string) => {
    if (!currentPage || !selectedKoma) return;
    const exists = selectedKoma.taggedHandles.some(
      (h) => h.toLowerCase() === handle.toLowerCase(),
    );
    const nextHandles = exists
      ? selectedKoma.taggedHandles.filter((h) => h.toLowerCase() !== handle.toLowerCase())
      : [...selectedKoma.taggedHandles, handle];

    updateKomaById(currentPage.id, selectedKoma.id, { taggedHandles: nextHandles });

    const castSet = new Set(currentPage.castIds);
    if (!exists) castSet.add(charId);
    updatePageById(currentPage.id, { castIds: Array.from(castSet) });
  };

  const generateKomaInk = async () => {
    if (!currentPage || !selectedKoma) return;
    const targetPageId = currentPage.id;
    const targetKomaId = selectedKoma.id;
    if (generating.komas[targetKomaId]) return;

    setKomaErrors((prev) => ({ ...prev, [targetKomaId]: '' }));
    setKomaLoading(targetKomaId, true);

    const promptSnapshot = selectedKoma.actionPrompt;
    const cameraSnapshot = selectedKoma.cameraAngle || 'Plano Medio';
    const styleSnapshot = pageStyle;
    const handlesSnapshot = selectedKoma.taggedHandles ?? [];

    try {
      const taggedSet = new Set(handlesSnapshot.map((h) => h.toLowerCase()));
      const activeChars = project.characters.filter((c) => c.activeInCanon !== false);
      const taggedEntities = activeChars.filter((c) => {
        const handle = normalizeTagHandle(c.tagHandle || '', c.name).toLowerCase();
        return taggedSet.has(handle);
      });

      const entityVisuals = taggedEntities
        .map((c) => {
          const handle = normalizeTagHandle(c.tagHandle || '', c.name);
          const anchors = (c.visualAnchors ?? []).filter(Boolean);
          return [
            `${handle} (${c.name})`,
            c.appearance,
            c.clothing,
            anchors.length > 0 ? `Anclas visuales obligatorias: ${anchors.join(', ')}` : '',
            c.seedLocked && c.characterSeed ? `Seed: ${c.characterSeed}` : '',
          ]
            .filter(Boolean)
            .join(' · ');
        })
        .filter(Boolean)
        .join(' | ');

      const seedsCanon = taggedEntities
        .map((c) => (c.characterSeed ? `${c.name}: ${c.characterSeed}` : ''))
        .filter(Boolean)
        .join(' | ');

      const referenceImageMediaIds = taggedEntities
        .map((c) => c.referenceMediaId)
        .filter((id): id is string => Boolean(id));
      const referenceImagesBase64 = taggedEntities
        .map((c) => c.referenceBase64)
        .filter((img): img is string => Boolean(img));

      const colorModeLabel =
        project.colorMode === 'color'
          ? 'vibrant full color editorial manga illustration'
          : 'high contrast black and white Sumi ink, fine G-pen linework, screentones';

      const finalPrompt = [
        `Professional single manga panel (Viñeta #${selectedKoma.panelIndex}), ${colorModeLabel}.`,
        `Style: ${styleSnapshot}.`,
        `Camera angle: ${cameraSnapshot}.`,
        `Action: ${promptSnapshot.trim() || currentPage.chapterBeat || 'Dramatic manga moment'}.`,
        entityVisuals ? `Strict Settei consistency: ${entityVisuals}.` : '',
        'No speech bubbles, no text overlays, clean frameless interior panel art.',
      ]
        .filter(Boolean)
        .join(' ');

      const result = await Flow.generate.image({
        prompt: finalPrompt,
        useHdModel: hdModelOn,
        renderPriority: renderPriorityOn,
        mode: 'panel',
        aspectRatio: '3:4',
        name:
          taggedEntities.map((c) => c.name).filter(Boolean).join(', ') ||
          `${project.name || 'Manga'} · Viñeta #${selectedKoma.panelIndex}`,
        details: entityVisuals || undefined,
        canon: seedsCanon || undefined,
        style: `${styleSnapshot} · ${project.colorMode === 'color' ? 'Color' : 'B/N'}`,
        notes: `${cameraSnapshot} — ${promptSnapshot.trim() || `Viñeta #${selectedKoma.panelIndex}`}`,
        referenceImageMediaIds:
          referenceImageMediaIds.length > 0 ? referenceImageMediaIds : undefined,
        referenceImagesBase64:
          referenceImagesBase64.length > 0 ? referenceImagesBase64 : undefined,
      });

      const nextState: KomaState =
        selectedKoma.state === 'LOCKED' ? 'LOCKED' : 'PEN_IRE';

      updateKomaById(targetPageId, targetKomaId, {
        inkRenderUrl: result.dataUrl,
        state: nextState,
      });
    } catch (err) {
      console.error(err);
      if (err instanceof QuotaExceededError) {
        onQuotaBlocked(err.message, normalizePlanTier(err.requiredPlan));
      }
      setKomaErrors((prev) => ({
        ...prev,
        [targetKomaId]:
          err instanceof Error
            ? err.message
            : `No se pudo entintar la Viñeta #${selectedKoma.panelIndex}.`,
      }));
    } finally {
      setKomaLoading(targetKomaId, false);
    }
  };

  const generateCoverTarget = async (target: 'wrap' | 'front' | 'back') => {
    if (generating.cover) return;
    setCoverError('');
    setTaskLoading('cover', true);
    const promptSnapshot = coverPrompt;

    try {
      const activeChars = project.characters.filter((c) => c.activeInCanon !== false);
      const charVisuals = activeChars
        .map((c) => {
          const anchors = (c.visualAnchors ?? []).filter(Boolean).join(', ');
          return [
            c.name,
            c.appearance,
            c.clothing,
            anchors ? `Anchors: ${anchors}` : '',
            c.characterSeed ? `Seed: ${c.characterSeed}` : '',
          ]
            .filter(Boolean)
            .join(': ');
        })
        .filter(Boolean)
        .join('. ');
      const seedsCanon = activeChars
        .map((c) => (c.characterSeed ? `${c.name}: ${c.characterSeed}` : ''))
        .filter(Boolean)
        .join(' | ');
      const referenceImageMediaIds = activeChars
        .map((c) => c.referenceMediaId)
        .filter((id): id is string => Boolean(id));
      const referenceImagesBase64 = activeChars
        .map((c) => c.referenceBase64)
        .filter((img): img is string => Boolean(img));

      const colorFlavor =
        project.colorMode === 'color'
          ? 'Vibrant full-color manga cover'
          : 'Sumi ink monochrome with dramatic crimson accent manga cover';

      const finalPrompt =
        target === 'wrap'
          ? `Professional cinematic manga wrap-around cover. Right side (front): main illustration showing ${promptSnapshot}. Left side (back): matching background elements, minimalist composition. Spine in middle. Style: ${style}. ${colorFlavor}. Character details: ${charVisuals}`
          : target === 'front'
          ? `Vertical 3:4 manga Tankobon front cover illustration showing ${promptSnapshot}. Style: ${style}. ${colorFlavor}. Character details: ${charVisuals}`
          : `Vertical 3:4 manga Tankobon back cover atmospheric background art matching ${promptSnapshot}, clean negative space for synopsis and barcode. Style: ${style}. ${colorFlavor}.`;

      const result = await Flow.generate.image({
        prompt: finalPrompt,
        useHdModel: hdModelOn,
        renderPriority: renderPriorityOn,
        mode: target === 'wrap' ? 'cover_wrap' : 'portrait',
        aspectRatio: target === 'wrap' ? '16:9' : '3:4',
        name: project.name || 'Manga sin título',
        details: charVisuals || undefined,
        canon: seedsCanon || undefined,
        style: `${style} · ${project.colorMode === 'color' ? 'Color' : 'B/N'}`,
        notes: promptSnapshot.trim() || `Cover artwork for ${project.name || 'Manga'}`,
        referenceImageMediaIds:
          referenceImageMediaIds.length > 0 ? referenceImageMediaIds : undefined,
        referenceImagesBase64:
          referenceImagesBase64.length > 0 ? referenceImagesBase64 : undefined,
      });

      if (target === 'wrap') {
        updateCover({
          fullWrapBase64: result.dataUrl,
          frontBase64: result.dataUrl,
          backBase64: result.dataUrl,
          prompt: promptSnapshot,
        });
      } else if (target === 'front') {
        updateCover({
          frontBase64: result.dataUrl,
          prompt: promptSnapshot,
        });
      } else {
        updateCover({
          backBase64: result.dataUrl,
          prompt: promptSnapshot,
        });
      }
    } catch (err) {
      console.error(err);
      if (err instanceof QuotaExceededError) {
        onQuotaBlocked(err.message, normalizePlanTier(err.requiredPlan));
      }
      setCoverError(
        err instanceof Error ? err.message : 'No se pudo generar la cubierta Tankōbon.',
      );
    } finally {
      setTaskLoading('cover', false);
    }
  };

  if (view === 'pages') {
    const primarySfx = selectedKoma?.sfxItems?.[0];
    const canMarkLocked = Boolean(
      selectedKoma &&
        selectedKoma.inkRenderUrl &&
        selectedKoma.dialogues.length > 0 &&
        selectedKoma.state !== 'LOCKED',
    );

    return (
      <div className="gf-controls-stack animate-slide-in-right">
        <div className="gf-controls-group">
          <div className="gf-inspector-head">
            <SectionLabel>
              {selectedKoma ? `Inspector · Viñeta #${selectedKoma.panelIndex}` : 'Inspector de Viñeta'}
            </SectionLabel>
            {selectedKoma && (
              <span className={`gf-koma-state-badge state-${selectedKoma.state.toLowerCase()}`}>
                {selectedKoma.state}
              </span>
            )}
          </div>

          {selectedKoma && currentPage && (
            <div className="gf-state-machine" role="group" aria-label="Estado de la viñeta">
              {KOMA_STATES.map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`gf-state-step ${selectedKoma.state === st ? 'is-active' : ''}`}
                  onClick={() => updateKomaById(currentPage.id, selectedKoma.id, { state: st })}
                >
                  {st}
                </button>
              ))}
            </div>
          )}

          <FieldDropdown
            label="Estilo de Tinta (Página)"
            value={pageStyle}
            options={ART_STYLES}
            onChange={(val) => {
              setStyle(val);
              if (currentPage) {
                updatePageById(currentPage.id, { artStyle: val });
              }
            }}
          />

          {selectedKoma && currentPage && (
            <>
              <FieldDropdown
                label="Ángulo de Cámara"
                value={selectedKoma.cameraAngle || 'Plano Medio'}
                options={CAMERA_ANGLES}
                onChange={(val) =>
                  updateKomaById(currentPage.id, selectedKoma.id, { cameraAngle: val })
                }
              />

              <div className="gf-cast-section">
                <SectionLabel>
                  Settei Etiquetados ({selectedKoma.taggedHandles.length})
                </SectionLabel>
                <div className="gf-cast-chips">
                  {project.characters.filter((c) => c.activeInCanon !== false).length === 0 ? (
                    <span className="gf-cast-empty">
                      Activa o crea fichas en «Settei y Personajes» para inyectar @handles y anclas visuales.
                    </span>
                  ) : (
                    project.characters
                      .filter((c) => c.activeInCanon !== false)
                      .map((c) => {
                      const handle = normalizeTagHandle(c.tagHandle || '', c.name);
                      const selected = selectedKoma.taggedHandles.some(
                        (h) => h.toLowerCase() === handle.toLowerCase(),
                      );
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleKomaSetteiHandle(handle, c.id)}
                          className={`gf-cast-chip ${selected ? 'is-active' : ''}`}
                          title={
                            (c.visualAnchors ?? []).length > 0
                              ? `Anclas: ${(c.visualAnchors ?? []).join(', ')}`
                              : c.name
                          }
                        >
                          {handle}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="gf-controls-group">
                <SectionLabel>Acción de Viñeta #{selectedKoma.panelIndex}</SectionLabel>
                <TextInput
                  value={selectedKoma.actionPrompt}
                  onChange={(val) =>
                    updateKomaById(currentPage.id, selectedKoma.id, {
                      actionPrompt: val,
                      state:
                        selectedKoma.state === 'VACIO' && val.trim()
                          ? 'NEMU'
                          : selectedKoma.state,
                    })
                  }
                  placeholder="Describe postura, expresión, fondo y foco dramático de esta viñeta..."
                />
              </div>

              {/* Sprint 4: Quota-gated Engine Boosters (Pro / Master) */}
              <div className="gf-engine-gates">
                <button
                  type="button"
                  role="switch"
                  aria-checked={hdModelOn}
                  className={`gf-engine-gate-btn ${hdModelOn ? 'is-on' : ''} ${
                    !quotaProfile.hdRenderEnabled ? 'is-locked' : ''
                  }`}
                  onClick={onToggleHdModel}
                >
                  <span className="gf-engine-gate-left">
                    {quotaProfile.hdRenderEnabled ? (
                      <Zap size={13} strokeWidth={2.2} className="gf-icon-shrink" />
                    ) : (
                      <Lock size={12} strokeWidth={2.2} className="gf-icon-shrink" />
                    )}
                    <span>Gemini 3.1 Flash HD</span>
                  </span>
                  <span className="gf-engine-gate-pill">
                    {hdModelOn ? 'ON' : quotaProfile.hdRenderEnabled ? 'OFF' : 'PRO'}
                  </span>
                </button>

                <button
                  type="button"
                  role="switch"
                  aria-checked={renderPriorityOn}
                  className={`gf-engine-gate-btn ${renderPriorityOn ? 'is-on' : ''} ${
                    !quotaProfile.renderPriority ? 'is-locked' : ''
                  }`}
                  onClick={onToggleRenderPriority}
                >
                  <span className="gf-engine-gate-left">
                    {quotaProfile.renderPriority ? (
                      <Crown size={13} strokeWidth={2.2} className="gf-icon-shrink" />
                    ) : (
                      <Lock size={12} strokeWidth={2.2} className="gf-icon-shrink" />
                    )}
                    <span>Prioridad de Render</span>
                  </span>
                  <span className="gf-engine-gate-pill">
                    {renderPriorityOn ? 'ON' : quotaProfile.renderPriority ? 'OFF' : 'MASTER'}
                  </span>
                </button>
              </div>

              <PillButton
                variant="filled"
                icon={
                  isSelectedKomaBusy ? (
                    <RefreshCw size={16} strokeWidth={1.75} className="gf-spin gf-icon-shrink" />
                  ) : (
                    <Sparkles size={16} strokeWidth={1.75} className="gf-icon-shrink" />
                  )
                }
                onClick={generateKomaInk}
                disabled={isSelectedKomaBusy || !currentPage || !selectedKoma}
              >
                {isSelectedKomaBusy
                  ? `Entintando Viñeta #${selectedKoma.panelIndex}...`
                  : `Generar Tinta Alta Res. (Viñeta #${selectedKoma.panelIndex})`}
              </PillButton>

              {currentKomaError && <div className="gf-inline-error">{currentKomaError}</div>}

              {/* Tramas L1 & Líneas Cinéticas L3 */}
              <div className="gf-controls-divider">
                <SectionLabel>Tramas (L1) y Efectos Cinéticos (L3)</SectionLabel>
                <div className="gf-field-box">
                  <label className="gf-field-label" htmlFor="gf-tone-select">
                    Trama Screentone (Capa L1)
                  </label>
                  <select
                    id="gf-tone-select"
                    className="gf-select-native"
                    value={selectedKoma.screentonePreset || 'none'}
                    onChange={(e) =>
                      updateKomaById(currentPage.id, selectedKoma.id, {
                        screentonePreset: e.target.value as ScreentonePreset,
                        state:
                          selectedKoma.state === 'PEN_IRE' ? 'TONE_FX' : selectedKoma.state,
                      })
                    }
                  >
                    {SCREENTONE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="gf-field-box">
                  <label className="gf-field-label" htmlFor="gf-fx-select">
                    Líneas Cinéticas (Capa L3)
                  </label>
                  <select
                    id="gf-fx-select"
                    className="gf-select-native"
                    value={selectedKoma.speedlinePreset || 'none'}
                    onChange={(e) =>
                      updateKomaById(currentPage.id, selectedKoma.id, {
                        speedlinePreset: e.target.value as SpeedlinePreset,
                      })
                    }
                  >
                    {SPEEDLINE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Globos Vectoriales Fukidashi (L5) */}
              <div className="gf-controls-divider">
                <div className="gf-inspector-head">
                  <SectionLabel>Globos Fukidashi L5 ({selectedKoma.dialogues.length})</SectionLabel>
                  <button
                    type="button"
                    className="gf-mini-add-btn"
                    onClick={() => onAddBalloon(currentPage.id, selectedKoma)}
                  >
                    <MessageSquarePlus size={12} strokeWidth={2} className="gf-icon-shrink" />
                    <span>+ Añadir Globo</span>
                  </button>
                </div>

                {selectedKoma.dialogues.length > 1 && (
                  <div className="gf-cast-chips">
                    {selectedKoma.dialogues.map((d, dIdx) => (
                      <button
                        key={d.id}
                        type="button"
                        className={`gf-cast-chip ${activeDialogue?.id === d.id ? 'is-active' : ''}`}
                        onClick={() => onSelectDialogue(d.id)}
                      >
                        Globo #{dIdx + 1}
                      </button>
                    ))}
                  </div>
                )}

                {activeDialogue ? (
                  <div className="gf-balloon-editor-box">
                    <div className="gf-field-box">
                      <label className="gf-field-label" htmlFor="gf-balloon-style">
                        Estilo Fukidashi
                      </label>
                      <select
                        id="gf-balloon-style"
                        className="gf-select-native"
                        value={activeDialogue.style}
                        onChange={(e) =>
                          onUpdateDialogue(currentPage.id, selectedKoma.id, activeDialogue.id, {
                            style: e.target.value as DialogueStyle,
                          })
                        }
                      >
                        {DIALOGUE_STYLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="gf-field-box">
                      <label className="gf-field-label" htmlFor="gf-balloon-text">
                        Texto del Globo (o doble clic en lienzo)
                      </label>
                      <input
                        id="gf-balloon-text"
                        type="text"
                        className="gf-text-input gf-text-input-sm"
                        value={activeDialogue.text}
                        onChange={(e) =>
                          onUpdateDialogue(currentPage.id, selectedKoma.id, activeDialogue.id, {
                            text: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="gf-balloon-size-row">
                      <label className="gf-field-label" htmlFor="gf-balloon-size">
                        Tamaño ({Math.round((activeDialogue.fontSize ?? 2.35) * 4.5)} px)
                      </label>
                      <input
                        id="gf-balloon-size"
                        type="range"
                        min={1.6}
                        max={3.6}
                        step={0.1}
                        value={activeDialogue.fontSize ?? 2.35}
                        onChange={(e) =>
                          onUpdateDialogue(currentPage.id, selectedKoma.id, activeDialogue.id, {
                            fontSize: Number(e.target.value),
                          })
                        }
                      />
                      <button
                        type="button"
                        className="gf-char-delete-btn"
                        title="Eliminar este globo"
                        onClick={() =>
                          onDeleteDialogue(currentPage.id, selectedKoma.id, activeDialogue.id)
                        }
                      >
                        <Trash2 size={14} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="gf-helper-copy">
                    Pulsa «+ Añadir Globo» para insertar un Fukidashi arrastrable en la capa L5.
                  </p>
                )}

                {/* SFX L4 Quick Input */}
                <div className="gf-field-box">
                  <label className="gf-field-label" htmlFor="gf-sfx-input">
                    Onomatopeya Kakimoji (Capa L4)
                  </label>
                  <input
                    id="gf-sfx-input"
                    type="text"
                    className="gf-text-input gf-text-input-sm"
                    value={primarySfx?.text ?? ''}
                    onChange={(e) => {
                      const nextText = e.target.value;
                      const rest = selectedKoma.sfxItems.slice(1);
                      const bounds = getPolygonBounds(selectedKoma.polygonCoords);
                      const nextSfx = nextText.trim()
                        ? [
                            {
                              id: primarySfx?.id || `${selectedKoma.id}-sfx-0`,
                              text: nextText,
                              x:
                                primarySfx?.x ??
                                Number(
                                  Math.min(84, Math.max(16, bounds.left + bounds.width * 0.74)).toFixed(1),
                                ),
                              y:
                                primarySfx?.y ??
                                Number(
                                  Math.min(86, Math.max(14, bounds.top + bounds.height * 0.76)).toFixed(1),
                                ),
                              rotation: primarySfx?.rotation ?? -8,
                            },
                            ...rest,
                          ]
                        : rest;
                      updateKomaById(currentPage.id, selectedKoma.id, { sfxItems: nextSfx });
                    }}
                    placeholder="Ej. ドン! (DON!)"
                  />
                </div>

                {canMarkLocked && (
                  <PillButton
                    variant="solid"
                    icon={<Lock size={14} strokeWidth={2} className="gf-icon-shrink" />}
                    onClick={() =>
                      updateKomaById(currentPage.id, selectedKoma.id, { state: 'LOCKED' })
                    }
                  >
                    Marcar Viñeta Lista (SHIAGE → LOCKED)
                  </PillButton>
                )}
              </div>
            </>
          )}
        </div>

        {/* =========================================================
            BLOCK 1: STRICT 7-LAYER STACK PANEL (L6 → L0)
            ========================================================= */}
        {currentPage && (
          <div className="gf-controls-divider gf-layers-panel">
            <div className="gf-inspector-head">
              <SectionLabel>Pila de Capas (L6 → L0)</SectionLabel>
              <Layers size={14} strokeWidth={1.75} className="gf-icon-shrink gf-layers-head-icon" />
            </div>

            <div className="gf-layers-list">
              {LAYER_DEFINITIONS.map((layer) => {
                const isVisible = layersVis[layer.key];
                const opacityVal =
                  layer.key === 'L0_nemu'
                    ? layersOpacity.L0_nemu
                    : layer.key === 'L1_tones'
                    ? layersOpacity.L1_tones
                    : null;

                return (
                  <div
                    key={layer.key}
                    className={`gf-layer-row ${isVisible ? '' : 'is-hidden'} ${
                      !layer.printable ? 'is-non-printable' : ''
                    }`}
                  >
                    <div className="gf-layer-row-top">
                      <button
                        type="button"
                        className="gf-layer-eye-btn"
                        onClick={() => onToggleLayer(currentPage.id, layer.key)}
                        aria-label={`${isVisible ? 'Ocultar' : 'Mostrar'} capa ${layer.code}`}
                      >
                        {isVisible ? (
                          <Eye size={14} strokeWidth={1.75} className="gf-icon-shrink" />
                        ) : (
                          <EyeOff size={14} strokeWidth={1.75} className="gf-icon-shrink" />
                        )}
                      </button>

                      <span className="gf-layer-code">{layer.code}</span>
                      <span className="gf-layer-name">{layer.label}</span>

                      {!layer.printable && (
                        <span className="gf-layer-nonprint-tag">No imprimible</span>
                      )}
                    </div>

                    {layer.hasOpacity && opacityVal !== null && (
                      <div className="gf-layer-opacity-row">
                        <span>Opacidad</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={opacityVal}
                          onChange={(e) =>
                            onLayerOpacity(
                              currentPage.id,
                              layer.key as 'L0_nemu' | 'L1_tones',
                              Number(e.target.value),
                            )
                          }
                          aria-label={`Opacidad de capa ${layer.code}`}
                        />
                        <span className="gf-layer-opacity-val">{opacityVal}%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="gf-controls-divider">
          <SectionLabel>Guionización Asistida</SectionLabel>
          <PillButton
            variant="outline"
            icon={<Sparkles size={15} strokeWidth={1.75} className="gf-icon-shrink" />}
            onClick={onOpenKai}
          >
            Pedir Secuencia a KAI Sensei
          </PillButton>
        </div>
      </div>
    );
  }

  if (view === 'cover') {
    const includeIsbn = project.cover.includeIsbn !== false;
    const isbnValidation = encodeEan13(project.cover.isbn || '');

    return (
      <div className="gf-controls-stack animate-slide-in-right">
        <div className="gf-controls-group">
          <SectionLabel>Generación de Cubierta Completa</SectionLabel>
          <p className="gf-helper-copy">
            Genera un lienzo panorámico 16:9 que unifica portada, lomo y contraportada en el mismo estilo.
          </p>
          <TextInput
            value={coverPrompt}
            onChange={(val) => updateCover({ prompt: val })}
            placeholder="Describe el ambiente, personajes y composición de la portada..."
          />
        </div>

        <div className="gf-engine-gates">
          <button
            type="button"
            role="switch"
            aria-checked={hdModelOn}
            className={`gf-engine-gate-btn ${hdModelOn ? 'is-on' : ''} ${
              !quotaProfile.hdRenderEnabled ? 'is-locked' : ''
            }`}
            onClick={onToggleHdModel}
          >
            <span className="gf-engine-gate-left">
              {quotaProfile.hdRenderEnabled ? (
                <Zap size={13} strokeWidth={2.2} className="gf-icon-shrink" />
              ) : (
                <Lock size={12} strokeWidth={2.2} className="gf-icon-shrink" />
              )}
              <span>Nano Banana 2 HD</span>
            </span>
            <span className="gf-engine-gate-pill">
              {hdModelOn ? 'ON' : quotaProfile.hdRenderEnabled ? 'OFF' : 'PRO'}
            </span>
          </button>

          <button
            type="button"
            role="switch"
            aria-checked={renderPriorityOn}
            className={`gf-engine-gate-btn ${renderPriorityOn ? 'is-on' : ''} ${
              !quotaProfile.renderPriority ? 'is-locked' : ''
            }`}
            onClick={onToggleRenderPriority}
          >
            <span className="gf-engine-gate-left">
              {quotaProfile.renderPriority ? (
                <Crown size={13} strokeWidth={2.2} className="gf-icon-shrink" />
              ) : (
                <Lock size={12} strokeWidth={2.2} className="gf-icon-shrink" />
              )}
              <span>Prioridad de Render</span>
            </span>
            <span className="gf-engine-gate-pill">
              {renderPriorityOn ? 'ON' : quotaProfile.renderPriority ? 'OFF' : 'MASTER'}
            </span>
          </button>
        </div>

        <div className="gf-controls-actions">
          <PillButton
            variant="solid"
            icon={
              isCoverBusy ? (
                <RefreshCw size={16} strokeWidth={1.75} className="gf-spin gf-icon-shrink" />
              ) : (
                <Sparkles size={16} strokeWidth={1.75} className="gf-icon-shrink" />
              )
            }
            onClick={() => generateCoverTarget('wrap')}
            disabled={isCoverBusy}
          >
            {isCoverBusy ? 'Generando Cubierta...' : 'Generar Full Wrap 16:9'}
          </PillButton>

          <PillButton
            variant="outline"
            onClick={() => generateCoverTarget('front')}
            disabled={isCoverBusy}
          >
            Generar Portada Frontal (3:4)
          </PillButton>

          <PillButton
            variant="outline"
            onClick={() => generateCoverTarget('back')}
            disabled={isCoverBusy}
          >
            Generar Contraportada (3:4)
          </PillButton>

          <PillButton
            variant="outline"
            icon={<Sparkles size={14} strokeWidth={1.75} className="gf-icon-shrink" />}
            onClick={onOpenKai}
          >
            Diseñar Portada con KAI
          </PillButton>

          {coverError && <div className="gf-inline-error">{coverError}</div>}
        </div>

        {/* Block 4: Editable ISBN-13, Barcode Toggle & Full Wrap Typography */}
        <div className="gf-controls-divider">
          <SectionLabel>ISBN-13 y Código de Barras EAN-13</SectionLabel>

          <label className="gf-toggle-row">
            <input
              type="checkbox"
              checked={includeIsbn}
              onChange={(e) => updateCover({ includeIsbn: e.target.checked })}
            />
            <span>Incluir caja de código de barras ISBN</span>
          </label>

          {includeIsbn && (
            <div className="gf-controls-group">
              <div className="gf-field-box">
                <label className="gf-field-label" htmlFor="gf-isbn-input">
                  ISBN-13 (13 dígitos)
                </label>
                <input
                  id="gf-isbn-input"
                  type="text"
                  className="gf-text-input gf-text-input-sm gf-mono-input"
                  value={project.cover.isbn ?? ''}
                  onChange={(e) => updateCover({ isbn: formatIsbn13(e.target.value) })}
                  placeholder="978-9945-0000-0-0"
                  maxLength={17}
                />
              </div>
              <span
                className={`gf-isbn-status ${
                  isbnValidation.valid && isbnValidation.checksumValid
                    ? 'is-ok'
                    : isbnValidation.valid
                    ? 'is-warn'
                    : 'is-muted'
                }`}
              >
                {isbnValidation.message}
              </span>
            </div>
          )}
        </div>

        <div className="gf-controls-divider">
          <SectionLabel>Tipografía sobre Full Wrap</SectionLabel>

          <div className="gf-field-box">
            <label className="gf-field-label" htmlFor="gf-spine-title">
              Título en el Lomo
            </label>
            <input
              id="gf-spine-title"
              type="text"
              className="gf-text-input gf-text-input-sm"
              value={project.cover.spineTitle ?? ''}
              onChange={(e) => updateCover({ spineTitle: e.target.value })}
              placeholder={project.name || 'Manga sin título'}
            />
          </div>

          <div className="gf-field-box">
            <label className="gf-field-label" htmlFor="gf-cover-author">
              Nombre del Autor
            </label>
            <input
              id="gf-cover-author"
              type="text"
              className="gf-text-input gf-text-input-sm"
              value={project.author}
              onChange={(e) => updateProject({ author: e.target.value })}
              placeholder="Autor / Mangaka"
            />
          </div>

          <div className="gf-field-box">
            <label className="gf-field-label" htmlFor="gf-cover-synopsis">
              Sinopsis de Contraportada
            </label>
            <textarea
              id="gf-cover-synopsis"
              className="gf-synopsis-textarea"
              value={project.cover.backSynopsis ?? ''}
              onChange={(e) => updateCover({ backSynopsis: e.target.value })}
              placeholder="Breve sinopsis editorial que aparecerá en la contraportada..."
              rows={3}
            />
          </div>
        </div>

        <div className="gf-controls-divider">
          <SectionLabel>Producción</SectionLabel>
          <PillButton
            variant="outline"
            icon={<Printer size={16} strokeWidth={1.75} className="gf-icon-shrink" />}
            onClick={onExportCover}
          >
            Exportar PNG de Cubierta
          </PillButton>
        </div>
      </div>
    );
  }

  return (
    <div className="gf-controls-empty">
      <Info size={28} strokeWidth={1.5} className="gf-controls-empty-icon gf-icon-shrink" />
      <span>
        Selecciona «Páginas e Interiores» para dirigir capas L0–L6 y globos Fukidashi, o abre{' '}
        <strong>KAI Sensei</strong> arriba para estructurar tu guion automáticamente.
      </span>
      <PillButton
        variant="outline"
        icon={<Sparkles size={15} strokeWidth={1.75} className="gf-icon-shrink" />}
        onClick={onOpenKai}
      >
        Abrir KAI Sensei
      </PillButton>
    </div>
  );
}
