import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/src/lib/db';
import { engagement } from '@/src/lib/video-analytics';
import { parseVideoFormBody } from '@/src/lib/video-import';
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
 const {data,error}=await parseVideoFormBody(organizationId,body);
 if(error||!data)return NextResponse.json({error:error??'Datos inválidos'},{status:400});
 const video=await prisma.video.create({data:data as never});return NextResponse.json(video,{status:201});
}
/** Borrado por lotes: { ids: string[] } → { deleted: number }. */
export async function DELETE(req:Request){
 const session=await auth(); const organizationId=(session as any)?.currentOrganizationId;
 if(!session?.user||!organizationId)return NextResponse.json({error:'Unauthorized'},{status:401});
 const body=await req.json().catch(()=>null);
 const ids=Array.isArray(body?.ids)?body.ids.filter((id:unknown)=>typeof id==='string'):[];
 if(!ids.length||ids.length>500)return NextResponse.json({error:'Entre 1 y 500 ids'},{status:400});
 const result=await prisma.video.deleteMany({where:{id:{in:ids},organizationId}});
 return NextResponse.json({deleted:result.count});
}
