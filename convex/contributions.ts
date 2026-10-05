import { mutation,query,type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

type Scores={potato:number;sauce:number;spiciness:number;taste:number;texture:number;quantity:number;value:number};
type VerifiedPlace={googlePlaceId:string;name:string;address:string;city:string;country:string;neighborhood:string;latitude?:number;longitude?:number;googleMapsUrl:string};
type UserIdentity={userId:string;userName:string;userEmail?:string;userImage?:string};
type RatingInput=UserIdentity&{scores:Scores;comment:string;photoStorageId?:Id<"_storage">};

function authorize(token:string){if(!process.env.BRAVOMETRO_SERVICE_TOKEN||token!==process.env.BRAVOMETRO_SERVICE_TOKEN)throw new Error("Unauthorized")}
function overall(s:Scores){return Math.round((s.potato*.2+s.sauce*.24+s.spiciness*.1+s.taste*.2+s.texture*.1+s.quantity*.07+s.value*.09)*10)/10}
function slugify(value:string){return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,90)}

const scores=v.object({potato:v.number(),sauce:v.number(),spiciness:v.number(),taste:v.number(),texture:v.number(),quantity:v.number(),value:v.number()});
const userFields={userId:v.string(),userName:v.string(),userEmail:v.optional(v.string()),userImage:v.optional(v.string())};
const verifiedPlaceFields={googlePlaceId:v.string(),name:v.string(),address:v.string(),city:v.string(),country:v.string(),neighborhood:v.string(),latitude:v.optional(v.number()),longitude:v.optional(v.number()),googleMapsUrl:v.string()};

async function ensureUser(ctx:MutationCtx,args:UserIdentity){
  const now=Date.now();const existing=await ctx.db.query("users").withIndex("by_clerk_id",q=>q.eq("clerkUserId",args.userId)).first();const profile={displayName:args.userName,updatedAt:now,lastSeenAt:now,...(args.userEmail?{email:args.userEmail}:{}),...(args.userImage?{imageUrl:args.userImage}:{})};
  if(existing){await ctx.db.patch(existing._id,profile);return existing._id}
  return ctx.db.insert("users",{clerkUserId:args.userId,createdAt:now,...profile});
}

async function ensureGooglePlace(ctx:MutationCtx,args:VerifiedPlace&UserIdentity,userRef:Id<"users">){
  const published=await ctx.db.query("places").withIndex("by_external_place",q=>q.eq("externalPlaceId",args.googlePlaceId)).first();if(published){if(!published.createdByUserRef&&published.createdBy===args.userId)await ctx.db.patch(published._id,{createdByUserRef:userRef});return{placeId:published._id,created:false}};
  const baseSlug=slugify(`${args.name}-${args.city}`)||"google-place";let slug=baseSlug;let suffix=1;while(await ctx.db.query("places").withIndex("by_slug",q=>q.eq("slug",slug)).first())slug=`${baseSlug}-${++suffix}`;
  const now=Date.now();const placeId=await ctx.db.insert("places",{name:args.name,slug,city:args.city,country:args.country,neighborhood:args.neighborhood,address:args.address,externalPlaceId:args.googlePlaceId,googleMapsUrl:args.googleMapsUrl,source:"google_places",createdBy:args.userId,createdByUserRef:userRef,verifiedAt:now,priceLevel:2,status:"published",createdAt:now,updatedAt:now,...(args.latitude!==undefined?{latitude:args.latitude}:{}),...(args.longitude!==undefined?{longitude:args.longitude}:{})});
  const pending=await ctx.db.query("placeSubmissions").withIndex("by_google_place",q=>q.eq("googlePlaceId",args.googlePlaceId)).filter(q=>q.eq(q.field("status"),"pending")).first();const audit={status:"published" as const,reviewedAt:now,updatedAt:now};if(pending)await ctx.db.patch(pending._id,{...audit,submittedByUserRef:userRef});else await ctx.db.insert("placeSubmissions",{googlePlaceId:args.googlePlaceId,name:args.name,address:args.address,googleMapsUrl:args.googleMapsUrl,submittedBy:args.userId,submittedByUserRef:userRef,submittedByName:args.userName,...audit,createdAt:now,...(args.latitude!==undefined?{latitude:args.latitude}:{}),...(args.longitude!==undefined?{longitude:args.longitude}:{}),...(args.userImage?{submittedByImage:args.userImage}:{})});
  return{placeId,created:true};
}

async function saveRating(ctx:MutationCtx,args:RatingInput,placeId:Id<"places">,userRef:Id<"users">){
  const place=await ctx.db.get(placeId);if(!place||place.status!=="published")throw new Error("El sitio no está disponible para valorar");
  if(args.photoStorageId){const metadata=await ctx.db.system.get("_storage",args.photoStorageId);if(!metadata)throw new Error("La imagen no existe");if(metadata.size>5*1024*1024)throw new Error("La imagen supera los 5 MB");if(!metadata.contentType||!["image/jpeg","image/png","image/webp"].includes(metadata.contentType))throw new Error("El formato de imagen no es válido")}
  const existing=await ctx.db.query("userRatings").withIndex("by_place_user",q=>q.eq("placeId",placeId).eq("userId",args.userId)).unique();const data={placeId,productType:"bravas" as const,userId:args.userId,userRef,userName:args.userName,overallScore:overall(args.scores),potatoScore:args.scores.potato,sauceScore:args.scores.sauce,spicinessScore:args.scores.spiciness,tasteScore:args.scores.taste,textureScore:args.scores.texture,quantityScore:args.scores.quantity,valueScore:args.scores.value,status:"pending" as const,updatedAt:Date.now(),...(args.userImage?{userImage:args.userImage}:{}),...(args.comment?{comment:args.comment}:{}),...(args.photoStorageId?{photoStorageId:args.photoStorageId}:{})};if(existing){await ctx.db.patch(existing._id,data);if(existing.photoStorageId&&args.photoStorageId&&existing.photoStorageId!==args.photoStorageId)await ctx.storage.delete(existing.photoStorageId);return existing._id}return ctx.db.insert("userRatings",{...data,createdAt:Date.now()});
}

export const syncUser=mutation({args:{serviceToken:v.string(),...userFields},handler:async(ctx,args)=>{authorize(args.serviceToken);const userRef=await ensureUser(ctx,args);const ratings=await ctx.db.query("userRatings").withIndex("by_user_updated",q=>q.eq("userId",args.userId)).take(100);for(const rating of ratings)if(rating.userRef!==userRef)await ctx.db.patch(rating._id,{userRef});const submissions=await ctx.db.query("placeSubmissions").withIndex("by_user",q=>q.eq("submittedBy",args.userId)).take(100);for(const submission of submissions)if(submission.submittedByUserRef!==userRef)await ctx.db.patch(submission._id,{submittedByUserRef:userRef});return userRef}});

export const generateRatingPhotoUploadUrl=mutation({args:{serviceToken:v.string()},handler:async(ctx,args)=>{authorize(args.serviceToken);return ctx.storage.generateUploadUrl()}});

export const submitPlace=mutation({args:{serviceToken:v.string(),...userFields,...verifiedPlaceFields},handler:async(ctx,args)=>{authorize(args.serviceToken);const userRef=await ensureUser(ctx,args);return ensureGooglePlace(ctx,args,userRef)}});

export const submitGooglePlaceRating=mutation({args:{serviceToken:v.string(),...userFields,...verifiedPlaceFields,scores,comment:v.string(),photoStorageId:v.optional(v.id("_storage"))},handler:async(ctx,args)=>{authorize(args.serviceToken);const userRef=await ensureUser(ctx,args);const place=await ensureGooglePlace(ctx,args,userRef);const ratingId=await saveRating(ctx,args,place.placeId,userRef);return{...place,ratingId}}});

export const submitRating=mutation({args:{serviceToken:v.string(),...userFields,placeId:v.id("places"),scores,comment:v.string(),photoStorageId:v.optional(v.id("_storage"))},handler:async(ctx,args)=>{authorize(args.serviceToken);const userRef=await ensureUser(ctx,args);return saveRating(ctx,args,args.placeId,userRef)}});

export const mine=query({args:{serviceToken:v.string(),userId:v.string()},handler:async(ctx,args)=>{authorize(args.serviceToken);const places=await ctx.db.query("placeSubmissions").withIndex("by_user",q=>q.eq("submittedBy",args.userId)).order("desc").take(100);return places.map(({submittedBy,...row})=>row)}});

export const myRatings=query({args:{serviceToken:v.string(),userId:v.string()},handler:async(ctx,args)=>{authorize(args.serviceToken);const ratings=await ctx.db.query("userRatings").withIndex("by_user_updated",q=>q.eq("userId",args.userId)).order("desc").take(100);const rows=[];for(const rating of ratings){const place=await ctx.db.get(rating.placeId);if(!place)continue;rows.push({id:rating._id,place:{id:place._id,name:place.name,address:place.address,slug:place.slug,googlePlaceId:place.externalPlaceId,googleMapsUrl:place.googleMapsUrl},overallScore:rating.overallScore,scores:{potato:rating.potatoScore,sauce:rating.sauceScore,spiciness:rating.spicinessScore,taste:rating.tasteScore,texture:rating.textureScore,quantity:rating.quantityScore,value:rating.valueScore},comment:rating.comment,photoUrl:rating.photoStorageId?await ctx.storage.getUrl(rating.photoStorageId):undefined,status:rating.status,createdAt:rating.createdAt,updatedAt:rating.updatedAt})}return rows}});
