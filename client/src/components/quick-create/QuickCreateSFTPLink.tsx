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
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2 } from "lucide-react";

interface QuickCreateSFTPLinkProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function QuickCreateSFTPLink({ 
  open, 
  onOpenChange, 
  onSuccess 
}: QuickCreateSFTPLinkProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    server: '',
    port: 22,
    user: '',
    password: ''
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.server || !formData.user || !formData.password) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive"
      });
      return;
    }

    if (formData.port <= 0 || formData.port > 65535) {
      toast({
        title: "Puerto inválido",
        description: "El puerto debe estar entre 1 y 65535",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);

    try {
      // TODO: Descomentar cuando esté listo para escribir en la base de datos
      // const response = await fetch('/api/sftp-links', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(formData),
      // });

      // if (!response.ok) {
      //   throw new Error('Error al crear el enlace SFTP');
      // }

      // const newLink = await response.json();

      // Simulación temporal hasta que se habilite la escritura
      const newLink = {
        id: `temp-${Date.now()}`,
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      toast({
        title: "Enlace SFTP creado",
        description: `El enlace "${formData.name}" se creó exitosamente`,
        variant: "default"
      });

      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: '',
        server: '',
        port: 22,
        user: '',
        password: ''
      });

    } catch (error) {
      console.error('Error creating SFTP link:', error);
      toast({
        title: "Error al crear enlace",
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
            Crear Enlace SFTP Rápido
          </DialogTitle>
          <DialogDescription>
            Crea un nuevo enlace SFTP para usar inmediatamente en tu pipeline.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              placeholder="Ej: Servidor FTP Producción"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="server">Servidor *</Label>
              <Input
                id="server"
                placeholder="ftp.ejemplo.com"
                value={formData.server}
                onChange={(e) => setFormData(prev => ({ ...prev, server: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">Puerto</Label>
              <Input
                id="port"
                type="number"
                min="1"
                max="65535"
                value={formData.port}
                onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) || 22 }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user">Usuario *</Label>
            <Input
              id="user"
              placeholder="nombre_usuario"
              value={formData.user}
              onChange={(e) => setFormData(prev => ({ ...prev, user: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña *</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
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
              Crear Enlace
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}