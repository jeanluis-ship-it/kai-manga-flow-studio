export const MANGA_STYLES = [
  'Manga blanco y negro con tramas y entintado profesional',
  'Seinen cinematográfico, sombreado dramático',
  'Shōnen dinámico, líneas expresivas y alto contraste',
  'Shōjo delicado, líneas finas y composición elegante',
  'Concept art a color para portada de tankōbon',
] as const;
export const IMAGE_MODES = [
  { id: 'portrait', label: 'Retrato', instruction: 'Produce a single clear character concept portrait, mid-torso framing, neutral background. No typography.' },
  { id: 'sheet', label: 'Hoja de personaje', instruction: 'Produce an editorial character reference sheet with front, side and three-quarter views. No typography.' },
  { id: 'expression', label: 'Expresiones', instruction: 'Produce an expression sheet with six visibly different emotions, all of the SAME character. No typography.' },
  { id: 'panel', label: 'Viñeta', instruction: 'Produce one cinematic black-and-white manga panel, storytelling composition, no dialogue or typography.' },
] as const;
