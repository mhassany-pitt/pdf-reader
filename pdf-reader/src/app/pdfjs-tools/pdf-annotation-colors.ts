import { getLabel, getValue, htmlToElements } from './pdf-utils';

export const HIGHLIGHT_COLORS = [
  '#ffd40075:#ffd400',
  '#ff656375:#ff6563',
  '#5db22175:#5db221',
  '#2ba8e875:#2ba8e8',
  '#a28ae975:#a28ae9',
  '#e66df275:#e66df2',
  '#f2982375:#f29823',
  '#aaaaaa75:#aaaaaa',
  'black'
];

export const MARK_COLORS = [
  '#ffd400',
  '#ff6563',
  '#5db221',
  '#2ba8e8',
  '#a28ae9',
  '#e66df2',
  '#f29823',
  '#aaaaaa',
  'black'
];

export const NOTE_COLORS = [
  '#e8d48a',
  '#ff6563',
  '#5db221',
  '#2ba8e8',
  '#a28ae9',
  '#e66df2',
  '#f29823',
  '#f5f5f5'
];

export const DEFAULT_NOTE_COLOR = '#e8d48a';

/** Monospace face for sticky + annotation note popups. */
export const ANNOTATION_POPUP_FONT =
  `"Consolas", "SFMono-Regular", "Menlo", "Monaco", "Liberation Mono", "Courier New", monospace`;

export function ensureAnnotationFonts(_docEl: Document) {
  // System monospace stack — nothing to load.
}

export function colorsEqual(stored: string | undefined, option: string) {
  if (!stored) return false;
  const value = getValue(option);
  const label = getLabel(option);
  return stored === option || stored === value || stored === label
    || stored.toLowerCase() === value.toLowerCase()
    || stored.toLowerCase() === label.toLowerCase();
}

export function noteTheme(color?: string) {
  const raw = color || DEFAULT_NOTE_COLOR;
  // Soften the old neon sticky yellow if still stored on existing notes.
  const base = raw.toLowerCase() === '#ffd400' ? DEFAULT_NOTE_COLOR : raw;
  return {
    color: base,
    header: `linear-gradient(180deg, color-mix(in srgb, ${base} 72%, white) 0%, color-mix(in srgb, ${base} 88%, white) 100%)`,
    body: `color-mix(in srgb, ${base} 14%, white)`,
    footer: `color-mix(in srgb, ${base} 22%, white)`,
    ink: '#2a2410',
    muted: `color-mix(in srgb, ${base} 32%, #5a4308)`,
    border: `color-mix(in srgb, ${base} 40%, rgba(0,0,0,0.18))`,
  };
}

export function buildColorSwatches(opts: {
  colors: string[];
  selected?: string;
  className?: string;
  title?: string;
}): HTMLElement {
  const className = opts.className || 'pdf-annotation-recolor-swatches';
  const panel = htmlToElements(
    `<div class="pdf-annotation-panel__section ${className}-wrap">
      ${opts.title ? `<div class="pdf-annotation-panel__section-label">${opts.title}</div>` : ''}
      <div class="pdf-annotation-swatches ${className}">
        ${opts.colors.map(color =>
      `<span data-annot-color="${getValue(color)}"
               data-annot-color-label="${getLabel(color)}"
               style="background-color: ${getLabel(color)}"
               title="${getLabel(color)}"
               class="${colorsEqual(opts.selected, color) ? 'selected' : ''}"
         ></span>`).join('')}
      </div>
    </div>`);
  return panel;
}

export function bindColorSwatches(
  root: HTMLElement,
  className: string,
  onSelect: (value: string, label: string, el: HTMLElement) => void
) {
  const swatchesEl = root.querySelector(`.${className}`) as HTMLElement;
  swatchesEl?.addEventListener('mousedown', ($event: any) => {
    $event.preventDefault();
    $event.stopPropagation();
  });
  swatchesEl?.addEventListener('click', ($event: any) => {
    $event.preventDefault();
    $event.stopPropagation();
    const el = $event.target as HTMLElement;
    const value = el.getAttribute('data-annot-color');
    const label = el.getAttribute('data-annot-color-label') || value;
    if (!value || el.classList.contains('selected')) return;
    root.querySelectorAll(`.${className} > span.selected`).forEach(other => other.classList.remove('selected'));
    el.classList.add('selected');
    onSelect(value, label!, el);
  });
}
