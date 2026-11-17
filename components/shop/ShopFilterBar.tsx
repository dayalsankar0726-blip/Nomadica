"use client";

import { useState, useRef, useEffect, useId, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown, Check, X } from "lucide-react";
import { normalizeCollectionKey } from "@/utils/productFilters";
import { COLOR_HEX_MAP } from "@/utils/productGroup";
import { SORT_OPTIONS, pluralize, type FilterOption, type ListingSort } from "@/lib/products/listing";
import { COLORS, FONTS, RADIUS } from "@/components/shop/tokens";

interface ShopFilterBarProps {
  /** Collection titles; omit to hide the Collection filter. */
  categories?: string[];
  selectedCategory?: string[];
  setSelectedCategory?: (cat: string[]) => void;
  /** Sizes and colours found in the products being listed, with counts. */
  sizeOptions: FilterOption[];
  colorOptions: FilterOption[];
  selectedSize: string[];
  setSelectedSize: (size: string[]) => void;
  selectedColor: string[];
  setSelectedColor: (color: string[]) => void;
  sortBy: ListingSort;
  setSortBy: (sort: ListingSort) => void;
  /** Resets every filter and the sort. */
  onClearAll: () => void;
  /** Products shown; -1 while loading (no count shown). */
  productCount: number;
  /** True when more products can still be loaded (the count is "so far"). */
  hasMore?: boolean;
  pageFilterLabel?: string;
  onClearPageFilter?: () => void;
  categoryLabel?: string;
}

type Menu = "category" | "size" | "color" | "sort";

const colorHex = (name: string) => {
  const key = Object.keys(COLOR_HEX_MAP).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? COLOR_HEX_MAP[key] : name.toLowerCase();
};

const sameKey = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase() || normalizeCollectionKey(a) === normalizeCollectionKey(b);

export function ShopFilterBar({
  categories,
  selectedCategory = [],
  setSelectedCategory,
  sizeOptions,
  colorOptions,
  selectedSize,
  setSelectedSize,
  selectedColor,
  setSelectedColor,
  sortBy,
  setSortBy,
  onClearAll,
  productCount,
  hasMore = false,
  pageFilterLabel,
  onClearPageFilter,
  categoryLabel = "Collection",
}: ShopFilterBarProps) {
  const [open, setOpen] = useState<Menu | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Partial<Record<Menu, HTMLButtonElement | null>>>({});
  const baseId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = (menu: Menu) => {
    setOpen(null);
    buttonRefs.current[menu]?.focus();
  };

  /** Escape closes; arrow keys move between the options of an open menu. */
  const onMenuKey = (menu: Menu) => (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close(menu);
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[next]?.focus();
    e.preventDefault();
  };

  const toggleIn = (list: string[], value: string, set: (next: string[]) => void) => {
    set(list.some((v) => sameKey(v, value)) ? list.filter((v) => !sameKey(v, value)) : [...list, value]);
  };

  const hasActive = selectedCategory.length > 0 || selectedSize.length > 0 || selectedColor.length > 0 || sortBy !== "featured";

  const triggerStyle = (active: boolean) => ({
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    minHeight: 40,
    padding: "0.5rem 0.875rem",
    backgroundColor: active ? COLORS.gold : COLORS.surface,
    border: `1px solid ${active ? COLORS.gold : COLORS.border}`,
    borderRadius: RADIUS.control,
    fontFamily: FONTS.sans,
    fontSize: "0.875rem",
    fontWeight: 500,
    color: COLORS.charcoal,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  });

  const menuStyle = (alignRight = false) => ({
    position: "absolute" as const,
    top: "100%",
    ...(alignRight ? { right: 0 } : { left: 0 }),
    marginTop: "0.5rem",
    backgroundColor: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.control,
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
    minWidth: "min(260px, calc(100vw - 2rem))",
    maxWidth: "calc(100vw - 2rem)",
    maxHeight: "min(60vh, 420px)",
    overflowY: "auto" as const,
    zIndex: 60,
    display: "flex",
    flexDirection: "column" as const,
    padding: "0.375rem 0",
  });

  const itemStyle = (selected: boolean) => ({
    padding: "0.625rem 1rem",
    fontFamily: FONTS.sans,
    fontSize: "0.875rem",
    color: COLORS.charcoal,
    fontWeight: selected ? 600 : 400,
    cursor: "pointer",
    backgroundColor: selected ? COLORS.goldSoft : "transparent",
    border: "none",
    textAlign: "left" as const,
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  });

  const box = (selected: boolean) => (
    <span
      aria-hidden="true"
      style={{
        width: 18,
        height: 18,
        flexShrink: 0,
        borderRadius: 3,
        border: `1px solid ${COLORS.brown}`,
        backgroundColor: selected ? COLORS.brown : "transparent",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {selected && <Check size={14} color="#FFFFFF" />}
    </span>
  );

  const dropdown = (menu: Menu, label: ReactNode, active: boolean, children: ReactNode, alignRight = false, a11yLabel?: string) => {
    const menuId = `${baseId}-${menu}`;
    return (
      <div style={{ position: "relative" }}>
        <button
          type="button"
          ref={(el) => {
            buttonRefs.current[menu] = el;
          }}
          onClick={() => setOpen(open === menu ? null : menu)}
          aria-expanded={open === menu}
          aria-controls={menuId}
          aria-label={a11yLabel}
          className="shop-focus"
          style={triggerStyle(active)}
        >
          {label}
          <ChevronDown size={14} aria-hidden="true" style={{ transform: open === menu ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </button>
        {open === menu && (
          <div id={menuId} role="menu" aria-label={typeof label === "string" ? label : a11yLabel} style={menuStyle(alignRight)} onKeyDown={onMenuKey(menu)}>
            {children}
          </div>
        )}
      </div>
    );
  };

  const optionButton = (key: string, selected: boolean, onClick: () => void, content: ReactNode, count?: number, disabled = false) => (
    <button
      key={key}
      type="button"
      role="menuitemcheckbox"
      aria-checked={selected}
      onClick={onClick}
      disabled={disabled}
      className="shop-focus shop-filter-item"
      style={{ ...itemStyle(selected), opacity: disabled ? 0.55 : 1, cursor: disabled ? "default" : "pointer" }}
    >
      {box(selected)}
      <span style={{ flexGrow: 1, display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>{content}</span>
      {count !== undefined && <span style={{ color: COLORS.muted, fontSize: "0.8125rem" }}>({count})</span>}
    </button>
  );

  const swatch = (name: string) => (
    <span
      aria-hidden="true"
      style={{
        width: 14,
        height: 14,
        borderRadius: "50%",
        backgroundColor: colorHex(name),
        border: "1px solid rgba(0,0,0,0.2)",
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );

  const chip = (key: string, text: string, onRemove: () => void) => (
    <span
      key={key}
      style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", backgroundColor: COLORS.goldSoft, color: COLORS.charcoal, padding: "0.25rem 0.25rem 0.25rem 0.75rem", borderRadius: RADIUS.pill, fontFamily: FONTS.sans, fontSize: "0.8125rem", fontWeight: 500 }}
    >
      {text}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${text}`}
        className="shop-focus"
        style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: COLORS.charcoal }}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </span>
  );

  const sortLabelText = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Featured";
  const shownCategories = (categories ?? []).filter((c) => c !== "All");

  return (
    <div
      className="shop-filter-bar"
      style={{
        position: "sticky",
        top: "var(--shop-header-offset, 74px)",
        zIndex: 40,
        backgroundColor: COLORS.page,
        borderBottom: "1px solid #e5e7eb",
        padding: "0.875rem 1rem",
      }}
    >
      <div ref={barRef} style={{ maxWidth: "1350px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.625rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            {setSelectedCategory && shownCategories.length > 0 &&
              dropdown(
                "category",
                selectedCategory.length === 0 ? categoryLabel : selectedCategory.length === 1 ? (shownCategories.find((c) => sameKey(c, selectedCategory[0])) ?? selectedCategory[0]) : `${categoryLabel} (${selectedCategory.length})`,
                selectedCategory.length > 0,
                shownCategories.map((cat) => {
                  const selected = selectedCategory.some((sc) => sameKey(sc, cat));
                  return optionButton(cat, selected, () => toggleIn(selectedCategory, cat, setSelectedCategory), cat);
                }),
                false,
                `Filter by ${categoryLabel.toLowerCase()}`,
              )}

            {sizeOptions.length > 0 &&
              dropdown(
                "size",
                selectedSize.length === 0 ? "Size" : selectedSize.length === 1 ? `Size: ${selectedSize[0]}` : `Size (${selectedSize.length})`,
                selectedSize.length > 0,
                sizeOptions.map((o) => {
                  const selected = selectedSize.some((s) => sameKey(s, o.value));
                  return optionButton(o.value, selected, () => toggleIn(selectedSize, o.value, setSelectedSize), o.value, o.count);
                }),
                false,
                "Filter by size",
              )}

            {colorOptions.length > 0 &&
              dropdown(
                "color",
                <>
                  {selectedColor.length === 1 && swatch(selectedColor[0])}
                  {selectedColor.length === 0 ? "Colour" : selectedColor.length === 1 ? selectedColor[0] : `Colour (${selectedColor.length})`}
                </>,
                selectedColor.length > 0,
                colorOptions.map((o) => {
                  const selected = selectedColor.some((c) => sameKey(c, o.value));
                  return optionButton(o.value, selected, () => toggleIn(selectedColor, o.value, setSelectedColor), <>{swatch(o.value)}{o.value}</>, o.count);
                }),
                false,
                "Filter by colour",
              )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <span role="status" aria-live="polite" style={{ fontFamily: FONTS.sans, fontSize: "0.8125rem", color: COLORS.muted }}>
              {productCount >= 0 ? `${pluralize(productCount, "product")}${hasMore ? " so far" : ""}` : ""}
            </span>
            {dropdown(
              "sort",
              <>
                <span style={{ fontWeight: 400 }}>Sort:</span> {sortLabelText}
              </>,
              false,
              SORT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={sortBy === o.value}
                  className="shop-focus shop-filter-item"
                  onClick={() => {
                    setSortBy(o.value);
                    close("sort");
                  }}
                  style={itemStyle(sortBy === o.value)}
                >
                  {o.label}
                </button>
              )),
              true,
              `Sort by, currently ${sortLabelText}`,
            )}
          </div>
        </div>

        {/* Applied filters as removable chips */}
        {(pageFilterLabel || hasActive) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
            {pageFilterLabel && chip("page", pageFilterLabel, () => onClearPageFilter?.())}
            {setSelectedCategory && selectedCategory.map((c) => chip(`c-${c}`, c, () => toggleIn(selectedCategory, c, setSelectedCategory)))}
            {selectedSize.map((s) => chip(`s-${s}`, `Size ${s}`, () => toggleIn(selectedSize, s, setSelectedSize)))}
            {selectedColor.map((c) => chip(`k-${c}`, c, () => toggleIn(selectedColor, c, setSelectedColor)))}
            {hasActive && (
              <button
                type="button"
                onClick={onClearAll}
                className="shop-focus"
                style={{ minHeight: 32, padding: "0.25rem 0.75rem", borderRadius: RADIUS.control, border: `1px solid ${COLORS.border}`, backgroundColor: "transparent", color: COLORS.charcoal, fontFamily: FONTS.sans, fontSize: "0.8125rem", cursor: "pointer", textDecoration: "underline" }}
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>
      <style>{`
        .shop-filter-item:hover:not(:disabled) { background-color: #F7F2EA; }
        .shop-focus:focus-visible { outline: 2px solid ${COLORS.focus}; outline-offset: 2px; }
      `}</style>
    </div>
  );
}
