import { useState } from "react";
import { SPEECH_TO_TEXT_PROVIDERS } from "@/config";
import { useApp } from "@/contexts";
import {
  addCustomSttProvider,
  getCustomSttProviders,
  removeCustomSttProvider,
  updateCustomSttProvider,
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

export function useCustomSttProviders() {
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
    const provider = getCustomSttProviders().find((item) => item.id === providerId);
    if (!provider) return;
    setFormData(provider);
    setEditingProvider(providerId);
    setShowForm(true);
    setErrors({});
  };

  const handleAutoFill = (providerId: string) => {
    const provider = SPEECH_TO_TEXT_PROVIDERS.find((item) => item.id === providerId);
    if (!provider) return;
    setFormData({
      ...provider,
      isCustom: true,
      streaming: false,
      responseContentPath: provider.responseContentPath || "",
    });
    setErrors({});
  };

  const handleSave = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.curl.trim()) {
      nextErrors.curl = "Curl command is required";
    } else if (!formData.curl.includes("{{AUDIO}}")) {
      nextErrors.curl = "cURL command must contain {{AUDIO}}.";
    } else {
      const validation = validateCurl(formData.curl, []);
      if (!validation.isValid) nextErrors.curl = validation.message || "";
    }

    if (!formData.responseContentPath?.trim()) {
      nextErrors.responseContentPath = "Response content path is required";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      curl: formData.curl,
      streaming: false,
      responseContentPath: formData.responseContentPath,
    };

    const saved = editingProvider
      ? updateCustomSttProvider(editingProvider, payload)
      : addCustomSttProvider(payload);

    if (!saved) return;
    resetForm();
    setShowForm(false);
    loadData();
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    if (removeCustomSttProvider(deleteConfirm)) {
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
