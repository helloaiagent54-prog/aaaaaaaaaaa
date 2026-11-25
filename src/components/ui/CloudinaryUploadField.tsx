import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { useAppDispatch } from '../../app/hooks.ts';
import { pushToast } from '../../features/toast/toastSlice.ts';
import { apiRequest } from '../../lib/api.ts';
import type { MediaAsset } from '../../types/domain.ts';

interface CloudinaryUploadFieldProps {
  folder: 'products' | 'categories' | 'brands' | 'cms' | 'promotions';
  onUploaded: (asset: MediaAsset) => void;
  label?: string;
}

export function CloudinaryUploadField({
  folder,
  onUploaded,
  label = 'Upload Image via Cloudinary',
}: CloudinaryUploadFieldProps) {
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      dispatch(pushToast({ variant: 'error', message: 'Select a valid JPEG, PNG, WebP, or GIF image.' }));
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      dispatch(pushToast({ variant: 'error', message: 'Image must be smaller than 6 MB.' }));
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      formData.append('alt', file.name.replace(/\.[^.]+$/, ''));

      const res = await apiRequest<{ asset: MediaAsset }>('/api/cms/admin/upload', {
        method: 'POST',
        body: formData,
        isFormData: true,
      });

      onUploaded(res.asset);
      dispatch(pushToast({ variant: 'success', message: 'Image uploaded to Cloudinary.' }));
    } catch (err) {
      dispatch(
        pushToast({
          variant: 'error',
          title: 'Upload Failed',
          message: err instanceof Error ? err.message : 'Cloudinary upload failed.',
        })
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="sr-only"
        id={`cloudinary-upload-${folder}`}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-dashed border-emerald-400 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-800 text-xs font-semibold transition-colors disabled:opacity-60"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
        <span>{uploading ? 'Uploading to Cloudinary...' : label}</span>
      </button>
    </div>
  );
}
