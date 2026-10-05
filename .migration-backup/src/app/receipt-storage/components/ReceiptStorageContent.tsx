'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, X, Image as ImageIcon, Trash2, ZoomIn, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Receipt {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  notes: string;
  capturedAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ReceiptStorageContent() {
  const { user, getEffectiveOwnerId, isOwner, isAccountant } = useAuth();
  const supabase = createClient();
  const canEdit = isOwner() || isAccountant();

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const ownerId = getEffectiveOwnerId();
      if (!ownerId) return;
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });
      if (error) {
        if (!/relation.*does not exist/i.test(error.message)) {
          toast.error('Failed to load receipts');
        }
        return;
      }
      setReceipts(
        (data || []).map((r: any) => ({
          id: r.id,
          fileName: r.file_name,
          fileUrl: r.file_url,
          fileType: r.file_type,
          fileSize: r.file_size,
          notes: r.notes || '',
          capturedAt: r.captured_at,
        }))
      );
    } catch {
      // silently fail if table doesn't exist yet
    } finally {
      setLoading(false);
    }
  }, [getEffectiveOwnerId, supabase]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  // Stop camera stream on unmount or tab change
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      const msg =
        err?.name === 'NotAllowedError' ?'Camera access denied. Please allow camera permission in your browser settings.'
          : err?.name === 'NotFoundError' ?'No camera found on this device.' :'Could not access camera. Please try the upload option instead.';
      setCameraError(msg);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      toast.error('Unsupported file type. Use JPG, PNG, WEBP, or PDF.');
      return;
    }
    setUploadFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setUploadPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setUploadPreview(null);
    }
  };

  const saveReceipt = async () => {
    if (!canEdit) return;
    const ownerId = getEffectiveOwnerId();
    if (!ownerId || !user) { toast.error('Not authenticated'); return; }

    setSaving(true);
    try {
      let fileUrl = '';
      let fileName = '';
      let fileType = 'image';
      let fileSize = 0;

      if (activeTab === 'camera' && capturedImage) {
        // Convert base64 to blob
        const res = await fetch(capturedImage);
        const blob = await res.blob();
        fileName = `receipt_${Date.now()}.jpg`;
        fileSize = blob.size;
        fileType = 'image';

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(`${ownerId}/${fileName}`, blob, { contentType: 'image/jpeg', upsert: false });

        if (uploadError) {
          // If storage bucket doesn't exist, store as data URL fallback
          fileUrl = capturedImage;
        } else {
          const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(uploadData.path);
          fileUrl = urlData.publicUrl;
        }
      } else if (activeTab === 'upload' && uploadFile) {
        fileName = uploadFile.name;
        fileSize = uploadFile.size;
        fileType = uploadFile.type.startsWith('image/') ? 'image' : 'pdf';

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(`${ownerId}/${Date.now()}_${fileName}`, uploadFile, { contentType: uploadFile.type, upsert: false });

        if (uploadError) {
          // Fallback: store preview or placeholder
          fileUrl = uploadPreview || '';
        } else {
          const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(uploadData.path);
          fileUrl = urlData.publicUrl;
        }
      } else {
        toast.error('No receipt to save');
        setSaving(false);
        return;
      }

      const { error } = await supabase.from('receipts').insert({
        owner_id: ownerId,
        user_id: user.id,
        file_name: fileName,
        file_url: fileUrl,
        file_type: fileType,
        file_size: fileSize,
        notes: notes.trim() || null,
        captured_at: new Date().toISOString(),
      });

      if (error) {
        toast.error('Failed to save receipt');
        return;
      }

      toast.success('Receipt saved successfully');
      setCapturedImage(null);
      setUploadPreview(null);
      setUploadFile(null);
      setNotes('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchReceipts();
    } catch (err: any) {
      toast.error(err?.message || 'Error saving receipt');
    } finally {
      setSaving(false);
    }
  };

  const deleteReceipt = async (id: string) => {
    if (!canEdit) return;
    try {
      const { error } = await supabase.from('receipts').delete().eq('id', id);
      if (error) { toast.error('Failed to delete receipt'); return; }
      toast.success('Receipt deleted');
      fetchReceipts();
    } catch {
      toast.error('Error deleting receipt');
    }
  };

  const hasCapture = activeTab === 'camera' ? !!capturedImage : !!uploadFile;

  return (
    <div className="space-y-6">
      {/* Capture Panel */}
      {canEdit && (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">Add Receipt</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Take a photo or upload an existing receipt image</p>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 mx-5 mt-4 w-fit">
            <button
              onClick={() => { setActiveTab('camera'); stopCamera(); setCapturedImage(null); }}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-150 ${activeTab === 'camera' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Camera size={14} />
              Camera
            </button>
            <button
              onClick={() => { setActiveTab('upload'); stopCamera(); }}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-150 ${activeTab === 'upload' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Upload size={14} />
              Upload
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Camera tab */}
            {activeTab === 'camera' && (
              <div className="space-y-3">
                {cameraError && (
                  <div className="flex items-start gap-2 p-3 bg-danger/5 border border-danger/20 rounded-lg">
                    <AlertCircle size={16} className="text-danger flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-danger">{cameraError}</p>
                  </div>
                )}

                {!cameraActive && !capturedImage && (
                  <div
                    onClick={startCamera}
                    className="border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors"
                  >
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Camera size={24} className="text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-foreground">Open Camera</p>
                      <p className="text-xs text-muted-foreground mt-1">Click to access your device camera and take a photo of a receipt</p>
                    </div>
                  </div>
                )}

                {cameraActive && !capturedImage && (
                  <div className="relative rounded-xl overflow-hidden bg-black">
                    <video ref={videoRef} className="w-full max-h-72 object-cover" playsInline muted />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
                      <button
                        onClick={stopCamera}
                        className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                      >
                        <X size={18} />
                      </button>
                      <button
                        onClick={capturePhoto}
                        className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg hover:bg-white/90 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full border-2 border-gray-400" />
                      </button>
                    </div>
                  </div>
                )}

                {capturedImage && (
                  <div className="space-y-3">
                    <div className="relative rounded-xl overflow-hidden">
                      <img src={capturedImage} alt="Captured receipt" className="w-full max-h-72 object-contain bg-black" />
                      <button
                        onClick={retakePhoto}
                        className="absolute top-2 right-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-black/60 text-white rounded-lg hover:bg-black/80 transition-colors"
                      >
                        <Camera size={12} />
                        Retake
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Upload tab */}
            {activeTab === 'upload' && (
              <div className="space-y-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors ${uploadFile ? 'border-success/40 bg-success/5' : 'border-border hover:border-primary/40 hover:bg-primary/5'}`}
                >
                  {uploadPreview ? (
                    <img src={uploadPreview} alt="Receipt preview" className="max-h-48 rounded-lg object-contain" />
                  ) : uploadFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileText size={32} className="text-success" />
                      <p className="text-sm font-semibold text-foreground">{uploadFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(uploadFile.size)}</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <Upload size={24} className="text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-foreground">Upload Receipt</p>
                        <p className="text-xs text-muted-foreground mt-1">Click to browse or drag and drop</p>
                        <p className="text-xs text-muted-foreground">JPG, PNG, WEBP, PDF — max 10MB</p>
                      </div>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {uploadFile && (
                  <button
                    onClick={() => { setUploadFile(null); setUploadPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="text-xs text-muted-foreground hover:text-danger transition-colors flex items-center gap-1"
                  >
                    <X size={12} />
                    Remove file
                  </button>
                )}
              </div>
            )}

            {/* Notes + Save */}
            {hasCapture && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="e.g. Grocery receipt, Office supplies..."
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={saveReceipt}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-70 active:scale-95 transition-all duration-150"
                  >
                    {saving ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                    ) : (
                      'Save Receipt'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Receipts Gallery */}
      <div className="bg-card border border-border rounded-xl shadow-sm">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Stored Receipts</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{receipts.length} receipt{receipts.length !== 1 ? 's' : ''} saved</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading receipts...</p>
          </div>
        ) : receipts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <ImageIcon size={24} className="text-muted-foreground/50" />
            </div>
            <p className="text-sm font-semibold text-foreground">No receipts yet</p>
            <p className="text-xs text-muted-foreground">Use the camera or upload option above to add your first receipt</p>
          </div>
        ) : (
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {receipts.map((r) => (
              <div key={r.id} className="group relative bg-muted rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-colors">
                {r.fileType === 'image' ? (
                  <div className="aspect-[3/4] overflow-hidden bg-black/5">
                    <img
                      src={r.fileUrl}
                      alt={r.fileName}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/assets/images/no_image.png'; }}
                    />
                  </div>
                ) : (
                  <div className="aspect-[3/4] flex items-center justify-center bg-muted">
                    <FileText size={32} className="text-muted-foreground" />
                  </div>
                )}

                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {r.fileType === 'image' && (
                    <button
                      onClick={() => setViewImage(r.fileUrl)}
                      className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                      title="View"
                    >
                      <ZoomIn size={16} />
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => deleteReceipt(r.id)}
                      className="w-9 h-9 rounded-full bg-danger/80 flex items-center justify-center text-white hover:bg-danger transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Info */}
                <div className="p-2">
                  <p className="text-xs font-medium text-foreground truncate">{r.notes || r.fileName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(r.capturedAt)}</p>
                  {r.fileSize > 0 && <p className="text-xs text-muted-foreground">{formatBytes(r.fileSize)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {viewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setViewImage(null)}
        >
          <button
            onClick={() => setViewImage(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
          <img
            src={viewImage}
            alt="Receipt full view"
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
