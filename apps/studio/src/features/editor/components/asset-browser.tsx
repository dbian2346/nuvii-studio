import { useDeferredValue, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  ASSET_BY_ID,
  ASSET_CATEGORIES,
  ASSET_DEFINITIONS,
  ASSET_SUBCATEGORY_LABELS,
} from "../domain/asset-data";
import type {
  AssetCategory,
  AssetDefinition,
  AssetSubcategory,
  Nail,
} from "../domain/types";
import { AssetArtwork } from "./asset-artwork";
import styles from "./editor.module.css";

const iconRoot = "/icons/nuvii";

interface AssetBrowserProps {
  nail: Nail;
  onAddAsset: (asset: AssetDefinition) => void;
  recentAssetIds: readonly string[];
  selectedAssetId?: string;
}

function AssetCard({
  asset,
  onAdd,
  selected,
}: {
  asset: AssetDefinition;
  onAdd: (asset: AssetDefinition) => void;
  selected: boolean;
}) {
  return (
    <button
      aria-label={`Add ${asset.name} to ${asset.category}`}
      aria-pressed={selected}
      className={styles.assetCard}
      onClick={() => onAdd(asset)}
      title={`Add ${asset.name}`}
      type="button"
    >
      <span className={styles.assetPreview}>
        <AssetArtwork asset={asset} />
      </span>
      <span className={styles.assetCardName}>{asset.name}</span>
      <span className={styles.assetCardType}>
        {ASSET_SUBCATEGORY_LABELS[asset.subcategory]}
      </span>
    </button>
  );
}

export function AssetBrowser({
  nail,
  onAddAsset,
  recentAssetIds,
  selectedAssetId,
}: AssetBrowserProps) {
  const [category, setCategory] = useState<AssetCategory>("design");
  const [subcategory, setSubcategory] = useState<AssetSubcategory | "all">("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const categoryAssets = ASSET_DEFINITIONS.filter((asset) => asset.category === category);
  const availableSubcategories = Array.from(
    new Set(categoryAssets.map((asset) => asset.subcategory)),
  );
  const filteredAssets = categoryAssets.filter((asset) => {
    const matchesSubtype = subcategory === "all" || asset.subcategory === subcategory;
    const searchable = `${asset.name} ${asset.subcategory} ${asset.tags.join(" ")}`;
    return matchesSubtype && (!deferredQuery || searchable.toLowerCase().includes(deferredQuery));
  });
  const recentAssets = recentAssetIds
    .map((id) => ASSET_BY_ID.get(id))
    .filter((asset): asset is AssetDefinition => Boolean(asset))
    .slice(0, 3);

  function selectCategory(nextCategory: AssetCategory) {
    setCategory(nextCategory);
    setSubcategory("all");
  }

  function handleCategoryKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + ASSET_CATEGORIES.length) % ASSET_CATEGORIES.length;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % ASSET_CATEGORIES.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = ASSET_CATEGORIES.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const nextCategory = ASSET_CATEGORIES[nextIndex];
    selectCategory(nextCategory.value);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]
      ?.focus();
  }

  function clearFilters() {
    setQuery("");
    setSubcategory("all");
  }

  return (
    <aside aria-labelledby="assets-title" className={styles.inspector}>
      <div className={styles.inspectorHeader}>
        <Icon size="medium" src={`${iconRoot}/folder.svg`} />
        <div>
          <h2 id="assets-title">Assets</h2>
          <p>Apply artwork to {nail.label}</p>
        </div>
      </div>
      <div className={styles.inspectorDivider} />

      <div className={styles.assetBrowserControls}>
        <label className={styles.assetSearch}>
          <span className={styles.visuallyHidden}>Search assets</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search artwork"
            type="search"
            value={query}
          />
        </label>

        <div aria-label="Asset categories" className={styles.assetTabs} role="tablist">
          {ASSET_CATEGORIES.map((option, index) => (
            <button
              aria-controls="asset-results-panel"
              aria-selected={category === option.value}
              id={`asset-${option.value}-tab`}
              key={option.value}
              onClick={() => selectCategory(option.value)}
              onKeyDown={(event) => handleCategoryKeyDown(event, index)}
              role="tab"
              tabIndex={category === option.value ? 0 : -1}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className={styles.assetFilter}>
          <span>Filter</span>
          <select
            aria-label="Filter asset type"
            onChange={(event) =>
              setSubcategory(event.target.value as AssetSubcategory | "all")
            }
            value={subcategory}
          >
            <option value="all">All {category}</option>
            {availableSubcategories.map((value) => (
              <option key={value} value={value}>
                {ASSET_SUBCATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        aria-labelledby={`asset-${category}-tab`}
        className={styles.assetScroller}
        id="asset-results-panel"
        role="tabpanel"
      >
        {recentAssets.length > 0 && !query ? (
          <section aria-labelledby="recent-assets-title" className={styles.assetSection}>
            <div className={styles.assetSectionHeading}>
              <h3 id="recent-assets-title">Recently used</h3>
            </div>
            <div className={styles.assetGrid}>
              {recentAssets.map((asset) => (
                <AssetCard
                  asset={asset}
                  key={`recent-${asset.id}`}
                  onAdd={onAddAsset}
                  selected={selectedAssetId === asset.id}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section aria-labelledby="asset-results-title" className={styles.assetSection}>
          <div className={styles.assetSectionHeading}>
            <h3 id="asset-results-title">
              {ASSET_CATEGORIES.find((option) => option.value === category)?.label}
            </h3>
            <span>{filteredAssets.length}</span>
          </div>
          {filteredAssets.length > 0 ? (
            <div className={styles.assetGrid}>
              {filteredAssets.map((asset) => (
                <AssetCard
                  asset={asset}
                  key={asset.id}
                  onAdd={onAddAsset}
                  selected={selectedAssetId === asset.id}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyMessage} role="status">
              <strong>No matching artwork</strong>
              <p>Try another search, category, or asset type.</p>
              <Button onClick={clearFilters} size="compact" variant="ghost">
                Clear filters
              </Button>
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
