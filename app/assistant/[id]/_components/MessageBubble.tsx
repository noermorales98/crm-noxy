"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export default function MessageBubble({ role, content, streaming }: Props) {
  const isUser = role === "user";

  return (
    <div className={`flex w-full mb-4 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="shrink-0 w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center mr-3 mt-0.5">
          <span className="text-[#6366F1] text-xs font-bold">AI</span>
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-[#2D2D2D] text-white rounded-br-sm"
            : "bg-surface-elevated border border-border-subtle text-text-primary rounded-bl-sm"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-pre:bg-gray-100 prose-pre:text-gray-800 prose-code:text-[#6366F1] prose-code:bg-[#EEF2FF] prose-code:px-1 prose-code:rounded prose-code:text-xs">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
            {streaming && (
              <span className="inline-block w-0.5 h-4 bg-text-primary ml-0.5 animate-pulse" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
