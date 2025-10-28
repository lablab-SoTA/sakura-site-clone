"use client";

import { useState } from "react";

type ReportFormProps = {
  videoId: string;
};

type ReportState = {
  reason: string;
  message: string;
};

const REASONS = [
  { value: "no_mosaic", label: "モザイク不足/欠落" },
  { value: "repost", label: "転載の疑い" },
  { value: "minor", label: "18歳未満向けの可能性" },
  { value: "other", label: "その他" },
];

export default function ReportForm({ videoId }: ReportFormProps) {
  const [state, setState] = useState<ReportState>({ reason: "no_mosaic", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const response = await fetch("/api/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        videoId,
        reason: state.reason,
        message: state.message || null,
      }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ message: "送信に失敗しました。" }));
      setError(payload.message ?? "送信に失敗しました。");
      return;
    }

    setMessage("通報を受け付けました。対応までしばらくお待ちください。");
    setState({ reason: "no_mosaic", message: "" });
  };

  return (
    <form className="report-form" onSubmit={handleSubmit}>
      <label className="report-form__field">
        <span>理由</span>
        <select
          value={state.reason}
          onChange={(event) => setState((prev) => ({ ...prev, reason: event.target.value }))}
        >
          {REASONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="report-form__field">
        <span>詳細（任意）</span>
        <textarea
          rows={4}
          value={state.message}
          onChange={(event) => setState((prev) => ({ ...prev, message: event.target.value }))}
          placeholder="詳細な状況やタイムスタンプなどがあればご記入ください"
        />
      </label>
      {error && (
        <p className="report-form__error" role="alert">
          {error}
        </p>
      )}
      {message && <p className="report-form__message">{message}</p>}
      <button type="submit" className="button" disabled={isSubmitting}>
        {isSubmitting ? "送信中..." : "送信する"}
      </button>
    </form>
  );
}
