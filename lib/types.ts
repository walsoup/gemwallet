export type Category =
  | "Food"
  | "Groceries"
  | "Transport"
  | "Utilities"
  | "Lifestyle"
  | "Subscription";

export type Transaction = {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: Category;
  recurring?: "monthly";
};

export type AdvisorResponse = {
  roast: string;
  highlights: string[];
  savingsOpportunities: Array<{
    label: string;
    amount: number;
    reason: string;
  }>;
  budgetPlan: {
    currentMonthlySpend: number;
    recommendedMonthlyCap: number;
    emergencyFundMonths: number;
  };
};
