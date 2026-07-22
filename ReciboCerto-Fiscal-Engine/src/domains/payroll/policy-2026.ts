import { eurCents, ratePpm } from "../../core/money";
import type { PayrollPolicy } from "./types";

/**
 * Política estrutural de 2026. Continua a pertencer ao dataset draft e não
 * constitui aprovação para produção das tabelas de retenção regionais.
 */
export const PORTUGAL_PAYROLL_POLICY_2026: PayrollPolicy = Object.freeze({
  id: "pt-payroll-2026.2026-07-22-draft.1",
  employeeSocialSecurityRate: ratePpm(110_000),
  employerSocialSecurityRate: ratePpm(237_500),
  mealCashDailyExemption: eurCents(615),
  // 6,15 € × 170% = 10,455 €; a fronteira monetária é representada a cêntimos.
  mealCardDailyExemption: eurCents(1_046),
  minimumMonthlyWage: eurCents(92_000),
  standardNightPremium: ratePpm(250_000),
  cashShortageIrsLimitRate: ratePpm(50_000),
  overtimePremiums: {
    up_to_100_hours: {
      working_day_first_hour: ratePpm(250_000),
      working_day_following: ratePpm(375_000),
      rest_day_or_holiday: ratePpm(500_000),
    },
    above_100_hours: {
      working_day_first_hour: ratePpm(500_000),
      working_day_following: ratePpm(750_000),
      rest_day_or_holiday: ratePpm(1_000_000),
    },
  },
  citations: [
    "pt.at.cirs.2",
    "pt.at.cirs.99-c",
    "pt.at.cirs.99-f",
    "pt.dr.despacho-233-a-2026",
    "pt.dr.codigo-trabalho.current",
    "pt.dr.codigo-contributivo.current",
    "pt.dr.portaria-51-b-2026",
    "pt.dr.decreto-lei-139-2025",
    "pt.dr.cpc.738",
  ],
});
