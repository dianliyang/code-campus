import React from 'react';

interface FormattedDescriptionProps {
  text: string;
}

export default function FormattedDescription({ text }: FormattedDescriptionProps) {
  if (!text) return null;

  return (
    <div className="bg-gray-50 border-2 border-black p-8 font-mono text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">
      {text}
    </div>
  );
}
