"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

export default function PublicFormPage() {
   const { id } = useParams() as { id: string };
   const [formConfig, setFormConfig] = useState<any>(null);
   const [errorMsg, setErrorMsg] = useState<string | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   
   const [formData, setFormData] = useState<Record<string, any>>({});
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [submitSuccess, setSubmitSuccess] = useState(false);
   const [successActionMsg, setSuccessActionMsg] = useState("");

   useEffect(() => {
      fetchFormDefinition();
   }, [id]);

   const fetchFormDefinition = async () => {
       try {
           const res = await fetch(`/api/public/forms/${id}`);
           const data = await res.json();
           
           if (!res.ok) {
               setErrorMsg(data.error || "Failed to load form.");
           } else {
               setFormConfig(data);
               // Initialize default state shape
               const initialData: Record<string, any> = {};
               data.fields.forEach((f: any) => {
                   if (f.type === "CHECKBOX") initialData[f.name] = [];
                   else initialData[f.name] = "";
               });
               setFormData(initialData);
           }
       } catch (e) {
           setErrorMsg("Could not connect to the server.");
       } finally {
           setIsLoading(false);
       }
   };

   const handleInputChange = (name: string, value: any, type: string) => {
       if (type === "CHECKBOX") {
           // Toggle array value
           setFormData(prev => {
               const currentArray = prev[name] || [];
               if (currentArray.includes(value)) {
                   return { ...prev, [name]: currentArray.filter((v: string) => v !== value) };
               } else {
                   return { ...prev, [name]: [...currentArray, value] };
               }
           });
       } else {
           setFormData(prev => ({ ...prev, [name]: value }));
       }
   };

   const handleSubmit = async (e: React.FormEvent) => {
       e.preventDefault();
       setIsSubmitting(true);
       setErrorMsg(null);

       try {
           const res = await fetch(`/api/public/forms/${id}/submit`, {
               method: "POST",
               headers: { "Content-Type" : "application/json" },
               body: JSON.stringify(formData)
           });
           
           const data = await res.json();
           
           if (res.ok) {
               if (data.action === "REDIRECT" && data.redirectUrl) {
                   window.location.href = data.redirectUrl;
               } else {
                   setSubmitSuccess(true);
                   setSuccessActionMsg(data.message || "Form submitted successfully!");
               }
           } else {
               setErrorMsg(data.error || "Failed to submit form.");
           }
       } catch (err) {
           setErrorMsg("Check your connection and try again.");
       } finally {
           setIsSubmitting(false);
       }
   };

   if (isLoading) {
       return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
       </div>;
   }

   if (errorMsg) {
       return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
           <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 max-w-md w-full text-center">
               <div className="text-red-500 font-bold mb-2">Error</div>
               <p className="text-gray-600">{errorMsg}</p>
           </div>
       </div>;
   }

   if (submitSuccess) {
       return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
           <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center flex flex-col items-center gap-4">
               <CheckCircle2 size={48} className="text-green-500" />
               <p className="text-gray-900 font-medium text-lg whitespace-pre-wrap">{successActionMsg}</p>
           </div>
       </div>;
   }

   return (
       <div className="min-h-screen bg-transparent p-4 md:py-10">
           <div className="bg-white max-w-xl mx-auto rounded-3xl shadow-sm border border-gray-100 p-8 md:p-10">
               <h1 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">{formConfig.name}</h1>
               {formConfig.description && (
                   <p className="text-gray-600 mb-8 whitespace-pre-wrap">{formConfig.description}</p>
               )}

               <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                   {formConfig.fields.map((field: any) => (
                       <div key={field.id} className="flex flex-col gap-2">
                           <label className="text-sm font-semibold text-gray-800">
                               {field.label} {field.isRequired && <span className="text-red-500">*</span>}
                           </label>
                           
                           {field.type === "TEXT" && (
                               <input type="text" required={field.isRequired} placeholder={field.placeholder || ""} value={formData[field.name]} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors" />
                           )}
                           {field.type === "PREDEFINED_NAME" && (
                               <div className="flex flex-col sm:flex-row gap-3">
                                   <input type="text" required={field.isRequired} placeholder="First Name" value={formData[`${field.name}_first`]} onChange={e => handleInputChange(`${field.name}_first`, e.target.value, field.type)} className="w-full sm:w-1/2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors" />
                                   <input type="text" required={field.isRequired} placeholder="Last Name" value={formData[`${field.name}_last`]} onChange={e => handleInputChange(`${field.name}_last`, e.target.value, field.type)} className="w-full sm:w-1/2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors" />
                               </div>
                           )}
                           {field.type === "EMAIL" && (
                               <input type="email" required={field.isRequired} placeholder={field.placeholder || ""} value={formData[field.name]} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors" />
                           )}
                           {field.type === "PHONE" && (
                               <input type="tel" required={field.isRequired} placeholder={field.placeholder || ""} value={formData[field.name]} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors" />
                           )}
                           {field.type === "PHONE_LADA" && (
                               <div className="flex gap-2">
                                   <select required={field.isRequired} value={formData[`${field.name}_code`]} onChange={e => handleInputChange(`${field.name}_code`, e.target.value, field.type)} className="w-[100px] px-2 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors">
                                       <option value="+52">+52 (MX)</option>
                                       <option value="+1">+1 (US/CA)</option>
                                       <option value="+34">+34 (ES)</option>
                                       <option value="+54">+54 (AR)</option>
                                       <option value="+57">+57 (CO)</option>
                                       <option value="+56">+56 (CL)</option>
                                       <option value="+51">+51 (PE)</option>
                                   </select>
                                   <input type="tel" required={field.isRequired} placeholder={field.placeholder || "Phone Number"} value={formData[`${field.name}_number`]} onChange={e => handleInputChange(`${field.name}_number`, e.target.value, field.type)} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors" />
                               </div>
                           )}
                           {field.type === "NUMBER" && (
                               <input type="number" required={field.isRequired} placeholder={field.placeholder || ""} value={formData[field.name]} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors" />
                           )}
                           {field.type === "DATE" && (
                               <input type="date" required={field.isRequired} value={formData[field.name]} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors" />
                           )}
                           {field.type === "TEXTAREA" && (
                               <textarea required={field.isRequired} placeholder={field.placeholder || ""} rows={3} value={formData[field.name]} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors resize-y"></textarea>
                           )}
                           
                           {field.type === "SELECT" && (
                               <select required={field.isRequired} value={formData[field.name]} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors">
                                   <option value="" disabled>Select an option</option>
                                   {field.options?.map((opt: string, i: number) => (
                                       <option key={i} value={opt}>{opt}</option>
                                   ))}
                               </select>
                           )}

                           {field.type === "RADIO" && (
                               <div className="flex flex-col gap-2 mt-1">
                                   {field.options?.map((opt: string, i: number) => (
                                       <label key={i} className="flex items-center gap-3 cursor-pointer text-gray-700">
                                           <input type="radio" required={field.isRequired} name={field.name} value={opt} checked={formData[field.name] === opt} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-4 h-4 text-black focus:ring-black" />
                                           <span>{opt}</span>
                                       </label>
                                   ))}
                               </div>
                           )}

                           {field.type === "CHECKBOX" && (
                               <div className="flex flex-col gap-2 mt-1">
                                   {field.options?.map((opt: string, i: number) => (
                                       <label key={i} className="flex items-center gap-3 cursor-pointer text-gray-700">
                                           <input type="checkbox" value={opt} checked={formData[field.name]?.includes(opt)} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-4 h-4 rounded text-black focus:ring-black border-gray-300" />
                                           <span>{opt}</span>
                                       </label>
                                   ))}
                               </div>
                           )}

                       </div>
                   ))}

                   <div className="pt-4 mt-2 border-t border-gray-100 pb-2">
                       <button type="submit" disabled={isSubmitting} className="w-full py-4 rounded-xl font-bold text-white bg-gray-900 hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50 text-lg">
                           {isSubmitting ? "Submitting..." : "Submit"}
                       </button>
                   </div>
               </form>

               <div className="mt-8 text-center">
                   <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Powered by Noxy CRM</p>
               </div>
           </div>
       </div>
   );
}
