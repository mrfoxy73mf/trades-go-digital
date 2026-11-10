import type { APIRoute } from "astro";
export const prerender = false;
const clean=(value:unknown,max:number)=>typeof value==="string"?value.trim().slice(0,max):"";
export const POST:APIRoute=async({request,locals})=>{
 const url=new URL(request.url),env=locals.runtime.env as any;
 if(request.headers.get("Origin")!==url.origin)return Response.json({error:"Please send feedback from this website."},{status:403});
 if(!request.headers.get("Content-Type")?.startsWith("application/json"))return Response.json({error:"Invalid feedback request."},{status:415});
 if(!env.RESEND_API_KEY)return Response.json({error:"Feedback is temporarily unavailable. Please email support@trades-go-digital.co.uk."},{status:503});
 if(env.TRAFFIC_MAP_RATE_LIMITER){const limit=await env.TRAFFIC_MAP_RATE_LIMITER.limit({key:`tools-feedback:${request.headers.get("CF-Connecting-IP")||"unknown"}`});if(!limit.success)return Response.json({error:"Please wait a minute before sending more feedback."},{status:429});}
 const body=await request.json().catch(()=>null) as any;if(!body||body.website)return Response.json({error:"Please check the form."},{status:400});
 const tool=clean(body.tool,30),rating=Number(body.rating),categories=Array.isArray(body.categories)?body.categories.map((v:unknown)=>clean(v,40)).filter(Boolean).slice(0,8):[],comments=clean(body.comments,4000),email=clean(body.email,254),contact=Boolean(body.contact);
 if(!["Logo Maker","PDF Maker","Both tools"].includes(tool)||!Number.isInteger(rating)||rating<1||rating>5||comments.length<10)return Response.json({error:"Choose a tool and rating, then tell us a little more."},{status:400});
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return Response.json({error:"Please enter a valid email address or leave it blank."},{status:400});
 const reference=`BT-FB-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${crypto.randomUUID().slice(0,6).toUpperCase()}`;
 const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:"TGD Business Tools <orders@tgd.trades-go-digital.co.uk>",to:["support@trades-go-digital.co.uk"],...(email?{reply_to:email}:{}),subject:`Business Tools feedback — ${tool} — ${rating}/5`,text:`Reference: ${reference}\nTool: ${tool}\nRating: ${rating}/5\nImprovement areas: ${categories.join(", ")||"None selected"}\nContact allowed: ${contact?"Yes":"No"}\nEmail: ${email||"Not supplied"}\n\nFeedback:\n${comments}`}),signal:AbortSignal.timeout(15000)}).catch(()=>null);
 if(!response?.ok)return Response.json({error:"Your feedback could not be sent. Please try again."},{status:502});
 return Response.json({sent:true,reference},{status:201,headers:{"Cache-Control":"no-store"}});
};
