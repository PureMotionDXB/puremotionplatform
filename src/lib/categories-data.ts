export interface ServiceCategory {
  id: string; // slug, user-chosen at creation, immutable after (FK target elsewhere)
  name: string;
  color: string | null;
  displayOrder: number;
}

export function emptyCategory(): ServiceCategory {
  return { id: "", name: "", color: null, displayOrder: 0 };
}
