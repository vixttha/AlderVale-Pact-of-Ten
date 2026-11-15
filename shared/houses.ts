import type { ElementId } from './elements.ts';

export interface AcademyHouse {
  id: string;
  name: string;
  crestElement: ElementId;
  motto: string;
  memberCount: number;
  academy?: boolean;
}
