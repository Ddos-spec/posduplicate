import React from 'react';
import { X, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import useConfirmationStore from '../../store/confirmationStore';

const ConfirmationModal: React.FC = () => {
  const { isOpen, title, message, onConfirm, hideConfirmation, type, confirmText, cancelText } = useConfirmationStore();

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    onConfirm();
    hideConfirmation();
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100',
          borderColor: 'border-blue-300',
          iconColor: 'text-blue-600',
          iconBg: 'bg-blue-100',
          icon: CheckCircle,
          buttonBg: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800',
          glowColor: 'shadow-blue-200',
        };
      case 'warning':
        return {
          bgColor: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
          borderColor: 'border-yellow-300',
          iconColor: 'text-yellow-600',
          iconBg: 'bg-yellow-100',
          icon: AlertCircle,
          buttonBg: 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800',
          glowColor: 'shadow-yellow-200',
        };
      case 'danger':
        return {
          bgColor: 'bg-gradient-to-br from-red-50 to-red-100',
          borderColor: 'border-red-300',
          iconColor: 'text-red-600',
          iconBg: 'bg-red-100',
          icon: AlertCircle,
          buttonBg: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800',
          glowColor: 'shadow-red-200',
        };
      case 'info':
        return {
          bgColor: 'bg-gradient-to-br from-purple-50 to-purple-100',
          borderColor: 'border-purple-300',
          iconColor: 'text-purple-600',
          iconBg: 'bg-purple-100',
          icon: HelpCircle,
          buttonBg: 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800',
          glowColor: 'shadow-purple-200',
        };
      default:
        return {
          bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100',
          borderColor: 'border-blue-300',
          iconColor: 'text-blue-600',
          iconBg: 'bg-blue-100',
          icon: CheckCircle,
          buttonBg: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800',
          glowColor: 'shadow-blue-200',
        };
    }
  };

  const styles = getTypeStyles();
  const Icon = styles.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex justify-center items-center p-4 backdrop-blur-sm animate-fade-in">
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 animate-scale-in border-2 ${styles.borderColor}`}>
        {/* Header with gradient background */}
        <div className={`${styles.bgColor} rounded-t-2xl px-6 py-5 border-b ${styles.borderColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Animated icon */}
              <div className={`${styles.iconBg} rounded-full p-3 ${styles.glowColor} shadow-lg animate-bounce-slow`}>
                <Icon size={28} className={styles.iconColor} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-bold text-gray-800">
                {title}
              </h3>
            </div>
            <button
              onClick={hideConfirmation}
              className="text-gray-400 hover:text-gray-600 transition-all duration-200 hover:rotate-90 p-1.5 hover:bg-white/50 rounded-full"
            >
              <X size={22} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <p className="text-gray-700 text-base leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex gap-3">
          <button
            type="button"
            className="flex-1 px-5 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-105"
            onClick={hideConfirmation}
          >
            {cancelText || 'Batal'}
          </button>
          <button
            type="button"
            className={`flex-1 px-5 py-3 ${styles.buttonBg} text-white rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl ${styles.glowColor} transform hover:scale-105`}
            onClick={handleConfirm}
          >
            {confirmText || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
