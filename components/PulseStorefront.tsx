"use client";

import Image from "next/image";
import { CreditCard, LogOut, Minus, Paperclip, Pause, Pencil, Play, Plus, RotateCcw, Search, ShoppingBag, Sparkles, Trash2, User, X } from "lucide-react";
import { ClipboardEvent, FormEvent, PointerEvent, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { getProductPricing, type ProductCategory, type PulseProduct } from "@/lib/products";

type Props = {
  categories: Array<{ id: ProductCategory; label: string }>;
  products: PulseProduct[];
};

type CodexResult = {
  mode: "sdk" | "fallback";
  title: string;
  recommendation: string;
  items: string[];
  fallbackReason?: string;
};

type CartItem = {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    priceCents: number;
    originalPriceCents?: number;
  };
};

type StorefrontUser = {
  email: string;
  name?: string | null;
  role: "product_manager" | "client" | string;
};

type CodexImageAttachment = {
  name: string;
  dataUrl: string;
};

type CodexHistoryItem = {
  id: string;
  intent: string;
  createdAt: string;
  title: string;
  prompt: string;
  category: ProductCategory | null;
  imageCount: number;
  result: CodexResult;
  status?: "in_progress" | "applied" | "failed";
  version?: number;
  events?: string[];
  isNew?: boolean;
};

const categoryDetails: Record<ProductCategory, { title: string; summary: string }> = {
  core: {
    title: "Core Line",
    summary: "Daily energy built around bright fruit, clean caffeine, and a crisp training finish."
  },
  zero: {
    title: "Zero Sugar",
    summary: "Sharper zero-sugar cans for a lighter profile without losing the cold Pulse snap."
  },
  recovery: {
    title: "Recovery",
    summary: "Mineral energy for training, work, and travel resets."
  },
  limited: {
    title: "Limited Drops",
    summary: "Small-run flavors with deeper night profiles and seasonal accents."
  }
};

const heroSlides = ["/assets/hero-desert-pulse.png", "/assets/hero-mountain-pulse.png"];
const codexThinkingWords = ["thinking", "typing", "planning", "creating", "checking", "coding", "reviewing", "saving", "polishing"];

function codexTitle(prompt: string) {
  const cleaned = prompt.trim().replace(/\s+/g, " ");
  if (!cleaned) return "New storefront request";

  return cleaned.length > 58 ? `${cleaned.slice(0, 55)}...` : cleaned;
}

function codexSummary(result: CodexResult) {
  const cleaned = result.recommendation
    .replace(/\[[^\]]+\]\([^)]+\)/g, "$1")
    .replace(/\[[^\]]+\]\([^)]*\)/g, "")
    .replace(/[A-Za-z]:[\\/][^\s)]+/g, "")
    .replace(/\b[\w.-]+\.(css|tsx|ts|js|jsx|json|prisma|mjs)\b/gi, "")
    .replace(/`[^`]+`/g, "")
    .replace(/\b(class|component|route|file|selector|TypeScript|Next prerender|React key|SDK|repo|build|test|tests)\b/gi, "")
    .replace(/Verification:\s*.*$/is, "")
    .replace(/Import trace:\s*.*$/is, "")
    .replace(/\s+-\s+/g, ". ")
    .replace(/\s+/g, " ")
    .trim();

  const parts = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 8 && !/[\\/]/.test(sentence))
    .map((sentence) => sentence.replace(/^(Implemented|Changed|Added|Updated|Styled)\s+/i, (match) => match.charAt(0).toUpperCase() + match.slice(1).toLowerCase()))
    .slice(0, 4);

  if (result.items.length) {
    parts.push(
      ...result.items
        .filter((item) => !/[\\/]/.test(item) && !/\b(css|tsx|ts|js|class|test|build)\b/i.test(item))
        .slice(0, 2)
    );
  }

  return parts.length ? parts.slice(0, 6) : ["Codex applied the requested storefront change."];
}

function cleanCodexPrompt(prompt: string) {
  return prompt
    .replace(/^Undo this previous Codex change and restore the previous behavior as closely as possible:\s*/i, "")
    .replace(/^Modify this previous change:\s*/i, "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "");
}

function sentenceCase(text: string) {
  if (!text) return text;

  return `${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

function codexHistorySummary(item: CodexHistoryItem) {
  const request = cleanCodexPrompt(item.prompt);
  const lines = request ? [`User asked to ${sentenceCase(request)}.`] : ["User asked for a storefront change."];

  if (item.status === "failed") {
    return [...lines, "Codex could not finish this change."];
  }

  const cleanResult = codexSummary(item.result).find((line) => !/\bimplemented|changed|restored|file|class|build|test|sdk\b/i.test(line));

  const eventLines =
    item.events
      ?.map(cleanCodexPrompt)
      .filter(Boolean)
      .map((event) => `Later update: ${sentenceCase(event)}.`) ?? [];

  return [...lines, cleanResult ?? "Codex applied the requested change.", ...eventLines].slice(0, 4);
}

function PriceDisplay({ product }: { product: PulseProduct }) {
  const pricing = getProductPricing(product);

  if (!pricing.isDiscounted) {
    return <span className="product-price">{pricing.originalPrice}</span>;
  }

  return (
    <span className="product-price sale-price" aria-label={`${pricing.salePrice}, originally ${pricing.originalPrice}`}>
      <span className="original-price">{pricing.originalPrice}</span>
      <span className="discounted-price">{pricing.salePrice}</span>
    </span>
  );
}

export function PulseStorefront({ categories, products }: Props) {
  const [activeCategory, setActiveCategory] = useState<ProductCategory>("core");
  const [heroIndex, setHeroIndex] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [email, setEmail] = useState("pm@pulse.test");
  const [password, setPassword] = useState("password123");
  const [user, setUser] = useState<StorefrontUser | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [message, setMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [codexOpen, setCodexOpen] = useState(false);
  const [codexPrompt, setCodexPrompt] = useState("");
  const [codexImages, setCodexImages] = useState<CodexImageAttachment[]>([]);
  const [codexError, setCodexError] = useState("");
  const [codexResult, setCodexResult] = useState<CodexResult | null>(null);
  const [codexHistory, setCodexHistory] = useState<CodexHistoryItem[]>([]);
  const [codexPosition, setCodexPosition] = useState({ x: 72, y: 92 });
  const [expandedCodexHistoryId, setExpandedCodexHistoryId] = useState<string | null>(null);
  const [activeCodexActionId, setActiveCodexActionId] = useState<string | null>(null);
  const [codexThinkingIndex, setCodexThinkingIndex] = useState(0);
  const [codexDoneMessage, setCodexDoneMessage] = useState("");
  const [isCodexLoading, setIsCodexLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<PulseProduct | null>(null);

  const visibleProducts = useMemo(
    () => products.filter((product) => product.category === activeCategory),
    [activeCategory, products]
  );
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;

    return products.filter((product) =>
      [product.name, product.categoryLabel, product.description].some((value) => value.toLowerCase().includes(query))
    );
  }, [products, searchQuery]);

  const activeDetails = categoryDetails[activeCategory];
  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  const cartTotal = cartItems.reduce((total, item) => total + item.quantity * item.product.priceCents, 0);
  const canUseCodex = user?.role === "product_manager";

  async function refreshCart() {
    const response = await fetch("/api/cart");
    const data = await response.json();
    setCartItems(data.items ?? []);
  }

  useLayoutEffect(() => {
    async function loadSession() {
      const response = await fetch("/api/auth/me");
      const data = await response.json();
      if (data.user) {
        setUser(data.user);
        await refreshCart();
      }
    }

    loadSession();
  }, []);

  useEffect(() => {
    if (isHeroPaused) return;

    const timer = window.setInterval(() => {
      setHeroIndex((index) => (index + 1) % heroSlides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [isHeroPaused]);

  useEffect(() => {
    if (codexOpen && canUseCodex) {
      refreshCodexHistory();
    }
  }, [codexOpen, canUseCodex]);

  useEffect(() => {
    if (!isCodexLoading) {
      setCodexThinkingIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setCodexThinkingIndex((index) => (index + 1) % codexThinkingWords.length);
    }, 2000);

    return () => window.clearInterval(timer);
  }, [isCodexLoading]);

  useLayoutEffect(() => {
    function updateHeaderTone() {
      const products = document.querySelector(".products");
      const header = document.querySelector<HTMLElement>(".site-header");
      if (!products) return;

      const whiteTop = products.getBoundingClientRect().top;
      const headerTop = header?.getBoundingClientRect().top ?? 0;
      header?.style.setProperty("--header-light-height", `${Math.max(0, whiteTop - headerTop)}px`);
    }

    updateHeaderTone();
    const animationFrames = [
      window.requestAnimationFrame(updateHeaderTone),
      window.requestAnimationFrame(() => window.requestAnimationFrame(updateHeaderTone))
    ];
    const timers = [
      window.setTimeout(updateHeaderTone, 120),
      window.setTimeout(updateHeaderTone, 480),
      window.setTimeout(updateHeaderTone, 920)
    ];
    window.addEventListener("scroll", updateHeaderTone, { passive: true });
    window.addEventListener("resize", updateHeaderTone);

    return () => {
      animationFrames.forEach((frame) => window.cancelAnimationFrame(frame));
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("scroll", updateHeaderTone);
      window.removeEventListener("resize", updateHeaderTone);
    };
  }, [heroIndex, canUseCodex, user, selectedProduct, authOpen, cartOpen, searchOpen, codexOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAuthOpen(false);
        setCartOpen(false);
        setCodexOpen(false);
        setSearchOpen(false);
        setSelectedProduct(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function chooseCategory(category: ProductCategory) {
    setActiveCategory(category);
    setMessage("");
    setCodexResult(null);
    setSearchOpen(false);
    setSelectedProduct(null);
  }

  function openAuth() {
    setAuthOpen(true);
    setCartOpen(false);
    setSearchOpen(false);
    setSelectedProduct(null);
    setAuthError("");
  }

  function toggleCart() {
    setCartOpen((open) => !open);
    setAuthOpen(false);
    setSearchOpen(false);
    setSelectedProduct(null);
  }

  function openProduct(product: PulseProduct) {
    setSelectedProduct(product);
    setAuthOpen(false);
    setCartOpen(false);
    setSearchOpen(false);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setAuthError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();

    if (!response.ok) {
      setAuthError(data.error ?? "Login failed.");
      return;
    }

    setUser(data.user);
    setAuthOpen(false);
    setAuthError("");
    await refreshCart();
    setMessage("Connexion reussie.");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setCartItems([]);
    setCartOpen(false);
    setMessage("Deconnexion reussie.");
  }

  async function addToCart(productId: string) {
    setMessage("");
    const response = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1 })
    });
    const data = await response.json();

    if (!response.ok) {
      openAuth();
      setMessage(data.error ?? "Login required.");
      return;
    }

    await refreshCart();
    setCartOpen(true);
    setMessage("Added to cart.");
  }

  async function updateCartQuantity(productId: string, quantity: number) {
    if (quantity < 1 || quantity > 24) return;

    setMessage("");
    const response = await fetch("/api/cart", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity })
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Cart update failed.");
      return;
    }

    await refreshCart();
  }

  async function removeCartItem(productId: string) {
    setMessage("");
    const response = await fetch("/api/cart", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId })
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Cart update failed.");
      return;
    }

    await refreshCart();
    setMessage("Removed from cart.");
  }

  function openCodexChat() {
    if (!canUseCodex) {
      setMessage("Codex is only available to product managers.");
      return;
    }

    setCodexOpen(true);
    setCodexError("");
    refreshCodexHistory();
  }

  function openSearch() {
    setSearchOpen(true);
    setAuthOpen(false);
    setSelectedProduct(null);
  }

  async function refreshCodexHistory() {
    const response = await fetch("/api/codex");
    if (!response.ok) return;

    const data = await response.json();
    setCodexHistory((data.actions ?? []).map((item: CodexHistoryItem) => ({ ...item, status: item.status ?? "applied" })));
  }

  function moveCodexWindow(event: PointerEvent<HTMLElement>) {
    const startX = event.clientX - codexPosition.x;
    const startY = event.clientY - codexPosition.y;

    function handlePointerMove(moveEvent: globalThis.PointerEvent) {
      setCodexPosition({
        x: Math.max(12, Math.min(window.innerWidth - 120, moveEvent.clientX - startX)),
        y: Math.max(12, Math.min(window.innerHeight - 80, moveEvent.clientY - startY))
      });
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function readImageAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Could not read image."));
        }
      };
      reader.onerror = () => reject(new Error("Could not read image."));
      reader.readAsDataURL(file);
    });
  }

  async function attachCodexImages(files: File[], source: "file" | "paste") {
    const images = files.filter((file) => file.type.startsWith("image/"));

    if (!images.length) return;

    try {
      const attachments = await Promise.all(
        images.map(async (file, index) => {
          const extension = file.type.split("/")[1]?.split(";")[0] || "png";
          const name = source === "file" && file.name ? file.name : `pasted-image-${Date.now()}-${index + 1}.${extension}`;

          return {
            name,
            dataUrl: await readImageAsDataUrl(file)
          };
        })
      );

      setCodexImages((current) => [...current, ...attachments].slice(0, 4));
      setCodexError("");
    } catch {
      setCodexError("Could not attach that image.");
    }
  }

  function handleCodexPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));

    if (!files.length) return;

    event.preventDefault();
    attachCodexImages(files, "paste");
  }

  async function handleCodexSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canUseCodex) {
      setCodexError("Codex is only available to product managers.");
      return;
    }

    if (codexPrompt.trim().length < 3 && codexImages.length === 0) {
      setCodexError("Write a short feature request or attach an image.");
      return;
    }

    const prompt = codexPrompt.trim() || "Review the attached image and suggest a storefront feature.";
    const pendingId = activeCodexActionId ?? `pending-${Date.now()}`;
    const pendingResult: CodexResult = {
      mode: "fallback",
      title: "Codex is working",
      recommendation: "Codex is preparing this storefront change.",
      items: []
    };

    setCodexError("");
    setCodexResult(null);
    setCodexDoneMessage("");
    setExpandedCodexHistoryId(pendingId);
    setCodexHistory((current) =>
      activeCodexActionId
        ? current.map((item) =>
            item.id === activeCodexActionId
              ? {
                  ...item,
                  status: "in_progress",
                  result: pendingResult
                }
              : item
          )
        : [
            {
              id: pendingId,
              intent: "feature-request",
              createdAt: new Date().toISOString(),
              title: codexTitle(prompt),
              prompt,
              category: activeCategory,
              imageCount: codexImages.length,
              result: pendingResult,
              status: "in_progress",
              version: 1,
              events: [],
              isNew: true
            },
            ...current
          ]
    );
    setIsCodexLoading(true);
    const response = await fetch("/api/codex", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "feature-request", category: activeCategory, prompt, images: codexImages, actionId: activeCodexActionId ?? undefined })
    });
    const data = await response.json();
    if (!response.ok) {
      setCodexError(data.error ?? "Codex request failed.");
      setCodexHistory((current) =>
        current.map((item) =>
          item.id === pendingId
            ? {
                ...item,
                status: "failed",
                result: {
                  mode: "fallback",
                  title: "Codex failed",
                  recommendation: data.error ?? "Codex could not finish this change.",
                  items: []
                }
              }
            : item
        )
      );
      await refreshCodexHistory();
    } else {
      setCodexResult(data);
      setCodexDoneMessage("Codex is done.");
      setCodexHistory((current) =>
        current.map((item) =>
          item.id === pendingId
            ? {
                ...item,
                status: "applied",
                version: activeCodexActionId ? (item.version ?? 1) + 1 : item.version ?? 1,
                events: activeCodexActionId ? [...(item.events ?? []), prompt].slice(-4) : item.events ?? [],
                result: data
              }
            : item
        )
      );
      await refreshCodexHistory();
    }
    setActiveCodexActionId(null);
    setIsCodexLoading(false);
  }

  function reuseCodexHistory(item: CodexHistoryItem) {
    setExpandedCodexHistoryId((current) => (current === item.id ? null : item.id));
    setCodexError("");
  }

  function editCodexHistory(item: CodexHistoryItem) {
    setCodexPrompt(`Modify this previous change: ${item.prompt}`);
    setCodexResult(item.result);
    setActiveCodexActionId(item.id);
    setExpandedCodexHistoryId(item.id);
    setCodexError("");
  }

  function undoCodexHistory(item: CodexHistoryItem) {
    setCodexPrompt(`Undo this previous Codex change and restore the previous behavior as closely as possible: ${item.prompt}`);
    setActiveCodexActionId(item.id);
    setExpandedCodexHistoryId(item.id);
    setCodexResult(item.result);
    setCodexError("");
  }

  async function deleteCodexHistory(item: CodexHistoryItem) {
    const response = await fetch(`/api/codex?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });

    if (!response.ok) {
      setCodexError("Could not delete that history item.");
      return;
    }

    setCodexHistory((current) => current.filter((historyItem) => historyItem.id !== item.id));
    setCodexError("");
  }

  function ToneText({ className = "", text }: { className?: string; text: string }) {
    return <span className={`tone-word ${className}`}>{text}</span>;
  }

  function HeaderLayer({ tone, decorative = false }: { tone: "light" | "dark"; decorative?: boolean }) {
    const inertProps = decorative ? { tabIndex: -1 } : {};

    return (
      <div className={`header-tone-layer header-tone-${tone}`} aria-hidden={decorative ? "true" : undefined}>
        <nav className="nav-left">
          <a href="#shop" onClick={() => chooseCategory("core")} {...inertProps}>
            <ToneText text="SHOP" />
          </a>
          {canUseCodex ? (
            <button className="nav-action codex-nav-action" type="button" onClick={openCodexChat} tabIndex={decorative ? -1 : undefined}>
              <Sparkles size={14} aria-hidden="true" />
              <ToneText text="CODEX" />
            </button>
          ) : null}
        </nav>
        <a className="brand" href="#" aria-label="Pulse home" {...inertProps}>
          <ToneText text="pulse." />
        </a>
        <nav className="nav-right">
          <button className="icon-action" type="button" onClick={openSearch} aria-label="Search" tabIndex={decorative ? -1 : undefined}>
            <Search size={18} strokeWidth={2.4} aria-hidden="true" />
          </button>
          <button
            className="icon-action"
            type="button"
            onClick={openAuth}
            aria-label={user ? "Open profile" : "Sign in"}
            tabIndex={decorative ? -1 : undefined}
          >
            <User size={18} strokeWidth={2.4} aria-hidden="true" />
          </button>
          {user ? (
            <button className="icon-action" type="button" aria-label="Sign out" onClick={handleLogout} tabIndex={decorative ? -1 : undefined}>
              <LogOut size={18} strokeWidth={2.4} aria-hidden="true" />
            </button>
          ) : null}
          <button
            className="cart-label icon-action"
            type="button"
            onClick={toggleCart}
            aria-label={`Cart with ${cartCount} items`}
            tabIndex={decorative ? -1 : undefined}
          >
            <ShoppingBag size={18} strokeWidth={2.4} aria-hidden="true" />
            {cartCount > 0 ? <span className="cart-badge">{cartCount}</span> : null}
          </button>
        </nav>
      </div>
    );
  }

  return (
    <>
      <div className="announcement-banner" role="region" aria-label="Store promotion">
        10% off Recovery and Zero Sugar
      </div>
      <header className="site-header" aria-label="Primary navigation">
        <HeaderLayer tone="light" />
        <HeaderLayer tone="dark" decorative />
      </header>

      {searchOpen ? (
        <div className="search-layer" role="presentation">
          <aside className="search-panel" role="search" aria-label="Product search">
            <div className="panel-heading">
              <p className="eyebrow">Search</p>
              <button className="icon-action" type="button" onClick={() => setSearchOpen(false)} aria-label="Close search">
                <X size={18} strokeWidth={2.4} aria-hidden="true" />
              </button>
            </div>
            <label className="search-field">
              <Search size={18} strokeWidth={2.4} aria-hidden="true" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search cans"
                autoFocus
              />
            </label>
            <div className="search-results">
              {searchResults.map((product) => (
                <button className="search-result" type="button" key={product.id} onClick={() => openProduct(product)}>
                  <span>{product.name}</span>
                  <small>{product.categoryLabel}</small>
                  <PriceDisplay product={product} />
                </button>
              ))}
            </div>
          </aside>
        </div>
      ) : null}

      {authOpen ? (
        <div
          className="modal-layer"
          role="presentation"
          onClick={() => {
            setAuthOpen(false);
            setAuthError("");
          }}
        >
          {user ? (
            <aside className="auth-panel account-panel" role="dialog" aria-modal="true" aria-label="Profile" onClick={(event) => event.stopPropagation()}>
              <div className="panel-heading">
                <p className="eyebrow">Profile</p>
                <button
                  className="icon-action"
                  type="button"
                  onClick={() => {
                    setAuthOpen(false);
                    setAuthError("");
                  }}
                  aria-label="Close profile"
                >
                  <X size={18} strokeWidth={2.4} aria-hidden="true" />
                </button>
              </div>
              <h2>{user.name ?? "Pulse account"}</h2>
              <p>{user.email}</p>
              <p>{user.role === "product_manager" ? "Product manager" : "Client"}</p>
              <p>{cartCount} item{cartCount === 1 ? "" : "s"} in cart</p>
              <button className="button button-dark" type="button" onClick={handleLogout}>
                Sign out
              </button>
            </aside>
          ) : (
            <form className="auth-panel" role="dialog" aria-modal="true" aria-label="Sign in" onSubmit={handleLogin} onClick={(event) => event.stopPropagation()}>
              <div className="panel-heading">
                <p className="eyebrow">Sign in</p>
                <button
                  className="icon-action"
                  type="button"
                  onClick={() => {
                    setAuthOpen(false);
                    setAuthError("");
                  }}
                  aria-label="Close sign in"
                >
                  <X size={18} strokeWidth={2.4} aria-hidden="true" />
                </button>
              </div>
              {authError ? (
                <p className="auth-error" role="alert">
                  {authError}
                </p>
              ) : null}
              <label>
                Email
                <input
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setAuthError("");
                  }}
                  type="email"
                  aria-invalid={authError ? "true" : undefined}
                />
              </label>
              <label>
                Password
                <input
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setAuthError("");
                  }}
                  type="password"
                  aria-invalid={authError ? "true" : undefined}
                />
              </label>
              <button className="button button-dark" type="submit">
                Sign in
              </button>
            </form>
          )}
        </div>
      ) : null}

      {cartOpen ? (
        <div className="cart-layer" role="presentation" onClick={() => setCartOpen(false)}>
          <aside className="cart-panel" aria-label="Shopping cart" onClick={(event) => event.stopPropagation()}>
            <div className="panel-heading">
              <p className="eyebrow">Cart</p>
              <button className="icon-action" type="button" onClick={() => setCartOpen(false)} aria-label="Close cart">
                <X size={18} strokeWidth={2.4} aria-hidden="true" />
              </button>
            </div>
            {user ? (
              cartItems.length > 0 ? (
                <>
                  <div className="cart-items">
                    {cartItems.map((item) => (
                      <div className="cart-row" key={item.id}>
                        <div className="cart-item-copy">
                          <span>{item.product.name}</span>
                          <small>
                            {item.product.originalPriceCents && item.product.originalPriceCents !== item.product.priceCents ? (
                              <>
                                <span className="original-price">${(item.product.originalPriceCents / 100).toFixed(2)}</span>{" "}
                              </>
                            ) : null}
                            <span className={item.product.originalPriceCents && item.product.originalPriceCents !== item.product.priceCents ? "discounted-price" : ""}>
                              ${(item.product.priceCents / 100).toFixed(2)} each
                            </span>
                          </small>
                        </div>
                        <div className="cart-quantity" aria-label={`Quantity for ${item.product.name}`}>
                          <button
                            className="cart-control"
                            type="button"
                            onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            aria-label={`Decrease ${item.product.name} quantity`}
                            title="Decrease"
                          >
                            <Minus size={13} strokeWidth={2.5} aria-hidden="true" />
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            className="cart-control"
                            type="button"
                            onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                            disabled={item.quantity >= 24}
                            aria-label={`Increase ${item.product.name} quantity`}
                            title="Increase"
                          >
                            <Plus size={13} strokeWidth={2.5} aria-hidden="true" />
                          </button>
                        </div>
                        <strong>${((item.product.priceCents * item.quantity) / 100).toFixed(2)}</strong>
                        <button
                          className="cart-remove"
                          type="button"
                          onClick={() => removeCartItem(item.product.id)}
                          aria-label={`Remove ${item.product.name} from cart`}
                          title="Remove"
                        >
                          <Trash2 size={14} strokeWidth={2.4} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <label className="promo-field">
                    <span>Promo code</span>
                    <input value={promoCode} onChange={(event) => setPromoCode(event.target.value.toUpperCase())} placeholder="PULSE10" />
                  </label>
                  <div className="cart-total">
                    <span>Total</span>
                    <strong>${(cartTotal / 100).toFixed(2)}</strong>
                  </div>
                  <button className="cart-pay button button-dark" type="button">
                    <CreditCard size={16} strokeWidth={2.4} aria-hidden="true" />
                    Pay
                  </button>
                </>
              ) : (
                <p>Your cart is empty.</p>
              )
            ) : (
              <p>Sign in to add products and keep your cart.</p>
            )}
          </aside>
        </div>
      ) : null}

      {selectedProduct ? (
        <div className="modal-layer product-detail-layer" role="presentation" onClick={() => setSelectedProduct(null)}>
          <aside
            className="product-detail-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-heading">
              <p className="eyebrow">{selectedProduct.categoryLabel}</p>
              <button className="icon-action" type="button" onClick={() => setSelectedProduct(null)} aria-label="Close product details">
                <X size={18} strokeWidth={2.4} aria-hidden="true" />
              </button>
            </div>
            <div className="product-detail-body">
              <div className="product-detail-visual">
                <Image
                  className="product-detail-image"
                  src={selectedProduct.image}
                  alt={`${selectedProduct.name} can`}
                  width={900}
                  height={640}
                  sizes="(max-width: 760px) 70vw, 360px"
                  quality={100}
                />
              </div>
              <div className="product-detail-copy">
                <p className="product-kicker">{selectedProduct.categoryLabel}</p>
                <h2 id="product-detail-title">{selectedProduct.name}</h2>
                <p className="product-detail-description">{selectedProduct.description}</p>
                <div className="product-detail-price">
                  <span>Price</span>
                  <PriceDisplay product={selectedProduct} />
                </div>
                <dl className="product-detail-specs">
                  <div>
                    <dt>Composition</dt>
                    <dd>{selectedProduct.composition}</dd>
                  </div>
                  <div>
                    <dt>Ingredients</dt>
                    <dd>{selectedProduct.ingredients.join(", ")}</dd>
                  </div>
                  <div>
                    <dt>Drink window</dt>
                    <dd>{selectedProduct.drinkWindow}</dd>
                  </div>
                  <div>
                    <dt>Texture</dt>
                    <dd>{selectedProduct.carbonation}</dd>
                  </div>
                  <div>
                    <dt>Recommendation</dt>
                    <dd>{selectedProduct.recommendation}</dd>
                  </div>
                </dl>
                <button className="button button-dark" type="button" onClick={() => addToCart(selectedProduct.id)}>
                  Add
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {codexOpen && canUseCodex ? (
        <aside
          className="codex-chat"
          role="dialog"
          aria-label="Codex feature chat"
          style={{ left: codexPosition.x, top: codexPosition.y }}
        >
          <div className="panel-heading codex-drag-handle" onPointerDown={moveCodexWindow}>
            <h2 className="codex-title">codex</h2>
            <button
              className="icon-action"
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setCodexOpen(false)}
              aria-label="Close Codex chat"
            >
              <X size={18} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>

          <div className="codex-thread" aria-live="polite">
            {isCodexLoading ? (
              <p className="codex-status-line">
                Codex is{" "}
                <span className="codex-typing-word" key={codexThinkingWords[codexThinkingIndex]}>
                  {codexThinkingWords[codexThinkingIndex]}
                </span>
              </p>
            ) : codexDoneMessage ? (
              <p className="codex-status-line codex-status-done">
                <span className="codex-new-badge">NEW</span>
                {codexDoneMessage} New feature applied.
              </p>
            ) : null}
          </div>

          {codexHistory.length ? (
            <div className="codex-history" aria-label="Codex history">
              <p className="eyebrow">Recent changes</p>
              {codexHistory.map((item) => (
                <article className={`codex-history-item ${expandedCodexHistoryId === item.id ? "expanded" : ""}`} key={item.id}>
                  <button className="codex-history-main" type="button" onClick={() => reuseCodexHistory(item)}>
                    <span className="codex-history-title">
                      {item.isNew ? <span className="codex-new-badge">NEW</span> : null}
                      {item.title}
                    </span>
                    <small>
                      {new Date(item.createdAt).toLocaleDateString()} · {item.imageCount} image{item.imageCount === 1 ? "" : "s"}
                      <span className={`codex-status-pill ${item.status ?? "applied"}`}>
                        {item.status === "in_progress" ? "running" : `${item.status ?? "applied"} v${item.version ?? 1}`}
                      </span>
                    </small>
                  </button>
                  <div className="codex-history-actions">
                    <button type="button" onClick={() => editCodexHistory(item)} aria-label={`Edit ${item.title}`} title="Edit">
                      <Pencil size={12} strokeWidth={2.4} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => undoCodexHistory(item)} aria-label={`Undo ${item.title}`} title="Undo">
                      <RotateCcw size={12} strokeWidth={2.4} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => deleteCodexHistory(item)} aria-label={`Delete ${item.title}`} title="Delete">
                      <Trash2 size={12} strokeWidth={2.4} aria-hidden="true" />
                    </button>
                  </div>
                  {expandedCodexHistoryId === item.id ? (
                    <div className="codex-history-summary">
                      {codexHistorySummary(item).map((sentence) => (
                        <p key={sentence}>{sentence}</p>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}

          <form className="codex-form" onSubmit={handleCodexSubmit}>
            {codexError ? (
              <p className="auth-error" role="alert">
                {codexError}
              </p>
            ) : null}
            <label>
              <span className="codex-helper">This developer feature is hidden from clients and is only available to product managers.</span>
              <textarea
                value={codexPrompt}
                onChange={(event) => {
                  setCodexPrompt(event.target.value);
                  setCodexError("");
                }}
                onPaste={handleCodexPaste}
                rows={4}
                placeholder="Example: add a wishlist button. Paste an image here to attach it."
              />
            </label>
            <div className="codex-attachments">
              <label className="codex-upload">
                <Paperclip size={15} strokeWidth={2.3} aria-hidden="true" />
                <span className="sr-only">Attach image</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    attachCodexImages(Array.from(event.target.files ?? []), "file");
                    event.target.value = "";
                  }}
                />
              </label>
              {codexImages.length ? (
                <div className="codex-image-list">
                  {codexImages.map((image) => (
                    <button
                      className="codex-image-pill"
                      key={`${image.name}-${image.dataUrl.length}`}
                      type="button"
                      onClick={() => setCodexImages((current) => current.filter((item) => item !== image))}
                      aria-label={`Remove ${image.name}`}
                    >
                      {image.name}
                      <X size={12} strokeWidth={2.4} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button className="codex-send button button-dark" type="submit" disabled={isCodexLoading}>
              {isCodexLoading ? "..." : "Send"}
            </button>
          </form>
        </aside>
      ) : null}

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-track" style={{ transform: `translateX(-${heroIndex * 100}%)` }}>
            {heroSlides.map((slide, index) => (
              <Image
                className="hero-image"
                src={slide}
                alt={index === 0 ? "Runner holding a Pulse Glacier Zero can in a desert trail scene" : "Hiker carrying a Pulse can in a mountain meadow scene"}
                width={1792}
                height={1024}
                sizes="100vw"
                quality={100}
                priority={index === 0}
                key={slide}
              />
            ))}
          </div>
          <div className="hero-copy">
            <h1 id="hero-title">Second wind</h1>
            <p className="hero-subtitle">Recharge without breaking stride.</p>
            <a className="button button-light" href="#shop">
              Shop
            </a>
          </div>
          <div className="hero-controls" aria-label="Hero slideshow controls">
            <div className="hero-progress">
              {heroSlides.map((slide, index) => (
                <button
                  className={index === heroIndex ? "active" : ""}
                  key={slide}
                  type="button"
                  onClick={() => setHeroIndex(index)}
                  aria-label={`Show hero image ${index + 1}`}
                />
              ))}
            </div>
            <button
              className="hero-pause"
              type="button"
              onClick={() => setIsHeroPaused((paused) => !paused)}
              aria-label={isHeroPaused ? "Resume hero slideshow" : "Pause hero slideshow"}
            >
              {isHeroPaused ? <Play size={14} strokeWidth={2.4} aria-hidden="true" /> : <Pause size={14} strokeWidth={2.4} aria-hidden="true" />}
            </button>
          </div>
        </section>

        <section className="products" id="shop" aria-labelledby="products-title">
          <div className="section-heading">
            <p className="eyebrow">Now viewing</p>
            <h2 id="products-title">{activeDetails.title}</h2>
            <p className="category-summary">{activeDetails.summary}</p>
            <div className="category-tabs" aria-label="Product categories">
              {categories.map((category) => (
                <button
                  className={category.id === activeCategory ? "active" : ""}
                  key={category.id}
                  type="button"
                  onClick={() => chooseCategory(category.id)}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <div className="product-grid">
            {visibleProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <button className="product-visual" type="button" onClick={() => openProduct(product)} aria-label={`View details for ${product.name}`}>
                  <Image
                    className="product-can-image"
                    src={product.image}
                    alt={`${product.name} can`}
                    width={900}
                    height={640}
                    sizes="(max-width: 640px) 100vw, (max-width: 980px) 50vw, 33vw"
                    quality={100}
                  />
                </button>
                <p className="product-kicker">{product.categoryLabel}</p>
                <h3>{product.name}</h3>
                <PriceDisplay product={product} />
                <button className="product-add" type="button" onClick={() => addToCart(product.id)}>
                  Add
                </button>
              </article>
            ))}
          </div>

          <div className="store-status" aria-live="polite">
            {message ? <p>{message}</p> : null}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div>
          <a className="brand" href="#">
            pulse.
          </a>
          <p>Premium energy for training, work, nights out, and the space between.</p>
        </div>
        <div className="footer-links">
          <a href="#">Stockists</a>
          <a href="#">Subscriptions</a>
          <a href="#">Ingredients</a>
          <a href="#">Contact</a>
        </div>
      </footer>
    </>
  );
}
