"use client";
import { useState, useEffect } from "react";
import Header from "@/src/components/Header";
import Sidebar from "@/src/components/Sidebar";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", website: "", industry: "" });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ name: "", website: "", industry: "" });
    setShowModal(true);
  };

  const openEditModal = (company: any) => {
    setEditingId(company.id);
    setFormData({
      name: company.name,
      website: company.website || "",
      industry: company.industry || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEditing = !!editingId;
      const url = "/api/companies";
      const method = isEditing ? "PUT" : "POST";
      const payload = isEditing ? { ...formData, id: editingId } : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const savedCompany = await res.json();
        if (isEditing) {
          setCompanies(companies.map(c => c.id === editingId ? savedCompany : c));
        } else {
          setCompanies([savedCompany, ...companies]);
        }
        setShowModal(false);
        setEditingId(null);
        setFormData({ name: "", website: "", industry: "" });
      } else {
        const errorData = await res.json();
        alert(`Error ${isEditing ? 'updating' : 'creating'} company: ${errorData.error}`);
        console.error("API Error Response:", errorData);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex bg-background h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
            <button 
              onClick={openAddModal}
              className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Add Company
            </button>
          </div>

          {loading ? (
             <div className="text-gray-500">Loading companies...</div>
          ) : (
            <div className="bg-white border text-sm border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#fcfbf9] border-b text-gray-500 border-gray-100 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Name</th>
                    <th className="px-6 py-4 font-semibold">Industry</th>
                    <th className="px-6 py-4 font-semibold">Website</th>
                    <th className="px-6 py-4 font-semibold">Contacts</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {companies.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No companies found. Create one!</td>
                    </tr>
                  ) : companies.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{c.name}</td>
                      <td className="px-6 py-4 text-gray-600">{c.industry || "-"}</td>
                      <td className="px-6 py-4 text-blue-600 hover:underline">{c.website ? <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank">{c.website}</a> : "-"}</td>
                      <td className="px-6 py-4 text-gray-600">{c._count?.contacts || 0}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => openEditModal(c)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit company' : 'Add new company'}</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input 
                      type="text" 
                      value={formData.website}
                      onChange={e => setFormData({...formData, website: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                      placeholder="acme.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                    <input 
                      type="text" 
                      value={formData.industry}
                      onChange={e => setFormData({...formData, industry: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                    />
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-transparent hover:bg-gray-50 rounded-lg">Cancel</button>
                    <button type="submit" className="px-4 py-2 text-sm text-white bg-black hover:bg-gray-800 rounded-lg font-medium">{editingId ? 'Save changes' : 'Create'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
