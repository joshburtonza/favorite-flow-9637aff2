export interface CostInputs {
  supplierCost: number;
  freightCost: number;
  clearingCost: number;
  transportCost: number;
  fxSpotRate: number;
  fxAppliedRate: number;
  clientInvoiceZar: number;
  bankCharges: number;
}

export interface CalculatedValues {
  totalForeign: number;
  fxSpread: number;
  totalZar: number;
  grossProfit: number;
  fxCommission: number;
  spreadProfit: number;
  netProfit: number;
  profitMargin: number;
}

export const FX_COMMISSION_RATE = 0.014; // 1.4%

export function calculateShipmentCosts(inputs: CostInputs): CalculatedValues {
  const {
    supplierCost,
    freightCost,
    clearingCost,
    transportCost,
    fxSpotRate,
    fxAppliedRate,
    clientInvoiceZar,
    bankCharges,
  } = inputs;

  // Total costs in foreign currency
  const totalForeign = supplierCost + freightCost + clearingCost + transportCost;

  // FX calculations
  const fxSpread = fxSpotRate - fxAppliedRate;
  const totalZar = totalForeign * fxAppliedRate;

  // Profit calculations
  const grossProfit = clientInvoiceZar - totalZar;
  const fxCommission = totalZar * FX_COMMISSION_RATE;
  const spreadProfit = totalForeign * fxSpread;
  const netProfit = grossProfit + fxCommission + spreadProfit - bankCharges;
  
  // Profit margin
  const profitMargin = clientInvoiceZar > 0 
    ? (netProfit / clientInvoiceZar) * 100 
    : 0;

  return {
    totalForeign,
    fxSpread,
    totalZar,
    grossProfit,
    fxCommission,
    spreadProfit,
    netProfit,
    profitMargin,
  };
}

export function getDefaultCostInputs(): CostInputs {
  return {
    supplierCost: 0,
    freightCost: 0,
    clearingCost: 0,
    transportCost: 0,
    fxSpotRate: 0,
    fxAppliedRate: 0,
    clientInvoiceZar: 0,
    bankCharges: 0,
  };
}