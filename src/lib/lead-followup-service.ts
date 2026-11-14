import { prisma } from '@/src/lib/db';
import { followupTasks } from './lead-followup';
export async function ensureLeadFollowups(dealId: string, organizationId: string) {
 const deal = await prisma.deal.findFirst({where:{id:dealId,organizationId},include:{stage:true}});
 if (!deal || deal.stage.name.toLowerCase() !== 'lead') return 0;
 const owner=await prisma.organizationMember.findFirst({where:{organizationId,role:'OWNER'},select:{userId:true}});
 if (!owner) return 0;
 const existing=await prisma.task.findMany({where:{dealId,organizationId},select:{title:true}});
 let created=0;
 for (const task of followupTasks(deal)) {
  if (existing.some(x=>x.title===task.title)) continue;
  await prisma.task.create({data:{...task,organizationId,assignedToId:owner.userId}});
  created++;
 }
 return created;
}
export async function ensureDeliveryReferrals(projectId:string, organizationId:string) {
 const project=await prisma.project.findFirst({where:{id:projectId,organizationId},select:{dealId:true,contactId:true,name:true}});
 if (!project?.dealId) return 0;
 const owner=await prisma.organizationMember.findFirst({where:{organizationId,role:'OWNER'},select:{userId:true}});
 if(!owner) return 0;
 const deal=await prisma.deal.findUnique({where:{id:project.dealId},select:{referredByClientId:true,referredByContactId:true}});
 const titles=['Pedir 2 referidos',...(deal?.referredByClientId||deal?.referredByContactId?['Agradecer a quien refirió']:[])];
 let created=0;
 for(const title of titles){
  const fullTitle=`${title}: ${project.name}`;
  const found=await prisma.task.findFirst({where:{projectId,organizationId,title:fullTitle}});
  if(found)continue;
  await prisma.task.create({data:{title:fullTitle,description:'Preparar mensaje y aprobarlo antes de enviar por WhatsApp.',projectId,dealId:project.dealId,contactId:project.contactId,organizationId,assignedToId:owner.userId,dueDate:new Date()}});
  created++;
 }
 return created;
}
