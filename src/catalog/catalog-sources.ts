/** Small browser-only source adapter. Imports no Three.js, renderer or story code.
 * Registry items and typed vocabularies remain the source of truth.
 */
import registry from "../../registry.json";
import reviews from "../../docs/verification/hero-approvals.json";
import { FINANCE_OBJECTS } from "../../registry/domains/finance-object-model";
import { BUSINESS_OBJECTS } from "../../registry/domains/business-object-model";
import { TECHNOLOGY_OBJECTS } from "../../registry/domains/technology-object-model";
import { PEOPLE_3D } from "../../registry/domains/people-model";
import { buildCatalog } from "./catalog-core";
import { CATALOG_DOCS, previewsForKinds } from "./catalog-metadata";
import { CATALOG_HERO_SUMMARIES } from "./catalog-hero-summaries";
export const componentCatalog=buildCatalog({
  items:registry.items,
  vocabularies:{
    finance:FINANCE_OBJECTS,business:BUSINESS_OBJECTS,technology:TECHNOLOGY_OBJECTS,people:PEOPLE_3D,
  },
  heroes:CATALOG_HERO_SUMMARIES,
  approvedHeroKinds:(reviews.approvals as {kind:string}[]).map(entry=>entry.kind),
  previews:previewsForKinds(FINANCE_OBJECTS,BUSINESS_OBJECTS,
    TECHNOLOGY_OBJECTS,CATALOG_HERO_SUMMARIES,PEOPLE_3D),
  docs:CATALOG_DOCS,
});
