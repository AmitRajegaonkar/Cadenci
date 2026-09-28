import { useState, useRef, useEffect } from 'react'
import { Dices, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function SlotMachine() {
  const [topicsText, setTopicsText] = useState("Technology\nScience\nArt\nHistory\nMusic\nSports")
  const [spinning, setSpinning] = useState(false)
  const [animating, setAnimating] = useState(false)
  
  // sequence of topics to display in the slot machine column
  const [slotSequence, setSlotSequence] = useState<string[]>(['Ready'])
  const [offset, setOffset] = useState(0) // which index we are currently looking at

  const topics = topicsText.split(/\n|,/).map(t => t.trim()).filter(Boolean)

  const spin = () => {
    if (topics.length === 0) return
    if (spinning) return
    setSpinning(true)
    
    // Pick a winner randomly
    const winnerIndex = Math.floor(Math.random() * topics.length)
    const winner = topics[winnerIndex]

    // Create a sequence of ~30 items to scroll through
    const sequenceCount = 30
    const newSequence = []
    
    // We want the sequence to look random, ending with the winner
    for (let i = 0; i < sequenceCount - 1; i++) {
      newSequence.push(topics[Math.floor(Math.random() * topics.length)])
    }
    newSequence.push(winner)

    // The sequence starts with whatever was currently showing to make the scroll seamless
    const currentView = slotSequence[offset] || 'Ready'
    
    const finalSequence = [currentView, ...newSequence]
    
    setSlotSequence(finalSequence)
    setOffset(0) // reset offset to start of new sequence instantly
    setAnimating(false) // turn off CSS transition for the jump

    // Using a timeout to ensure the DOM has updated the sequence before we transition
    setTimeout(() => {
      setAnimating(true) // turn on CSS transition
      setOffset(finalSequence.length - 1)
    }, 50)
  }

  // Handle what happens when the spin finishes
  useEffect(() => {
    if (animating && offset > 0 && offset === slotSequence.length - 1) {
      // The CSS transition duration is 3000ms. Wait for it to finish.
      const timer = setTimeout(() => {
        setAnimating(false)
        setSpinning(false)
        
        // Remove the winning topic from the text area
        const winner = slotSequence[offset]
        
        // Remove only the first occurrence of the winner to be safe
        let removed = false
        const remainingTopics = topics.filter(t => {
          if (!removed && t === winner) {
            removed = true
            return false
          }
          return true
        })
        
        setTopicsText(remainingTopics.join('\n'))
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [offset, animating, slotSequence, topics])

  return (
    <div className="flex h-full flex-col p-4 sm:p-6 overflow-hidden">
      <div className="flex flex-col gap-4 max-w-xl mx-auto w-full flex-shrink-0 z-10 relative">
        <div className="flex items-center gap-2">
          <Dices className="h-5 w-5 text-amber" />
          <h2 className="text-lg font-semibold">Topic Selector</h2>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="topics">Paste topics (one per line or comma-separated)</Label>
          <Textarea 
            id="topics"
            value={topicsText}
            onChange={(e) => setTopicsText(e.target.value)}
            className="h-32 resize-none bg-card/60 font-mono"
            placeholder="Topic 1&#10;Topic 2&#10;Topic 3"
            disabled={spinning}
          />
        </div>
        <Button 
          onClick={spin} 
          disabled={spinning || topics.length === 0}
          className="w-full h-12 text-lg font-bold"
        >
          <Play className="mr-2 h-5 w-5" /> {spinning ? 'Spinning...' : 'Spin!'}
        </Button>
      </div>

      <div className="flex-1 min-h-0 mt-8 rounded-xl border border-border bg-card/30 overflow-hidden relative shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]">
        
        {/* The visual window for the slot machine */}
        <div className="absolute inset-0 flex items-center justify-center">
          
          {/* Fading edges */}
          <div className="absolute top-0 inset-x-0 h-1/4 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute bottom-0 inset-x-0 h-1/4 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
          
          {/* Selection indicator lines */}
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-amber/50 -translate-y-[min(10vh,8vw)] z-10 shadow-[0_0_10px_rgba(245,166,35,0.8)]" />
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-amber/50 translate-y-[min(10vh,8vw)] z-10 shadow-[0_0_10px_rgba(245,166,35,0.8)]" />

          {/* Scrolling container */}
          <div 
            className="absolute top-1/2 left-0 right-0 transition-transform"
            style={{ 
              transform: `translateY(calc(-10vh - ${offset * 20}vh))`,
              transitionDuration: animating ? '3000ms' : '0ms',
              transitionTimingFunction: 'cubic-bezier(0.15, 0.85, 0.15, 1)' // ease-out cubic for realistic slow down
            }}
          >
            {slotSequence.map((topic, i) => (
              <div 
                key={i} 
                className={cn(
                  "absolute left-0 right-0 flex items-center justify-center text-center font-normal italic px-4 break-words leading-none",
                  "transition-opacity duration-300"
                )}
                style={{ 
                  fontFamily: '"Playfair Display", serif',
                  top: `${i * 20}vh`,
                  height: '20vh',
                  fontSize: 'min(15vw, 15vh)',
                  textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  // Fade out items that aren't the center one
                  opacity: Math.abs(offset - i) < 2 ? 1 : 0.2,
                  // Scale down slightly if not the exact center
                  transform: i === offset ? 'scale(1)' : 'scale(0.8) rotateX(20deg)',
                  color: i === offset && !animating ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.7)',
                }}
              >
                {topic}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
