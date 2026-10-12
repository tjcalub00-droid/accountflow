export const INVOICES_CHANGED_EVENT = 'accountflow:invoices-changed';

export function notifyInvoicesChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(INVOICES_CHANGED_EVENT));
  }
}
