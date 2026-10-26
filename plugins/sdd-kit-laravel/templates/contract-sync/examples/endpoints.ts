// BFF endpoint registry: every call the Next.js app makes to the Laravel API.
export const endpoints = {
  listInvoices: { method: 'GET', path: '/api/invoices' },
  showInvoice: { method: 'GET', path: '/api/invoices/{invoice}' },
  updateInvoiceStatus: { method: 'PUT', path: '/api/invoices/{invoice}/status' },
  exportInvoices: { method: 'GET', path: '/api/invoices/export' },
} as const;

export type EndpointName = keyof typeof endpoints;
