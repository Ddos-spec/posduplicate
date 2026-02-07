import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, AlertCircle } from 'lucide-react';

interface ReasonSelectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  message?: string;
  isLoading?: boolean;
  confirmText?: string;
  cancelText?: string;
  reasons: string[]; // Predefined reasons
}

export default function ReasonSelectDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isLoading = false,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  reasons
}: ReasonSelectDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleConfirm = () => {
    let finalReason = '';
    
    if (selectedReason === 'Lainnya') {
      if (!customReason.trim()) {
        setError('Mohon isi alasan lainnya');
        return;
      }
      finalReason = customReason.trim();
    } else {
      if (!selectedReason) {
        setError('Mohon pilih alasan');
        return;
      }
      finalReason = selectedReason;
    }

    setError('');
    onConfirm(finalReason);
  };

  const resetForm = () => {
    setSelectedReason('');
    setCustomReason('');
    setError('');
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center"
                >
                  {title}
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-500"
                    disabled={isLoading}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Title>

                <div className="mt-2">
                  {message && (
                    <p className="text-sm text-gray-500 mb-4">
                      {message}
                    </p>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pilih Alasan
                      </label>
                      {/* Replace select with buttons for predefined reasons */}
                      <div className="grid grid-cols-2 gap-2">
                        {reasons.filter(r => r !== 'Lainnya').map((reasonOption) => (
                          <button
                            key={reasonOption}
                            onClick={() => {
                              setSelectedReason(reasonOption);
                              setCustomReason(''); // Clear custom reason if a predefined one is selected
                              setError('');
                            }}
                            className={`px-3 py-2 rounded-lg border text-sm font-medium text-left transition-colors ${
                              selectedReason === reasonOption
                                ? 'bg-blue-500 text-white border-blue-500'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                            disabled={isLoading}
                          >
                            {reasonOption}
                          </button>
                        ))}
                      </div>
                      
                      {/* "Lainnya" Option */}
                      <button
                        onClick={() => {
                          setSelectedReason('Lainnya');
                          setError('');
                        }}
                        className={`mt-2 w-full px-3 py-2 rounded-lg border text-sm font-medium text-left transition-colors ${
                          selectedReason === 'Lainnya'
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                        disabled={isLoading}
                      >
                        Lainnya...
                      </button>
                    </div>

                    {selectedReason === 'Lainnya' && (
                      <div className="animate-fadeIn">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Keterangan Alasan
                        </label>
                        <textarea
                          value={customReason}
                          onChange={(e) => {
                            setCustomReason(e.target.value);
                            setError('');
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Jelaskan alasan secara detail..."
                          rows={3}
                          disabled={isLoading}
                        />
                      </div>
                    )}

                    {error && (
                      <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                    onClick={handleClose}
                    disabled={isLoading}
                  >
                    {cancelText}
                  </button>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
                    onClick={handleConfirm}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Memproses...
                      </span>
                    ) : (
                      confirmText
                    )}
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