import type {
  AuthenticatedUser,
  CreateExpenseInput,
  ExpenseRecord,
  FirestoreMemberRole,
  TripBackend,
} from "../../firebase/contracts";
import { validateExpenseInput } from "./expense-calculations";

export interface ExpenseFeatureOptions {
  backend: TripBackend;
  tripId: string;
  actor: AuthenticatedUser;
  /** UI feedback only; Firestore rules remain the authorization boundary. */
  role: FirestoreMemberRole;
}

export type ExpenseActionErrorCode =
  | "forbidden"
  | "invalid-input"
  | "invalid-state"
  | "not-found";

export class ExpenseFeatureError extends Error {
  readonly code: ExpenseActionErrorCode;

  constructor(code: ExpenseActionErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function canManageExpense(
  actorId: string,
  role: FirestoreMemberRole,
  expense: Pick<ExpenseRecord, "createdBy">,
): boolean {
  return role === "lead" || expense.createdBy === actorId;
}

export class ExpenseFeature {
  private readonly backend: TripBackend;
  private readonly tripId: string;
  private readonly actor: AuthenticatedUser;
  private readonly role: FirestoreMemberRole;
  private expenses: ExpenseRecord[] = [];
  // eslint-disable-next-line no-unused-vars -- Type-only callback parameter.
  private listener: ((expenses: ExpenseRecord[]) => void) | undefined;
  private unsubscribe: (() => void) | undefined;

  constructor(options: ExpenseFeatureOptions) {
    this.backend = options.backend;
    this.tripId = options.tripId;
    this.actor = options.actor;
    this.role = options.role;
  }

  replaceExpenses(expenses: ExpenseRecord[]): void {
    this.expenses = [...expenses];
    this.listener?.([...this.expenses]);
  }

  // eslint-disable-next-line no-unused-vars -- Type-only callback parameter.
  subscribe(listener: (expenses: ExpenseRecord[]) => void): void {
    this.listener = listener;
    listener([...this.expenses]);
  }

  start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = this.backend.subscribeTrip(this.tripId, (snapshot) => {
      this.replaceExpenses(snapshot.expenses);
    });
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  async create(input: CreateExpenseInput): Promise<ExpenseRecord> {
    this.assertValid(input);
    return this.backend.createExpense(this.tripId, input, this.actor);
  }

  async update(
    expenseId: string,
    patch: Partial<CreateExpenseInput>,
  ): Promise<void> {
    const expense = this.findExpense(expenseId);
    this.assertCanManage(expense);
    this.assertValid({
      title: patch.title ?? expense.title,
      amount: patch.amount ?? expense.amount,
      paidBy: patch.paidBy ?? expense.paidBy,
      splitAmong: patch.splitAmong ?? expense.splitAmong,
    });
    await this.backend.updateExpense(this.tripId, expenseId, patch);
  }

  async delete(expenseId: string): Promise<void> {
    this.assertCanManage(this.findExpense(expenseId));
    await this.backend.deleteExpense(this.tripId, expenseId);
  }

  async settle(expenseId: string): Promise<void> {
    if (this.role !== "lead") {
      throw new ExpenseFeatureError(
        "forbidden",
        "Chỉ lead mới có thể chốt khoản chi.",
      );
    }
    const expense = this.findExpense(expenseId);
    if (expense.status !== "pending") {
      throw new ExpenseFeatureError(
        "invalid-state",
        "Khoản chi này đã được chốt.",
      );
    }
    await this.backend.settleExpense(this.tripId, expenseId);
  }

  private findExpense(expenseId: string): ExpenseRecord {
    const expense = this.expenses.find((item) => item.id === expenseId);
    if (!expense) {
      throw new ExpenseFeatureError("not-found", "Không tìm thấy khoản chi.");
    }
    return expense;
  }

  private assertCanManage(expense: ExpenseRecord): void {
    if (!canManageExpense(this.actor.uid, this.role, expense)) {
      throw new ExpenseFeatureError("forbidden", "Bạn không thể sửa khoản chi này.");
    }
  }

  private assertValid(input: CreateExpenseInput): void {
    const errors = validateExpenseInput(input);
    if (errors.length > 0) {
      throw new ExpenseFeatureError("invalid-input", errors.join(" "));
    }
  }
}
