import { useState } from "react";
import { AI_PROVIDERS } from "@/config";
import { useApp } from "@/contexts";
import {
  addCustomAiProvider,
  getCustomAiProviders,
  removeCustomAiProvider,
  updateCustomAiProvider,
  validateCurl,
} from "@/lib";
import { TYPE_PROVIDER } from "@/types";

const emptyProvider: TYPE_PROVIDER = {
  id: "",
  streaming: false,
  responseContentPath: "",
  isCustom: true,
  curl: "",
};

export function useCustomAiProviders() {
  const { loadData } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [formData, setFormData] = useState<TYPE_PROVIDER>(emptyProvider);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const resetForm = () => {
    setFormData(emptyProvider);
    setEditingProvider(null);
    setErrors({});
  };

  const handleEdit = (providerId: string) => {
    const provider = getCustomAiProviders().find((item) => item.id === providerId);
    if (!provider) return;
    setFormData(provider);
    setEditingProvider(providerId);
    setShowForm(true);
    setErrors({});
  };

  const handleAutoFill = (providerId: string) => {
    const provider = AI_PROVIDERS.find((item) => item.id === providerId);
    if (!provider) return;
    setFormData({
      ...provider,
      isCustom: true,
      responseContentPath: provider.responseContentPath || "",
    });
    setErrors({});
  };

  const handleSave = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.curl.trim()) {
      nextErrors.curl = "Curl command is required";
    } else {
      const validation = validateCurl(formData.curl, ["TEXT"]);
      if (!validation.isValid) nextErrors.curl = validation.message || "";
    }

    if (!formData.responseContentPath?.trim()) {
      nextErrors.responseContentPath = "Response content path is required";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      curl: formData.curl,
      streaming: formData.streaming,
      responseContentPath: formData.responseContentPath,
    };

    const saved = editingProvider
      ? updateCustomAiProvider(editingProvider, payload)
      : addCustomAiProvider(payload);

    if (!saved) return;
    resetForm();
    setShowForm(false);
    loadData();
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    if (removeCustomAiProvider(deleteConfirm)) {
      setDeleteConfirm(null);
      loadData();
    }
  };

  return {
    errors,
    setErrors,
    showForm,
    setShowForm,
    editingProvider,
    deleteConfirm,
    formData,
    setFormData,
    resetForm,
    handleSave,
    handleAutoFill,
    handleEdit,
    handleDelete: setDeleteConfirm,
    confirmDelete,
    cancelDelete: () => setDeleteConfirm(null),
  };
}
