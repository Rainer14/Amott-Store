export interface CatalogSnapshot {
  filter: string
  selectedBrands: string[]
  maxPrice: number | null
  filtersExpanded: boolean
  scrollY: number
  returnTo: string
}

export const CATALOG_SNAPSHOT_KEY = 'amott.catalog-return'

export function readCatalogSnapshot(returnTo: string): CatalogSnapshot | null {
  try {
    const raw = sessionStorage.getItem(CATALOG_SNAPSHOT_KEY)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return null
    const snapshot = value as Partial<CatalogSnapshot>
    if (
      snapshot.returnTo !== returnTo ||
      typeof snapshot.filter !== 'string' ||
      !Array.isArray(snapshot.selectedBrands) ||
      !snapshot.selectedBrands.every((brand) => typeof brand === 'string') ||
      (snapshot.maxPrice !== null &&
        typeof snapshot.maxPrice !== 'number') ||
      typeof snapshot.filtersExpanded !== 'boolean' ||
      typeof snapshot.scrollY !== 'number' ||
      !Number.isFinite(snapshot.scrollY)
    ) {
      return null
    }
    return snapshot as CatalogSnapshot
  } catch {
    return null
  }
}

export function saveCatalogSnapshot(snapshot: CatalogSnapshot) {
  try {
    sessionStorage.setItem(CATALOG_SNAPSHOT_KEY, JSON.stringify(snapshot))
  } catch {
    // Session storage is optional; catalog navigation still works without it.
  }
}

export function clearCatalogSnapshot() {
  try {
    sessionStorage.removeItem(CATALOG_SNAPSHOT_KEY)
  } catch {
    // Session storage is optional.
  }
}
