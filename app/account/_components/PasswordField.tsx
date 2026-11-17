// app/account/_components/PasswordField.tsx
"use client";
import { useState } from "react";
import { Eye, EyeOff, Check, Circle } from "lucide-react";
import { PASSWORD_RULES } from "../_lib/validation";

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  /** Show the password rules under the field, ticking them off as the customer types. */
  showRules?: boolean;
  error?: string;
  onBlur?: () => void;
  required?: boolean;
  disabled?: boolean;
  boxed?: boolean;
}

export function PasswordField({ id, label, value, onChange, autoComplete, placeholder, showRules, error, onBlur, required = true, disabled, boxed }: Props) {
  const [visible, setVisible] = useState(false);
  const rulesId = `${id}-rules`;
  const errorId = `${id}-error`;
  const describedBy = [showRules ? rulesId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="acct-label">
        {label}
      </label>
      <div className="acct-password-wrap">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          className={`acct-input${boxed ? " acct-input-boxed" : ""}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          maxLength={autoComplete === "new-password" ? 40 : undefined}
          spellCheck={false}
          autoCapitalize="none"
        />
        <button
          type="button"
          className="acct-eye"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          aria-controls={id}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {showRules && (
        <ul id={rulesId} className="acct-rules" aria-label="Password must have">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(value);
            return (
              <li key={rule.id} data-ok={ok}>
                {ok ? <Check size={14} aria-hidden="true" /> : <Circle size={10} aria-hidden="true" style={{ margin: "0 2px" }} />}
                <span>
                  {rule.label}
                  <span className="sr-only">{ok ? " (done)" : " (not yet)"}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {error && (
        <p id={errorId} className="acct-field-error">
          {error}
        </p>
      )}
    </div>
  );
}
