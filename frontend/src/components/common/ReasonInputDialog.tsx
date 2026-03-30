import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { AlertCircle, X } from 'lucide-react';

interface ReasonInputDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  message?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  initialValue?: string;
}

export default function ReasonInputDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  placeholder = 'Tulis alasan secara singkat dan jelas...',
  confirmText = 'Simpan',
  cancelText = 'Batal',
  isLoading = false,
  initialValue = ''
}: ReasonInputDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setError('');
    }
  }, [initialValue, isOpen]);

  const handleConfirm = () => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      setError('Alasan wajib diisi.');
      return;
    }

    onConfirm(trimmedValue);
  };

  const handleClose = () => {
    if (isLoading) {
      return;
    }

    setError('');
    setValue(initialValue);
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-2 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-2 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
                <div className="border-b border-slate-100 px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Dialog.Title className="text-xl font-semibold text-slate-900">{title}</Dialog.Title>
                      {message && <p className="mt-2 text-sm text-slate-500">{message}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isLoading}
                      className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="px-6 py-5">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Alasan</label>
                  <textarea
                    rows={4}
                    value={value}
                    onChange={(event) => {
                      setValue(event.target.value);
                      if (error) {
                        setError('');
                      }
                    }}
                    placeholder={placeholder}
                    disabled={isLoading}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  {error && (
                    <div className="mt-3 flex items-center gap-2 rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                  >
                    {cancelText}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isLoading}
                    className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                  >
                    {isLoading ? 'Memproses...' : confirmText}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
