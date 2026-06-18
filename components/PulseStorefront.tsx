"use client";

import Image from "next/image";
import { CreditCard, LogOut, Minus, Paperclip, Pause, Pencil, Play, Plus, RotateCcw, Search, ShoppingBag, Sparkles, Trash2, User, X } from "lucide-react";
import { ClipboardEvent, FormEvent, PointerEvent, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { getProductPricing, type ProductCategory, type PulseProduct } from "@/lib/products";

type Props = {
  categories: Array<{ id: ProductCategory; label: string }>;
  products: PulseProduct[];
};

type CopilotResult = {
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

type CopilotImageAttachment = {
  name: string;
  dataUrl: string;
};

type CopilotHistoryItem = {
  id: string;
  intent: string;
  createdAt: string;
  title: string;
  prompt: string;
  category: ProductCategory | null;
  imageCount: number;
  result: CopilotResult;
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
const copilotThinkingWords = ["thinking", "typing", "planning", "creating", "checking", "coding", "reviewing", "saving", "polishing"];

function copilotTitle(prompt: string) {
  const cleaned = prompt.trim().replace(/\s+/g, " ");
  if (!cleaned) return "New storefront request";

  return cleaned.length > 58 ? `${cleaned.slice(0, 55)}...` : cleaned;
}

function copilotSummary(result: CopilotResult) {
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

  return parts.length ? parts.slice(0, 6) : ["Copilot applied the requested storefront change."];
}

function cleanCopilotPrompt(prompt: string) {
  return prompt
    .replace(/^Undo this previous Copilot change and restore the previous behavior as closely as possible:\s*/i, "")
    .replace(/^Modify this previous change:\s*/i, "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "");
}

function sentenceCase(text: string) {
  if (!text) return text;

  return `${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

function copilotHistorySummary(item: CopilotHistoryItem) {
  const request = cleanCopilotPrompt(item.prompt);
  const lines = request ? [`User asked to ${sentenceCase(request)}.`] : ["User asked for a storefront change."];

  if (item.status === "failed") {
    return [...lines, "Copilot could not finish this change."];
  }

  const cleanResult = copilotSummary(item.result).find((line) => !/\bimplemented|changed|restored|file|class|build|test|sdk\b/i.test(line));

  const eventLines =
    item.events
      ?.map(cleanCopilotPrompt)
      .filter(Boolean)
      .map((event) => `Later update: ${sentenceCase(event)}.`) ?? [];

  return [...lines, cleanResult ?? "Copilot applied the requested change.", ...eventLines].slice(0, 4);
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
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotPrompt, setCopilotPrompt] = useState("");
  const [copilotImages, setCopilotImages] = useState<CopilotImageAttachment[]>([]);
  const [copilotError, setCopilotError] = useState("");
  const [copilotResult, setCopilotResult] = useState<CopilotResult | null>(null);
  const [copilotHistory, setCopilotHistory] = useState<CopilotHistoryItem[]>([]);
  const [copilotPosition, setCopilotPosition] = useState({ x: 72, y: 92 });
  const [expandedCopilotHistoryId, setExpandedCopilotHistoryId] = useState<string | null>(null);
  const [activeCopilotActionId, setActiveCopilotActionId] = useState<string | null>(null);
  const [copilotThinkingIndex, setCopilotThinkingIndex] = useState(0);
  const [copilotDoneMessage, setCopilotDoneMessage] = useState("");
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);
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
  const canUseCopilot = user?.role === "product_manager";

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
    if (copilotOpen && canUseCopilot) {
      refreshCopilotHistory();
    }
  }, [copilotOpen, canUseCopilot]);

  useEffect(() => {
    if (!isCopilotLoading) {
      setCopilotThinkingIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setCopilotThinkingIndex((index) => (index + 1) % copilotThinkingWords.length);
    }, 2000);

    return () => window.clearInterval(timer);
  }, [isCopilotLoading]);

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
  }, [heroIndex, canUseCopilot, user, selectedProduct, authOpen, cartOpen, searchOpen, copilotOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAuthOpen(false);
        setCartOpen(false);
        setCopilotOpen(false);
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
    setCopilotResult(null);
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

  function openCopilotChat() {
    if (!canUseCopilot) {
      setMessage("Copilot is only available to product managers.");
      return;
    }

    setCopilotOpen(true);
    setCopilotError("");
    refreshCopilotHistory();
  }

  function openSearch() {
    setSearchOpen(true);
    setAuthOpen(false);
    setSelectedProduct(null);
  }

  async function refreshCopilotHistory() {
    const response = await fetch("/api/copilot");
    if (!response.ok) return;

    const data = await response.json();
    setCopilotHistory((data.actions ?? []).map((item: CopilotHistoryItem) => ({ ...item, status: item.status ?? "applied" })));
  }

  function moveCopilotWindow(event: PointerEvent<HTMLElement>) {
    const startX = event.clientX - copilotPosition.x;
    const startY = event.clientY - copilotPosition.y;

    function handlePointerMove(moveEvent: globalThis.PointerEvent) {
      setCopilotPosition({
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

  async function attachCopilotImages(files: File[], source: "file" | "paste") {
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

      setCopilotImages((current) => [...current, ...attachments].slice(0, 4));
      setCopilotError("");
    } catch {
      setCopilotError("Could not attach that image.");
    }
  }

  function handleCopilotPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));

    if (!files.length) return;

    event.preventDefault();
    attachCopilotImages(files, "paste");
  }

  async function handleCopilotSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canUseCopilot) {
      setCopilotError("Copilot is only available to product managers.");
      return;
    }

    if (copilotPrompt.trim().length < 3 && copilotImages.length === 0) {
      setCopilotError("Write a short feature request or attach an image.");
      return;
    }

    const prompt = copilotPrompt.trim() || "Review the attached image and suggest a storefront feature.";
    const pendingId = activeCopilotActionId ?? `pending-${Date.now()}`;
    const pendingResult: CopilotResult = {
      mode: "fallback",
      title: "Copilot is working",
      recommendation: "Copilot is preparing this storefront change.",
      items: []
    };

    setCopilotError("");
    setCopilotResult(null);
    setCopilotDoneMessage("");
    setExpandedCopilotHistoryId(pendingId);
    setCopilotHistory((current) =>
      activeCopilotActionId
        ? current.map((item) =>
            item.id === activeCopilotActionId
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
              title: copilotTitle(prompt),
              prompt,
              category: activeCategory,
              imageCount: copilotImages.length,
              result: pendingResult,
              status: "in_progress",
              version: 1,
              events: [],
              isNew: true
            },
            ...current
          ]
    );
    setIsCopilotLoading(true);
    const response = await fetch("/api/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "feature-request", category: activeCategory, prompt, images: copilotImages, actionId: activeCopilotActionId ?? undefined })
    });
    const data = await response.json();
    if (!response.ok) {
      setCopilotError(data.error ?? "Copilot request failed.");
      setCopilotHistory((current) =>
        current.map((item) =>
          item.id === pendingId
            ? {
                ...item,
                status: "failed",
                result: {
                  mode: "fallback",
                  title: "Copilot failed",
                  recommendation: data.error ?? "Copilot could not finish this change.",
                  items: []
                }
              }
            : item
        )
      );
      await refreshCopilotHistory();
    } else {
      setCopilotResult(data);
      setCopilotDoneMessage("Copilot is done.");
      setCopilotHistory((current) =>
        current.map((item) =>
          item.id === pendingId
            ? {
                ...item,
                status: "applied",
                version: activeCopilotActionId ? (item.version ?? 1) + 1 : item.version ?? 1,
                events: activeCopilotActionId ? [...(item.events ?? []), prompt].slice(-4) : item.events ?? [],
                result: data
              }
            : item
        )
      );
      await refreshCopilotHistory();
    }
    setActiveCopilotActionId(null);
    setIsCopilotLoading(false);
  }

  function reuseCopilotHistory(item: CopilotHistoryItem) {
    setExpandedCopilotHistoryId((current) => (current === item.id ? null : item.id));
    setCopilotError("");
  }

  function editCopilotHistory(item: CopilotHistoryItem) {
    setCopilotPrompt(`Modify this previous change: ${item.prompt}`);
    setCopilotResult(item.result);
    setActiveCopilotActionId(item.id);
    setExpandedCopilotHistoryId(item.id);
    setCopilotError("");
  }

  function undoCopilotHistory(item: CopilotHistoryItem) {
    setCopilotPrompt(`Undo this previous Copilot change and restore the previous behavior as closely as possible: ${item.prompt}`);
    setActiveCopilotActionId(item.id);
    setExpandedCopilotHistoryId(item.id);
    setCopilotResult(item.result);
    setCopilotError("");
  }

  async function deleteCopilotHistory(item: CopilotHistoryItem) {
    const response = await fetch(`/api/copilot?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });

    if (!response.ok) {
      setCopilotError("Could not delete that history item.");
      return;
    }

    setCopilotHistory((current) => current.filter((historyItem) => historyItem.id !== item.id));
    setCopilotError("");
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
          {canUseCopilot ? (
            <button className="nav-action copilot-nav-action" type="button" onClick={openCopilotChat} tabIndex={decorative ? -1 : undefined}>
              <Sparkles size={14} aria-hidden="true" />
              <ToneText text="COPILOT" />
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

      {copilotOpen && canUseCopilot ? (
        <aside
          className="copilot-chat"
          role="dialog"
          aria-label="Copilot feature chat"
          style={{ left: copilotPosition.x, top: copilotPosition.y }}
        >
          <div className="panel-heading copilot-drag-handle" onPointerDown={moveCopilotWindow}>
            <h2 className="copilot-title">copilot</h2>
            <button
              className="icon-action"
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setCopilotOpen(false)}
              aria-label="Close Copilot chat"
            >
              <X size={18} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>

          <div className="copilot-thread" aria-live="polite">
            {isCopilotLoading ? (
              <p className="copilot-status-line">
                Copilot is{" "}
                <span className="copilot-typing-word" key={copilotThinkingWords[copilotThinkingIndex]}>
                  {copilotThinkingWords[copilotThinkingIndex]}
                </span>
              </p>
            ) : copilotDoneMessage ? (
              <p className="copilot-status-line copilot-status-done">
                <span className="copilot-new-badge">NEW</span>
                {copilotDoneMessage} New feature applied.
              </p>
            ) : null}
          </div>

          {copilotHistory.length ? (
            <div className="copilot-history" aria-label="Copilot history">
              <p className="eyebrow">Recent changes</p>
              {copilotHistory.map((item) => (
                <article className={`copilot-history-item ${expandedCopilotHistoryId === item.id ? "expanded" : ""}`} key={item.id}>
                  <button className="copilot-history-main" type="button" onClick={() => reuseCopilotHistory(item)}>
                    <span className="copilot-history-title">
                      {item.isNew ? <span className="copilot-new-badge">NEW</span> : null}
                      {item.title}
                    </span>
                    <small>
                      {new Date(item.createdAt).toLocaleDateString()} · {item.imageCount} image{item.imageCount === 1 ? "" : "s"}
                      <span className={`copilot-status-pill ${item.status ?? "applied"}`}>
                        {item.status === "in_progress" ? "running" : `${item.status ?? "applied"} v${item.version ?? 1}`}
                      </span>
                    </small>
                  </button>
                  <div className="copilot-history-actions">
                    <button type="button" onClick={() => editCopilotHistory(item)} aria-label={`Edit ${item.title}`} title="Edit">
                      <Pencil size={12} strokeWidth={2.4} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => undoCopilotHistory(item)} aria-label={`Undo ${item.title}`} title="Undo">
                      <RotateCcw size={12} strokeWidth={2.4} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => deleteCopilotHistory(item)} aria-label={`Delete ${item.title}`} title="Delete">
                      <Trash2 size={12} strokeWidth={2.4} aria-hidden="true" />
                    </button>
                  </div>
                  {expandedCopilotHistoryId === item.id ? (
                    <div className="copilot-history-summary">
                      {copilotHistorySummary(item).map((sentence) => (
                        <p key={sentence}>{sentence}</p>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}

          <form className="copilot-form" onSubmit={handleCopilotSubmit}>
            {copilotError ? (
              <p className="auth-error" role="alert">
                {copilotError}
              </p>
            ) : null}
            <label>
              <span className="copilot-helper">This developer feature is hidden from clients and is only available to product managers.</span>
              <textarea
                value={copilotPrompt}
                onChange={(event) => {
                  setCopilotPrompt(event.target.value);
                  setCopilotError("");
                }}
                onPaste={handleCopilotPaste}
                rows={4}
                placeholder="Example: add a wishlist button. Paste an image here to attach it."
              />
            </label>
            <div className="copilot-attachments">
              <label className="copilot-upload">
                <Paperclip size={15} strokeWidth={2.3} aria-hidden="true" />
                <span className="sr-only">Attach image</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    attachCopilotImages(Array.from(event.target.files ?? []), "file");
                    event.target.value = "";
                  }}
                />
              </label>
              {copilotImages.length ? (
                <div className="copilot-image-list">
                  {copilotImages.map((image) => (
                    <button
                      className="copilot-image-pill"
                      key={`${image.name}-${image.dataUrl.length}`}
                      type="button"
                      onClick={() => setCopilotImages((current) => current.filter((item) => item !== image))}
                      aria-label={`Remove ${image.name}`}
                    >
                      {image.name}
                      <X size={12} strokeWidth={2.4} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button className="copilot-send button button-dark" type="submit" disabled={isCopilotLoading}>
              {isCopilotLoading ? "..." : "Send"}
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
