import React from 'react';

interface FormattedDescriptionProps {
  text: string;
}

export default function FormattedDescription({ text }: FormattedDescriptionProps) {
  if (!text) return null;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
      {text}
    </div>
  );
}
