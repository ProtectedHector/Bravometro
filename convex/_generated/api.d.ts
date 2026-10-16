/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminIdentity from "../adminIdentity.js";
import type * as contributions from "../contributions.js";
import type * as placeAdmin from "../placeAdmin.js";
import type * as placeImages from "../placeImages.js";
import type * as places from "../places.js";
import type * as ratingMath from "../ratingMath.js";
import type * as restaurantScanner from "../restaurantScanner.js";
import type * as scanLimits from "../scanLimits.js";
import type * as scanMunicipalities from "../scanMunicipalities.js";
import type * as scanMunicipalitiesRest from "../scanMunicipalitiesRest.js";
import type * as scanPlan from "../scanPlan.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminIdentity: typeof adminIdentity;
  contributions: typeof contributions;
  placeAdmin: typeof placeAdmin;
  placeImages: typeof placeImages;
  places: typeof places;
  ratingMath: typeof ratingMath;
  restaurantScanner: typeof restaurantScanner;
  scanLimits: typeof scanLimits;
  scanMunicipalities: typeof scanMunicipalities;
  scanMunicipalitiesRest: typeof scanMunicipalitiesRest;
  scanPlan: typeof scanPlan;
  seed: typeof seed;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
