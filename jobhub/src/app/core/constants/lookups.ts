import { Skill } from '../models';

/** Locations offered in the search filters and in the job form. */
export const LOCATIONS = ['Mumbai', 'Navi Mumbai', 'Pune', 'Bangalore', 'Hyderabad', 'Delhi', 'Remote'];

/** Skill names suggested while typing. The server accepts any skill name. The ids are not real database ids. */
export const SKILL_SUGGESTIONS: Skill[] = [
  'Angular', 'TypeScript', 'RxJS', 'JavaScript', 'HTML/CSS', 'React', 'Python', 'Flask', 'MySQL', 'SQL', 'Power BI',
  'Excel', 'Tableau', 'Statistics', 'Figma', 'UX Research', 'Node.js', 'Git', 'REST APIs', 'Java', 'Spring Boot',
  'Docker', 'AWS',
].map((name, i) => ({ id: i + 1, name }));
