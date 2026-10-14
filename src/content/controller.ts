import { normalizeCaption } from '../core/caption';
import type { TranslationResponse } from '../shared/types';

export class CaptionController<T> {
  private generation = 0;
  private lastCaption = '';
  private target: T | undefined;
  private renderedTarget: T | undefined;
  private translation: string | undefined;
  constructor(
    private readonly translate: (text: string, generation: number) => Promise<TranslationResponse>,
    private readonly render: (translation: string, target: T) => void,
    private readonly clear: () => void,
    private readonly reconcile: (target: T) => void = () => {},
  ) {}

  async handle(rawCaption: string, target: T): Promise<void> {
    const caption = normalizeCaption(rawCaption);
    if (!caption) { this.disable(); return; }
    if (caption === this.lastCaption) {
      this.target = target;
      if (this.translation !== undefined && this.renderedTarget !== target) {
        this.renderedTarget = target;
        this.render(this.translation, target);
      } else if (this.translation !== undefined) {
        this.reconcile(target);
      }
      return;
    }
    this.lastCaption = caption;
    this.target = target;
    this.renderedTarget = undefined;
    this.translation = undefined;
    const generation = ++this.generation;
    const result = await this.translate(caption, generation);
    if (generation !== this.generation || result.status !== 'translated') return;
    this.translation = result.translation;
    this.renderedTarget = this.target;
    this.render(result.translation, this.target);
  }

  disable(): void {
    this.generation += 1;
    this.lastCaption = '';
    this.target = undefined;
    this.renderedTarget = undefined;
    this.translation = undefined;
    this.clear();
  }
}
