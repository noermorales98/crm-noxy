import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/src/lib/db';
import { engagement } from '@/src/lib/video-analytics';
const numeric=['durationSeconds','reach','views','retention3s','shares','saves','comments','leadsGenerated','predictorScore'] as const;
const optional=['hook','hookType','format','aiTool','prompt','notes'] as const;
export async function GET(){
 const session=await auth(); const organizationId=(session as any)?.currentOrganizationId;
 if(!session?.user||!organizationId)return NextResponse.json({error:'Unauthorized'},{status:401});
 const videos=await prisma.video.findMany({where:{organizationId},orderBy:{publishedAt:'desc'},take:500});
 return NextResponse.json(videos.map(v=>({...v,engagementPct:engagement(v)})));
}
export async function POST(req:Request){
 const session=await auth(); const organizationId=(session as any)?.currentOrganizationId;
 if(!session?.user||!organizationId)return NextResponse.json({error:'Unauthorized'},{status:401});
 const body=await req.json();
 if(typeof body.title!=='string'||!body.title.trim()||typeof body.platform!=='string'||!body.platform.trim())return NextResponse.json({error:'Título y plataforma requeridos'},{status:400});
 const data:Record<string,any>={organizationId,title:body.title.trim(),platform:body.platform.trim()};
 for(const key of optional)if(body[key]!=null)data[key]=String(body[key]);
 for(const key of numeric)if(body[key]!=null&&body[key]!==''){
  const n=Number(body[key]); if(!Number.isFinite(n)||n<0)return NextResponse.json({error:`Valor inválido: ${key}`},{status:400}); data[key]=n;
 }
 if(body.publishedAt){const date=new Date(body.publishedAt);if(Number.isNaN(date.getTime()))return NextResponse.json({error:'Fecha inválida'},{status:400});data.publishedAt=date;}
 for(const [key,model] of [['clientId','client'],['contentClientId','contentClient'],['contentItemId','contentItem']] as const){
  if(body[key]){const exists=await (prisma[model] as any).findFirst({where:{id:body[key],organizationId},select:{id:true}});if(!exists)return NextResponse.json({error:`${key} no autorizado`},{status:404});data[key]=body[key];}
 }
 const video=await prisma.video.create({data:data as any});return NextResponse.json(video,{status:201});
}
