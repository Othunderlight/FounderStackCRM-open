import React from "react";

const URL_REGEX = /(https?:\/\/[^\s<]+)/gi;

interface LinkifiedTextProps {
  text: string | undefined | null;
  className?: string;
  onEdit?: () => void;
  preserveNewlines?: boolean;
}

export function LinkifiedText({ text, className = "", onEdit, preserveNewlines = true }: LinkifiedTextProps) {
  if (!text) return null;

  // First, replace newlines with <br> tags to preserve them in HTML if preserveNewlines is true
  const textWithBreaks = preserveNewlines ? text.replace(/\n/g, '<br />') : text.replace(/\n/g, ' ');

  const parts = textWithBreaks.split(URL_REGEX);

  const handleClick = (e: React.MouseEvent, isUrl: boolean) => {
    if (isUrl) {
      e.preventDefault();
      window.open((e.target as HTMLAnchorElement).href, "_blank", "noopener,noreferrer");
    } else if (onEdit) {
      onEdit();
    }
  };

  return (
    <span dir="auto" className={`${className} break-words`}>
      {parts.map((part, i) => {
        if (URL_REGEX.test(part)) {
          URL_REGEX.lastIndex = 0;
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline cursor-pointer break-all"
              onClick={(e) => handleClick(e, true)}
            >
              {part}
            </a>
          );
        }
        // For non-URL parts, render as HTML to preserve <br> tags
        return (
          <span
            key={i}
            className="cursor-default"
            onClick={(e) => handleClick(e, false)}
            dangerouslySetInnerHTML={{ __html: part }}
          />
        );
      })}
    </span>
  );
}
