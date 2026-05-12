import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import { useAppStore } from '@/src/lib/store';
import {
  FileUp,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Brain,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';

type ParsedEmployee = {
  name: string;
  registration: string;
};

export default function Upload() {
  const { setLastUpload } = useAppStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [result, setResult] = useState<{ employees: ParsedEmployee[] } | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(10);
    setCurrentStep('Lendo PDF...');
    setResult(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = String(reader.result || '').split(',')[1];

      try {
        setUploadProgress(25);
        setCurrentStep('Processando no servidor...');

        const response = await fetch('/api/upload/ponto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64 }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || 'Falha no processamento do PDF');
        }

        const employees: ParsedEmployee[] = payload.employees || payload.segments || [];
        if (!employees.length) {
          throw new Error('Nenhum funcionário identificado no PDF.');
        }

        setUploadProgress(100);
        setCurrentStep('Concluído!');

        setTimeout(() => {
          setIsUploading(false);
          setResult({ employees });
          setLastUpload(new Date().toLocaleString('pt-BR'));
          toast.success('Arquivo processado com sucesso!');
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });

          void fetch('/api/upload/ponto/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employees }),
          }).catch((error) => {
            console.warn('Failed to save parsed data to server', error);
          });
        }, 800);
      } catch (error: any) {
        console.error(error);
        setIsUploading(false);
        toast.error(error.message || 'Erro ao processar PDF. Verifique o layout.');
      }
    };

    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  } as any);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
          <Brain className="w-3 h-3" />
          Parsing de PDF
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Importar Espelho de Ponto</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Faça upload do seu arquivo PDF DIMEP. O servidor irá extrair e identificar os colaboradores automaticamente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card
            {...getRootProps()}
            className={cn(
              'relative h-[400px] border border-border bg-card rounded-[40px] flex flex-col items-center justify-center cursor-pointer transition-all duration-500 shadow-xl overflow-hidden group',
              isDragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'hover:border-primary/40 hover:bg-muted/40',
              isUploading && 'pointer-events-none opacity-60'
            )}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <input {...getInputProps()} />

            <AnimatePresence mode="wait">
              {isUploading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-6 relative z-10"
                >
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-primary animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center font-bold text-[10px] text-foreground">
                      {uploadProgress}%
                    </div>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{currentStep || 'Processando...'}</p>
                    <p className="text-muted-foreground text-sm">Servidor extraindo registros e identificando colaboradores.</p>
                  </div>
                </motion.div>
              ) : result ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-6 relative z-10"
                >
                  <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-foreground">Importação Concluída!</p>
                    <p className="text-muted-foreground text-sm">{result.employees?.length || 0} colaboradores identificados.</p>
                  </div>
                  <Button className="rounded-xl px-10 h-11 shadow-lg shadow-primary/20" onClick={(e) => { e.stopPropagation(); setResult(null); }}>
                    Importar Outro
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center space-y-6 relative z-10"
                >
                  <div className="w-24 h-24 rounded-[32px] bg-muted border border-border flex items-center justify-center mx-auto shadow-inner group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-500">
                    <FileUp className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground tracking-tight">Arraste seu PDF aqui</p>
                    <p className="text-muted-foreground text-sm">Ou clique para selecionar manualmente</p>
                  </div>
                  <div className="flex items-center gap-2 justify-center text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Processamento Seguro Chronos
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[32px] border border-border shadow-sm bg-card p-6">
            <h3 className="font-bold flex items-center gap-2 mb-4 text-foreground">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Dicas de Importação
            </h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <ArrowRight className="w-4 h-4 shrink-0 text-primary" />
                Use o layout padrão DIMEP DMP Light.
              </li>
              <li className="flex gap-2">
                <ArrowRight className="w-4 h-4 shrink-0 text-primary" />
                Arquivos devem estar legíveis.
              </li>
              <li className="flex gap-2">
                <ArrowRight className="w-4 h-4 shrink-0 text-primary" />
                Verifique se o CNPJ está visível.
              </li>
            </ul>
          </Card>

          <Card className="rounded-[32px] border border-border shadow-sm bg-primary/5 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resumo Recente</span>
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-2">
              <RecentUploadItem name="Junho_2026.pdf" date="Ontem" />
              <RecentUploadItem name="Maio_2026.pdf" date="03/05/2026" />
            </div>
          </Card>
        </div>
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {result.employees?.map((emp, idx) => (
            <Card key={idx} className="rounded-2xl hover:bg-accent transition-colors cursor-pointer border-border shadow-none p-4 flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold truncate max-w-[150px] text-foreground">{emp.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{emp.registration}</p>
                </div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </Card>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

function RecentUploadItem({ name, date }: { name: string; date: string }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-xl hover:bg-white/70 transition-colors">
      <span className="text-xs font-medium truncate max-w-[120px] text-foreground">{name}</span>
      <span className="text-[10px] text-muted-foreground font-mono">{date}</span>
    </div>
  );
}
