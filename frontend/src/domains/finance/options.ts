const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  INCOME: "Income",
  EXPENSE: "Expense",
  TRANSFER: "Transfer",
};

const LEDGER_DIRECTION_LABELS: Record<string, string> = {
  IN: "In",
  OUT: "Out",
};

export const TRANSACTION_TYPE_OPTIONS = Object.entries(TRANSACTION_TYPE_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

export function getTransactionTypeLabel(transactionType: string) {
  return TRANSACTION_TYPE_LABELS[transactionType] ?? transactionType;
}

export function getLedgerDirectionLabel(direction: string) {
  return LEDGER_DIRECTION_LABELS[direction] ?? direction;
}
