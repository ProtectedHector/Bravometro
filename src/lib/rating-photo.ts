const MAX_INPUT_BYTES=15*1024*1024;
const MAX_OUTPUT_BYTES=5*1024*1024;
const MAX_EDGE=1600;
const STANDARD_TYPES=new Set(["image/jpeg","image/png","image/webp"]);

function loadImage(file:File):Promise<HTMLImageElement>{return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file);const image=new Image();image.onload=()=>{URL.revokeObjectURL(url);resolve(image)};image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("No se ha podido leer la imagen"))};image.src=url})}

export async function prepareRatingPhoto(file:File):Promise<File>{
  const heic=/\.(heic|heif)$/i.test(file.name)||["image/heic","image/heif","image/heic-sequence","image/heif-sequence"].includes(file.type.toLowerCase());
  if(!heic&&!STANDARD_TYPES.has(file.type.toLowerCase()))throw new Error("Selecciona una imagen JPG, PNG, WebP o HEIC");
  if(file.size>MAX_INPUT_BYTES)throw new Error("La imagen original no puede superar los 15 MB");
  let source:Blob=file;if(heic){try{const{heicTo}=await import("heic-to/csp");source=await heicTo({blob:file,type:"image/jpeg",quality:.9})}catch{throw new Error("No se ha podido convertir la imagen HEIC")}}
  const image=await loadImage(new File([source],"foto.jpg",{type:source.type||"image/jpeg"}));const scale=Math.min(1,MAX_EDGE/Math.max(image.naturalWidth,image.naturalHeight));const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));const context=canvas.getContext("2d");if(!context)throw new Error("No se ha podido procesar la imagen");context.drawImage(image,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/webp",.82));if(!blob)throw new Error("No se ha podido procesar la imagen");if(blob.size>MAX_OUTPUT_BYTES)throw new Error("La imagen procesada supera los 5 MB");return new File([blob],"valoracion-bravometro.webp",{type:"image/webp"});
}
