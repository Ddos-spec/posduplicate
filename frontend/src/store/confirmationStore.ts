import { create } from 'zustand';

type ConfirmationType = 'success' | 'warning' | 'danger' | 'info';

interface ConfirmationOptions {
  title: string;
  message: string;
  onConfirm: () => void;
  type?: ConfirmationType;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmationState {
  isOpen: boolean;
  title: string;
  message: string;
  type: ConfirmationType;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  // Support both old API (3 parameters) and new API (options object)
  showConfirmation: (
    titleOrOptions: string | ConfirmationOptions,
    message?: string,
    onConfirm?: () => void
  ) => void;
  hideConfirmation: () => void;
}

const useConfirmationStore = create<ConfirmationState>((set) => ({
  isOpen: false,
  title: '',
  message: '',
  type: 'success',
  confirmText: 'OK',
  cancelText: 'Batal',
  onConfirm: () => {},
  showConfirmation: (titleOrOptions, message?, onConfirm?) => {
    // Check if old API (3 parameters) or new API (options object)
    if (typeof titleOrOptions === 'string') {
      // Old API: showConfirmation(title, message, onConfirm)
      set({
        isOpen: true,
        title: titleOrOptions,
        message: message || '',
        onConfirm: onConfirm || (() => {}),
        type: 'success',
        confirmText: 'OK',
        cancelText: 'Batal',
      });
    } else {
      // New API: showConfirmation(options)
      const options = titleOrOptions;
      set({
        isOpen: true,
        title: options.title,
        message: options.message,
        onConfirm: options.onConfirm,
        type: options.type || 'success',
        confirmText: options.confirmText || 'OK',
        cancelText: options.cancelText || 'Batal',
      });
    }
  },
  hideConfirmation: () => set({
    isOpen: false,
    title: '',
    message: '',
    type: 'success',
    confirmText: 'OK',
    cancelText: 'Batal',
    onConfirm: () => {},
  }),
}));

export default useConfirmationStore;
