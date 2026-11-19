'use client'

import { useId, useRef, useState, type KeyboardEvent } from 'react'
import Quiz from './Quiz'

type Mot = {
  id: number
  fr: string
  dendi: string
  phonetique: string
  categorie: string
}

export default function QuizWrapper({ mots, description }: { mots: Mot[], description: string }) {
  const [modeQuiz, setModeQuiz] = useState(false)
  const [sessionActive, setSessionActive] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogId = useId()
  const titleId = `${dialogId}-title`
  const descriptionId = `${dialogId}-description`

  const openQuiz = () => {
    if (modeQuiz || !dialogRef.current) return
    dialogRef.current.showModal()
    setModeQuiz(true)
  }

  const requestClose = () => {
    if (sessionActive && !window.confirm('Quitter le quiz ? La session en cours et ses réponses ne pourront pas être reprises.')) return
    dialogRef.current?.close()
  }

  const onClosed = () => {
    setModeQuiz(false)
    setSessionActive(false)
    // The browser normally restores focus. Cover pointer activation without focus.
    if (triggerRef.current && document.activeElement !== triggerRef.current) {
      triggerRef.current.focus({ preventScroll: true })
    }
  }

  const wrapTab = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return
    // showModal() blocks the background. Wrap the dialog's buttons to skip browser chrome.
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button:enabled')
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    const from = event.shiftKey ? first : last
    const to = event.shiftKey ? last : first
    if (to && document.activeElement === from) {
      event.preventDefault()
      to.focus()
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openQuiz}
        className="quiz-launch-button"
        aria-haspopup="dialog"
        aria-controls={dialogId}
        aria-describedby={descriptionId}
      >
        Quiz libre
      </button>
      <p id={descriptionId} className="learn-quiz-scope">{description}</p>
      <dialog
        ref={dialogRef}
        id={dialogId}
        className="quiz-overlay"
        aria-labelledby={titleId}
        onKeyDown={wrapTab}
        onCancel={(event) => {
          event.preventDefault()
          requestClose()
        }}
        onClose={onClosed}
      >
        <span id={titleId} className="sr-only">Quiz Dendi-Learn</span>
        <div className="quiz-overlay-inner">
          <button type="button" onClick={requestClose} className="quiz-close-button" aria-label="Fermer le quiz">
            <span aria-hidden="true">←</span> Fermer
          </button>
          {modeQuiz && <Quiz mots={mots} onQuitter={requestClose} onSessionActiveChange={setSessionActive} />}
        </div>
      </dialog>
    </>
  )
}
