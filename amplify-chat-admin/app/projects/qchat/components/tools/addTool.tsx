export default function addTool() {
  return;
  <h1>Add Tool component</h1>;
}
// components/ui/dynamic-modal.tsx
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "email" | "number" | "select" | "switch";
  options?: { label: string; value: string | number }[]; // For select fields
  required?: boolean;
  placeholder?: string;
}

interface DynamicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: Record<string, any>) => void;
  title: string;
  description?: string;
  fields: FieldConfig[];
}

export function DynamicModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  fields,
}: DynamicModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleFieldChange = (name: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const renderField = (field: FieldConfig) => {
    switch (field.type) {
      case "text":
      case "email":
      case "number":
        return (
          <div className="grid gap-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type={field.type}
              placeholder={field.placeholder}
              required={field.required}
              value={formData[field.name] || ""}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className="w-full"
            />
          </div>
        );

      case "select":
        return (
          <div className="grid gap-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={formData[field.name]}
              onValueChange={(value) => handleFieldChange(field.name, value)}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={field.placeholder || `Select ${field.label}`}
                />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem
                    key={option.value.toString()}
                    value={option.value.toString()}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "switch":
        return (
          <div className="flex items-center justify-between">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Switch
              id={field.name}
              checked={formData[field.name] || false}
              onCheckedChange={(checked) =>
                handleFieldChange(field.name, checked)
              }
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {fields.map((field) => (
              <div key={field.name}>{renderField(field)}</div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Example usage in your page or component
//import { useState } from 'react';
//import { DynamicModal } from '@/components/ui/dynamic-modal';

export function YourComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fields = [
    {
      name: "fullName",
      label: "Full Name",
      type: "text",
      required: true,
      placeholder: "Enter your full name",
    },
    {
      name: "email",
      label: "Email Address",
      type: "email",
      required: true,
      placeholder: "Enter your email",
    },
    {
      name: "role",
      label: "Role",
      type: "select",
      required: true,
      options: [
        { label: "Admin", value: "admin" },
        { label: "User", value: "user" },
        { label: "Guest", value: "guest" },
      ],
    },
    {
      name: "isActive",
      label: "Active Status",
      type: "switch",
    },
  ];

  const handleSubmit = (formData: Record<string, any>) => {
    console.log("Form submitted:", formData);
    // Handle the form data here
  };

  return (
    <div>
      <Button onClick={() => setIsModalOpen(true)}>Open Modal</Button>

      <DynamicModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        title="User Information"
        description="Please fill in the user details"
        fields={fields as FieldConfig[]}
      />
    </div>
  );
}
