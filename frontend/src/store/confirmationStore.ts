import { create } from 'zustand';

interface ConfirmationState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  showConfirmation: (title: string, message: string, onConfirm: () => void) => void;
  hideConfirmation: () => void;
}

const useConfirmationStore = create<ConfirmationState>((set) => ({
  isOpen: false,
  title: '',
  message: '',
  onConfirm: () => {},
  showConfirmation: (title, message, onConfirm) => set({
    isOpen: true,
    title,
    message,
    onConfirm,
  }),
  hideConfirmation: () => set({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  }),
}));

export default useConfirmationStore;
