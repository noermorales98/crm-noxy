"use client";
import { useState, useEffect } from "react";
import Header from "@/src/components/Header";
import Sidebar from "@/src/components/Sidebar";
import { useToast } from "@/src/context/ToastContext";

export default function ContactsPage() {
  const { addToast } = useToast();
  const [contacts, setContacts] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", phone: "", companyId: "" });

  useEffect(() => {
    fetchContacts();
    fetchCompanies();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await fetch("/api/contacts");
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ firstName: "", lastName: "", email: "", phone: "", companyId: "" });
    setShowModal(true);
  };

  const openEditModal = (contact: any) => {
    setEditingId(contact.id);
    setFormData({
      firstName: contact.firstName,
      lastName: contact.lastName || "",
      email: contact.email || "",
      phone: contact.phone || "",
      companyId: contact.companyId || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEditing = !!editingId;
      const url = "/api/contacts";
      const method = isEditing ? "PUT" : "POST";

      const payload = {
        ...formData,
        companyId: formData.companyId === "" ? null : formData.companyId,
        ...(isEditing ? { id: editingId } : {})
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const savedContact = await res.json();
        if (isEditing) {
          setContacts(contacts.map(c => c.id === editingId ? savedContact : c));
        } else {
          setContacts([savedContact, ...contacts]);
        }
        setShowModal(false);
        setEditingId(null);
        setFormData({ firstName: "", lastName: "", email: "", phone: "", companyId: "" });
      } else {
        const errorData = await res.json();
        addToast(`Error ${isEditing ? 'updating' : 'creating'} contact: ${errorData.error}`, "error");
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
            <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
            <button
              onClick={openAddModal}
              className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Add Contact
            </button>
          </div>

          {loading ? (
            <div className="text-gray-500">Cargando contactos...</div>
          ) : (
            <div className="bg-white border text-sm border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#fcfbf9] border-b text-gray-500 border-gray-100 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Nombre</th>
                    <th className="px-6 py-4 font-semibold">Email</th>
                    <th className="px-6 py-4 font-semibold">Teléfono</th>
                    <th className="px-6 py-4 font-semibold">Empresa</th>
                    <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contacts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No contacts found. Create one!</td>
                    </tr>
                  ) : contacts.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                          {c.firstName[0]}
                        </div>
                        {c.firstName} {c.lastName}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{c.email || "-"}</td>
                      <td className="px-6 py-4 text-gray-600">{c.phone || "-"}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {c.company ? (
                          <span className="px-2 py-1 bg-gray-100 rounded-md text-xs font-semibold">{c.company.name}</span>
                        ) : (
                          "-"
                        )}
                      </td>
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
                <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit contact' : 'Add new contact'}</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                      <input
                        required
                        type="text"
                        value={formData.firstName}
                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <select
                      value={formData.companyId}
                      onChange={e => setFormData({ ...formData, companyId: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black bg-white"
                    >
                      <option value="">-- No Company --</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
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
