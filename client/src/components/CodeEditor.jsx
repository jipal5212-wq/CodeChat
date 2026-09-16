import React, { useState, useEffect, useMemo, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { oneDark } from '@codemirror/theme-one-dark';
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, PLACEHOLDERS, LIMITS } from '../utils/constants';

function CodeEditor({
  language,
  onLanguageChange,
  onRunCode,
  onSendMessage,
  isRunning,
  isSending,
  runResult,
  sendError,
  onClearOutput,
}) {
  const [code, setCode] = useState(PLACEHOLDERS[language] || '');

  // When language changes, update snippet if code is default or empty
  const handleLangSelect = (newLang) => {
    if (newLang === language) return;
    const isCurrentPlaceholder = Object.values(PLACEHOLDERS).includes(code.trim()) || code.trim() === '';
    onLanguageChange(newLang);
    if (isCurrentPlaceholder) {
      setCode(PLACEHOLDERS[newLang] || '');
    }
  };

  // Language extension for CodeMirror
  const languageExtension = useMemo(() => {
    switch (language) {
      case 'python':
        return python();
      case 'java':
        return java();
      case 'cpp':
      case 'c':
      default:
        return cpp();
    }
  }, [language]);

  const handleRun = () => {
    if (!code.trim() || isRunning) return;
    onRunCode(code, language);
  };

  const handleSend = () => {
    if (!code.trim() || isSending) return;
    onSendMessage(code, language);
  };

  const handleReset = () => {
    setCode(PLACEHOLDERS[language] || '');
    if (onClearOutput) onClearOutput();
  };

  // Keyboard shortcut listener
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    } else if (e.shiftKey && e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
      // Optional Shift+Enter to Run
      // e.preventDefault();
      // handleRun();
    }
  };

  const charCount = code.length;
  const isOverLimit = charCount > LIMITS.MAX_CODE_LENGTH;

  return (
    <div className="editor-panel-wrapper" onKeyDown={handleKeyDown}>
      {/* Editor Controls Bar */}
      <div className="editor-toolbar">
        <div className="editor-toolbar-left">
          <label className="editor-lang-label" htmlFor="lang-select">
            LANGUAGE:
          </label>
          <div className="select-wrapper">
            <select
              id="lang-select"
              className={`editor-lang-select editor-lang-select--${language}`}
              value={language}
              onChange={(e) => handleLangSelect(e.target.value)}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang]}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn-toolbar-action"
            onClick={handleReset}
            title="Reset code to default template"
          >
            ⟲ Template
          </button>
        </div>

        <div className="editor-toolbar-right">
          <span className={`char-counter ${isOverLimit ? 'char-counter--error' : ''}`}>
            {charCount} / {LIMITS.MAX_CODE_LENGTH}
          </span>
          <span className="kbd-shortcut-hint">
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to Send
          </span>
        </div>
      </div>

      {/* CodeMirror Editor Area */}
      <div className="codemirror-wrapper">
        <CodeMirror
          value={code}
          height="140px"
          theme={oneDark}
          extensions={[languageExtension]}
          onChange={(value) => setCode(value)}
          placeholder="// Write code to chat with strangers..."
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            history: true,
            foldGutter: false,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: false,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: false,
            rectangularSelection: false,
            crosshairCursor: false,
            highlightActiveLine: true,
            highlightSelectionMatches: false,
            closeBracketsKeymap: true,
            defaultKeymap: true,
            searchKeymap: false,
            historyKeymap: true,
            foldKeymap: false,
            completionKeymap: false,
            lintKeymap: false,
          }}
        />
      </div>

      {/* Action Buttons Bar */}
      <div className="editor-actions-bar">
        <div className="actions-left">
          <button
            type="button"
            className="btn btn--secondary btn-run"
            onClick={handleRun}
            disabled={isRunning || !code.trim()}
          >
            {isRunning ? (
              <>
                <span className="spinner-inline" /> Running Sandbox...
              </>
            ) : (
              <>
                <span>▶</span> RUN CODE
              </>
            )}
          </button>
        </div>

        <div className="actions-right">
          <button
            type="button"
            className="btn btn--primary btn-send"
            onClick={handleSend}
            disabled={isSending || isOverLimit || !code.trim()}
          >
            {isSending ? (
              <>
                <span className="spinner-inline" /> Sending...
              </>
            ) : (
              <>
                <span>↵</span> SEND MESSAGE
              </>
            )}
          </button>
        </div>
      </div>

      {/* Console Output Drawer */}
      {(runResult || sendError || isRunning) && (
        <div className={`console-output-drawer ${sendError || (runResult && !runResult.valid) ? 'console-drawer--error' : 'console-drawer--success'}`}>
          <div className="console-drawer-header">
            <span className="console-title">
              {isRunning ? 'SANDBOX RUNNING...' : sendError || (runResult && !runResult.valid) ? 'EXECUTION ERROR' : 'OUTPUT'}
            </span>
            {runResult?.executionTimeMs !== undefined && (
              <span className="execution-time-badge">{runResult.executionTimeMs}ms</span>
            )}
            <button
              type="button"
              className="btn-console-close"
              onClick={onClearOutput}
              title="Close console"
            >
              ✕
            </button>
          </div>

          <div className="console-body">
            {isRunning && (
              <p className="console-msg console-msg--running">
                Executing inside secure AST sandbox...
              </p>
            )}

            {sendError && (
              <p className="console-msg console-msg--error">
                {sendError}
              </p>
            )}

            {!isRunning && runResult && (
              <>
                {runResult.valid ? (
                  <pre className="console-output-text">
                    {runResult.output || '(Execution produced no output)'}
                  </pre>
                ) : (
                  <div className="console-error-list">
                    {runResult.errors?.map((err, idx) => (
                      <p key={idx} className="console-msg console-msg--error">
                        ⛔ {err.message || 'Syntax error'}
                      </p>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CodeEditor;
