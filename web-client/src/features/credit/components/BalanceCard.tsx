// Placeholder. The credit-service team replaces it with the real balance (F4.1.4):
// available credits large, reserved and total below, like the prototype's sidebar card.
export function BalanceCard() {
  return (
    <div className="ds-surface ds-surface--sunken grid grid-cols-1 gap-1 p-4">
      <p className="ds-label">Available</p>
      <p className="text-sm text-muted">
        Balance comes here. Owned by the credit-service team:
      </p>
      <code className="font-mono text-xs wrap-anywhere">src/features/credit/components/BalanceCard.tsx</code>
    </div>
  )
}
