import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Check, Clock, ChefHat, Timer, TimerOff, Users } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import type { Recipe } from '../types'

interface Props {
  recipe: Recipe
  onClose: () => void
}

type WakeLockSentinel = { release: () => Promise<void> }

export default function CookMode({ recipe, onClose }: Props) {
  const { settings } = useAppStore()
  const lang = settings.language

  const [stepIdx, setStepIdx] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [servingMult, setServingMult] = useState(1)

  // Per-step countdown timer
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Wake Lock — keep screen on while cooking
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return
    try {
      wakeLockRef.current = await (navigator as unknown as { wakeLock: { request: (t: string) => Promise<WakeLockSentinel> } }).wakeLock.request('screen')
    } catch {
      // Permission denied or browser doesn't support — silently ignore
    }
  }, [])

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release()
      wakeLockRef.current = null
    }
  }, [])

  useEffect(() => {
    requestWakeLock()
    return () => { releaseWakeLock() }
  }, [requestWakeLock, releaseWakeLock])

  // Re-acquire wake lock if page becomes visible again (e.g. after tab switch)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [requestWakeLock])

  const currentStep = recipe.steps[stepIdx]
  const totalSteps = recipe.steps.length
  const stepDuration = currentStep?.duration ? currentStep.duration * 60 : null // minutes → seconds

  // BUG FIX: stopTimer must be declared before the useEffect that calls it
  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setTimerRunning(false)
  }, [])

  // Reset timer when step changes (track prev stepIdx to avoid setState-in-effect lint;
  // this still runs once per step change but via a guarded ref comparison)
  const prevStepIdxRef = useRef(stepIdx)
  useEffect(() => {
    if (prevStepIdxRef.current !== stepIdx) {
      prevStepIdxRef.current = stepIdx
      stopTimer()
      setTimerRemaining(stepDuration)
    }
  }, [stepIdx, stepDuration, stopTimer])

  const startTimer = () => {
    if (timerRemaining === null || timerRemaining <= 0) return
    setTimerRunning(true)
    intervalRef.current = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev === null || prev <= 1) {
          stopTimer()
          // Vibrate + notify when timer done
          if ('vibrate' in navigator) navigator.vibrate([300, 100, 300])
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const resetTimer = () => {
    stopTimer()
    setTimerRemaining(stepDuration)
  }

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const toggleComplete = (idx: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) { next.delete(idx) } else { next.add(idx) }
      return next
    })
  }

  const goNext = () => {
    if (stepIdx < totalSteps - 1) {
      toggleComplete(stepIdx)
      setStepIdx(stepIdx + 1)
    }
  }

  const goPrev = () => {
    if (stepIdx > 0) setStepIdx(stepIdx - 1)
  }

  const scaleAmount = (amount: string): string => {
    const num = parseFloat(amount)
    if (isNaN(num)) return amount
    const scaled = num * servingMult
    return scaled % 1 === 0 ? String(scaled) : scaled.toFixed(1)
  }

  const timerDone = timerRemaining === 0
  const progress = totalSteps > 0 ? ((stepIdx + (completedSteps.has(stepIdx) ? 1 : 0)) / totalSteps) * 100 : 0

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'var(--color-bg)',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px', borderBottom: '1px solid var(--color-border)',
        position: 'sticky', top: 0, background: 'var(--color-bg)', zIndex: 2,
      }}>
        <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
            <ChefHat size={11} style={{ display: 'inline', marginRight: 3 }} />
            {lang === 'zh' ? '\u716e\u98df\u6a21\u5f0f' : 'Cook Mode'}
          </p>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{recipe.title}</h2>
        </div>
        {/* Serving scaler */}
        {recipe.servings && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={13} style={{ color: 'var(--color-text-3)' }} />
            <button className="scaler-btn" onClick={() => setServingMult((m) => Math.max(0.5, +(m - 0.5).toFixed(1)))}>−</button>
            <span style={{ fontSize: 13, fontWeight: 600, minWidth: 32, textAlign: 'center' }}>
              {Math.round(recipe.servings * servingMult)}
            </span>
            <button className="scaler-btn" onClick={() => setServingMult((m) => +(m + 0.5).toFixed(1))}>＋</button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: 'var(--color-border)' }}>
        <div style={{
          height: '100%', background: 'var(--color-primary)',
          width: `${progress}%`, transition: 'width 0.3s',
        }} />
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '10px 16px 4px' }}>
        {recipe.steps.map((_, i) => (
          <button
            key={i}
            onClick={() => setStepIdx(i)}
            style={{
              width: i === stepIdx ? 20 : 8, height: 8, borderRadius: 4,
              background: completedSteps.has(i) ? 'var(--color-success)' :
                i === stepIdx ? 'var(--color-primary)' : 'var(--color-border)',
              transition: 'all 0.2s', padding: 0, flexShrink: 0,
            }}
          />
        ))}
      </div>

      {/* Main step content */}
      <div style={{ flex: 1, padding: '16px 20px' }}>
        <div style={{
          fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
        }}>
          {lang === 'zh' ? `\u6b65\u9a5f ${stepIdx + 1} / ${totalSteps}` : `Step ${stepIdx + 1} of ${totalSteps}`}
        </div>

        <p style={{
          fontSize: 20, fontWeight: 500, lineHeight: 1.6,
          color: 'var(--color-text)', marginBottom: 24,
          textDecoration: completedSteps.has(stepIdx) ? 'line-through' : 'none',
          opacity: completedSteps.has(stepIdx) ? 0.5 : 1,
        }}>
          {currentStep?.description}
        </p>

        {/* Step timer */}
        {stepDuration !== null && (
          <div style={{
            background: timerDone ? 'var(--color-success-light, #d1fae5)' : 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: 16,
            border: `1px solid ${timerDone ? 'var(--color-success)' : 'var(--color-border)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} style={{ color: timerDone ? 'var(--color-success)' : 'var(--color-primary)' }} />
                <span style={{
                  fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                  color: timerDone ? 'var(--color-success)' : 'var(--color-text)',
                }}>
                  {timerRemaining !== null ? formatTimer(timerRemaining) : formatTimer(stepDuration)}
                </span>
                {timerDone && (
                  <span style={{ fontSize: 13, color: 'var(--color-success)', fontWeight: 600 }}>
                    {lang === 'zh' ? '\u5b8c\u6210\uff01' : 'Done!'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {!timerRunning && !timerDone && (
                  <button className="btn-primary" style={{ padding: '7px 14px', fontSize: 13 }} onClick={startTimer}>
                    <Timer size={14} style={{ display: 'inline', marginRight: 4 }} />
                    {lang === 'zh' ? '\u958b\u59cb' : 'Start'}
                  </button>
                )}
                {timerRunning && (
                  <button className="btn-ghost" style={{ padding: '7px 14px', fontSize: 13 }} onClick={stopTimer}>
                    <TimerOff size={14} style={{ display: 'inline', marginRight: 4 }} />
                    {lang === 'zh' ? '\u6682\u505c' : 'Pause'}
                  </button>
                )}
                <button className="btn-ghost" style={{ padding: '7px 12px', fontSize: 13 }} onClick={resetTimer}>
                  {lang === 'zh' ? '\u91cd\u7f6e' : 'Reset'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mark complete button */}
        <button
          onClick={() => toggleComplete(stepIdx)}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 'var(--radius-md)',
            fontWeight: 600, fontSize: 15,
            background: completedSteps.has(stepIdx) ? 'var(--color-surface)' : 'var(--color-primary)',
            color: completedSteps.has(stepIdx) ? 'var(--color-text-2)' : '#fff',
            border: completedSteps.has(stepIdx) ? '1.5px solid var(--color-border)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Check size={18} />
          {completedSteps.has(stepIdx)
            ? (lang === 'zh' ? '\u53d6\u6d88\u5b8c\u6210' : 'Undo')
            : (lang === 'zh' ? '\u6b65\u9a5f\u5b8c\u6210' : 'Mark Complete')}
        </button>
      </div>

      {/* Ingredients panel (collapsed) */}
      {recipe.ingredients.length > 0 && (
        <details style={{ padding: '0 20px 12px' }}>
          <summary style={{
            fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)', cursor: 'pointer',
            padding: '8px 0', borderTop: '1px solid var(--color-border)', marginTop: 4,
          }}>
            {lang === 'zh' ? `\u98df\u6750\uff08${recipe.ingredients.length}\uff09` : `Ingredients (${recipe.ingredients.length})`}
          </summary>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recipe.ingredients.map((ing) => (
              <div key={ing.id} style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 14, padding: '4px 0',
              }}>
                <span>{ing.name}</span>
                <span style={{ color: 'var(--color-text-2)', fontWeight: 500 }}>
                  {scaleAmount(ing.amount)} {ing.unit}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Prev / Next navigation */}
      <div style={{
        display: 'flex', gap: 12, padding: '12px 20px 32px',
        borderTop: '1px solid var(--color-border)',
      }}>
        <button
          className="btn-ghost"
          style={{ flex: 1, padding: '12px 0', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          disabled={stepIdx === 0}
          onClick={goPrev}
        >
          <ChevronLeft size={18} />
          {lang === 'zh' ? '\u4e0a\u4e00\u6b65' : 'Prev'}
        </button>
        {stepIdx < totalSteps - 1 ? (
          <button
            className="btn-primary"
            style={{ flex: 1, padding: '12px 0', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onClick={goNext}
          >
            {lang === 'zh' ? '\u4e0b\u4e00\u6b65' : 'Next'}
            <ChevronRight size={18} />
          </button>
        ) : (
          <button
            className="btn-primary"
            style={{ flex: 1, padding: '12px 0', fontSize: 15, background: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onClick={onClose}
          >
            <Check size={18} />
            {lang === 'zh' ? '\u5b8c\u6210\uff01' : 'Done!'}
          </button>
        )}
      </div>
    </div>
  )
}
