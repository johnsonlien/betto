export function formatCost(cost: string): string {
  return `$${Number(cost).toFixed(2)}`;
}

export function sumCosts(events: { cost: string | null }[]): number {
  return events.reduce((sum, e) => sum + (e.cost ? Number(e.cost) : 0), 0);
}

export function formatTotalCost(total: number): string {
  return `$${total.toFixed(2)}`;
}
