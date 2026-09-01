// Pin management utilities using localStorage
// Pins are scoped to parent records (person/company/opportunity)

const PIN_STORAGE_KEY = "crm_pinned_items";

interface PinnedItems {
  [parentId: string]: {
    notes: string[];
    tasks: string[];
  };
}

function getPinnedItems(): PinnedItems {
  try {
    const data = localStorage.getItem(PIN_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function setPinnedItems(items: PinnedItems): void {
  try {
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Failed to save pinned items:", error);
  }
}

export function isPinned(parentId: string, type: "note" | "task", itemId: string): boolean {
  const pinned = getPinnedItems();
  if (!pinned[parentId]) return false;
  
  const key = type === "note" ? "notes" : "tasks";
  return pinned[parentId][key]?.includes(itemId) || false;
}

export function togglePin(parentId: string, type: "note" | "task", itemId: string): void {
  const pinned = getPinnedItems();
  
  if (!pinned[parentId]) {
    pinned[parentId] = { notes: [], tasks: [] };
  }
  
  const key = type === "note" ? "notes" : "tasks";
  if (!pinned[parentId][key]) {
    pinned[parentId][key] = [];
  }
  
  const index = pinned[parentId][key].indexOf(itemId);
  if (index > -1) {
    pinned[parentId][key].splice(index, 1);
  } else {
    pinned[parentId][key].push(itemId);
  }
  
  setPinnedItems(pinned);
}

export function getPinnedIds(parentId: string, type: "note" | "task"): string[] {
  const pinned = getPinnedItems();
  if (!pinned[parentId]) return [];
  
  const key = type === "note" ? "notes" : "tasks";
  return pinned[parentId][key] || [];
}

export function sortWithPinnedFirst<T extends { id: string }>(
  parentId: string,
  type: "note" | "task",
  items: T[]
): T[] {
  const pinnedIds = getPinnedIds(parentId, type);
  
  if (pinnedIds.length === 0) return items;
  
  const pinned = items.filter(item => pinnedIds.includes(item.id));
  const unpinned = items.filter(item => !pinnedIds.includes(item.id));
  
  // Sort pinned items in the order they were pinned
  const pinnedSorted = pinned.sort((a, b) => {
    const indexA = pinnedIds.indexOf(a.id);
    const indexB = pinnedIds.indexOf(b.id);
    return indexA - indexB;
  });
  
  return [...pinnedSorted, ...unpinned];
}
