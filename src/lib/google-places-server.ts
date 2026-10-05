import "server-only";
import type { GooglePlaceCandidate,Locale } from "@/lib/types";

export type GoogleAddressComponent={longText?:string;shortText?:string;types?:string[]};
export type GooglePlaceResponse={id?:string;displayName?:{text?:string};formattedAddress?:string;location?:{latitude?:number;longitude?:number};addressComponents?:GoogleAddressComponent[];googleMapsUri?:string};
export type VerifiedGooglePlace={googlePlaceId:string;name:string;address:string;city:string;country:string;neighborhood:string;latitude?:number;longitude?:number;googleMapsUrl:string};

export const googlePlacesFieldMask="places.id,places.displayName,places.formattedAddress,places.location";

export function toCandidate(place:GooglePlaceResponse):GooglePlaceCandidate|null{
  if(!place.id||!place.displayName?.text||!place.formattedAddress)return null;
  return{googlePlaceId:place.id,name:place.displayName.text,address:place.formattedAddress,latitude:place.location?.latitude,longitude:place.location?.longitude,googleMapsUrl:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName.text)}&query_place_id=${encodeURIComponent(place.id)}`};
}

function addressPart(components:GoogleAddressComponent[]|undefined,...types:string[]){return components?.find(component=>types.some(type=>component.types?.includes(type)))}

export async function verifyGooglePlace(googlePlaceId:string,locale:Locale,key:string):Promise<VerifiedGooglePlace>{
  const detailsUrl=new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(googlePlaceId)}`);detailsUrl.searchParams.set("languageCode",locale);
  const response=await fetch(detailsUrl,{headers:{"X-Goog-Api-Key":key,"X-Goog-FieldMask":"id,displayName,formattedAddress,location,addressComponents,googleMapsUri"},signal:AbortSignal.timeout(8000),cache:"no-store"});
  if(!response.ok){console.error("Google Place verification error",response.status,await response.text());throw new Error("No hemos podido verificar el establecimiento en Google Places")}
  const place=await response.json() as GooglePlaceResponse;const name=place.displayName?.text?.trim();const address=place.formattedAddress?.trim();if(place.id!==googlePlaceId||!name||!address)throw new Error("Google Places no ha devuelto un establecimiento válido");
  const cityPart=addressPart(place.addressComponents,"locality","postal_town","administrative_area_level_2","administrative_area_level_1");const city=cityPart?.longText?.trim()||"Sin especificar";
  const neighborhoodPart=addressPart(place.addressComponents,"neighborhood","sublocality_level_1","sublocality");const neighborhood=neighborhoodPart?.longText?.trim()||city;
  const countryPart=addressPart(place.addressComponents,"country");const country=countryPart?.shortText?.trim()||countryPart?.longText?.trim()||"ES";
  return{googlePlaceId,name:name.slice(0,160),address:address.slice(0,300),city:city.slice(0,120),country:country.slice(0,80),neighborhood:neighborhood.slice(0,120),googleMapsUrl:(place.googleMapsUri||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(googlePlaceId)}`).slice(0,500),...(typeof place.location?.latitude==="number"?{latitude:place.location.latitude}:{}),...(typeof place.location?.longitude==="number"?{longitude:place.location.longitude}:{})};
}
