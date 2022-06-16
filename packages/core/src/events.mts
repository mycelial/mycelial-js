class MycelialEvent extends Event implements CustomEvent {
  _detail;

  constructor(type: string, options: any) {
      super(type, options);

      this._detail = options.detail || null;
  }

  get detail() {
      return this._detail;
  }

  initCustomEvent(type: string, bubbles?: boolean, cancelable?: boolean, detail?: any): void {
    // 
  }
}

export function createCustomEvent(type: string, opts: any) {
  if (typeof CustomEvent === 'undefined') {
    return new MycelialEvent(type, opts);
  }

  return new CustomEvent(type, opts);
}
