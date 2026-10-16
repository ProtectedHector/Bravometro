import "server-only";
import { siteUrl } from "@/lib/site-url";

type PendingReviewNotification={placeName:string;userName:string;userEmail?:string;score:number;comment?:string};

function escapeHtml(value:string){return value.replace(/[&<>'"]/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[character]!)}

export async function sendPendingReviewNotification(review:PendingReviewNotification){
  const apiKey=process.env.RESEND_API_KEY;const recipients=process.env.REVIEW_NOTIFICATION_EMAIL?.split(",").map(value=>value.trim()).filter(Boolean);
  if(!apiKey||!recipients?.length)return;
  const adminUrl=new URL("/es/admin",siteUrl()).toString();const safePlace=escapeHtml(review.placeName);const safeUser=escapeHtml(review.userName);const safeComment=escapeHtml(review.comment||"Sin comentario");
  try{
    const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.REVIEW_NOTIFICATION_FROM||"Bravómetro <onboarding@resend.dev>",to:recipients,subject:`Nueva valoración pendiente · ${review.placeName}`,html:`<h1>Nueva valoración pendiente</h1><p><strong>${safePlace}</strong> ha recibido una valoración de <strong>${review.score.toFixed(1)}/10</strong>.</p><p>Enviada por ${safeUser}.</p><blockquote>${safeComment}</blockquote><p><a href="${adminUrl}">Abrir la cola de moderación</a></p>`,...(review.userEmail?{reply_to:review.userEmail}:{})}),signal:AbortSignal.timeout(8000)});
    if(!response.ok)console.error("Could not send pending review email",response.status,(await response.text()).slice(0,300));
  }catch(error){console.error("Could not send pending review email",error instanceof Error?error.message:error)}
}
