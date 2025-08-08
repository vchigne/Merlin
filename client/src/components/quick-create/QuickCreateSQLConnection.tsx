import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2 } from "lucide-react";

interface QuickCreateSQLConnectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function QuickCreateSQLConnection({ 
  open, 
  onOpenChange, 
  onSuccess 
}: QuickCreateSQLConnectionProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    driver: '',
    connstring: ''
  });
  const { toast } = useToast();

  const drivers = [
    'SQL Server',
    'MySQL',
    'PostgreSQL',
    'Oracle',
    'SQLite',
    'MariaDB'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.driver || !formData.connstring) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);

    try {
      // TODO: Descomentar cuando esté listo para escribir en la base de datos
      // const response = await fetch('/api/sql-connections', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(formData),
      // });

      // if (!response.ok) {
      //   throw new Error('Error al crear la conexión SQL');
      // }

      // const newConnection = await response.json();

      // Simulación temporal hasta que se habilite la escritura
      const newConnection = {
        id: `temp-${Date.now()}`,
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      toast({
        title: "Conexión SQL creada",
        description: `La conexión "${formData.name}" se creó exitosamente`,
        variant: "default"
      });

      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: '',
        driver: '',
        connstring: ''
      });

    } catch (error) {
      console.error('Error creating SQL connection:', error);
      toast({
        title: "Error al crear conexión",
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Crear Conexión SQL Rápida
          </DialogTitle>
          <DialogDescription>
            Crea una nueva conexión SQL para usar inmediatamente en tu pipeline.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              placeholder="Ej: DB Producción"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="driver">Driver</Label>
            <Select
              value={formData.driver}
              onValueChange={(value) => setFormData(prev => ({ ...prev, driver: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un driver" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map(driver => (
                  <SelectItem key={driver} value={driver}>
                    {driver}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="connstring">Cadena de Conexión</Label>
            <Input
              id="connstring"
              placeholder="Server=localhost;Database=mydb;..."
              value={formData.connstring}
              onChange={(e) => setFormData(prev => ({ ...prev, connstring: e.target.value }))}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isCreating}
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Conexión
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}