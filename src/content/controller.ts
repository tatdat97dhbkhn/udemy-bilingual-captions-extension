import { normalizeCaption } from '../core/caption';
import type { TranslationResponse } from '../shared/types';

export class CaptionController<T> {
  private generation = 0;
  private lastCaption = '';
  constructor(private readonly translate: (text: string, generation: number) => Promise<TranslationResponse>, private readonly render: (translation: string, target: T) => void, private readonly clear: () => void) {}

  async handle(rawCaption: string, target: T): Promise<void> {
    const caption = normalizeCaption(rawCaption);
    if (!caption) { this.clear(); return; }
    if (caption === this.lastCaption) return;
    this.lastCaption = caption;
    const generation = ++this.generation;
    const result = await this.translate(caption, generation);
    if (generation !== this.generation || result.status !== 'translated') return;
    this.render(result.translation, target);
  }

  disable(): void { this.generation += 1; this.lastCaption = ''; this.clear(); }
}
