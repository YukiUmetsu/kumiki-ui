/** Finance/business visual vocabulary. Each semantic ID maps to one reusable
 * geometric archetype, not a separate renderer, camera or timeline.
 * No real account numbers, brand marks or financial credentials are synthesized.
 */
export const FINANCE_OBJECTS=[
  {kind:"bank",title:"Bank",archetype:"institution"},
  {kind:"bank-branch",title:"Bank branch",archetype:"institution"},
  {kind:"investment-bank",title:"Investment bank",archetype:"institution"},
  {kind:"bank-account",title:"Bank account",archetype:"account"},
  {kind:"checking-account",title:"Checking account",archetype:"account"},
  {kind:"savings-account",title:"Savings account",archetype:"account"},
  {kind:"credit-card",title:"Credit card",archetype:"card"},
  {kind:"debit-card",title:"Debit card",archetype:"card"},
  {kind:"gift-card",title:"Gift card",archetype:"card"},
  {kind:"atm",title:"ATM",archetype:"terminal"},
  {kind:"payment-terminal",title:"Payment terminal",archetype:"terminal"},
  {kind:"cash-register",title:"Cash register",archetype:"terminal"},
  {kind:"loan",title:"Loan",archetype:"document"},
  {kind:"loan-agreement",title:"Loan agreement",archetype:"document"},
  {kind:"contract",title:"Contract",archetype:"document"},
  {kind:"invoice",title:"Invoice",archetype:"document"},
  {kind:"receipt",title:"Receipt",archetype:"document"},
  {kind:"tax-return",title:"Tax return",archetype:"document"},
  {kind:"insurance-policy",title:"Insurance policy",archetype:"document"},
  {kind:"dollar",title:"US dollar",archetype:"cash"},
  {kind:"banknote",title:"Banknote",archetype:"cash"},
  {kind:"cash-stack",title:"Cash stack",archetype:"cash"},
  {kind:"coin",title:"Coin",archetype:"coin"},
  {kind:"coins",title:"Coins",archetype:"coin"},
  {kind:"interest",title:"Interest",archetype:"coin"},
  {kind:"wallet",title:"Wallet",archetype:"wallet"},
  {kind:"piggy-bank",title:"Piggy bank",archetype:"piggy"},
  {kind:"safe",title:"Safe",archetype:"vault"},
  {kind:"vault",title:"Vault",archetype:"vault"},
  {kind:"house",title:"House",archetype:"house"},
  {kind:"mortgage",title:"Mortgage",archetype:"house"},
  {kind:"storefront",title:"Storefront",archetype:"store"},
  {kind:"business",title:"Business",archetype:"store"},
  {kind:"briefcase",title:"Briefcase",archetype:"briefcase"},
  {kind:"investment",title:"Investment",archetype:"chart"},
  {kind:"stock",title:"Stock market",archetype:"chart"},
  {kind:"growth",title:"Growth",archetype:"chart"},
  {kind:"profit",title:"Profit",archetype:"chart"},
  {kind:"loss",title:"Loss",archetype:"chart"},
  {kind:"calculator",title:"Calculator",archetype:"calculator"},
  {kind:"budget",title:"Budget",archetype:"calculator"},
  {kind:"insurance",title:"Insurance",archetype:"shield"},
  {kind:"risk",title:"Risk",archetype:"shield"},
  {kind:"transfer",title:"Money transfer",archetype:"transfer"},
  {kind:"transaction",title:"Transaction",archetype:"transfer"},
  {kind:"currency-exchange",title:"Currency exchange",archetype:"transfer"},
  {kind:"handshake",title:"Handshake",archetype:"handshake"},
  {kind:"partnership",title:"Partnership",archetype:"handshake"},
  {kind:"repayment",title:"Repayment schedule",archetype:"calendar"},
  {kind:"payday",title:"Payday",archetype:"calendar"},
] as const;
export type FinanceObjectKind=typeof FINANCE_OBJECTS[number]["kind"];
export type FinanceObjectArchetype=typeof FINANCE_OBJECTS[number]["archetype"];
export interface FinanceObjectSpec {
  kind:FinanceObjectKind;
  id:string;
  /** Visible title for narration/storyboard; not a real institution logo. */
  title?:string;
  accent?:string;
  /** Optional conceptual data, never real account credentials. */
  state?:"idle"|"active"|"complete";
}
export interface ResolvedFinanceObject extends FinanceObjectSpec {
  title:string;
  archetype:FinanceObjectArchetype;
}
export function resolveFinanceObject(spec:FinanceObjectSpec):ResolvedFinanceObject {
  const descriptor=FINANCE_OBJECTS.find(entry=>entry.kind===spec?.kind);
  if(!descriptor)throw new Error("Unsupported financial object kind.");
  if(!spec.id||!/^[-a-zA-Z0-9_]{1,72}$/.test(spec.id))
    throw new Error("Finance object needs a stable ASCII semantic ID (1–72 characters).");
  const title=spec.title??descriptor.title;
  if(!title.trim()||title.length>52)
    throw new Error("Finance object title must be 1–52 characters.");
  if(spec.accent&&!/^#[0-9A-Fa-f]{6}$/.test(spec.accent))
    throw new Error("Finance object accent must be six-digit hex.");
  if(spec.state!==undefined&&
     !["idle","active","complete"].includes(spec.state))
    throw new Error("Unsupported financial object state.");
  return {...spec,title,archetype:descriptor.archetype};
}
export function financeObjectProgress(frame:number,startFrame=0,durationFrames=20):number{
  if(!Number.isSafeInteger(frame)||!Number.isSafeInteger(startFrame)||
     !Number.isSafeInteger(durationFrames)||durationFrames<1||startFrame<0)
    throw new Error("Finance object reveal requires integer absolute frames.");
  const t=Math.max(0,Math.min(1,(frame-startFrame)/durationFrames));
  return t*t*(3-2*t);
}
