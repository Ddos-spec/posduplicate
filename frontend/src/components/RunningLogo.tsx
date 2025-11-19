import { useEffect, useState } from 'react';

export default function RunningLogo() {
  const [position, setPosition] = useState(0);
  const logoText = "myposE2NK";

  useEffect(() => {
    const interval = setInterval(() => {
      setPosition((prev) => (prev >= 100 ? 0 : prev + 0.5));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="overflow-hidden w-full h-6 relative bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white">
      <div
        className="absolute whitespace-nowrap flex items-center h-full text-sm font-bold"
        style={{
          transform: `translateX(${position}%)`,
          transition: 'transform 0.05s linear',
        }}
      >
        <span className="mx-4">📦 {logoText}</span>
        <span className="mx-4">📦 {logoText}</span>
        <span className="mx-4">📦 {logoText}</span>
        <span className="mx-4">📦 {logoText}</span>
      </div>
    </div>
  );
}
