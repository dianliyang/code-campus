import React from 'react';

interface FormattedDescriptionProps {
  text: string;
}

export default function FormattedDescription({ text }: FormattedDescriptionProps) {
  if (!text) return null;

  return (
    <div className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
      {text}
    </div>
  );
}
