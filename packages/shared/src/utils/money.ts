export const roundCurrency = (value: number) => Math.round(value * 100) / 100;

export const calculateInvoiceTotals = (
  items: Array<{ quantity: number; unitPrice: number }>,
  taxRate: number,
) => {
  const subtotal = roundCurrency(
    items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
  );
  const taxAmount = roundCurrency(subtotal * taxRate);
  const total = roundCurrency(subtotal + taxAmount);

  return { subtotal, taxAmount, total };
};
