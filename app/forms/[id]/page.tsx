"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";
import { ArrowLeft, Save, Plus, GripVertical, Trash2, Settings2, LayoutTemplate } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import Link from "next/link";

const FIELD_TYPES = [
  { value: "TEXT", label: "Short Text" },
  { value: "PREDEFINED_NAME", label: "Full Name (First & Last)" },
  { value: "TEXTAREA", label: "Long Text (Paragraph)" },
  { value: "EMAIL", label: "Email Address" },
  { value: "PHONE", label: "Phone Number" },
  { value: "PHONE_LADA", label: "Phone Number with Lada" },
  { value: "NUMBER", label: "Number" },
  { value: "DATE", label: "Date Picker" },
  { value: "SELECT", label: "Dropdown Select" },
  { value: "CHECKBOX", label: "Multiple Checkboxes" },
  { value: "RADIO", label: "Radio Buttons" }
];

export default function FormBuilderPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form Metadata
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [successAction, setSuccessAction] = useState("MESSAGE");
  const [successMessage, setSuccessMessage] = useState("Thank you for your submission!");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [welcomeEmailId, setWelcomeEmailId] = useState("");

  const [campaigns, setCampaigns] = useState<any[]>([]);

  // Form Fields
  const [fields, setFields] = useState<any[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState<"BUILDER" | "SETTINGS">("BUILDER");

  useEffect(() => {
    fetchForm();
    fetchCampaigns();
  }, [id]);

  const fetchCampaigns = async () => {
     try {
       const res = await fetch("/api/campaigns");
       if (res.ok) {
         const data = await res.json();
         setCampaigns(data);
       }
     } catch (e) {
       console.error(e);
     }
  };

  const fetchForm = async () => {
    try {
      const res = await fetch(`/api/forms/${id}`);
      if (res.ok) {
        const data = await res.json();
        setName(data.name);
        setDescription(data.description || "");
        setIsActive(data.isActive);
        setSuccessAction(data.successAction);
        setSuccessMessage(data.successMessage || "");
        setRedirectUrl(data.redirectUrl || "");
        setWelcomeEmailId(data.welcomeEmailId || "");
        setFields(data.fields || []);
      } else {
         alert("Form not found");
         router.push("/forms");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
     setIsSaving(true);
     // Update the order property of fields based on array position before saving
     const orderedFields = fields.map((f, i) => ({ ...f, order: i }));

     try {
       const res = await fetch(`/api/forms/${id}`, {
         method: "PUT",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
            name,
            description,
            isActive,
            successAction,
            successMessage,
            redirectUrl,
            welcomeEmailId,
            fields: orderedFields
         })
       });

       if (res.ok) {
          alert("Form saved successfully.");
          fetchForm(); // Reload to get actual DB IDs if new fields were added
       } else {
          const err = await res.json();
          alert(err.error || "Failed to save form.");
       }
     } catch (e) {
       alert("An expected error occurred.");
     } finally {
        setIsSaving(false);
     }
  };

  const addField = () => {
     const newField = {
        id: `temp-${Date.now()}`, // Temporary ID for drag and drop
        type: "TEXT",
        label: "New Field",
        name: `field_${Date.now()}`,
        placeholder: "",
        isRequired: false,
        options: "",
        order: fields.length
     };
     setFields([...fields, newField]);
  };

  const removeField = (index: number) => {
      const newFields = [...fields];
      newFields.splice(index, 1);
      setFields(newFields);
  };

  const updateField = (index: number, key: string, value: any) => {
      const newFields = [...fields];
      newFields[index] = { ...newFields[index], [key]: value };
      setFields(newFields);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    const items = Array.from(fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setFields(items);
  };

  if (isLoading) return <div className="p-20 text-center">Loading builder...</div>;

  return (
    <div className="flex h-screen bg-background font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 flex flex-col overflow-hidden bg-white/50">
          {/* Topbar Builder Navigation */}
          <div className="border-b border-gray-100 bg-white px-8 py-4 flex items-center justify-between shrink-0">
             <div className="flex items-center gap-4">
                <Link href="/forms" className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors">
                   <ArrowLeft size={20} />
                </Link>
                <div>
                   <h1 className="text-xl font-bold text-gray-900 leading-tight">{name || "Untitled Form"}</h1>
                   <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                      <p className="text-xs text-gray-500 font-medium">{isActive ? 'Live' : 'Draft'}</p>
                   </div>
                </div>
             </div>

             <div className="flex bg-gray-100 p-1 rounded-xl">
                 <button 
                    onClick={() => setActiveTab("BUILDER")}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'BUILDER' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                    <LayoutTemplate size={16} className="inline mr-2" />
                    Builder
                 </button>
                 <button 
                    onClick={() => setActiveTab("SETTINGS")}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'SETTINGS' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                    <Settings2 size={16} className="inline mr-2" />
                    Settings
                 </button>
             </div>

             <button
               onClick={handleSave}
               disabled={isSaving}
               className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
             >
               <Save size={16} />
               {isSaving ? "Saving..." : "Save Changes"}
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 relative">
             <div className="max-w-3xl mx-auto z-10 relative">

                {activeTab === "SETTINGS" && (
                   <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col gap-6">
                       <h2 className="text-lg font-bold text-gray-900 mb-2">Form Settings</h2>
                       
                       <div className="flex flex-col gap-2">
                           <label className="text-sm font-semibold text-gray-700">Form Name</label>
                           <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 text-sm" />
                       </div>

                       <div className="flex flex-col gap-2">
                           <label className="text-sm font-semibold text-gray-700">Internal Description</label>
                           <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 text-sm resize-none"></textarea>
                       </div>

                       <div className="flex items-center gap-3 py-4 border-y border-gray-50">
                           <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-5 h-5 rounded text-gray-900 focus:ring-gray-900 border-gray-300" />
                           <label htmlFor="isActive" className="text-sm font-medium text-gray-900">Form is Active (Can receive public submissions)</label>
                       </div>

                       <h3 className="text-md font-bold text-gray-900 mt-4 border-b border-gray-100 pb-2">On Submission Success</h3>
                       
                       <div className="flex gap-4">
                           <label className="flex items-center gap-2 text-sm text-gray-700">
                               <input type="radio" value="MESSAGE" checked={successAction === "MESSAGE"} onChange={e => setSuccessAction(e.target.value)} className="text-gray-900 focus:ring-gray-900" />
                               Show Success Message
                           </label>
                           <label className="flex items-center gap-2 text-sm text-gray-700">
                               <input type="radio" value="REDIRECT" checked={successAction === "REDIRECT"} onChange={e => setSuccessAction(e.target.value)} className="text-gray-900 focus:ring-gray-900" />
                               Redirect to URL
                           </label>
                       </div>

                       {successAction === "MESSAGE" && (
                           <div className="flex flex-col gap-2">
                               <label className="text-sm font-semibold text-gray-700">Success Message</label>
                               <textarea value={successMessage} onChange={e => setSuccessMessage(e.target.value)} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 text-sm resize-none"></textarea>
                           </div>
                       )}

                       {successAction === "REDIRECT" && (
                           <div className="flex flex-col gap-2">
                               <label className="text-sm font-semibold text-gray-700">Redirect URL</label>
                               <input type="url" placeholder="https://..." value={redirectUrl} onChange={e => setRedirectUrl(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 text-sm" />
                           </div>
                       )}

                       <h3 className="text-md font-bold text-gray-900 mt-4 border-b border-gray-100 pb-2">Auto-Welcome Email</h3>
                       <div className="flex flex-col gap-2">
                           <label className="text-sm font-semibold text-gray-700">Send an email automatically to new leads</label>
                           <select 
                             value={welcomeEmailId} 
                             onChange={e => setWelcomeEmailId(e.target.value)} 
                             className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                           >
                             <option value="">Do not send a welcome email</option>
                             {campaigns.map(c => (
                                <option key={c.id} value={c.id}>{c.subject}</option>
                             ))}
                           </select>
                           <p className="text-xs text-gray-500 mt-1">Select an existing Campaign draft to act as a template.</p>
                       </div>
                   </div>
                )}

                {activeTab === "BUILDER" && (
                   <div className="flex flex-col gap-6">
                       <DragDropContext onDragEnd={handleDragEnd}>
                         <Droppable droppableId="form-fields">
                           {(provided: any) => (
                             <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-4">
                               {fields.map((field, index) => (
                                 <Draggable key={field.id} draggableId={field.id} index={index}>
                                   {(provided: any, snapshot: any) => (
                                     <div
                                       ref={provided.innerRef}
                                       {...provided.draggableProps}
                                       className={`bg-white rounded-2xl border ${snapshot.isDragging ? 'border-gray-400 shadow-xl scale-[1.02]' : 'border-gray-200 shadow-sm'} transition-all`}
                                     >
                                         <div className="flex items-center gap-4 bg-gray-50/50 p-3 px-4 border-b border-gray-100 rounded-t-2xl">
                                            <div {...provided.dragHandleProps} className="text-gray-400 hover:text-gray-700 cursor-grab">
                                               <GripVertical size={20} />
                                            </div>
                                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Field {index + 1}</span>
                                            
                                            <button onClick={() => removeField(index)} className="ml-auto text-gray-400 hover:text-red-600 transition-colors p-1">
                                                <Trash2 size={16} />
                                            </button>
                                         </div>

                                         <div className="p-6 grid grid-cols-2 gap-5">
                                             <div className="flex flex-col gap-1.5 col-span-2 md:col-span-1">
                                                 <label className="text-xs font-semibold text-gray-600">Field Type</label>
                                                 <select value={field.type} onChange={(e) => updateField(index, "type", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm">
                                                     {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                                 </select>
                                             </div>
                                             
                                             <div className="flex flex-col gap-1.5 col-span-2 md:col-span-1">
                                                 <label className="text-xs font-semibold text-gray-600">Question / Label</label>
                                                 <input type="text" value={field.label} onChange={(e) => updateField(index, "label", e.target.value)} placeholder="e.g. What is your name?" className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm" />
                                             </div>

                                             <div className="flex flex-col gap-1.5 col-span-2 md:col-span-1">
                                                 <label className="text-xs font-semibold text-gray-600">Internal System Name</label>
                                                 <input type="text" value={field.name} onChange={(e) => updateField(index, "name", e.target.value)} placeholder="e.g. first_name" className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-mono" />
                                             </div>

                                             <div className="flex flex-col gap-1.5 col-span-2 md:col-span-1">
                                                 <label className="text-xs font-semibold text-gray-600">Placeholder Text</label>
                                                 <input type="text" value={field.placeholder || ""} onChange={(e) => updateField(index, "placeholder", e.target.value)} placeholder="e.g. John Doe" className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm" />
                                             </div>

                                             {(field.type === "SELECT" || field.type === "RADIO" || field.type === "CHECKBOX") && (
                                                <div className="flex flex-col gap-1.5 col-span-2">
                                                    <label className="text-xs font-semibold text-gray-600">Options (Comma separated)</label>
                                                    <textarea rows={2} value={field.options || ""} onChange={(e) => updateField(index, "options", e.target.value)} placeholder="Option 1, Option 2, Option 3" className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm resize-none"></textarea>
                                                </div>
                                             )}

                                             <div className="flex items-center gap-2 col-span-2 mt-2">
                                                 <input type="checkbox" id={`req-${field.id}`} checked={field.isRequired} onChange={(e) => updateField(index, "isRequired", e.target.checked)} className="w-4 h-4 rounded text-gray-900 focus:ring-gray-900 border-gray-300" />
                                                 <label htmlFor={`req-${field.id}`} className="text-sm font-medium text-gray-800">Make this field Required</label>
                                             </div>
                                         </div>
                                     </div>
                                   )}
                                 </Draggable>
                               ))}
                               {provided.placeholder}
                             </div>
                           )}
                         </Droppable>
                       </DragDropContext>

                       <button 
                         onClick={addField}
                         className="w-full py-6 border-2 border-dashed border-gray-200 hover:border-gray-800 hover:bg-gray-50 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all text-gray-500 hover:text-gray-900 group"
                       >
                           <div className="p-3 rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors">
                              <Plus size={24} />
                           </div>
                           <span className="font-semibold">Add New Form Field</span>
                       </button>

                       {fields.length === 0 && (
                          <div className="text-center py-10">
                              <p className="text-gray-500 text-sm">Your form is completely empty.</p>
                          </div>
                       )}
                   </div>
                )}
             </div>
          </div>
        </main>
      </div>
    </div>
  );
}
